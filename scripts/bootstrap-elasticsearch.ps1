param(
    [string]$ElasticsearchUrl = "http://localhost:9200"
)

$ErrorActionPreference = "Stop"
$indexName = "soc-events-v1"
$mappingPath = Join-Path $PSScriptRoot "..\infra\elasticsearch\soc-events-v1-index.json"

Write-Host "Waiting for Elasticsearch at $ElasticsearchUrl ..."
Invoke-RestMethod `
    -Uri "$ElasticsearchUrl/_cluster/health?wait_for_status=yellow&timeout=60s" `
    -Method Get | Out-Null

try {
    Invoke-RestMethod -Uri "$ElasticsearchUrl/$indexName" -Method Get | Out-Null
    Write-Host "Elasticsearch index '$indexName' already exists."
}
catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 404) {
        throw
    }

    Write-Host "Creating Elasticsearch index '$indexName' ..."
    Invoke-RestMethod `
        -Uri "$ElasticsearchUrl/$indexName" `
        -Method Put `
        -ContentType "application/json" `
        -InFile $mappingPath | Out-Null

    Write-Host "Elasticsearch index '$indexName' created."
}
