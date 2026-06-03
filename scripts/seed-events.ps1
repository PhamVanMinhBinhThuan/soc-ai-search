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
$attackerIps = @("203.0.113.45", "203.0.113.77", "198.51.100.200", "192.0.2.88")
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

    if ($Number -le 20) {
        $user = Get-Choice -Random $Random -Values @("admin", "vpn.user", "finance.user")
        $minutesAgo = 5 + ($Number * 11)
        return New-EventObject `
            -Timestamp $BaseTime.AddMinutes(-$minutesAgo) `
            -Source "windows-auth" `
            -Severity "high" `
            -EventType "failed_login" `
            -User $user `
            -HostName "vpn-gw-01" `
            -Ip "203.0.113.45" `
            -CountryCode "CN" `
            -Message "Possible brute force: failed login from CN targeting $user"
    }

    if ($Number -le 24) {
        $user = Get-Choice -Random $Random -Values @("admin", "vpn.user")
        return New-EventObject `
            -Timestamp $BaseTime.AddMinutes(-(15 + $Number)) `
            -Source "vpn" `
            -Severity "high" `
            -EventType "account_lockout" `
            -User $user `
            -HostName "vpn-gw-01" `
            -Ip "203.0.113.45" `
            -CountryCode "CN" `
            -Message "Account lockout after repeated brute force failed login attempts for $user"
    }

    if ($Number -le 28) {
        return New-EventObject `
            -Timestamp $BaseTime.AddMinutes(-(30 + $Number)) `
            -Source "firewall" `
            -Severity "medium" `
            -EventType "firewall_block" `
            -User "unknown" `
            -HostName "firewall-edge-01" `
            -Ip "203.0.113.77" `
            -CountryCode "CN" `
            -Message "Firewall block: denied inbound connection from CN to vpn-gw-01"
    }

    if ($Number -le 32) {
        $hostName = Get-Choice -Random $Random -Values @("endpoint-014", "endpoint-023", "finance-ws-07")
        return New-EventObject `
            -Timestamp $BaseTime.AddHours(-($Number % 7)) `
            -Source "edr" `
            -Severity "critical" `
            -EventType "malware_detected" `
            -User "alice" `
            -HostName $hostName `
            -Ip "10.20.5.33" `
            -CountryCode "VN" `
            -Message "Malware detected by EDR on $hostName with suspicious process activity"
    }

    if ($Number -le 35) {
        $user = Get-Choice -Random $Random -Values @("admin", "svc.backup")
        return New-EventObject `
            -Timestamp $BaseTime.AddHours(-($Number % 12)) `
            -Source "windows-auth" `
            -Severity "critical" `
            -EventType "privilege_escalation" `
            -User $user `
            -HostName "dc-01" `
            -Ip "10.10.1.15" `
            -CountryCode "VN" `
            -Message "Privilege escalation attempt: $user added to local administrators"
    }

    if ($Number -le 38) {
        return New-EventObject `
            -Timestamp $BaseTime.AddHours(-($Number % 10)) `
            -Source "proxy" `
            -Severity "high" `
            -EventType "suspicious_outbound" `
            -User "finance.user" `
            -HostName "finance-ws-07" `
            -Ip "198.51.100.200" `
            -CountryCode "RU" `
            -Message "Suspicious outbound connection from finance-ws-07 to rare external IP"
    }

    if ($Number -le 40) {
        return New-EventObject `
            -Timestamp $BaseTime.AddHours(-($Number % 8)) `
            -Source "proxy" `
            -Severity "critical" `
            -EventType "data_exfiltration" `
            -User "finance.user" `
            -HostName "finance-ws-07" `
            -Ip "198.51.100.200" `
            -CountryCode "RU" `
            -Message "Potential data exfiltration: large transfer from finance-ws-07 to external IP"
    }

    $recent = $Random.Next(0, 100) -lt 18
    if ($recent) {
        $timestamp = $BaseTime.AddMinutes(-$Random.Next(0, 24 * 60))
    }
    else {
        $timestamp = $BaseTime.AddMinutes(-$Random.Next(24 * 60, 30 * 24 * 60))
    }

    $roll = $Random.Next(0, 100)

    if ($roll -lt 18) {
        $user = Get-Choice -Random $Random -Values @("admin", "vpn.user", "finance.user", "jdoe")
        $ip = Get-Choice -Random $Random -Values $attackerIps
        return New-EventObject -Timestamp $timestamp -Source "windows-auth" -Severity "high" -EventType "failed_login" -User $user -HostName "vpn-gw-01" -Ip $ip -CountryCode "CN" -Message "Possible brute force: failed login from CN targeting $user"
    }

    if ($roll -lt 28) {
        $ip = Get-Choice -Random $Random -Values $attackerIps
        $country = Get-Choice -Random $Random -Values @("CN", "RU", "US")
        return New-EventObject -Timestamp $timestamp -Source "firewall" -Severity "medium" -EventType "firewall_block" -User "unknown" -HostName "firewall-edge-01" -Ip $ip -CountryCode $country -Message "Firewall block: denied inbound connection from $country to protected service"
    }

    if ($roll -lt 38) {
        $severity = if ($Random.Next(0, 100) -lt 35) { "critical" } else { "high" }
        $hostName = Get-Choice -Random $Random -Values @("endpoint-014", "endpoint-023", "finance-ws-07")
        return New-EventObject -Timestamp $timestamp -Source "edr" -Severity $severity -EventType "malware_detected" -User (Get-Choice -Random $Random -Values $users) -HostName $hostName -Ip (Get-Choice -Random $Random -Values $normalIps) -CountryCode "VN" -Message "Malware detected by EDR on $hostName with suspicious process activity"
    }

    if ($roll -lt 47) {
        $eventType = if ($Random.Next(0, 100) -lt 50) { "suspicious_outbound" } else { "large_transfer" }
        return New-EventObject -Timestamp $timestamp -Source "proxy" -Severity "high" -EventType $eventType -User "finance.user" -HostName "finance-ws-07" -Ip "198.51.100.200" -CountryCode "RU" -Message "Suspicious outbound activity: possible data exfiltration large transfer to external IP"
    }

    if ($roll -lt 53) {
        $user = Get-Choice -Random $Random -Values @("admin", "svc.backup")
        return New-EventObject -Timestamp $timestamp -Source "windows-auth" -Severity "critical" -EventType "privilege_escalation" -User $user -HostName "dc-01" -Ip "10.10.1.15" -CountryCode "VN" -Message "Privilege escalation attempt detected for $user on domain controller"
    }

    if ($roll -lt 60) {
        $user = Get-Choice -Random $Random -Values @("admin", "vpn.user", "finance.user")
        return New-EventObject -Timestamp $timestamp -Source "vpn" -Severity "medium" -EventType "account_lockout" -User $user -HostName "vpn-gw-01" -Ip "203.0.113.45" -CountryCode "CN" -Message "Account lockout after repeated failed login attempts for $user"
    }

    $normalRoll = $Random.Next(0, 4)
    switch ($normalRoll) {
        0 {
            return New-EventObject -Timestamp $timestamp -Source "windows-auth" -Severity "low" -EventType "successful_login" -User (Get-Choice -Random $Random -Values $users) -HostName (Get-Choice -Random $Random -Values $hosts) -Ip (Get-Choice -Random $Random -Values $normalIps) -CountryCode (Get-Choice -Random $Random -Values $countries) -Message "Successful login observed for normal user activity"
        }
        1 {
            return New-EventObject -Timestamp $timestamp -Source "dns" -Severity "low" -EventType "dns_query" -User (Get-Choice -Random $Random -Values $users) -HostName "dns-01" -Ip (Get-Choice -Random $Random -Values $normalIps) -CountryCode "VN" -Message "DNS query resolved for common business domain"
        }
        2 {
            return New-EventObject -Timestamp $timestamp -Source "edr" -Severity "medium" -EventType "process_start" -User (Get-Choice -Random $Random -Values $users) -HostName (Get-Choice -Random $Random -Values $hosts) -Ip (Get-Choice -Random $Random -Values $normalIps) -CountryCode "VN" -Message "Process start event from monitored endpoint"
        }
        default {
            return New-EventObject -Timestamp $timestamp -Source "edr" -Severity "low" -EventType "file_access" -User (Get-Choice -Random $Random -Values $users) -HostName (Get-Choice -Random $Random -Values $hosts) -Ip (Get-Choice -Random $Random -Values $normalIps) -CountryCode "VN" -Message "File access event from normal business workflow"
        }
    }
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
            $eventId = "seed-$Seed-$i"
            $event = New-SyntheticEvent -Number $i -BaseTime $baseTime -Random $random
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
    $eventId = "seed-$Seed-$i"
    $event = New-SyntheticEvent -Number $i -BaseTime $baseTime -Random $random
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
