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
        $json = $Body | ConvertTo-Json -Depth 20
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

    $json = if ($null -ne $Body) { $Body | ConvertTo-Json -Depth 20 } else { $null }

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

function Assert-SearchResponse {
    param(
        [object]$Response,
        [int]$ExpectedMaxEvents,
        [string]$ScenarioName
    )

    Assert-True -Condition ($null -ne $Response.generated_dsl) -Message "$ScenarioName response contains generated_dsl"
    Assert-True -Condition ($Response.generated_dsl -isnot [string]) -Message "$ScenarioName generated_dsl is a JSON object, not a string"
    Assert-True -Condition ($null -ne $Response.total_pages -and [long]$Response.total_pages -ge 0) -Message "$ScenarioName response has total_pages >= 0"

    $events = @($Response.events)
    Assert-True -Condition ($events.Count -le $ExpectedMaxEvents) -Message "$ScenarioName returns at most $ExpectedMaxEvents events"

    if ($Response.total -gt 0) {
        Assert-True -Condition ($events.Count -gt 0) -Message "$ScenarioName returns at least one event when total > 0"
        Assert-True -Condition (-not [string]::IsNullOrWhiteSpace($events[0].event_id)) -Message "$ScenarioName maps Elasticsearch _id to non-blank event_id"
    }
}

Write-Host "Running Day 03 smoke test..."
Write-Host "Backend: $BackendUrl"
Write-Host "Elasticsearch: $ElasticsearchUrl"
Write-Host "Index: $Index"

$backendHealth = Invoke-Json -Uri "$BackendUrl/api/v1/health/live"
Assert-True -Condition ($backendHealth.status -eq "UP") -Message "Backend health API is UP"

$clusterHealth = Invoke-Json -Uri "$ElasticsearchUrl/_cluster/health?wait_for_status=yellow&timeout=30s"
Assert-True -Condition ($clusterHealth.status -in @("green", "yellow")) -Message "Elasticsearch health is $($clusterHealth.status)"

$openApi = Invoke-Json -Uri "$BackendUrl/v3/api-docs"
$paths = @($openApi.paths.PSObject.Properties.Name)
Assert-True -Condition ($paths -contains "/api/v1/search/plan") -Message "OpenAPI exposes POST /api/v1/search/plan"
Assert-True -Condition ($paths -contains "/api/v1/events/{event_id}") -Message "OpenAPI exposes GET /api/v1/events/{event_id}"

$failedLoginBody = @{
    mode = "search"
    filters = @{
        timestamp = @{
            from = "now-24h"
            to = "now"
        }
        event_type = @("failed_login")
        country_code = @("CN")
    }
    page = 0
    size = 5
}
$failedLoginSearch = Invoke-Json -Method Post -Uri "$BackendUrl/api/v1/search/plan" -Body $failedLoginBody
Assert-True -Condition ($failedLoginSearch.total -gt 0) -Message "Search failed_login from CN in the last 24h returns total > 0: $($failedLoginSearch.total)"
Assert-SearchResponse -Response $failedLoginSearch -ExpectedMaxEvents 5 -ScenarioName "failed_login CN 24h"

$messageSearchBody = @{
    mode = "search"
    filters = @{
        timestamp = @{
            from = "now-7d"
            to = "now"
        }
    }
    message_query = "malware detected"
    page = 0
    size = 5
}
$messageSearch = Invoke-Json -Method Post -Uri "$BackendUrl/api/v1/search/plan" -Body $messageSearchBody
Assert-True -Condition ($messageSearch.total -gt 0) -Message "Search message_query 'malware detected' returns total > 0: $($messageSearch.total)"
Assert-SearchResponse -Response $messageSearch -ExpectedMaxEvents 5 -ScenarioName "message_query malware detected"

$invalidSearchBody = @{
    mode = "search"
    filters = @{}
    page = 0
    size = 101
}
Assert-HttpStatus -Method Post -Uri "$BackendUrl/api/v1/search/plan" -Body $invalidSearchBody -ExpectedStatusCodes @(400) | Out-Null
Write-Pass "Invalid SearchPlan size > 100 returns 400"

$eventId = @($failedLoginSearch.events)[0].event_id
$encodedEventId = [uri]::EscapeDataString($eventId)
$eventDetail = Invoke-Json -Uri "$BackendUrl/api/v1/events/$encodedEventId"
Assert-True -Condition ($eventDetail.event_id -eq $eventId) -Message "Event detail preserves event_id from search response"
Assert-True -Condition ($eventDetail.index_name -eq $Index) -Message "Event detail returns index_name '$Index'"
Assert-True -Condition (-not [string]::IsNullOrWhiteSpace($eventDetail.raw)) -Message "Event detail returns raw log"

$elapsed = ((Get-Date) - $startedAt).TotalMilliseconds
Write-Host ""
Write-Host ("Day 03 smoke test passed in {0:N0} ms." -f $elapsed) -ForegroundColor Green
