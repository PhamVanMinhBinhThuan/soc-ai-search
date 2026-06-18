param(
    [string]$BackendUrl = "http://localhost:8081",
    [string]$FrontendUrl = "http://localhost:3000",
    [string]$ViewerToken = "",
    [string]$AnalystToken = "",
    [string]$AdminToken = "",
    [switch]$RequireTokens
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.Net.Http

$BackendUrl = $BackendUrl.TrimEnd("/")
$FrontendUrl = $FrontendUrl.TrimEnd("/")
$startedAt = Get-Date

function Write-Pass {
    param([string]$Message)
    Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Write-Skip {
    param([string]$Message)
    Write-Host "[SKIP] $Message" -ForegroundColor Yellow
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

function New-AuthHeaders {
    param([string]$Token)

    if ([string]::IsNullOrWhiteSpace($Token)) {
        return @{}
    }

    return @{ Authorization = "Bearer $Token" }
}

function Invoke-Json {
    param(
        [string]$Method = "Get",
        [string]$Uri,
        [hashtable]$Headers = @{},
        [object]$Body = $null
    )

    $parameters = @{
        Method  = $Method
        Uri     = $Uri
        Headers = $Headers
    }

    if ($null -ne $Body) {
        $parameters.ContentType = "application/json"
        $parameters.Body = ($Body | ConvertTo-Json -Depth 30)
    }

    return Invoke-RestMethod @parameters
}

function Get-HttpStatus {
    param(
        [string]$Method = "Get",
        [string]$Uri,
        [hashtable]$Headers = @{},
        [object]$Body = $null
    )

    $client = [System.Net.Http.HttpClient]::new()
    $request = [System.Net.Http.HttpRequestMessage]::new(
        [System.Net.Http.HttpMethod]::new($Method),
        $Uri
    )

    foreach ($headerName in $Headers.Keys) {
        [void]$request.Headers.TryAddWithoutValidation($headerName, [string]$Headers[$headerName])
    }

    if ($null -ne $Body) {
        $jsonBody = $Body | ConvertTo-Json -Depth 30
        $request.Content = [System.Net.Http.StringContent]::new(
            $jsonBody,
            [System.Text.Encoding]::UTF8,
            "application/json"
        )
    }

    try {
        $response = $client.SendAsync($request).GetAwaiter().GetResult()
        try {
            return [int]$response.StatusCode
        }
        finally {
            $response.Dispose()
        }
    }
    finally {
        $request.Dispose()
        $client.Dispose()
    }
}

function Assert-HttpStatus {
    param(
        [string]$Method = "Get",
        [string]$Uri,
        [int]$ExpectedStatus,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [string]$Message
    )

    $actualStatus = Get-HttpStatus -Method $Method -Uri $Uri -Headers $Headers -Body $Body
    Assert-True -Condition ($actualStatus -eq $ExpectedStatus) -Message "$Message (HTTP $ExpectedStatus)"
}

function SearchPlanBody {
    return [ordered]@{
        mode = "search"
        filters = [ordered]@{
            timestamp = [ordered]@{
                from = "now-30d"
                to = "now"
            }
            event_type = @("failed_login")
            country_code = @("CN")
        }
        aggregation = $null
        message_query = $null
        page = 0
        size = 5
    }
}

function NaturalSearchBody {
    return [ordered]@{
        question = "Show me failed login attempts from China in the last 24h"
        page = 0
        size = 5
    }
}

function FirstEventIdFromSearchPlan {
    param([string]$Token)

    $response = Invoke-Json `
        -Method "Post" `
        -Uri "$BackendUrl/api/v1/search/plan" `
        -Headers (New-AuthHeaders $Token) `
        -Body (SearchPlanBody)

    Assert-True -Condition ($response.mode -eq "search") -Message "SearchPlan endpoint returns mode=search"
    Assert-True -Condition (@($response.events).Count -gt 0) -Message "SearchPlan endpoint returns at least one event for RBAC detail checks"
    $eventId = [string]$response.events[0].event_id
    Assert-True -Condition (-not [string]::IsNullOrWhiteSpace($eventId)) -Message "Search result contains non-blank event_id"
    return $eventId
}

function CreateQueryId {
    param([string]$Token)

    $response = Invoke-Json `
        -Method "Post" `
        -Uri "$BackendUrl/api/v1/search" `
        -Headers (New-AuthHeaders $Token) `
        -Body (NaturalSearchBody)

    $queryId = [string]$response.query_id
    Assert-True -Condition (-not [string]::IsNullOrWhiteSpace($queryId)) -Message "Natural language search returns query_id for CSV replay"
    return $queryId
}

function Assert-AuthRole {
    param(
        [string]$Token,
        [string]$ExpectedRole
    )

    $authMe = Invoke-Json -Uri "$BackendUrl/api/v1/auth/me" -Headers (New-AuthHeaders $Token)
    Assert-True -Condition ($authMe.authenticated -eq $true) -Message "/api/v1/auth/me returns authenticated=true for $ExpectedRole"
    Assert-True -Condition (@($authMe.roles) -contains $ExpectedRole) -Message "/api/v1/auth/me includes role $ExpectedRole"
}

Write-Host "Running Day 09 RBAC smoke test..."
Write-Host "Backend: $BackendUrl"
Write-Host "Frontend: $FrontendUrl"

if ($RequireTokens -and (
        [string]::IsNullOrWhiteSpace($ViewerToken) -or
        [string]::IsNullOrWhiteSpace($AnalystToken) -or
        [string]::IsNullOrWhiteSpace($AdminToken))) {
    throw "[FAIL] -RequireTokens was specified, but ViewerToken, AnalystToken and AdminToken were not all provided."
}

$backendHealth = Invoke-Json -Uri "$BackendUrl/api/v1/health/live"
Assert-True -Condition ($backendHealth.status -eq "UP") -Message "Backend health API is UP"

$frontend = Invoke-WebRequest -Uri $FrontendUrl -UseBasicParsing
Assert-True -Condition ($frontend.StatusCode -eq 200) -Message "Frontend returns HTTP 200"
Assert-True -Condition ($frontend.Content -match "<html|<div id=`"root`"") -Message "Frontend returns Vite HTML shell"

$openApi = Invoke-Json -Uri "$BackendUrl/v3/api-docs"
$paths = @($openApi.paths.PSObject.Properties.Name)
@(
    "/api/v1/auth/me",
    "/api/v1/search",
    "/api/v1/search/plan",
    "/api/v1/events/{event_id}",
    "/api/v1/search/history",
    "/api/v1/audit-logs",
    "/api/v1/search/{queryId}/export.csv"
) | ForEach-Object {
    Assert-True -Condition ($paths -contains $_) -Message "OpenAPI exposes $_"
}

$authMeNoTokenStatus = Get-HttpStatus -Uri "$BackendUrl/api/v1/auth/me"
if ($authMeNoTokenStatus -eq 401) {
    Write-Pass "Auth is enabled; /api/v1/auth/me without token returns HTTP 401"
    Assert-HttpStatus `
        -Method "Post" `
        -Uri "$BackendUrl/api/v1/search/plan" `
        -ExpectedStatus 401 `
        -Body (SearchPlanBody) `
        -Message "Business endpoint without token is rejected when auth is enabled"
}
elseif ($authMeNoTokenStatus -eq 200) {
    Write-Skip "Auth appears disabled; no-token business endpoint 401 check is not applicable."
}
else {
    throw "[FAIL] Unexpected /api/v1/auth/me no-token status: $authMeNoTokenStatus"
}

if (
    [string]::IsNullOrWhiteSpace($ViewerToken) -and
    [string]::IsNullOrWhiteSpace($AnalystToken) -and
    [string]::IsNullOrWhiteSpace($AdminToken)) {
    Write-Host ""
    Write-Info "No role token was provided. Token-based RBAC checks were skipped."
    Write-Info "Manual token workflow:"
    Write-Info "1. Start Keycloak and frontend with auth enabled."
    Write-Info "2. Log in as viewer.demo, analyst.demo or admin.demo."
    Write-Info "3. Open browser devtools -> Application -> Session Storage."
    Write-Info "4. Find oidc.user:<authority>:soc-ai-search-frontend and copy access_token."
    Write-Info "5. Re-run this script with -ViewerToken/-AnalystToken/-AdminToken."
}

if (-not [string]::IsNullOrWhiteSpace($ViewerToken)) {
    Write-Host ""
    Write-Info "Checking SOC_VIEWER..."
    Assert-AuthRole -Token $ViewerToken -ExpectedRole "SOC_VIEWER"

    $viewerEventId = FirstEventIdFromSearchPlan -Token $ViewerToken
    $viewerDetail = Invoke-Json -Uri "$BackendUrl/api/v1/events/$([uri]::EscapeDataString($viewerEventId))" -Headers (New-AuthHeaders $ViewerToken)
    Assert-True -Condition ($null -eq $viewerDetail.raw -or $viewerDetail.raw_visible -eq $false) -Message "Viewer event detail redacts raw log"

    Assert-HttpStatus -Uri "$BackendUrl/api/v1/search/00000000-0000-4000-8000-000000000001/export.csv" -ExpectedStatus 403 -Headers (New-AuthHeaders $ViewerToken) -Message "Viewer export CSV is forbidden"
    Assert-HttpStatus -Uri "$BackendUrl/api/v1/search/history?page=0&size=5" -ExpectedStatus 403 -Headers (New-AuthHeaders $ViewerToken) -Message "Viewer search history is forbidden"
    Assert-HttpStatus -Uri "$BackendUrl/api/v1/audit-logs?page=0&size=5" -ExpectedStatus 403 -Headers (New-AuthHeaders $ViewerToken) -Message "Viewer audit logs are forbidden"
}

if (-not [string]::IsNullOrWhiteSpace($AnalystToken)) {
    Write-Host ""
    Write-Info "Checking SOC_ANALYST..."
    Assert-AuthRole -Token $AnalystToken -ExpectedRole "SOC_ANALYST"

    $analystEventId = FirstEventIdFromSearchPlan -Token $AnalystToken
    $analystDetail = Invoke-Json -Uri "$BackendUrl/api/v1/events/$([uri]::EscapeDataString($analystEventId))" -Headers (New-AuthHeaders $AnalystToken)
    Assert-True -Condition ($analystDetail.raw_visible -eq $true -and -not [string]::IsNullOrWhiteSpace([string]$analystDetail.raw)) -Message "Analyst event detail includes raw log"

    $analystQueryId = CreateQueryId -Token $AnalystToken
    Assert-HttpStatus -Uri "$BackendUrl/api/v1/search/$analystQueryId/export.csv" -ExpectedStatus 200 -Headers (New-AuthHeaders $AnalystToken) -Message "Analyst export CSV is allowed"
    Assert-HttpStatus -Uri "$BackendUrl/api/v1/search/history?page=0&size=5" -ExpectedStatus 200 -Headers (New-AuthHeaders $AnalystToken) -Message "Analyst search history is allowed"
    Assert-HttpStatus -Uri "$BackendUrl/api/v1/audit-logs?page=0&size=5" -ExpectedStatus 403 -Headers (New-AuthHeaders $AnalystToken) -Message "Analyst audit logs are forbidden"
}

if (-not [string]::IsNullOrWhiteSpace($AdminToken)) {
    Write-Host ""
    Write-Info "Checking SOC_ADMIN..."
    Assert-AuthRole -Token $AdminToken -ExpectedRole "SOC_ADMIN"

    $adminEventId = FirstEventIdFromSearchPlan -Token $AdminToken
    $adminDetail = Invoke-Json -Uri "$BackendUrl/api/v1/events/$([uri]::EscapeDataString($adminEventId))" -Headers (New-AuthHeaders $AdminToken)
    Assert-True -Condition ($adminDetail.raw_visible -eq $true -and -not [string]::IsNullOrWhiteSpace([string]$adminDetail.raw)) -Message "Admin event detail includes raw log through role hierarchy"

    $adminQueryId = CreateQueryId -Token $AdminToken
    Assert-HttpStatus -Uri "$BackendUrl/api/v1/search/$adminQueryId/export.csv" -ExpectedStatus 200 -Headers (New-AuthHeaders $AdminToken) -Message "Admin export CSV is allowed through role hierarchy"
    Assert-HttpStatus -Uri "$BackendUrl/api/v1/audit-logs?page=0&size=5" -ExpectedStatus 200 -Headers (New-AuthHeaders $AdminToken) -Message "Admin audit logs are allowed"
}

$elapsed = ((Get-Date) - $startedAt).TotalMilliseconds
Write-Host ""
Write-Host ("Day 09 RBAC smoke test completed in {0:N0} ms." -f $elapsed) -ForegroundColor Green
