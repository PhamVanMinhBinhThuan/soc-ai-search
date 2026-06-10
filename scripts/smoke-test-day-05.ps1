param(
    [string]$BackendUrl = "http://localhost:8081",
    [string]$ElasticsearchUrl = "http://localhost:9200",
    [string]$Index = "soc-events-v1"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$BackendUrl = $BackendUrl.TrimEnd("/")
$ElasticsearchUrl = $ElasticsearchUrl.TrimEnd("/")
$startedAt = Get-Date

function Write-Pass {
    param([string]$Message)
    Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Assert-True {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        throw "[FAIL] $Message"
    }

    Write-Pass $Message
}

function Invoke-Json {
    param(
        [string]$Method = "Get",
        [string]$Uri,
        [object]$Body
    )

    if ($PSBoundParameters.ContainsKey("Body")) {
        $json = $Body | ConvertTo-Json -Depth 40
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        return Invoke-RestMethod -Method $Method -Uri $Uri -ContentType "application/json; charset=utf-8" -Body $bytes
    }

    return Invoke-RestMethod -Method $Method -Uri $Uri
}

function Expand-UnicodeEscapes {
    param([string]$Value)
    return [System.Text.RegularExpressions.Regex]::Unescape($Value)
}

function Get-Array {
    param([object]$Value)

    if ($null -eq $Value) {
        return ,@()
    }

    return ,@($Value)
}

function Assert-NoProperty {
    param(
        [object]$Object,
        [string]$PropertyName,
        [string]$Message
    )

    $property = $Object.PSObject.Properties[$PropertyName]
    Assert-True -Condition ($null -eq $property) -Message $Message
}

function Test-HasProperty {
    param(
        [object]$Object,
        [string]$PropertyName
    )

    return $null -ne $Object.PSObject.Properties[$PropertyName]
}

function Assert-GeneratedDslObject {
    param(
        [object]$Response,
        [string]$ScenarioName
    )

    Assert-True -Condition ($null -ne $Response.generated_dsl) -Message "$ScenarioName has generated_dsl"
    Assert-True -Condition ($Response.generated_dsl -isnot [string]) -Message "$ScenarioName generated_dsl is object, not string"
    Assert-True -Condition ($Response.generated_dsl.GetType().Name -ne "String") -Message "$ScenarioName generated_dsl is not escaped JSON string"
    Assert-True -Condition ($Response.generated_dsl.ToString() -notmatch "\.keyword") -Message "$ScenarioName generated_dsl does not contain .keyword"
}

function Assert-ChartMetadata {
    param(
        [object]$Response,
        [string]$ExpectedChartType,
        [string]$ScenarioName
    )

    Assert-True -Condition ($null -ne $Response.chart_metadata) -Message "$ScenarioName has chart_metadata"
    Assert-True -Condition (-not [string]::IsNullOrWhiteSpace([string]$Response.chart_metadata.chart_type)) -Message "$ScenarioName chart_metadata.chart_type exists"
    Assert-True -Condition (-not [string]::IsNullOrWhiteSpace([string]$Response.chart_metadata.x_axis_label)) -Message "$ScenarioName chart_metadata.x_axis_label exists"
    Assert-True -Condition (-not [string]::IsNullOrWhiteSpace([string]$Response.chart_metadata.y_axis_label)) -Message "$ScenarioName chart_metadata.y_axis_label exists"
    Assert-True -Condition ([string]$Response.chart_metadata.chart_type -eq $ExpectedChartType) -Message "$ScenarioName chart_type is $ExpectedChartType"
}

function Assert-AggregationShape {
    param(
        [object]$Response,
        [string]$ExpectedAggregationType,
        [string]$ExpectedChartType,
        [string]$ScenarioName,
        [bool]$IsNaturalLanguage = $false
    )

    Assert-True -Condition ([string]$Response.mode -eq "aggregation") -Message "$ScenarioName response mode is aggregation"
    Assert-True -Condition ([string]$Response.aggregation_type -eq $ExpectedAggregationType) -Message "$ScenarioName aggregation_type is $ExpectedAggregationType"
    Assert-GeneratedDslObject -Response $Response -ScenarioName $ScenarioName
    Assert-True -Condition ($null -ne $Response.aggregation_results) -Message "$ScenarioName has aggregation_results"
    Assert-True -Condition ([long]$Response.total -ge 0) -Message "$ScenarioName total >= 0"
    Assert-ChartMetadata -Response $Response -ExpectedChartType $ExpectedChartType -ScenarioName $ScenarioName

    if ($IsNaturalLanguage) {
        Assert-True -Condition ($null -ne $Response.search_plan -and $Response.search_plan -isnot [string]) -Message "$ScenarioName has search_plan object"
        Assert-True -Condition ([string]$Response.search_plan.mode -eq "aggregation") -Message "$ScenarioName search_plan.mode is aggregation"
        Assert-True -Condition ($null -ne $Response.events) -Message "$ScenarioName has events array"
        Assert-True -Condition ((Get-Array $Response.events).Count -eq 0) -Message "$ScenarioName events = []"
        Assert-True -Condition ($null -ne $Response.search_latency_ms -and [long]$Response.search_latency_ms -ge 0) -Message "$ScenarioName search_latency_ms >= 0"
        Assert-NoProperty -Object $Response -PropertyName "aggregation_latency_ms" -Message "$ScenarioName has no aggregation_latency_ms"
    }
}

function Invoke-SearchPlan {
    param([object]$Body)
    return Invoke-Json -Method Post -Uri "$BackendUrl/api/v1/search/plan" -Body $Body
}

function Invoke-NaturalLanguageSearch {
    param(
        [string]$Question,
        [int]$Page = 0,
        [int]$Size = 10
    )

    $body = @{
        question = $Question
        page = $Page
        size = $Size
    }

    return Invoke-Json -Method Post -Uri "$BackendUrl/api/v1/search" -Body $body
}

Write-Host "Running Day 05 smoke test..."
Write-Host "Backend: $BackendUrl"
Write-Host "Elasticsearch: $ElasticsearchUrl"
Write-Host "Index: $Index"
Write-Host "Expected LLM provider: mock"

$backendHealth = Invoke-Json -Uri "$BackendUrl/api/v1/health/live"
Assert-True -Condition ($backendHealth.status -eq "UP") -Message "Backend health API is UP"

$clusterHealth = Invoke-Json -Uri "$ElasticsearchUrl/_cluster/health?wait_for_status=yellow&timeout=30s"
Assert-True -Condition ($clusterHealth.status -in @("green", "yellow")) -Message "Elasticsearch health is $($clusterHealth.status)"

$openApi = Invoke-Json -Uri "$BackendUrl/v3/api-docs"
$paths = @($openApi.paths.PSObject.Properties.Name)
Assert-True -Condition ($paths -contains "/api/v1/search") -Message "OpenAPI exposes POST /api/v1/search"
Assert-True -Condition ($paths -contains "/api/v1/search/plan") -Message "OpenAPI exposes POST /api/v1/search/plan"

$countBody = @{
    mode = "aggregation"
    filters = @{
        timestamp = @{ from = "now-7d"; to = "now" }
        event_type = @("failed_login")
    }
    aggregation = @{ type = "count" }
    page = 0
    size = 10
}
$countResponse = Invoke-SearchPlan -Body $countBody
Assert-AggregationShape -Response $countResponse -ExpectedAggregationType "count" -ExpectedChartType "NUMBER" -ScenarioName "technical COUNT"
Assert-True -Condition ([int]$countResponse.generated_dsl.size -eq 0) -Message "technical COUNT generated_dsl.size is 0"
Assert-True -Condition (-not (Test-HasProperty -Object $countResponse.generated_dsl -PropertyName "aggs")) -Message "technical COUNT generated_dsl has no aggs"
Assert-True -Condition ($null -ne $countResponse.generated_dsl.query.bool.filter) -Message "technical COUNT generated_dsl has query filter"

$topNBody = @{
    mode = "aggregation"
    filters = @{
        timestamp = @{ from = "now-30d"; to = "now" }
    }
    aggregation = @{
        type = "top_n"
        field = "ip"
        top_n = 10
    }
    page = 0
    size = 10
}
$topNResponse = Invoke-SearchPlan -Body $topNBody
Assert-AggregationShape -Response $topNResponse -ExpectedAggregationType "top_n" -ExpectedChartType "BAR" -ScenarioName "technical TOP_N"
Assert-True -Condition ((Get-Array $topNResponse.aggregation_results).Count -le 10) -Message "technical TOP_N bucket count <= top_n"

$histogramBody = @{
    mode = "aggregation"
    filters = @{
        timestamp = @{ from = "now-24h"; to = "now" }
    }
    aggregation = @{
        type = "date_histogram"
        interval = "hour"
    }
    page = 0
    size = 10
}
$histogramResponse = Invoke-SearchPlan -Body $histogramBody
Assert-AggregationShape -Response $histogramResponse -ExpectedAggregationType "date_histogram" -ExpectedChartType "LINE" -ScenarioName "technical DATE_HISTOGRAM"
Assert-True -Condition ([string]$histogramResponse.generated_dsl.aggs.events_over_time.date_histogram.fixed_interval -eq "1h") -Message "technical DATE_HISTOGRAM uses fixed_interval 1h"

$groupByQuestion = Expand-UnicodeEscapes "\u0110\u1ebfm s\u1ed1 l\u1ea7n login th\u1ea5t b\u1ea1i theo t\u1eebng user trong 7 ng\u00e0y qua"
$groupByResponse = Invoke-NaturalLanguageSearch -Question $groupByQuestion
Assert-AggregationShape -Response $groupByResponse -ExpectedAggregationType "group_by" -ExpectedChartType "BAR" -ScenarioName "NL GROUP_BY user" -IsNaturalLanguage $true
Assert-True -Condition ([string]$groupByResponse.search_plan.aggregation.type -eq "group_by") -Message "NL GROUP_BY search_plan.aggregation.type is group_by"
Assert-True -Condition ([string]$groupByResponse.search_plan.aggregation.field -eq "user") -Message "NL GROUP_BY search_plan.aggregation.field is user"
Assert-True -Condition ([int]$groupByResponse.search_plan.aggregation.top_n -eq 10) -Message "NL GROUP_BY search_plan.aggregation.top_n is 10"
Assert-True -Condition ((Get-Array $groupByResponse.aggregation_results).Count -le 10) -Message "NL GROUP_BY bucket count <= top_n"

$nlTopNQuestion = Expand-UnicodeEscapes "Top 10 IP c\u00f3 nhi\u1ec1u alert nh\u1ea5t th\u00e1ng n\u00e0y"
$nlTopNResponse = Invoke-NaturalLanguageSearch -Question $nlTopNQuestion
Assert-AggregationShape -Response $nlTopNResponse -ExpectedAggregationType "top_n" -ExpectedChartType "BAR" -ScenarioName "NL TOP_N ip" -IsNaturalLanguage $true
Assert-True -Condition ([string]$nlTopNResponse.search_plan.aggregation.field -eq "ip") -Message "NL TOP_N search_plan.aggregation.field is ip"
Assert-True -Condition ((Get-Array $nlTopNResponse.aggregation_results).Count -le 10) -Message "NL TOP_N bucket count <= top_n"

$nlHistogramQuestion = Expand-UnicodeEscapes "S\u1ed1 event theo gi\u1edd trong 24h qua"
$nlHistogramResponse = Invoke-NaturalLanguageSearch -Question $nlHistogramQuestion
Assert-AggregationShape -Response $nlHistogramResponse -ExpectedAggregationType "date_histogram" -ExpectedChartType "LINE" -ScenarioName "NL DATE_HISTOGRAM hour" -IsNaturalLanguage $true
Assert-True -Condition ([string]$nlHistogramResponse.search_plan.aggregation.interval -eq "hour") -Message "NL DATE_HISTOGRAM search_plan.aggregation.interval is hour"
Assert-True -Condition ([string]$nlHistogramResponse.generated_dsl.aggs.events_over_time.date_histogram.fixed_interval -eq "1h") -Message "NL DATE_HISTOGRAM uses fixed_interval 1h"

$elapsed = ((Get-Date) - $startedAt).TotalMilliseconds
Write-Host ""
Write-Host ("Day 05 smoke test passed in {0:N0} ms." -f $elapsed) -ForegroundColor Green
