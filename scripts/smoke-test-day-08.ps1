param(
    [string]$BackendUrl = "http://localhost:8081",
    [string]$FrontendUrl = "http://localhost:3000",
    [string]$KeycloakAuthority = "http://localhost:8082/realms/soc-ai-search",
    [switch]$AuthEnabled,
    [string]$AccessToken = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$BackendUrl = $BackendUrl.TrimEnd("/")
$FrontendUrl = $FrontendUrl.TrimEnd("/")
$KeycloakAuthority = $KeycloakAuthority.TrimEnd("/")
$startedAt = Get-Date

function Write-Pass {
    param([string]$Message)
    Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Write-Skip {
    param([string]$Message)
    Write-Host "[SKIP] $Message" -ForegroundColor Yellow
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
        [hashtable]$Headers = @{}
    )

    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers
}

function Invoke-ExpectedHttpStatus {
    param(
        [string]$Uri,
        [int]$ExpectedStatus
    )

    try {
        Invoke-WebRequest -Uri $Uri -UseBasicParsing | Out-Null
        throw "Expected HTTP $ExpectedStatus but request succeeded"
    }
    catch {
        $status = 0
        if ($null -ne $_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
        }
        Assert-True -Condition ($status -eq $ExpectedStatus) -Message "$Uri returns HTTP $ExpectedStatus"
    }
}

Write-Host "Running Day 08 smoke test..."
Write-Host "Backend: $BackendUrl"
Write-Host "Frontend: $FrontendUrl"
Write-Host "Keycloak authority: $KeycloakAuthority"
Write-Host "Auth enabled expectation: $($AuthEnabled.IsPresent)"

$backendHealth = Invoke-Json -Uri "$BackendUrl/api/v1/health/live"
Assert-True -Condition ($backendHealth.status -eq "UP") -Message "Backend health API is UP"

$frontend = Invoke-WebRequest -Uri $FrontendUrl -UseBasicParsing
Assert-True -Condition ($frontend.StatusCode -eq 200) -Message "Frontend returns HTTP 200"
Assert-True -Condition ($frontend.Content -match "<html|<div id=`"root`"") -Message "Frontend returns HTML shell"

try {
    $keycloakConfig = Invoke-Json -Uri "$KeycloakAuthority/.well-known/openid-configuration"
    Assert-True -Condition ([string]$keycloakConfig.issuer -eq $KeycloakAuthority) -Message "Keycloak realm endpoint is reachable"
}
catch {
    Write-Skip "Keycloak realm endpoint is not reachable; start it with docker compose --profile auth up -d keycloak"
}

$openApi = Invoke-Json -Uri "$BackendUrl/v3/api-docs"
$paths = @($openApi.paths.PSObject.Properties.Name)
Assert-True -Condition ($paths -contains "/api/v1/auth/me") -Message "OpenAPI exposes /api/v1/auth/me"

if ($AuthEnabled) {
    if ([string]::IsNullOrWhiteSpace($AccessToken)) {
        Invoke-ExpectedHttpStatus -Uri "$BackendUrl/api/v1/auth/me" -ExpectedStatus 401
        Write-Skip "No AccessToken provided; skipping authenticated /auth/me check"
    }
    else {
        $authMe = Invoke-Json `
            -Uri "$BackendUrl/api/v1/auth/me" `
            -Headers @{ Authorization = "Bearer $AccessToken" }
        Assert-True -Condition ($authMe.authenticated -eq $true) -Message "Authenticated /auth/me returns authenticated=true"
        Assert-True -Condition (-not [string]::IsNullOrWhiteSpace([string]$authMe.identity)) -Message "Authenticated /auth/me returns identity"
        Assert-True -Condition (@($authMe.roles).Count -gt 0) -Message "Authenticated /auth/me returns roles"
    }
}
else {
    $authMe = Invoke-Json -Uri "$BackendUrl/api/v1/auth/me"
    Assert-True -Condition ($authMe.authenticated -eq $true) -Message "Auth-disabled /auth/me returns authenticated=true"
    Assert-True -Condition ([string]$authMe.identity -eq "demo-analyst") -Message "Auth-disabled /auth/me returns demo identity"
    Assert-True -Condition (@($authMe.roles) -contains "SOC_ANALYST") -Message "Auth-disabled /auth/me returns SOC_ANALYST role"
}

$elapsed = ((Get-Date) - $startedAt).TotalMilliseconds
Write-Host ""
Write-Host ("Day 08 smoke test passed in {0:N0} ms." -f $elapsed) -ForegroundColor Green
