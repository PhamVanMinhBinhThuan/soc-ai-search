param(
    [string]$BackendUrl = "http://localhost:8081",
    [string]$FrontendUrl = "http://localhost:3000",
    [string]$ElasticsearchUrl = "http://localhost:9200",
    [string]$Index = "soc-events-v1",
    [switch]$RequireFullRegression
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$BackendUrl = $BackendUrl.TrimEnd("/")
$FrontendUrl = $FrontendUrl.TrimEnd("/")
$ElasticsearchUrl = $ElasticsearchUrl.TrimEnd("/")
$startedAt = Get-Date
$skippedChecks = New-Object System.Collections.Generic.List[string]

function Write-Pass {
    param([string]$Message)
    Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Write-Skip {
    param([string]$Message)
    Write-Host "[SKIP] $Message" -ForegroundColor Yellow
    $script:skippedChecks.Add($Message)
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
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
        [string]$Uri,
        [string]$Method = "Get"
    )

    return Invoke-RestMethod -Uri $Uri -Method $Method
}

function Get-HttpStatus {
    param([string]$Uri)

    try {
        $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing
        return [int]$response.StatusCode
    }
    catch {
        if ($null -ne $_.Exception.Response) {
            return [int]$_.Exception.Response.StatusCode
        }

        throw
    }
}

function Get-BackendContainerEnv {
    param([string]$Name)

    try {
        $value = (& docker compose exec -T backend printenv $Name 2>$null)
        if ($LASTEXITCODE -ne 0) {
            return $null
        }

        return [string]$value.Trim()
    }
    catch {
        return $null
    }
}

function Invoke-SmokeScript {
    param(
        [string]$Name,
        [string]$Path,
        [hashtable]$Parameters = @{},
        [string]$SkipReason = ""
    )

    if (-not [string]::IsNullOrWhiteSpace($SkipReason)) {
        Write-Skip "$Name skipped: $SkipReason"
        return
    }

    Assert-True -Condition (Test-Path -LiteralPath $Path) -Message "$Name script exists"
    Write-Host ""
    Write-Info "Running $Name..."
    & $Path @Parameters
    Assert-True -Condition ($?) -Message "$Name completed"
}

Write-Host "Running Day 10 smoke regression..."
Write-Host "Backend: $BackendUrl"
Write-Host "Frontend: $FrontendUrl"
Write-Host "Elasticsearch: $ElasticsearchUrl"
Write-Host "Index: $Index"

$backendHealth = Invoke-Json -Uri "$BackendUrl/api/v1/health/live"
Assert-True -Condition ($backendHealth.status -eq "UP") -Message "Backend health API is UP"

$clusterHealth = Invoke-Json -Uri "$ElasticsearchUrl/_cluster/health?wait_for_status=yellow&timeout=30s"
Assert-True `
    -Condition ($clusterHealth.status -in @("green", "yellow")) `
    -Message "Elasticsearch health is $($clusterHealth.status)"

$frontend = Invoke-WebRequest -Uri $FrontendUrl -UseBasicParsing
Assert-True -Condition ($frontend.StatusCode -eq 200) -Message "Frontend returns HTTP 200"

$authMeStatus = Get-HttpStatus -Uri "$BackendUrl/api/v1/auth/me"
$authEnabled = $authMeStatus -eq 401
$llmProvider = Get-BackendContainerEnv -Name "LLM_PROVIDER"
$mockProviderReady = $null -ne $llmProvider -and $llmProvider -eq "mock"

if ($authEnabled) {
    Write-Info "Backend auth appears enabled; legacy no-token smoke scripts will be skipped."
}
else {
    Write-Pass "Backend auth appears disabled for no-token smoke scripts"
}

if ($mockProviderReady) {
    Write-Pass "Backend container uses LLM_PROVIDER=mock"
}
elseif ($null -eq $llmProvider) {
    Write-Skip "Could not read backend container LLM_PROVIDER; LLM-dependent smoke scripts may be skipped"
}
else {
    Write-Skip "Backend container LLM_PROVIDER is '$llmProvider', not 'mock'"
}

$commonParams = @{
    BackendUrl = $BackendUrl
    ElasticsearchUrl = $ElasticsearchUrl
    Index = $Index
}
$frontendParams = @{
    BackendUrl = $BackendUrl
    ElasticsearchUrl = $ElasticsearchUrl
    FrontendUrl = $FrontendUrl
    Index = $Index
}

$legacySkipReason = if ($authEnabled) {
    "backend auth is enabled and this script does not accept a token"
}
else {
    ""
}
$llmSkipReason = if (-not $mockProviderReady) {
    "backend LLM_PROVIDER is not confirmed as mock"
}
else {
    $legacySkipReason
}

Invoke-SmokeScript `
    -Name "Day 02 dataset pattern smoke" `
    -Path ".\scripts\smoke-test-day-02.ps1" `
    -Parameters $commonParams `
    -SkipReason $legacySkipReason

Invoke-SmokeScript `
    -Name "Day 03 search/detail smoke" `
    -Path ".\scripts\smoke-test-day-03.ps1" `
    -Parameters $commonParams `
    -SkipReason $legacySkipReason

Invoke-SmokeScript `
    -Name "Day 04 natural language search smoke" `
    -Path ".\scripts\smoke-test-day-04.ps1" `
    -Parameters $commonParams `
    -SkipReason $llmSkipReason

Invoke-SmokeScript `
    -Name "Day 05 aggregation smoke" `
    -Path ".\scripts\smoke-test-day-05.ps1" `
    -Parameters $commonParams `
    -SkipReason $llmSkipReason

Invoke-SmokeScript `
    -Name "Day 07 summary/history/export smoke" `
    -Path ".\scripts\smoke-test-day-07.ps1" `
    -Parameters $frontendParams `
    -SkipReason $llmSkipReason

$day08Params = @{
    BackendUrl = $BackendUrl
    FrontendUrl = $FrontendUrl
}
if ($authEnabled) {
    $day08Params.AuthEnabled = $true
}
Invoke-SmokeScript `
    -Name "Day 08 auth foundation smoke" `
    -Path ".\scripts\smoke-test-day-08.ps1" `
    -Parameters $day08Params

Invoke-SmokeScript `
    -Name "Day 09 RBAC no-token smoke" `
    -Path ".\scripts\smoke-test-day-09-rbac.ps1" `
    -Parameters @{
        BackendUrl = $BackendUrl
        FrontendUrl = $FrontendUrl
    }

if ($RequireFullRegression -and $skippedChecks.Count -gt 0) {
    throw "[FAIL] Full regression required, but $($skippedChecks.Count) check(s) were skipped."
}

$elapsed = ((Get-Date) - $startedAt).TotalMilliseconds
Write-Host ""
Write-Host ("Day 10 smoke regression completed in {0:N0} ms." -f $elapsed) -ForegroundColor Green
if ($skippedChecks.Count -gt 0) {
    Write-Host "Skipped checks:" -ForegroundColor Yellow
    $skippedChecks | ForEach-Object { Write-Host "- $_" -ForegroundColor Yellow }
    Write-Host "Use -RequireFullRegression to fail when any smoke script is skipped." -ForegroundColor Yellow
}
