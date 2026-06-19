param(
    [string]$AppUrl = "https://soc-ai-search.app",
    [string]$ApiUrl = "https://api.soc-ai-search.app",
    [string]$AuthUrl = "https://auth.soc-ai-search.app",
    [string]$VpsIp = "178.128.111.251",
    [int]$PortTimeoutMs = 1500
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$AppUrl = $AppUrl.TrimEnd("/")
$ApiUrl = $ApiUrl.TrimEnd("/")
$AuthUrl = $AuthUrl.TrimEnd("/")
$startedAt = Get-Date
$script:CurlCommonArgs = @("--noproxy=*")
$isWindowsRuntime = $env:OS -eq "Windows_NT"
$isWindowsVariable = Get-Variable -Name IsWindows -ErrorAction SilentlyContinue
if ($null -ne $isWindowsVariable) {
    $isWindowsRuntime = $isWindowsRuntime -or [bool]$isWindowsVariable.Value
}
if ($isWindowsRuntime) {
    $script:CurlCommonArgs += "--ssl-no-revoke"
}
$tempDirectory = Join-Path ".tmp" ("day-11-domain-smoke-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tempDirectory | Out-Null

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

function Invoke-CurlStatus {
    param(
        [string]$Uri,
        [string]$ScenarioName,
        [string[]]$ExtraArgs = @()
    )

    $bodyPath = Join-Path $tempDirectory (([guid]::NewGuid().ToString("N")) + ".body")
    $curlArgs = $script:CurlCommonArgs + @(
        "--location",
        "--silent",
        "--show-error",
        "--output", $bodyPath,
        "--write-out", "%{http_code}"
    ) + $ExtraArgs + @($Uri)

    $statusText = & curl @curlArgs
    if ($LASTEXITCODE -ne 0) {
        throw "[FAIL] $ScenarioName curl failed with exit code $LASTEXITCODE"
    }

    $status = [int]([string]$statusText | Select-Object -Last 1)
    Assert-True -Condition ($status -ge 200 -and $status -lt 300) -Message "$ScenarioName returns 2xx ($status)"
    return $status
}

function Test-TcpPortOpen {
    param(
        [string]$HostName,
        [int]$Port,
        [int]$TimeoutMs
    )

    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $asyncResult = $client.BeginConnect($HostName, $Port, $null, $null)
        $connectedInTime = $asyncResult.AsyncWaitHandle.WaitOne($TimeoutMs, $false)

        if (-not $connectedInTime) {
            return $false
        }

        try {
            $client.EndConnect($asyncResult)
        }
        catch {
            return $false
        }

        return $client.Connected
    }
    finally {
        $client.Close()
        $client.Dispose()
    }
}

function Assert-PortClosed {
    param(
        [string]$HostName,
        [int]$Port
    )

    $isOpen = Test-TcpPortOpen -HostName $HostName -Port $Port -TimeoutMs $PortTimeoutMs
    Assert-True -Condition (-not $isOpen) -Message "$HostName`:$Port is not publicly reachable"
}

try {
    Write-Host "Day 11 domain smoke test started at $startedAt"
    Write-Host "AppUrl=$AppUrl"
    Write-Host "ApiUrl=$ApiUrl"
    Write-Host "AuthUrl=$AuthUrl"
    Write-Host "VpsIp=$VpsIp"

    Invoke-CurlStatus -Uri $AppUrl -ScenarioName "Frontend HTTPS" | Out-Null
    Invoke-CurlStatus -Uri "$ApiUrl/api/v1/health/live" -ScenarioName "Backend health HTTPS" | Out-Null
    Invoke-CurlStatus -Uri "$AuthUrl/realms/soc-ai-search/.well-known/openid-configuration" -ScenarioName "Keycloak OIDC configuration HTTPS" | Out-Null

    $headersPath = Join-Path $tempDirectory "cors-preflight.headers"
    $bodyPath = Join-Path $tempDirectory "cors-preflight.body"
    $preflightArgs = $script:CurlCommonArgs + @(
        "--silent",
        "--show-error",
        "--output", $bodyPath,
        "--dump-header", $headersPath,
        "--request", "OPTIONS",
        "--header", "Origin: $AppUrl",
        "--header", "Access-Control-Request-Method: POST",
        "--header", "Access-Control-Request-Headers: authorization,content-type",
        "--write-out", "%{http_code}",
        "$ApiUrl/api/v1/search"
    )
    $preflightStatusText = & curl @preflightArgs

    if ($LASTEXITCODE -ne 0) {
        throw "[FAIL] CORS preflight curl failed with exit code $LASTEXITCODE"
    }

    $preflightStatus = [int]([string]$preflightStatusText | Select-Object -Last 1)
    Assert-True `
        -Condition ($preflightStatus -ge 200 -and $preflightStatus -lt 300) `
        -Message "CORS preflight to POST /api/v1/search returns 2xx ($preflightStatus)"

    $preflightHeaders = Get-Content -Path $headersPath -Raw
    Assert-True `
        -Condition ($preflightHeaders -match "(?im)^access-control-allow-origin:\s*.+") `
        -Message "CORS preflight exposes Access-Control-Allow-Origin"

    foreach ($port in @(3000, 8081, 8082, 9200, 5433, 5601)) {
        Assert-PortClosed -HostName $VpsIp -Port $port
    }

    $duration = (Get-Date) - $startedAt
    Write-Host "Day 11 domain smoke test completed in $([math]::Round($duration.TotalSeconds, 2))s" -ForegroundColor Cyan
}
finally {
    Remove-Item -LiteralPath $tempDirectory -Recurse -Force -ErrorAction SilentlyContinue
}




