param(
    [string]$BackendUrl = "http://localhost:8081",
    [string]$ElasticsearchUrl = "http://localhost:9200",
    [string]$FrontendUrl = "http://localhost:3000",
    [string]$Index = "soc-events-v1"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$BackendUrl = $BackendUrl.TrimEnd("/")
$ElasticsearchUrl = $ElasticsearchUrl.TrimEnd("/")
$FrontendUrl = $FrontendUrl.TrimEnd("/")
$startedAt = Get-Date
$tempDirectory = Join-Path ".tmp" ("day-07-smoke-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tempDirectory | Out-Null

function Get-CurlCommand {
    $command = Get-Command curl.exe -ErrorAction SilentlyContinue | Where-Object { $_.CommandType -eq "Application" } | Select-Object -First 1
    if ($null -eq $command) {
        $command = Get-Command curl -ErrorAction SilentlyContinue | Where-Object { $_.CommandType -eq "Application" } | Select-Object -First 1
    }

    if ($null -eq $command) {
        throw "curl executable not found"
    }

    return $command.Source
}
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
        $json = $Body | ConvertTo-Json -Depth 50
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        return Invoke-RestMethod `
            -Method $Method `
            -Uri $Uri `
            -ContentType "application/json; charset=utf-8" `
            -Body $bytes
    }

    return Invoke-RestMethod -Method $Method -Uri $Uri
}

function Get-Array {
    param([object]$Value)

    if ($null -eq $Value) {
        return ,@()
    }

    return ,@($Value)
}

function Test-HasProperty {
    param(
        [object]$Object,
        [string]$PropertyName
    )

    return $null -ne $Object.PSObject.Properties[$PropertyName]
}

function Assert-SearchSummary {
    param(
        [object]$Response,
        [string]$ScenarioName
    )

    $parsedQueryId = [guid]::Empty
    Assert-True `
        -Condition ([guid]::TryParse([string]$Response.query_id, [ref]$parsedQueryId)) `
        -Message "$ScenarioName returns query_id UUID"
    Assert-True `
        -Condition (-not [string]::IsNullOrWhiteSpace([string]$Response.summary)) `
        -Message "$ScenarioName returns non-blank summary"
    Assert-True `
        -Condition ([string]$Response.summary_source -in @("llm", "fallback")) `
        -Message "$ScenarioName summary_source is llm or fallback"
    Assert-True `
        -Condition ([long]$Response.summary_latency_ms -ge 0) `
        -Message "$ScenarioName summary_latency_ms >= 0"
}

function Invoke-NaturalLanguageSearch {
    param(
        [string]$Question,
        [int]$Page = 0,
        [int]$Size = 10
    )

    return Invoke-Json `
        -Method Post `
        -Uri "$BackendUrl/api/v1/search" `
        -Body @{
            question = $Question
            page = $Page
            size = $Size
        }
}

function Invoke-ExpectedHttpError {
    param(
        [string]$Method,
        [string]$Uri,
        [object]$Body,
        [int]$ExpectedStatus
    )

    try {
        Invoke-Json -Method $Method -Uri $Uri -Body $Body | Out-Null
        throw "Expected HTTP $ExpectedStatus but request succeeded"
    }
    catch {
        $status = 0
        if ($null -ne $_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
        }
        Assert-True `
            -Condition ($status -eq $ExpectedStatus) `
            -Message "$Method $Uri returns HTTP $ExpectedStatus"
    }
}

function Export-CsvWithCurl {
    param(
        [string]$QueryId,
        [string]$Name
    )

    $headersPath = Join-Path $tempDirectory "$Name.headers.txt"
    $csvPath = Join-Path $tempDirectory "$Name.csv"
    $curlCommand = Get-CurlCommand
    & $curlCommand `
        --silent `
        --show-error `
        --fail-with-body `
        -D $headersPath `
        -o $csvPath `
        "$BackendUrl/api/v1/search/$QueryId/export.csv"

    Assert-True -Condition ($LASTEXITCODE -eq 0) -Message "$Name CSV download succeeds"
    Assert-True -Condition (Test-Path $headersPath) -Message "$Name response headers captured"
    Assert-True -Condition (Test-Path $csvPath) -Message "$Name CSV file created"

    $headers = Get-Content -LiteralPath $headersPath -Raw
    Assert-True -Condition ($headers -match "(?im)^content-type:\s*text/csv") -Message "$Name Content-Type is text/csv"
    Assert-True -Condition ($headers -match "(?im)^content-disposition:\s*attachment;") -Message "$Name has attachment Content-Disposition"
    Assert-True -Condition ($headers -match "(?im)^x-export-truncated:\s*(true|false)") -Message "$Name has X-Export-Truncated"

    $bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $csvPath))
    Assert-True `
        -Condition ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) `
        -Message "$Name CSV starts with UTF-8 BOM"

    $reader = [System.IO.StreamReader]::new(
        (Resolve-Path $csvPath),
        [System.Text.Encoding]::UTF8,
        $true
    )
    try {
        $headerLine = $reader.ReadLine()
    }
    finally {
        $reader.Dispose()
    }

    return @{
        CsvPath = $csvPath
        Headers = $headers
        HeaderLine = $headerLine
        Rows = @(Import-Csv -LiteralPath $csvPath -Encoding UTF8)
    }
}

Write-Host "Running Day 07 smoke test..."
Write-Host "Backend: $BackendUrl"
Write-Host "Elasticsearch: $ElasticsearchUrl"
Write-Host "Frontend: $FrontendUrl"
Write-Host "Index: $Index"
Write-Host "Expected LLM provider: mock"

$provider = (& docker compose exec -T backend printenv LLM_PROVIDER 2>$null)
Assert-True `
    -Condition ([string]$provider.Trim() -eq "mock") `
    -Message "Backend container uses LLM_PROVIDER=mock"

$backendHealth = Invoke-Json -Uri "$BackendUrl/api/v1/health/live"
Assert-True -Condition ($backendHealth.status -eq "UP") -Message "Backend health API is UP"

$clusterHealth = Invoke-Json -Uri "$ElasticsearchUrl/_cluster/health?wait_for_status=yellow&timeout=30s"
Assert-True -Condition ($clusterHealth.status -in @("green", "yellow")) -Message "Elasticsearch health is $($clusterHealth.status)"

$indexResponse = Invoke-WebRequest -Uri "$ElasticsearchUrl/$Index" -Method Head -UseBasicParsing
Assert-True -Condition ($indexResponse.StatusCode -eq 200) -Message "Elasticsearch index $Index exists"

$openApi = Invoke-Json -Uri "$BackendUrl/v3/api-docs"
$paths = @($openApi.paths.PSObject.Properties.Name)
Assert-True -Condition ($paths -contains "/api/v1/search/history") -Message "OpenAPI exposes search history"
Assert-True -Condition ($paths -contains "/api/v1/audit-logs") -Message "OpenAPI exposes audit logs"
Assert-True -Condition ($paths -contains "/api/v1/search/{queryId}/export.csv") -Message "OpenAPI exposes CSV export"

$searchQuestion = "Show me failed login attempts from China in the last 24h"
$searchResponse = Invoke-NaturalLanguageSearch -Question $searchQuestion -Size 5
Assert-SearchSummary -Response $searchResponse -ScenarioName "search"
Assert-True -Condition ([string]$searchResponse.mode -eq "search") -Message "Search response mode is search"

$aggregationQuestion = "Top 10 IP có nhiều alert nhất tháng này"
$aggregationResponse = Invoke-NaturalLanguageSearch -Question $aggregationQuestion -Size 5
Assert-SearchSummary -Response $aggregationResponse -ScenarioName "aggregation"
Assert-True -Condition ([string]$aggregationResponse.mode -eq "aggregation") -Message "Aggregation response mode is aggregation"
Assert-True -Condition ($null -ne $aggregationResponse.aggregation_results) -Message "Aggregation response has aggregation_results"

$history = Invoke-Json -Uri "$BackendUrl/api/v1/search/history?page=0&size=100"
Assert-True -Condition ($history.page -eq 0) -Message "History page is zero-based"
Assert-True -Condition ($history.total_pages -ge 0) -Message "History total_pages >= 0"
$historyItems = Get-Array $history.items
$searchHistoryItem = $historyItems | Where-Object { $_.query_id -eq $searchResponse.query_id } | Select-Object -First 1
Assert-True -Condition ($null -ne $searchHistoryItem) -Message "History contains the successful search query"
Assert-True -Condition ([string]$searchHistoryItem.status -eq "SUCCESS") -Message "History query status is SUCCESS"

$audit = Invoke-Json -Uri "$BackendUrl/api/v1/audit-logs?page=0&size=100"
$auditItems = Get-Array $audit.items
$successAudit = $auditItems | Where-Object { $_.query_id -eq $searchResponse.query_id } | Select-Object -First 1
Assert-True -Condition ($null -ne $successAudit) -Message "Audit contains SUCCESS record"
Assert-True -Condition ([string]$successAudit.status -eq "SUCCESS") -Message "Audit success status is SUCCESS"

$unsupportedQuestion = "unsupported audit smoke $([guid]::NewGuid())"
Invoke-ExpectedHttpError `
    -Method Post `
    -Uri "$BackendUrl/api/v1/search" `
    -ExpectedStatus 502 `
    -Body @{
        question = $unsupportedQuestion
        page = 0
        size = 5
    }

$failedAuditResponse = Invoke-Json -Uri "$BackendUrl/api/v1/audit-logs?page=0&size=100"
$failedAudit = (Get-Array $failedAuditResponse.items) |
    Where-Object { $_.question -eq $unsupportedQuestion } |
    Select-Object -First 1
Assert-True -Condition ($null -ne $failedAudit) -Message "Audit contains FAILED record for unsupported question"
Assert-True -Condition ([string]$failedAudit.status -eq "FAILED") -Message "Unsupported question audit status is FAILED"
$failedAuditJson = $failedAudit | ConvertTo-Json -Depth 10 -Compress
Assert-True `
    -Condition ($failedAuditJson -notmatch "(?i)(stacktrace|exception\s+at|api[_ -]?key|AIza)") `
    -Message "FAILED audit does not expose stack trace or secret"

$searchCsv = Export-CsvWithCurl -QueryId $searchResponse.query_id -Name "search"
Assert-True -Condition ($searchCsv.Rows.Count -le 10000) -Message "Search CSV has at most 10,000 data rows"
Assert-True `
    -Condition ([string]$searchCsv.HeaderLine -eq "event_id,timestamp,source,severity,event_type,user,host,ip,country_code,message") `
    -Message "Search CSV has exact MVP header"
Assert-True -Condition ([string]$searchCsv.HeaderLine -notmatch "(^|,)raw(,|$)") -Message "Search CSV excludes raw column"

$aggregationCsv = Export-CsvWithCurl -QueryId $aggregationResponse.query_id -Name "aggregation"
Assert-True `
    -Condition ([string]$aggregationCsv.HeaderLine -eq "key,value") `
    -Message "Aggregation CSV has exact key,value header"

$unknownId = [guid]::NewGuid()
try {
    Invoke-WebRequest `
        -Uri "$BackendUrl/api/v1/search/$unknownId/export.csv" `
        -UseBasicParsing | Out-Null
    throw "Expected unknown query_id export to fail"
}
catch {
    $status = 0
    if ($null -ne $_.Exception.Response) {
        $status = [int]$_.Exception.Response.StatusCode
    }
    Assert-True -Condition ($status -eq 404) -Message "Unknown query_id export returns HTTP 404"
}

$frontend = Invoke-WebRequest -Uri $FrontendUrl -UseBasicParsing
Assert-True -Condition ($frontend.StatusCode -eq 200) -Message "Frontend URL returns HTTP 200"
Assert-True -Condition (Test-Path "frontend/dist/index.html") -Message "Frontend build artifact exists"

$elapsed = ((Get-Date) - $startedAt).TotalMilliseconds
Write-Host ""
Write-Host ("Day 07 smoke test passed in {0:N0} ms." -f $elapsed) -ForegroundColor Green
Write-Host "Temporary CSV evidence: $tempDirectory"
Write-Host "To restore Gemini after this deterministic checkpoint, clear the shell override and recreate backend from .env:"
Write-Host "Remove-Item Env:LLM_PROVIDER -ErrorAction SilentlyContinue"
Write-Host "docker compose up -d --build --force-recreate backend"
