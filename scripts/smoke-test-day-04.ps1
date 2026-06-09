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
        $json = $Body | ConvertTo-Json -Depth 30
        return Invoke-RestMethod -Method $Method -Uri $Uri -ContentType "application/json" -Body $json
    }

    return Invoke-RestMethod -Method $Method -Uri $Uri
}

function Assert-HttpStatus {
    param(
        [string]$Method,
        [string]$Uri,
        [object]$Body,
        [int[]]$ExpectedStatusCodes
    )

    $json = if ($null -ne $Body) { $Body | ConvertTo-Json -Depth 30 } else { $null }

    try {
        if ($null -ne $json) {
            $response = Invoke-WebRequest -Method $Method -Uri $Uri -ContentType "application/json" -Body $json -UseBasicParsing
        }
        else {
            $response = Invoke-WebRequest -Method $Method -Uri $Uri -UseBasicParsing
        }

        if ($ExpectedStatusCodes -notcontains [int]$response.StatusCode) {
            throw "Expected status $($ExpectedStatusCodes -join ', ') from $Uri but got $($response.StatusCode)."
        }

        return $response
    }
    catch {
        $statusCode = $null
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }

        if ($null -ne $statusCode -and $ExpectedStatusCodes -contains $statusCode) {
            return $_.Exception.Response
        }

        throw
    }
}

function Get-EventsArray {
    param([object]$Response)

    if ($null -eq $Response.events) {
        return ,@()
    }

    return ,@($Response.events)
}

function Assert-SearchResponseShape {
    param(
        [object]$Response,
        [int]$ExpectedSize,
        [string]$ScenarioName
    )

    Assert-True -Condition ($null -ne $Response.original_question) -Message "$ScenarioName response contains original_question"
    Assert-True -Condition ([string]$Response.mode -eq "search") -Message "$ScenarioName response mode is search"
    Assert-True -Condition ($null -ne $Response.search_plan -and $Response.search_plan -isnot [string]) -Message "$ScenarioName response contains search_plan object"
    Assert-True -Condition ([string]$Response.search_plan.mode -eq "search") -Message "$ScenarioName search_plan.mode is search"
    Assert-True -Condition ($null -ne $Response.generated_dsl -and $Response.generated_dsl -isnot [string]) -Message "$ScenarioName response contains generated_dsl object"
    Assert-True -Condition ($null -ne $Response.total_pages -and [long]$Response.total_pages -ge 0) -Message "$ScenarioName response has total_pages >= 0"
    Assert-True -Condition ($null -ne $Response.llm_latency_ms -and [long]$Response.llm_latency_ms -ge 0) -Message "$ScenarioName response has llm_latency_ms >= 0"
    Assert-True -Condition ($null -ne $Response.search_latency_ms -and [long]$Response.search_latency_ms -ge 0) -Message "$ScenarioName response has search_latency_ms >= 0"
    Assert-True -Condition ($null -ne $Response.latency_ms -and [long]$Response.latency_ms -ge 0) -Message "$ScenarioName response has latency_ms >= 0"
    Assert-True -Condition ([int]$Response.size -eq $ExpectedSize) -Message "$ScenarioName response size is $ExpectedSize"
    Assert-True -Condition ([int]$Response.search_plan.size -eq $ExpectedSize) -Message "$ScenarioName search_plan.size is $ExpectedSize"

    $events = Get-EventsArray -Response $Response
    Assert-True -Condition ($events.Count -le $ExpectedSize) -Message "$ScenarioName returns at most $ExpectedSize events"

    if ([long]$Response.total -gt 0) {
        Assert-True -Condition ($events.Count -gt 0) -Message "$ScenarioName returns at least one event when total > 0"
        Assert-True -Condition (-not [string]::IsNullOrWhiteSpace($events[0].event_id)) -Message "$ScenarioName maps Elasticsearch _id to non-blank event_id"
    }
}

function Invoke-NaturalLanguageSearch {
    param(
        [string]$Question,
        [int]$Page = 0,
        [int]$Size = 5
    )

    $body = @{
        question = $Question
        page = $Page
        size = $Size
    }

    return Invoke-Json -Method Post -Uri "$BackendUrl/api/v1/search" -Body $body
}

Write-Host "Running Day 04 smoke test..."
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
Assert-True -Condition ($paths -contains "/api/v1/search/plan") -Message "OpenAPI still exposes POST /api/v1/search/plan"

$failedLoginSearch = Invoke-NaturalLanguageSearch -Question "Show me failed login attempts from China in the last 24h" -Size 5
Assert-True -Condition ([long]$failedLoginSearch.total -gt 0) -Message "Natural language failed_login China 24h returns total > 0: $($failedLoginSearch.total)"
Assert-SearchResponseShape -Response $failedLoginSearch -ExpectedSize 5 -ScenarioName "failed_login China 24h"
Write-Pass "Natural language endpoint works with mock provider and no LLM_API_KEY requirement"

$criticalSearch = Invoke-NaturalLanguageSearch -Question "Tìm alert critical trong 7 ngày qua" -Size 5
Assert-True -Condition ([long]$criticalSearch.total -gt 0) -Message "Natural language critical 7 days returns total > 0: $($criticalSearch.total)"
Assert-SearchResponseShape -Response $criticalSearch -ExpectedSize 5 -ScenarioName "critical 7 days"

$malwareSearch = Invoke-NaturalLanguageSearch -Question "Tìm malware detected trong 7 ngày qua" -Size 5
Assert-True -Condition ([long]$malwareSearch.total -gt 0) -Message "Natural language malware detected 7 days returns total > 0: $($malwareSearch.total)"
Assert-SearchResponseShape -Response $malwareSearch -ExpectedSize 5 -ScenarioName "malware detected 7 days"

$noResultBody = @{
    mode = "search"
    filters = @{
        user = "definitely.no.such.user"
    }
    page = 0
    size = 5
}
$noResultSearch = Invoke-Json -Method Post -Uri "$BackendUrl/api/v1/search/plan" -Body $noResultBody
$noResultEvents = Get-EventsArray -Response $noResultSearch
Assert-True -Condition ([long]$noResultSearch.total -eq 0) -Message "No-result SearchPlan returns total = 0"
Assert-True -Condition ($noResultEvents.Count -eq 0) -Message "No-result SearchPlan returns events = []"

$blankQuestionBody = @{
    question = " "
    page = 0
    size = 5
}
Assert-HttpStatus -Method Post -Uri "$BackendUrl/api/v1/search" -Body $blankQuestionBody -ExpectedStatusCodes @(400) | Out-Null
Write-Pass "Blank natural language question returns 400"

$invalidSizeBody = @{
    question = "failed login china"
    page = 0
    size = 101
}
Assert-HttpStatus -Method Post -Uri "$BackendUrl/api/v1/search" -Body $invalidSizeBody -ExpectedStatusCodes @(400) | Out-Null
Write-Pass "Natural language search size > 100 returns 400"

$elapsed = ((Get-Date) - $startedAt).TotalMilliseconds
Write-Host ""
Write-Host ("Day 04 smoke test passed in {0:N0} ms." -f $elapsed) -ForegroundColor Green
