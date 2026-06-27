# Q16 - Elasticsearch Mapping Và Synthetic Dataset Hoạt Động Như Thế Nào?

## 1. Câu trả lời ngắn

SOC events được lưu trong Elasticsearch index:

```text
soc-events-v1
```

Index này có mapping cố định cho các field như `timestamp`, `severity`, `event_type`, `user`, `host`, `ip`, `country_code`, `message`, `raw`. Dataset demo là synthetic SOC events được seed bằng PowerShell script.

Câu cần nhớ khi bảo vệ:

> Elasticsearch lưu raw security events để search/filter/aggregation nhanh. PostgreSQL không lưu raw events chính, PostgreSQL chỉ lưu metadata như audit/history/SearchPlan/DSL.

---

## 2. Code/tài liệu cần đọc

```text
infra/elasticsearch/soc-events-v1-index.json
scripts/bootstrap-elasticsearch.ps1
scripts/seed-events.ps1
docs/questions/Q2_synthetic_dataset.md
docs/questions/Q10_seed_elasticsearch_data.md
docs/search-engine-decision.md
backend/src/main/java/com/soc/ai/search/search/validation/SearchPlanValidator.java
backend/src/main/java/com/soc/ai/search/search/compiler/SearchPlanCompiler.java
```

---

## 3. Mapping Elasticsearch hiện tại là gì?

File:

```text
infra/elasticsearch/soc-events-v1-index.json
```

Mapping chính:

```json
{
  "mappings": {
    "dynamic": false,
    "properties": {
      "timestamp": { "type": "date" },
      "source": { "type": "keyword" },
      "severity": { "type": "keyword" },
      "event_type": { "type": "keyword" },
      "user": { "type": "keyword" },
      "host": { "type": "keyword" },
      "ip": { "type": "ip" },
      "country_code": { "type": "keyword" },
      "message": { "type": "text" },
      "raw": { "type": "text", "index": false }
    }
  }
}
```

Ý nghĩa:

| Field | Type | Dùng để làm gì |
| --- | --- | --- |
| `timestamp` | `date` | lọc theo thời gian, sort, date histogram |
| `source` | `keyword` | filter/group/top-N theo nguồn log |
| `severity` | `keyword` | filter/group theo mức độ |
| `event_type` | `keyword` | filter/group theo loại event |
| `user` | `keyword` | filter/group theo user |
| `host` | `keyword` | filter/group theo host |
| `ip` | `ip` | filter/top-N IP |
| `country_code` | `keyword` | filter/group theo quốc gia |
| `message` | `text` | full-text match query |
| `raw` | `text`, `index=false` | lưu raw log để xem, không search |

Điểm quan trọng:

> `dynamic=false` nghĩa là Elasticsearch không tự index field lạ. Mapping được kiểm soát rõ để tránh dữ liệu hoặc query ngoài phạm vi MVP.

---

## 4. Vì sao không tự thêm `.keyword`?

Trong nhiều index Elasticsearch, field `message` hoặc field text có sub-field `.keyword`. Nhưng trong project này, các field cần exact match/aggregation đã được map trực tiếp là `keyword` hoặc `ip`.

Ví dụ:

```json
"user": { "type": "keyword" }
```

Vì vậy compiler dùng:

```json
{ "terms": { "user": ["admin"] } }
```

không dùng:

```json
{ "terms": { "user.keyword": ["admin"] } }
```

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/search/compiler/SearchPlanCompiler.java
```

Ví dụ compiler:

```java
addTermFilter("user", searchFilters.user(), filters);
addTermsFilter("severity", searchFilters.severity(), filters);
addTermsFilter("event_type", searchFilters.eventType(), filters);
```

Câu nói khi bảo vệ:

> Mapping MVP đã định nghĩa các field aggregatable là `keyword` hoặc `ip`, nên compiler không tự thêm `.keyword`. Việc tự thêm `.keyword` bừa bãi có thể làm query sai mapping.

---

## 5. Field nào được allowlist cho aggregation?

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/search/validation/SearchPlanValidator.java
```

Allowlist:

```java
private static final Set<String> AGGREGATION_FIELD_ALLOWLIST = Set.of(
        "source",
        "severity",
        "event_type",
        "user",
        "host",
        "ip",
        "country_code");
```

Ý nghĩa:

- Chỉ các field này được dùng cho `group_by` hoặc `top_n`.
- Không cho aggregation trên `message`.
- Không cho aggregation trên `raw`.
- Không cho field lạ như `password`.
- Không cho field sai case như `User` hoặc `USER`.
- Không cho field tự thêm `.keyword`.

Câu nói khi bảo vệ:

> Aggregation field phải nằm trong allowlist và khớp mapping hiện tại. Đây là guardrail để LLM hoặc user không query field tùy ý.

---

## 6. `message` và `raw` khác gì nhau?

`message`:

```json
"message": {
  "type": "text"
}
```

Dùng để full-text search bằng `match`, ví dụ:

```text
malware detected
failed login
```

`raw`:

```json
"raw": {
  "type": "text",
  "index": false
}
```

Ý nghĩa:

- `raw` lưu log thô để xem chi tiết.
- `raw` không được index.
- Không search/filter/aggregation trên `raw`.

Câu nói khi bảo vệ:

> `message` dùng cho search text, còn `raw` chỉ để hiển thị forensic log gốc. `raw` không index để tránh tăng dung lượng và tránh query nặng trên payload thô.

---

## 7. Bootstrap Elasticsearch làm gì?

File:

```text
scripts/bootstrap-elasticsearch.ps1
```

Script làm 3 việc:

1. Chờ Elasticsearch healthy:

```powershell
Invoke-RestMethod -Uri "$ElasticsearchUrl/_cluster/health?wait_for_status=yellow&timeout=60s"
```

2. Kiểm tra index `soc-events-v1` đã tồn tại chưa.
3. Nếu chưa có thì tạo index bằng mapping:

```powershell
Invoke-RestMethod `
    -Uri "$ElasticsearchUrl/$indexName" `
    -Method Put `
    -ContentType "application/json" `
    -InFile $mappingPath
```

Câu nói khi bảo vệ:

> Bootstrap script tạo index `soc-events-v1` với mapping cố định trước khi seed data.

---

## 8. Seed dataset hoạt động như thế nào?

File:

```text
scripts/seed-events.ps1
```

Script sinh synthetic SOC events với các field:

```text
timestamp
source
severity
event_type
user
host
ip
country_code
message
raw
```

Sau đó index vào Elasticsearch bằng Bulk API:

```powershell
Invoke-RestMethod `
    -Method Post `
    -Uri "$ElasticsearchUrl/_bulk" `
    -ContentType "application/x-ndjson" `
    -Body $Payload
```

Bulk format gồm 2 dòng cho mỗi event:

```json
{ "index": { "_index": "soc-events-v1", "_id": "seed-20260604-1" } }
{ "timestamp": "...", "source": "...", "severity": "...", "event_type": "..." }
```

Ý nghĩa:

> Bulk API giúp seed nhanh nhiều event vào Elasticsearch, thay vì gửi từng request riêng lẻ.

---

## 9. Dataset demo có những scenario nào?

Synthetic dataset có các scenario chính:

| Scenario | Ví dụ event |
| --- | --- |
| Failed login từ China | `failed_login`, `country_code=CN` |
| Account lockout | `account_lockout` |
| Firewall block | `firewall_block` |
| Malware critical | `malware_detected`, `severity=critical` |
| Privilege escalation | `privilege_escalation` |
| Suspicious outbound | `suspicious_outbound` |
| Data exfiltration | `data_exfiltration` / `large_transfer` |
| Normal activity | `successful_login`, `dns_query`, `process_start`, `file_access` |

Script cũng in summary sau khi seed:

```text
Seed summary
requested_count: 10000
indexed_count: 10000
failed_count: 0
scenario_counters:
  failed_login_cn_24h: ...
  malware_critical: ...
  repeated_attacker_ip_events: ...
```

Câu nói khi bảo vệ:

> Dataset là synthetic nhưng được thiết kế có các pattern SOC rõ ràng để demo search, aggregation, dashboard và investigations.

---

## 10. Lệnh seed dữ liệu local Windows

Từ root project:

```powershell
.\scripts\bootstrap-elasticsearch.ps1
.\scripts\seed-events.ps1 -Count 10000
```

Nếu muốn xóa index trước khi seed lại:

```powershell
Invoke-RestMethod -Method Delete -Uri "http://localhost:9200/soc-events-v1"
.\scripts\bootstrap-elasticsearch.ps1
.\scripts\seed-events.ps1 -Count 10000
```

---

## 11. Lệnh seed dữ liệu trên VPS Linux

Từ thư mục project trên VPS:

```bash
pwsh ./scripts/bootstrap-elasticsearch.ps1
pwsh ./scripts/seed-events.ps1 -Count 10000
```

Nếu muốn xóa index trước:

```bash
curl -X DELETE http://localhost:9200/soc-events-v1
pwsh ./scripts/bootstrap-elasticsearch.ps1
pwsh ./scripts/seed-events.ps1 -Count 10000
```

Không cần restart backend sau khi seed, vì backend query Elasticsearch theo index hiện tại.

---

## 12. Vì sao dùng Elasticsearch thay vì PostgreSQL để search raw events?

Elasticsearch phù hợp hơn cho SOC event search vì:

- search text trên `message`;
- filter theo nhiều field;
- range query theo `timestamp`;
- aggregation `terms` và `date_histogram`;
- sort theo thời gian;
- phù hợp log/event telemetry.

PostgreSQL vẫn dùng cho:

- audit logs;
- query history;
- SearchPlan;
- generated DSL;
- summary;
- pin/investigation metadata.

Câu nói khi bảo vệ:

> Elasticsearch là search engine cho log events. PostgreSQL là metadata store cho audit/history. Hai công cụ đảm nhiệm hai loại dữ liệu khác nhau.

---

## 13. Câu trả lời mẫu khi hội đồng hỏi

### SOC events đang lưu ở đâu?

> SOC events được lưu trong Elasticsearch index `soc-events-v1`. PostgreSQL không lưu raw event chính; PostgreSQL lưu audit/history/SearchPlan/DSL.

### Mapping có những field nào?

> Mapping có `timestamp`, `source`, `severity`, `event_type`, `user`, `host`, `ip`, `country_code`, `message`, `raw`. Các field filter/aggregation là `keyword` hoặc `ip`, `message` là `text`, còn `raw` không index.

### Vì sao không thêm `.keyword`?

> Vì mapping đã khai báo các field aggregatable như `user`, `host`, `severity`, `event_type` là `keyword` trực tiếp. Compiler thêm `.keyword` bừa bãi có thể làm query sai.

### Dataset demo từ đâu?

> Dataset là synthetic SOC events do `seed-events.ps1` sinh ra và index vào Elasticsearch bằng Bulk API. Nó có các scenario như failed login, firewall block, malware, privilege escalation, suspicious outbound, data exfiltration.

### Nếu cần seed lại data thì làm sao?

> Xóa index `soc-events-v1`, chạy bootstrap để tạo mapping lại, rồi chạy seed script với `-Count 10000`.

### Vì sao `raw` không index?

> `raw` chỉ để xem log gốc trong event detail. Không index `raw` giúp tiết kiệm tài nguyên và tránh query nặng trên payload thô.

---

## 14. Một câu cực ngắn để nhớ

> Elasticsearch lưu synthetic SOC events trong `soc-events-v1`; mapping cố định, field allowlist rõ ràng, seed bằng Bulk API, aggregation dùng field hiện tại và không tự thêm `.keyword`.
