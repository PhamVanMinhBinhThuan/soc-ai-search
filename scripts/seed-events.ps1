param(
    [int]$Count = 10000,
    [int]$BatchSize = 1000,
    [int]$Seed = 20260604,
    [string]$BaseTimeUtc,
    [string]$ElasticsearchUrl = "http://localhost:9200",
    [string]$Index = "soc-events-v1",
    [switch]$GenerateOnly,
    [string]$OutputPath = "generated-data/events.ndjson",
    [string]$SeedFromFile
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ElasticsearchUrl = $ElasticsearchUrl.TrimEnd('/')
$culture = [System.Globalization.CultureInfo]::InvariantCulture
$dateStyles = [System.Globalization.DateTimeStyles]::AssumeUniversal

if ($BatchSize -lt 1) {
    throw "BatchSize must be greater than 0."
}

if ($Count -lt 1 -and [string]::IsNullOrWhiteSpace($SeedFromFile)) {
    throw "Count must be greater than 0."
}

if ($GenerateOnly -and -not [string]::IsNullOrWhiteSpace($SeedFromFile)) {
    throw "Use GenerateOnly or SeedFromFile, not both."
}

if ([string]::IsNullOrWhiteSpace($BaseTimeUtc)) {
    $baseTime = [System.DateTimeOffset]::UtcNow
}
else {
    $baseTime = [System.DateTimeOffset]::Parse($BaseTimeUtc, $culture, $dateStyles).ToUniversalTime()
}

$random = [System.Random]::new($Seed)
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

$users = @("admin", "vpn.user", "finance.user", "svc.backup", "alice", "bob", "analyst1", "guest01", "jdoe")
$hosts = @("dc-01", "vpn-gw-01", "finance-ws-07", "endpoint-014", "endpoint-023", "proxy-01", "dns-01", "srv-app-02")
$countries = @("VN", "CN", "US", "RU", "SG", "DE")
$attackerIps = @("203.0.113.45", "203.0.113.77", "203.0.113.88", "198.51.100.200", "192.0.2.88")
$normalIps = @("10.10.1.15", "10.10.2.24", "10.20.5.33", "172.16.10.42", "192.168.20.55")

$counters = [ordered]@{
    failed_login_cn_24h = 0
    malware_critical = 0
    repeated_attacker_ip_events = 0
    firewall_block = 0
    privilege_escalation = 0
    account_lockout = 0
    suspicious_outbound = 0
    data_exfiltration = 0
}

function Get-Choice {
    param(
        [System.Random]$Random,
        [object[]]$Values
    )

    return $Values[$Random.Next(0, $Values.Count)]
}

function Get-WeightedChoice {
    param(
        [System.Random]$Random,
        [object[]]$Values,
        [int[]]$Weights
    )

    if ($Values.Count -ne $Weights.Count) {
        throw "Weighted choice values and weights must have the same length."
    }

    $total = 0
    foreach ($weight in $Weights) {
        if ($weight -lt 1) {
            throw "Weights must be positive."
        }
        $total += $weight
    }

    $roll = $Random.Next(1, $total + 1)
    $running = 0
    for ($i = 0; $i -lt $Values.Count; $i++) {
        $running += $Weights[$i]
        if ($roll -le $running) {
            return $Values[$i]
        }
    }

    return $Values[$Values.Count - 1]
}

function Get-CampaignTimestamp {
    param(
        [System.DateTimeOffset]$BaseTime,
        [System.Random]$Random,
        [int[]]$StartsMinutesAgo,
        [int]$WindowMinutes = 30
    )

    $start = Get-Choice -Random $Random -Values $StartsMinutesAgo
    return $BaseTime.AddMinutes(-($start + $Random.Next(0, [Math]::Max(1, $WindowMinutes))))
}

function Format-Template {
    param(
        [string]$Template,
        [string]$User,
        [string]$HostName,
        [string]$Ip,
        [string]$CountryCode,
        [string]$Family = "AgentTesla"
    )

    $message = $Template.Replace("{user}", $User)
    $message = $message.Replace("{host}", $HostName)
    $message = $message.Replace("{ip}", $Ip)
    $message = $message.Replace("{country_code}", $CountryCode)
    $message = $message.Replace("{family}", $Family)
    return $message
}

function Get-FailedLoginSeverity {
    param(
        [System.Random]$Random,
        [string]$User,
        [string]$Ip
    )

    if ($User -eq "admin" -or $User -eq "svc.backup") {
        return Get-WeightedChoice -Random $Random -Values @("critical", "high", "medium") -Weights @(20, 55, 25)
    }

    if ($Ip -eq "203.0.113.45") {
        return Get-WeightedChoice -Random $Random -Values @("critical", "high", "medium") -Weights @(10, 55, 35)
    }

    return Get-WeightedChoice -Random $Random -Values @("high", "medium") -Weights @(45, 55)
}

function Get-IsoUtcTimestamp {
    param([System.DateTimeOffset]$Timestamp)

    return $Timestamp.UtcDateTime.ToString("yyyy-MM-ddTHH:mm:ssZ", $culture)
}

function New-EventObject {
    param(
        [System.DateTimeOffset]$Timestamp,
        [string]$Source,
        [string]$Severity,
        [string]$EventType,
        [string]$User,
        [string]$HostName,
        [string]$Ip,
        [string]$CountryCode,
        [string]$Message
    )

    $timestampText = Get-IsoUtcTimestamp -Timestamp $Timestamp
    $raw = "ts=$timestampText source=$Source event_type=$EventType severity=$Severity user=$User host=$HostName ip=$Ip country_code=$CountryCode message=""$Message"" synthetic=true"

    return [ordered]@{
        event_id = $null
        timestamp = $timestampText
        source = $Source
        severity = $Severity
        event_type = $EventType
        user = $User
        host = $HostName
        ip = $Ip
        country_code = $CountryCode
        message = $Message
        raw = $raw
    }
}

function Add-ScenarioCounters {
    param(
        [System.Collections.IDictionary]$Counters,
        $Event,
        [System.DateTimeOffset]$BaseTime
    )

    $eventTime = [System.DateTimeOffset]::Parse([string]$Event.timestamp, $culture, $dateStyles).ToUniversalTime()

    if ($Event.event_type -eq "failed_login" -and $Event.country_code -eq "CN" -and $eventTime -ge $BaseTime.AddHours(-24)) {
        $Counters["failed_login_cn_24h"]++
    }

    if ($Event.event_type -eq "malware_detected" -and $Event.severity -eq "critical") {
        $Counters["malware_critical"]++
    }

    if ($attackerIps -contains [string]$Event.ip) {
        $Counters["repeated_attacker_ip_events"]++
    }

    if ($Event.event_type -eq "firewall_block") {
        $Counters["firewall_block"]++
    }

    if ($Event.event_type -eq "privilege_escalation") {
        $Counters["privilege_escalation"]++
    }

    if ($Event.event_type -eq "account_lockout") {
        $Counters["account_lockout"]++
    }

    if ($Event.event_type -eq "suspicious_outbound") {
        $Counters["suspicious_outbound"]++
    }

    if ($Event.event_type -eq "data_exfiltration" -or $Event.event_type -eq "large_transfer") {
        $Counters["data_exfiltration"]++
    }
}

function Add-ScenarioCountersFromJsonLine {
    param(
        [System.Collections.IDictionary]$Counters,
        [string]$JsonLine,
        [System.DateTimeOffset]$BaseTime
    )

    if ($JsonLine.Contains('"event_type":"failed_login"') -and $JsonLine.Contains('"country_code":"CN"')) {
        if ($JsonLine -match '"timestamp":"([^"]+)"') {
            $eventTime = [System.DateTimeOffset]::Parse($Matches[1], $culture, $dateStyles).ToUniversalTime()
            if ($eventTime -ge $BaseTime.AddHours(-24)) {
                $Counters["failed_login_cn_24h"]++
            }
        }
    }

    if ($JsonLine.Contains('"event_type":"malware_detected"') -and $JsonLine.Contains('"severity":"critical"')) {
        $Counters["malware_critical"]++
    }

    foreach ($attackerIp in $attackerIps) {
        if ($JsonLine.Contains("""ip"":""$attackerIp""")) {
            $Counters["repeated_attacker_ip_events"]++
            break
        }
    }

    if ($JsonLine.Contains('"event_type":"firewall_block"')) {
        $Counters["firewall_block"]++
    }
    if ($JsonLine.Contains('"event_type":"privilege_escalation"')) {
        $Counters["privilege_escalation"]++
    }
    if ($JsonLine.Contains('"event_type":"account_lockout"')) {
        $Counters["account_lockout"]++
    }
    if ($JsonLine.Contains('"event_type":"suspicious_outbound"')) {
        $Counters["suspicious_outbound"]++
    }
    if ($JsonLine.Contains('"event_type":"data_exfiltration"') -or $JsonLine.Contains('"event_type":"large_transfer"')) {
        $Counters["data_exfiltration"]++
    }
}

function New-SyntheticEvent {
    param(
        [int]$Number,
        [System.DateTimeOffset]$BaseTime,
        [System.Random]$Random
    )

    $failedUsers = @("jdoe", "admin", "vpn.user", "finance.user", "alice", "bob", "svc.backup")
    $failedHosts = @("vpn-gw-01", "vpn-gw-02", "dc-01", "firewall-edge-01", "finance-ws-07")
    $failedMessages = @(
        "Failed login from {country_code} targeting {user}",
        "Possible brute force from {ip} against {user}",
        "Invalid password attempt for {user} via {host}",
        "Repeated authentication failure from {country_code} source {ip}",
        "Suspicious login failure burst against {user} on {host}"
    )

    $newFailedLogin = {
        param([System.DateTimeOffset]$Timestamp, [bool]$ForceChina)

        $user = Get-WeightedChoice -Random $Random -Values $failedUsers -Weights @(20, 20, 18, 15, 10, 9, 8)
        $hostName = Get-WeightedChoice -Random $Random -Values $failedHosts -Weights @(35, 18, 18, 14, 15)
        $ip = Get-WeightedChoice -Random $Random -Values $attackerIps -Weights @(42, 18, 15, 15, 10)
        $country = if ($ForceChina) { "CN" } else { Get-WeightedChoice -Random $Random -Values @("CN", "RU", "VN", "US", "SG") -Weights @(52, 20, 10, 10, 8) }
        $source = if ($hostName.StartsWith("vpn-gw")) { "vpn" } else { "windows-auth" }
        $severity = Get-FailedLoginSeverity -Random $Random -User $user -Ip $ip
        $message = Format-Template -Template (Get-Choice -Random $Random -Values $failedMessages) -User $user -HostName $hostName -Ip $ip -CountryCode $country
        return New-EventObject -Timestamp $Timestamp -Source $source -Severity $severity -EventType "failed_login" -User $user -HostName $hostName -Ip $ip -CountryCode $country -Message $message
    }

    $newAccountLockout = {
        param([System.DateTimeOffset]$Timestamp)

        $user = Get-WeightedChoice -Random $Random -Values @("admin", "vpn.user", "finance.user", "jdoe") -Weights @(32, 30, 22, 16)
        $hostName = Get-WeightedChoice -Random $Random -Values @("vpn-gw-01", "vpn-gw-02", "dc-01", "finance-ws-07") -Weights @(34, 18, 30, 18)
        $ip = Get-WeightedChoice -Random $Random -Values @("203.0.113.45", "203.0.113.88", "198.51.100.200", "10.10.1.15") -Weights @(45, 20, 20, 15)
        $country = Get-WeightedChoice -Random $Random -Values @("CN", "RU", "VN") -Weights @(60, 25, 15)
        $severity = if ($user -eq "admin") { Get-WeightedChoice -Random $Random -Values @("critical", "high", "medium") -Weights @(20, 55, 25) } else { Get-WeightedChoice -Random $Random -Values @("high", "medium") -Weights @(45, 55) }
        $message = Format-Template -Template (Get-Choice -Random $Random -Values @(
            "Account lockout after repeated failed login attempts for {user}",
            "User {user} locked out after authentication failures from {ip}",
            "Lockout detected on {host} for {user}",
            "Repeated password failures caused lockout for {user} on {host}"
        )) -User $user -HostName $hostName -Ip $ip -CountryCode $country
        return New-EventObject -Timestamp $Timestamp -Source "vpn" -Severity $severity -EventType "account_lockout" -User $user -HostName $hostName -Ip $ip -CountryCode $country -Message $message
    }

    $newFirewallBlock = {
        param([System.DateTimeOffset]$Timestamp, [bool]$ForceChina)

        $ip = Get-WeightedChoice -Random $Random -Values $attackerIps -Weights @(32, 24, 18, 16, 10)
        $country = if ($ForceChina) { "CN" } else { Get-WeightedChoice -Random $Random -Values @("CN", "RU", "US", "SG", "DE") -Weights @(38, 24, 16, 12, 10) }
        $hostName = Get-WeightedChoice -Random $Random -Values @("firewall-edge-01", "proxy-01", "vpn-gw-01") -Weights @(55, 25, 20)
        $severity = Get-WeightedChoice -Random $Random -Values @("high", "medium", "low") -Weights @(20, 55, 25)
        $message = Format-Template -Template (Get-Choice -Random $Random -Values @(
            "Firewall blocked connection from {ip} ({country_code})",
            "Inbound connection denied by firewall policy from {country_code}",
            "Blocked suspicious network traffic from {country_code} source {ip}",
            "Firewall edge denied scan attempt from {ip}"
        )) -User "unknown" -HostName $hostName -Ip $ip -CountryCode $country
        return New-EventObject -Timestamp $Timestamp -Source "firewall" -Severity $severity -EventType "firewall_block" -User "unknown" -HostName $hostName -Ip $ip -CountryCode $country -Message $message
    }

    $newMalware = {
        param([System.DateTimeOffset]$Timestamp)

        $hostName = Get-WeightedChoice -Random $Random -Values @("endpoint-014", "endpoint-023", "finance-ws-07", "srv-app-02") -Weights @(30, 25, 25, 20)
        $user = Get-WeightedChoice -Random $Random -Values @("alice", "bob", "finance.user", "jdoe") -Weights @(25, 20, 35, 20)
        $family = Get-Choice -Random $Random -Values @("AgentTesla", "RedLine", "QakBot", "AsyncRAT")
        $severity = Get-WeightedChoice -Random $Random -Values @("critical", "high") -Weights @(38, 62)
        $message = Format-Template -Template (Get-Choice -Random $Random -Values @(
            "EDR detected malware family {family} on {host}",
            "Malware quarantine triggered for {host}",
            "Suspicious binary execution detected on {host} by {user}",
            "EDR blocked malicious payload {family} on {host}"
        )) -User $user -HostName $hostName -Ip "10.20.5.33" -CountryCode "VN" -Family $family
        return New-EventObject -Timestamp $Timestamp -Source "edr" -Severity $severity -EventType "malware_detected" -User $user -HostName $hostName -Ip (Get-Choice -Random $Random -Values $normalIps) -CountryCode "VN" -Message $message
    }

    $newPrivilegeEscalation = {
        param([System.DateTimeOffset]$Timestamp)

        $user = Get-WeightedChoice -Random $Random -Values @("admin", "svc.backup", "finance.user", "jdoe") -Weights @(35, 30, 20, 15)
        $hostName = Get-WeightedChoice -Random $Random -Values @("dc-01", "srv-app-02", "endpoint-014") -Weights @(50, 30, 20)
        $severity = Get-WeightedChoice -Random $Random -Values @("critical", "high") -Weights @(55, 45)
        $source = if ($hostName -eq "dc-01") { "windows-auth" } else { "edr" }
        $message = Format-Template -Template (Get-Choice -Random $Random -Values @(
            "Privilege escalation attempt detected for {user} on {host}",
            "Suspicious admin privilege assignment observed on {host}",
            "User {user} attempted elevated operation on {host}",
            "Unexpected local administrator membership change for {user}"
        )) -User $user -HostName $hostName -Ip "10.10.1.15" -CountryCode "VN"
        return New-EventObject -Timestamp $Timestamp -Source $source -Severity $severity -EventType "privilege_escalation" -User $user -HostName $hostName -Ip "10.10.1.15" -CountryCode "VN" -Message $message
    }

    $newOutbound = {
        param([System.DateTimeOffset]$Timestamp)

        $eventType = Get-WeightedChoice -Random $Random -Values @("suspicious_outbound", "large_transfer", "data_exfiltration") -Weights @(42, 38, 20)
        $user = Get-WeightedChoice -Random $Random -Values @("finance.user", "svc.backup", "alice") -Weights @(55, 25, 20)
        $hostName = Get-WeightedChoice -Random $Random -Values @("finance-ws-07", "proxy-01", "srv-app-02") -Weights @(55, 25, 20)
        $country = Get-WeightedChoice -Random $Random -Values @("RU", "SG", "DE", "US") -Weights @(35, 25, 20, 20)
        $severity = Get-WeightedChoice -Random $Random -Values @("critical", "high", "medium") -Weights @(22, 55, 23)
        $message = Format-Template -Template (Get-Choice -Random $Random -Values @(
            "Suspicious outbound connection from {host} to {country_code}",
            "Large transfer detected from {host} by {user}",
            "Potential data exfiltration from {host} to external destination",
            "Proxy observed unusual upload volume from {host}"
        )) -User $user -HostName $hostName -Ip "198.51.100.200" -CountryCode $country
        return New-EventObject -Timestamp $Timestamp -Source "proxy" -Severity $severity -EventType $eventType -User $user -HostName $hostName -Ip "198.51.100.200" -CountryCode $country -Message $message
    }

    $newNormal = {
        param([System.DateTimeOffset]$Timestamp)

        $normalRoll = $Random.Next(0, 4)
        switch ($normalRoll) {
            0 {
                $user = Get-Choice -Random $Random -Values $users
                $hostName = Get-Choice -Random $Random -Values $hosts
                return New-EventObject -Timestamp $Timestamp -Source "windows-auth" -Severity "low" -EventType "successful_login" -User $user -HostName $hostName -Ip (Get-Choice -Random $Random -Values $normalIps) -CountryCode (Get-Choice -Random $Random -Values $countries) -Message "Successful login observed for $user on $hostName"
            }
            1 {
                return New-EventObject -Timestamp $Timestamp -Source "dns" -Severity "low" -EventType "dns_query" -User (Get-Choice -Random $Random -Values $users) -HostName "dns-01" -Ip (Get-Choice -Random $Random -Values $normalIps) -CountryCode "VN" -Message "DNS query resolved for common business domain"
            }
            2 {
                $hostName = Get-Choice -Random $Random -Values $hosts
                return New-EventObject -Timestamp $Timestamp -Source "edr" -Severity "medium" -EventType "process_start" -User (Get-Choice -Random $Random -Values $users) -HostName $hostName -Ip (Get-Choice -Random $Random -Values $normalIps) -CountryCode "VN" -Message "Process start event from monitored endpoint $hostName"
            }
            default {
                $user = Get-Choice -Random $Random -Values $users
                return New-EventObject -Timestamp $Timestamp -Source "edr" -Severity "low" -EventType "file_access" -User $user -HostName (Get-Choice -Random $Random -Values $hosts) -Ip (Get-Choice -Random $Random -Values $normalIps) -CountryCode "VN" -Message "File access event from normal business workflow for $user"
            }
        }
    }

    if ($Number -le 70) {
        $timestamp = Get-CampaignTimestamp -BaseTime $BaseTime -Random $Random -StartsMinutesAgo @(35, 85, 210, 420, 760, 1180) -WindowMinutes 28
        return & $newFailedLogin $timestamp $true
    }

    if ($Number -le 105) {
        $timestamp = Get-CampaignTimestamp -BaseTime $BaseTime -Random $Random -StartsMinutesAgo @(90, 360, 1200, 2300, 5100, 8200) -WindowMinutes 45
        return & $newAccountLockout $timestamp
    }

    if ($Number -le 140) {
        $timestamp = Get-CampaignTimestamp -BaseTime $BaseTime -Random $Random -StartsMinutesAgo @(55, 240, 900, 3900, 7600, 18000, 33000) -WindowMinutes 60
        return & $newFirewallBlock $timestamp $true
    }

    if ($Number -le 175) {
        $timestamp = Get-CampaignTimestamp -BaseTime $BaseTime -Random $Random -StartsMinutesAgo @(130, 620, 1800, 4200, 9900, 21000, 36000) -WindowMinutes 90
        return & $newMalware $timestamp
    }

    if ($Number -le 205) {
        $timestamp = Get-CampaignTimestamp -BaseTime $BaseTime -Random $Random -StartsMinutesAgo @(160, 980, 3500, 9100, 25000) -WindowMinutes 75
        return & $newPrivilegeEscalation $timestamp
    }

    if ($Number -le 235) {
        $timestamp = Get-CampaignTimestamp -BaseTime $BaseTime -Random $Random -StartsMinutesAgo @(250, 1300, 4700, 12000, 29000, 41000) -WindowMinutes 120
        return & $newOutbound $timestamp
    }

    if ($Number -le 260) {
        $timestamp = Get-CampaignTimestamp -BaseTime $BaseTime -Random $Random -StartsMinutesAgo @(15, 150, 300, 600, 960, 1350) -WindowMinutes 50
        return & $newNormal $timestamp
    }

    $recentRoll = $Random.Next(0, 100)
    if ($recentRoll -lt 24) {
        $timestamp = $BaseTime.AddMinutes(-$Random.Next(0, 24 * 60))
    }
    elseif ($recentRoll -lt 58) {
        $timestamp = $BaseTime.AddMinutes(-$Random.Next(24 * 60, 7 * 24 * 60))
    }
    else {
        $timestamp = $BaseTime.AddMinutes(-$Random.Next(7 * 24 * 60, 30 * 24 * 60))
    }

    $roll = $Random.Next(0, 100)

    if ($roll -lt 20) {
        return & $newFailedLogin $timestamp ($Random.Next(0, 100) -lt 60)
    }

    if ($roll -lt 31) {
        return & $newFirewallBlock $timestamp ($Random.Next(0, 100) -lt 35)
    }

    if ($roll -lt 43) {
        return & $newMalware $timestamp
    }

    if ($roll -lt 53) {
        return & $newOutbound $timestamp
    }

    if ($roll -lt 60) {
        return & $newPrivilegeEscalation $timestamp
    }

    if ($roll -lt 68) {
        return & $newAccountLockout $timestamp
    }

    return & $newNormal $timestamp
}

function New-BulkLines {
    param(
        [string]$EventId,
        [System.Collections.IDictionary]$Event,
        [string]$Index
    )

    $action = [ordered]@{
        index = [ordered]@{
            _index = $Index
            _id = $EventId
        }
    }

    return @(
        ($action | ConvertTo-Json -Compress -Depth 5),
        ($Event | ConvertTo-Json -Compress -Depth 5)
    )
}

function Wait-Elasticsearch {
    param([string]$ElasticsearchUrl)

    Write-Host "Waiting for Elasticsearch at $ElasticsearchUrl ..."
    Invoke-RestMethod `
        -Uri "$ElasticsearchUrl/_cluster/health?wait_for_status=yellow&timeout=60s" `
        -Method Get | Out-Null
}

function Assert-IndexExists {
    param(
        [string]$ElasticsearchUrl,
        [string]$Index
    )

    try {
        Invoke-WebRequest -Uri "$ElasticsearchUrl/$Index" -Method Head -UseBasicParsing | Out-Null
    }
    catch {
        $statusCode = $null
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }

        if ($statusCode -eq 404) {
            throw "Elasticsearch index '$Index' was not found at $ElasticsearchUrl. Run .\scripts\bootstrap-elasticsearch.ps1 first."
        }

        throw
    }
}

function Invoke-BulkPayload {
    param(
        [string]$Payload,
        [string]$ElasticsearchUrl
    )

    if ([string]::IsNullOrWhiteSpace($Payload)) {
        return [pscustomobject]@{
            requested = 0
            indexed = 0
            failed = 0
        }
    }

    $response = Invoke-RestMethod `
        -Method Post `
        -Uri "$ElasticsearchUrl/_bulk" `
        -ContentType "application/x-ndjson" `
        -Body $Payload

    $items = @($response.items)
    $failed = 0
    $printedErrors = 0

    foreach ($item in $items) {
        $operation = $item.index
        $errorProperty = $operation.PSObject.Properties["error"]
        if ($null -ne $errorProperty -and $null -ne $errorProperty.Value) {
            $failed++
            if ($printedErrors -lt 3) {
                $idProperty = $operation.PSObject.Properties["_id"]
                $id = if ($null -ne $idProperty) { $idProperty.Value } else { "<unknown>" }
                Write-Warning ("Bulk item failed: id={0}, reason={1}" -f $id, $errorProperty.Value.reason)
                $printedErrors++
            }
        }
    }

    return [pscustomobject]@{
        requested = $items.Count
        indexed = $items.Count - $failed
        failed = $failed
    }
}

function Write-Summary {
    param(
        [int]$Requested,
        [int]$Indexed,
        [int]$Failed,
        [System.Collections.IDictionary]$Counters,
        [System.Diagnostics.Stopwatch]$Stopwatch,
        [string]$OutputFile
    )

    $Stopwatch.Stop()

    Write-Host ""
    Write-Host "Seed summary"
    Write-Host ("requested_count: {0}" -f $Requested)
    Write-Host ("indexed_count: {0}" -f $Indexed)
    Write-Host ("failed_count: {0}" -f $Failed)
    Write-Host ("elapsed_ms: {0}" -f $Stopwatch.ElapsedMilliseconds)

    if (-not [string]::IsNullOrWhiteSpace($OutputFile)) {
        Write-Host ("output_file: {0}" -f $OutputFile)
    }

    Write-Host "scenario_counters:"
    foreach ($key in $Counters.Keys) {
        Write-Host ("  {0}: {1}" -f $key, $Counters[$key])
    }
}

if ($GenerateOnly -and $Count -lt 40) {
    Write-Warning "Count below 40 cannot include every anchor scenario. Use Count 100 for a useful demo fixture."
}

if ($GenerateOnly) {
    $resolvedOutputPath = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
        $OutputPath
    }
    else {
        Join-Path (Get-Location) $OutputPath
    }

    $outputDirectory = Split-Path -Parent $resolvedOutputPath
    if (-not [string]::IsNullOrWhiteSpace($outputDirectory)) {
        New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
    }

    $writer = [System.IO.StreamWriter]::new($resolvedOutputPath, $false, [System.Text.UTF8Encoding]::new($false))
    try {
        for ($i = 1; $i -le $Count; $i++) {
            $eventId = [System.Guid]::NewGuid().ToString()
            $event = New-SyntheticEvent -Number $i -BaseTime $baseTime -Random $random
            $event.event_id = $eventId
            Add-ScenarioCounters -Counters $counters -Event $event -BaseTime $baseTime

            $bulkLines = New-BulkLines -EventId $eventId -Event $event -Index $Index
            $writer.WriteLine($bulkLines[0])
            $writer.WriteLine($bulkLines[1])

            if ($i % $BatchSize -eq 0 -or $i -eq $Count) {
                Write-Host ("Generated {0}/{1} events to {2}" -f $i, $Count, $resolvedOutputPath)
            }
        }
    }
    finally {
        $writer.Dispose()
    }

    Write-Summary -Requested $Count -Indexed 0 -Failed 0 -Counters $counters -Stopwatch $stopwatch -OutputFile $resolvedOutputPath
    exit 0
}

Wait-Elasticsearch -ElasticsearchUrl $ElasticsearchUrl
Assert-IndexExists -ElasticsearchUrl $ElasticsearchUrl -Index $Index

$requestedCount = 0
$indexedCount = 0
$failedCount = 0

if (-not [string]::IsNullOrWhiteSpace($SeedFromFile)) {
    if (-not (Test-Path -Path $SeedFromFile -PathType Leaf)) {
        throw "SeedFromFile '$SeedFromFile' was not found."
    }

    $reader = [System.IO.StreamReader]::new($SeedFromFile)
    $builder = [System.Text.StringBuilder]::new()
    $batchCount = 0

    try {
        while (-not $reader.EndOfStream) {
            $actionLine = $reader.ReadLine()
            $sourceLine = $reader.ReadLine()

            if ([string]::IsNullOrWhiteSpace($actionLine) -or [string]::IsNullOrWhiteSpace($sourceLine)) {
                throw "Invalid NDJSON file. Each bulk operation must have an action line and a source line."
            }

            [void]$builder.AppendLine($actionLine)
            [void]$builder.AppendLine($sourceLine)
            Add-ScenarioCountersFromJsonLine -Counters $counters -JsonLine $sourceLine -BaseTime $baseTime
            $batchCount++

            if ($batchCount -ge $BatchSize) {
                $result = Invoke-BulkPayload -Payload $builder.ToString() -ElasticsearchUrl $ElasticsearchUrl
                $requestedCount += $result.requested
                $indexedCount += $result.indexed
                $failedCount += $result.failed
                Write-Host ("Seeded {0} events from {1}" -f $requestedCount, $SeedFromFile)

                [void]$builder.Clear()
                $batchCount = 0
            }
        }

        if ($batchCount -gt 0) {
            $result = Invoke-BulkPayload -Payload $builder.ToString() -ElasticsearchUrl $ElasticsearchUrl
            $requestedCount += $result.requested
            $indexedCount += $result.indexed
            $failedCount += $result.failed
            Write-Host ("Seeded {0} events from {1}" -f $requestedCount, $SeedFromFile)
        }
    }
    finally {
        $reader.Dispose()
    }

    Write-Summary -Requested $requestedCount -Indexed $indexedCount -Failed $failedCount -Counters $counters -Stopwatch $stopwatch -OutputFile ""
    exit 0
}

if ($Count -lt 40) {
    Write-Warning "Count below 40 cannot include every anchor scenario. Use Count 100 for a useful demo fixture."
}

$builder = [System.Text.StringBuilder]::new()
$batchCount = 0

for ($i = 1; $i -le $Count; $i++) {
    $eventId = [System.Guid]::NewGuid().ToString()
    $event = New-SyntheticEvent -Number $i -BaseTime $baseTime -Random $random
    $event.event_id = $eventId
    Add-ScenarioCounters -Counters $counters -Event $event -BaseTime $baseTime

    $bulkLines = New-BulkLines -EventId $eventId -Event $event -Index $Index
    [void]$builder.AppendLine($bulkLines[0])
    [void]$builder.AppendLine($bulkLines[1])
    $batchCount++

    if ($batchCount -ge $BatchSize) {
        $result = Invoke-BulkPayload -Payload $builder.ToString() -ElasticsearchUrl $ElasticsearchUrl
        $requestedCount += $result.requested
        $indexedCount += $result.indexed
        $failedCount += $result.failed
        Write-Host ("Seeded {0}/{1} events into {2}" -f $requestedCount, $Count, $Index)

        [void]$builder.Clear()
        $batchCount = 0
    }
}

if ($batchCount -gt 0) {
    $result = Invoke-BulkPayload -Payload $builder.ToString() -ElasticsearchUrl $ElasticsearchUrl
    $requestedCount += $result.requested
    $indexedCount += $result.indexed
    $failedCount += $result.failed
    Write-Host ("Seeded {0}/{1} events into {2}" -f $requestedCount, $Count, $Index)
}

Write-Summary -Requested $requestedCount -Indexed $indexedCount -Failed $failedCount -Counters $counters -Stopwatch $stopwatch -OutputFile ""
