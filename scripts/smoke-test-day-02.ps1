param(
    [string]$ElasticsearchUrl = "http://localhost:9200",
    [string]$BackendUrl = "http://localhost:8081",
    [string]$Index = "soc-events-v1"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ElasticsearchUrl = $ElasticsearchUrl.TrimEnd("/")
$BackendUrl = $BackendUrl.TrimEnd("/")
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

function Get-Count {
    param([object]$Query)

    if ($null -eq $Query) {
        return (Invoke-RestMethod -Uri "$ElasticsearchUrl/$Index/_count").count
    }

    return (Invoke-Json -Method Post -Uri "$ElasticsearchUrl/$Index/_count" -Body $Query).count
}

function Get-TermCount {
    param(
        [string]$Field,
        [string]$Value
    )

    $query = @{
        query = @{
            term = @{
                $Field = $Value
            }
        }
    }

    return Get-Count -Query $query
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

function New-SmokeEvent {
    param(
        [string]$EventType,
        [string]$Severity,
        [string]$Message,
        [string]$User = "smoke.user",
        [string]$HostName = "smoke-host-01",
        [string]$Ip = "203.0.113.250",
        [string]$CountryCode = "CN",
        [string]$Source = "windows-auth"
    )

    $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

    return [ordered]@{
        timestamp = $timestamp
        source = $Source
        severity = $Severity
        event_type = $EventType
        user = $User
        host = $HostName
        ip = $Ip
        country_code = $CountryCode
        message = $Message
        raw = "ts=$timestamp source=$Source event_type=$EventType severity=$Severity user=$User host=$HostName ip=$Ip country_code=$CountryCode message=""$Message"" synthetic=true smoke=true"
    }
}

Write-Host "Running Day 02 smoke test..."
Write-Host "Elasticsearch: $ElasticsearchUrl"
Write-Host "Backend: $BackendUrl"
Write-Host "Index: $Index"

$clusterHealth = Invoke-RestMethod -Uri "$ElasticsearchUrl/_cluster/health?wait_for_status=yellow&timeout=30s"
Assert-True -Condition ($clusterHealth.status -in @("green", "yellow")) -Message "Elasticsearch health is $($clusterHealth.status)"

Assert-HttpStatus -Method Head -Uri "$ElasticsearchUrl/$Index" -ExpectedStatusCodes @(200) | Out-Null
Write-Pass "Elasticsearch index '$Index' exists"

$mapping = Invoke-RestMethod -Uri "$ElasticsearchUrl/$Index/_mapping"
$properties = $mapping.$Index.mappings.properties
$requiredFields = @("timestamp", "source", "severity", "event_type", "user", "host", "ip", "country_code", "message", "raw")
foreach ($field in $requiredFields) {
    Assert-True -Condition ($null -ne $properties.$field) -Message "Mapping contains field '$field'"
}
Assert-True -Condition ($properties.raw.index -eq $false) -Message "Mapping keeps raw but disables raw indexing"

$backendHealth = Invoke-RestMethod -Uri "$BackendUrl/api/v1/health/live"
Assert-True -Condition ($backendHealth.status -eq "UP") -Message "Backend health API is UP"

$totalCount = Get-Count -Query $null
Assert-True -Condition ($totalCount -gt 0) -Message "Index has at least one document: $totalCount"

$failedLoginCn24hQuery = @{
    query = @{
        bool = @{
            filter = @(
                @{ term = @{ event_type = "failed_login" } },
                @{ term = @{ country_code = "CN" } },
                @{ range = @{ timestamp = @{ gte = "now-24h" } } }
            )
        }
    }
}
$failedLoginCn24hCount = Get-Count -Query $failedLoginCn24hQuery
Assert-True -Condition ($failedLoginCn24hCount -gt 0) -Message "Dataset has failed_login from CN in the last 24h: $failedLoginCn24hCount"

$severityAggregationQuery = @{
    size = 0
    aggs = @{
        by_severity = @{
            terms = @{
                field = "severity"
                size = 10
            }
        }
    }
}
$severityAggregation = Invoke-Json -Method Post -Uri "$ElasticsearchUrl/$Index/_search" -Body $severityAggregationQuery
$severityBuckets = @($severityAggregation.aggregations.by_severity.buckets)
Assert-True -Condition ($severityBuckets.Count -gt 0) -Message "Severity aggregation returns buckets"
foreach ($severity in @("low", "medium", "high", "critical")) {
    $bucket = $severityBuckets | Where-Object { $_.key -eq $severity } | Select-Object -First 1
    Assert-True -Condition ($null -ne $bucket -and $bucket.doc_count -gt 0) -Message "Severity aggregation contains '$severity'"
}

$topIpQuery = @{
    size = 0
    aggs = @{
        top_ip = @{
            terms = @{
                field = "ip"
                size = 5
            }
        }
    }
}
$topIp = Invoke-Json -Method Post -Uri "$ElasticsearchUrl/$Index/_search" -Body $topIpQuery
$topIpBuckets = @($topIp.aggregations.top_ip.buckets)
Assert-True -Condition ($topIpBuckets.Count -gt 0) -Message "Top IP aggregation returns buckets"
Assert-True -Condition ($topIpBuckets[0].doc_count -gt 1) -Message "Top IP has repeated events: $($topIpBuckets[0].key) = $($topIpBuckets[0].doc_count)"

$messageQuery = @{
    query = @{
        match_phrase = @{
            message = "malware detected"
        }
    }
}
$messageCount = Get-Count -Query $messageQuery
Assert-True -Condition ($messageCount -gt 0) -Message "Full-text message search finds 'malware detected': $messageCount"

foreach ($eventType in @("firewall_block", "privilege_escalation", "account_lockout")) {
    $scenarioCount = Get-TermCount -Field "event_type" -Value $eventType
    Assert-True -Condition ($scenarioCount -gt 0) -Message "Dataset contains scenario '$eventType': $scenarioCount"
}

$singleEvent = New-SmokeEvent `
    -EventType "failed_login" `
    -Severity "high" `
    -Message "Smoke test single ingest failed login from CN"
$singleResponse = Assert-HttpStatus -Method Post -Uri "$BackendUrl/api/v1/events" -Body $singleEvent -ExpectedStatusCodes @(201)
Write-Pass "POST /api/v1/events returns $($singleResponse.StatusCode)"

$bulkBody = @{
    events = @(
        (New-SmokeEvent -EventType "firewall_block" -Severity "medium" -Source "firewall" -Message "Smoke test firewall block for suspicious inbound connection" -User "unknown" -HostName "firewall-edge-01" -Ip "203.0.113.251"),
        (New-SmokeEvent -EventType "privilege_escalation" -Severity "critical" -Source "edr" -Message "Smoke test privilege escalation attempt by admin" -User "admin" -HostName "dc-01" -Ip "10.10.1.15" -CountryCode "VN")
    )
}
$bulkResponse = Assert-HttpStatus -Method Post -Uri "$BackendUrl/api/v1/events/bulk" -Body $bulkBody -ExpectedStatusCodes @(201)
Write-Pass "POST /api/v1/events/bulk returns $($bulkResponse.StatusCode)"

$invalidEvent = New-SmokeEvent `
    -EventType "failed_login" `
    -Severity "urgent" `
    -Message "Smoke test invalid severity"
Assert-HttpStatus -Method Post -Uri "$BackendUrl/api/v1/events" -Body $invalidEvent -ExpectedStatusCodes @(400) | Out-Null
Write-Pass "Invalid single ingest request returns 400"

Invoke-RestMethod -Method Post -Uri "$ElasticsearchUrl/$Index/_refresh" | Out-Null
Write-Pass "Index refresh completed after ingest smoke checks"

$elapsed = ((Get-Date) - $startedAt).TotalMilliseconds
Write-Host ""
Write-Host ("Day 02 smoke test passed in {0:N0} ms." -f $elapsed) -ForegroundColor Green
