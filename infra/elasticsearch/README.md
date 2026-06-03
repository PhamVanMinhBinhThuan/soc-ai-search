# Elasticsearch Event Index

## Index `soc-events-v1`

`soc-events-v1` là Elasticsearch index, không phải PostgreSQL table. Mỗi SOC event được lưu dưới dạng một Elasticsearch document.

Các field trong [soc-events-v1-index.json](./soc-events-v1-index.json) được mapping rõ ràng để phục vụ:

- Full-text search: `message`.
- Filter và aggregation: `timestamp`, `source`, `severity`, `event_type`, `user`, `host`, `ip`, `country_code`.
- Xem chi tiết event: `raw`.

## Khởi tạo index

Khi Elasticsearch đã chạy, có thể tạo index bằng Create Index API:

```bash
curl -X PUT "$ELASTICSEARCH_URL/soc-events-v1" \
  -H "Content-Type: application/json" \
  --data-binary "@soc-events-v1-index.json"
```

Chạy lệnh từ thư mục `infra/elasticsearch/`. Nếu Elasticsearch bật security, bổ sung cơ chế xác thực phù hợp nhưng không hardcode credential vào repository.

## Lựa chọn `dynamic: false`

MVP dùng `"dynamic": false` để tránh field explosion khi event nguồn chứa thêm metadata ngoài schema đã chốt. Field chưa được mapping vẫn được giữ trong `_source` để xem lại, nhưng chưa thể search, filter hoặc aggregate. Khi cần truy vấn một field mới, phải bổ sung mapping rõ ràng.

`raw` dùng `"type": "text"` và `"index": false`: raw log vẫn nằm trong `_source` để hiển thị event detail nhưng không tạo inverted index. Cách này giảm kích thước index vì MVP chưa cần search trực tiếp trên raw log. Trade-off là không thể tìm kiếm nội dung `raw`.

Nếu sau này cần lưu raw log dạng JSON object, hãy đánh giá chuyển sang object có `"enabled": false` hoặc tách các field cần truy vấn thành mapping riêng. MVP hiện tại giữ `raw` dưới dạng chuỗi.

## Kiểm tra bằng Kibana

Kibana `9.4.2` là công cụ tùy chọn để debug Elasticsearch trong môi trường local. Bật Kibana bằng Docker Compose profile `tools`, sau đó tạo Data View:

```text
soc-events-v1
```

Chọn `timestamp` làm time field để xem document trong Discover. Có thể dùng Dev Tools Console để kiểm tra mapping và thử Query DSL.

Kibana phải pin cùng version `9.4.2` với Elasticsearch. Kibana không thay thế frontend React của đồ án và không nên expose cổng `5601` public trên VPS.

## Seed dữ liệu synthetic

Dữ liệu demo được sinh bằng [scripts/seed-events.ps1](../../scripts/seed-events.ps1). Đây là dữ liệu synthetic, không phải dữ liệu SOC thật. Dataset có các pattern phục vụ demo như failed login từ CN trong 24 giờ gần nhất, IP brute-force lặp lại, malware critical, firewall block, privilege escalation và account lockout.

Seed trực tiếp vào Elasticsearch bằng Bulk API:

```powershell
.\scripts\seed-events.ps1 -Count 10000 -BatchSize 1000
```

Sinh file NDJSON để xem/debug mà không gọi Elasticsearch:

```powershell
.\scripts\seed-events.ps1 -Count 100 -GenerateOnly
Get-Content .\generated-data\events.ndjson -TotalCount 6
```

Seed lại từ file NDJSON nếu Elasticsearch volume bị mất:

```powershell
.\scripts\seed-events.ps1 -SeedFromFile .\generated-data\events.ndjson -BatchSize 1000
```

`generated-data/` được ignore bởi Git. Không commit dataset sinh ra, đặc biệt khi scale lên hàng trăm nghìn hoặc vài triệu document.

Một số lệnh kiểm tra pattern:

```powershell
Invoke-RestMethod "http://localhost:9200/soc-events-v1/_count"

$query = @{
  query = @{
    bool = @{
      filter = @(
        @{ term = @{ event_type = "failed_login" } },
        @{ term = @{ country_code = "CN" } },
        @{ range = @{ timestamp = @{ gte = "now-24h" } } }
      )
    }
  }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:9200/soc-events-v1/_search?pretty" `
  -ContentType "application/json" `
  -Body $query
```
