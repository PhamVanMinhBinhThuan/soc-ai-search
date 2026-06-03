# Prompt triển khai Ngày 2 - SOC AI Search MVP

## 1. Cách sử dụng

Ngày 2 nên chia thành **7 prompt cho AI coding agent**. Không gửi toàn bộ ngày 2 trong một prompt lớn.

Sau mỗi prompt:

1. Đọc tóm tắt thay đổi của AI.
2. Kiểm tra file đã tạo hoặc sửa.
3. Chạy lệnh verify mà AI báo cáo.
4. Chỉ chuyển prompt tiếp theo khi checkpoint đạt.
5. Commit sau một nhóm thay đổi ổn định, không commit dữ liệu seed lớn hoặc secret.

Các prompt dưới đây giả định kết quả ngày 1 đã chạy được:

- Backend Spring Boot, frontend React và Docker Compose local đã có.
- Elasticsearch `9.4.2` chạy single-node.
- Mapping `soc-events-v1` đã có trong `infra/elasticsearch/`.
- PostgreSQL + Flyway đã có bảng `search_query_logs`.
- Kibana chỉ là công cụ debug tùy chọn qua profile `tools`.

## 2. Phạm vi Ngày 2

Kết quả cần đạt cuối ngày:

- Elasticsearch index `soc-events-v1` được bootstrap idempotent.
- Có backend Elasticsearch client/config để ghi event vào index.
- Có API:
  - `POST /api/v1/events`
  - `POST /api/v1/events/bulk`
- Có script sinh event synthetic với seed cố định.
- Script seed mặc định `10.000` event document local, nhưng có tham số số lượng để scale lên vài triệu document trước buổi bảo vệ hội đồng.
- Dữ liệu demo có pattern rõ:
  - failed login từ `CN` trong 24 giờ gần nhất;
  - một số IP tạo nhiều alert;
  - severity gồm `low`, `medium`, `high`, `critical`;
  - dữ liệu trải qua ít nhất 30 ngày.
- Có integration test hoặc smoke test cho mapping và ingest.
- Có thể query trực tiếp Elasticsearch để kiểm tra pattern đã seed.

Không làm trong ngày 2:

- Natural language search.
- LLM integration.
- SearchPlan, compiler DSL và validator nghiệp vụ search.
- Aggregation API.
- Frontend search UI.
- Auth.
- CI/CD hoặc production deploy.

Các nội dung này thuộc ngày sau.

## 3. Chuẩn bị trước khi gửi Prompt 1

Chạy stack local:

```powershell
Copy-Item .env.example .env
docker compose up -d --build
.\scripts\bootstrap-elasticsearch.ps1
docker compose ps
```

Nếu `.env` đã tồn tại thì không cần copy lại.

Kiểm tra nhanh:

```powershell
Invoke-RestMethod http://localhost:8081/api/v1/health/live
Invoke-RestMethod http://localhost:9200/_cluster/health
Invoke-RestMethod http://localhost:9200/soc-events-v1/_mapping
```

## 4. Prompt 1 - Rà soát Day 1 và chuẩn hóa mapping/bootstrap

**Mục tiêu:** đảm bảo foundation ngày 1 đủ chắc trước khi thêm ingest.

```text
Tiếp tục triển khai ngày 2 cho SOC AI Search MVP.

Hãy đọc trước các file:
- docs/requirement.md
- docs/tech-stack.md
- docs/architecture.md
- docs/sequence-flow.md
- plan/14-day-mvp-plan.md
- infra/elasticsearch/soc-events-v1-index.json
- scripts/bootstrap-elasticsearch.ps1
- docker-compose.yml

Yêu cầu:
1. Kiểm tra trạng thái repository trước khi sửa.
2. Kiểm tra Elasticsearch mapping `soc-events-v1` hiện có đã đúng các field:
   - timestamp: date
   - source: keyword
   - severity: keyword
   - event_type: keyword
   - user: keyword
   - host: keyword
   - ip: ip
   - country_code: keyword
   - message: text
   - raw: text với index: false
3. Kiểm tra script bootstrap Elasticsearch có tính idempotent:
   - Nếu index chưa có thì tạo index.
   - Nếu index đã có thì không lỗi.
4. Nếu mapping hoặc bootstrap script đang thiếu chi tiết nhỏ thì sửa trong phạm vi tối thiểu.
5. Không tạo ingest API, không tạo seed script, không thêm dependency backend trong prompt này.
6. Chạy verify:
   - docker compose config
   - .\scripts\bootstrap-elasticsearch.ps1
   - GET http://localhost:9200/soc-events-v1/_mapping
7. Báo checklist PASS/FAIL và file đã tạo hoặc sửa.

Giữ thay đổi nhỏ gọn. Không xóa dữ liệu Elasticsearch hoặc Docker volume nếu không được yêu cầu.
```

**Checkpoint:**

- Bootstrap script chạy lại nhiều lần không lỗi.
- Mapping runtime trong Elasticsearch khớp với file JSON.
- `raw.index` là `false`.

## 5. Prompt 2 - Thêm Elasticsearch client vào backend

**Mục tiêu:** backend monolith kết nối được Elasticsearch, nhưng chưa mở ingest API.

```text
Tiếp tục triển khai ngày 2 cho SOC AI Search MVP.

Hãy thêm Elasticsearch client/config vào backend Spring Boot monolith.

Yêu cầu:
1. Kiểm tra trạng thái repository và đọc backend hiện có trước khi sửa.
2. Thêm dependency Elasticsearch Java client chính thức, chọn version tương thích với Elasticsearch 9.4.2.
3. Cấu hình Elasticsearch qua environment variables, không hardcode URL hoặc password:
   - ELASTICSEARCH_URL, mặc định local là http://localhost:9200 khi chạy ngoài Docker.
   - ELASTICSEARCH_USERNAME nullable.
   - ELASTICSEARCH_PASSWORD nullable.
   - ELASTICSEARCH_INDEX_EVENTS mặc định soc-events-v1.
4. Khi chạy Docker Compose, backend phải dùng URL nội bộ `http://elasticsearch:9200`.
5. Tạo config class tối giản để cung cấp Elasticsearch client bean.
6. Không thêm auth, LLM, search API hoặc business abstraction lớn.
7. Không index dữ liệu trong prompt này.
8. Cập nhật .env.example nếu cần.
9. Chạy backend test và nếu có thể chạy app trong Docker Compose để kiểm tra backend vẫn healthy.
10. Báo lệnh verify, kết quả và file đã tạo hoặc sửa.

Giữ code phù hợp modular monolith. Chỉ tạo package rõ ràng, ví dụ:
- com.soc.ai.search.config
- com.soc.ai.search.event
```

**Checkpoint:**

```powershell
cd backend
.\mvnw.cmd test
cd ..
docker compose up -d --build backend
docker compose ps
Invoke-RestMethod http://localhost:8081/api/v1/health/live
```

## 6. Prompt 3 - Tạo Event DTO và API ingest một event

**Mục tiêu:** ingest một event hợp lệ vào Elasticsearch qua Swagger.

```text
Tiếp tục triển khai ngày 2 cho SOC AI Search MVP.

Hãy triển khai API ingest một event:
POST /api/v1/events

Yêu cầu:
1. Đọc docs/requirement.md, docs/architecture.md, docs/sequence-flow.md và mapping Elasticsearch trước khi sửa.
2. Tạo request DTO cho event với field:
   - timestamp
   - source
   - severity
   - event_type
   - user
   - host
   - ip
   - country_code
   - message
   - raw
3. Dùng Bean Validation:
   - các field chính không được blank/null;
   - severity chỉ nhận low, medium, high, critical;
   - timestamp parse được ISO-8601;
   - ip hợp lệ ở mức hợp lý cho MVP.
4. Tạo service index event vào Elasticsearch index `soc-events-v1`.
5. Response trả JSON tối thiểu:
   - event_id
   - index
   - result
6. Controller đặt trong backend monolith, endpoint prefix `/api/v1/events`.
7. Cập nhật Swagger/OpenAPI annotation nếu hữu ích.
8. Tạo unit test hoặc integration-style test tối thiểu cho controller:
   - request hợp lệ trả 201 hoặc 200 theo lựa chọn implementation;
   - severity không hợp lệ trả 400.
9. Không tạo bulk endpoint trong prompt này.
10. Không tạo search API, LLM hoặc frontend UI.
11. Chạy test backend và nếu Docker đang chạy thì test endpoint qua Swagger/curl/Invoke-RestMethod.
12. Báo file đã tạo hoặc sửa và ví dụ request JSON.

Giữ code tối giản, chưa tạo nhiều layer nếu chưa cần.
```

**Checkpoint:**

Ví dụ request:

```powershell
$body = @{
  timestamp = "2026-06-03T10:00:00Z"
  source = "windows-auth"
  severity = "high"
  event_type = "failed_login"
  user = "demo.user"
  host = "host-001"
  ip = "203.0.113.10"
  country_code = "CN"
  message = "Failed login attempt from CN"
  raw = "raw log line"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8081/api/v1/events `
  -ContentType "application/json" `
  -Body $body
```

Kiểm tra document vào Elasticsearch:

```powershell
Invoke-RestMethod "http://localhost:9200/soc-events-v1/_search?q=event_type:failed_login&pretty"
```

## 7. Prompt 4 - Tạo bulk ingest API

**Mục tiêu:** nạp batch event qua backend, phục vụ demo và test API.

```text
Tiếp tục triển khai ngày 2 cho SOC AI Search MVP.

Hãy triển khai bulk ingest API:
POST /api/v1/events/bulk

Yêu cầu:
1. Đọc implementation ingest một event hiện có trước khi sửa.
2. Request body là danh sách event hoặc object chứa `events`, chọn format dễ dùng và ghi rõ trong README hoặc Swagger.
3. Reuse validation từ single ingest.
4. Giới hạn batch size để tránh request quá lớn, ví dụ tối đa 1000 event/request trong MVP.
5. Dùng Elasticsearch Bulk API ở backend.
6. Response trả JSON tối thiểu:
   - requested_count
   - indexed_count
   - failed_count
   - errors nếu có, giới hạn số lỗi trả về để response không quá lớn.
7. Nếu một số event lỗi validation, trả 400 rõ ràng.
8. Nếu Elasticsearch bulk có item lỗi, trả trạng thái phù hợp và không làm mất thông tin lỗi.
9. Thêm test:
   - bulk request hợp lệ;
   - bulk rỗng hoặc quá giới hạn;
   - event invalid trong batch.
10. Không tạo script seed trong prompt này.
11. Không thêm search API, LLM hoặc frontend UI.
12. Chạy backend test và kiểm tra Swagger.
13. Báo file đã tạo hoặc sửa và ví dụ request.

Giữ endpoint phục vụ MVP, chưa cần async queue hoặc streaming.
```

**Checkpoint:**

```powershell
cd backend
.\mvnw.cmd test
cd ..
Invoke-WebRequest http://localhost:8081/swagger-ui.html -UseBasicParsing
```

Test nhanh bulk nhỏ:

```powershell
$events = @{
  events = @(
    @{
      timestamp = "2026-06-03T10:01:00Z"
      source = "windows-auth"
      severity = "medium"
      event_type = "failed_login"
      user = "alice"
      host = "host-001"
      ip = "203.0.113.11"
      country_code = "CN"
      message = "Failed login attempt"
      raw = "raw log 1"
    },
    @{
      timestamp = "2026-06-03T10:02:00Z"
      source = "vpn"
      severity = "critical"
      event_type = "malware_detected"
      user = "bob"
      host = "host-002"
      ip = "198.51.100.20"
      country_code = "VN"
      message = "Malware detected on endpoint"
      raw = "raw log 2"
    }
  )
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8081/api/v1/events/bulk `
  -ContentType "application/json" `
  -Body $events
```

## 8. Prompt 5 - Viết script generate và seed event synthetic

**Mục tiêu:** tạo dataset local mặc định `10.000` document, có pattern SOC rõ để demo search/aggregation, có thể scale số lượng khi cần.

```text
Tiếp tục triển khai ngày 2 cho SOC AI Search MVP.

Hãy viết script sinh và seed event synthetic trong thư mục scripts/.

Yêu cầu:
1. Kiểm tra trạng thái repository trước khi sửa.
2. Tạo script PowerShell phù hợp Windows local, ví dụ:
   - scripts/seed-events.ps1
3. Script nhận tham số:
   - Count, mặc định 10000.
   - BatchSize, mặc định 1000.
   - Seed, mặc định cố định để dữ liệu reproducible.
   - BaseTimeUtc, optional, mặc định là thời điểm UTC hiện tại để các truy vấn "last 24h" luôn có dữ liệu; nếu truyền vào thì dataset có thể tái lập chính xác theo thời gian đó.
   - ElasticsearchUrl, mặc định http://localhost:9200.
   - Index, mặc định soc-events-v1.
   - GenerateOnly, switch optional: chỉ sinh file NDJSON, không gọi Elasticsearch.
   - OutputPath, mặc định generated-data/events.ndjson, dùng khi GenerateOnly hoặc khi cần ghi file để debug.
   - SeedFromFile, optional: đọc NDJSON đã sinh sẵn và bulk vào Elasticsearch.
4. Script seed trực tiếp vào Elasticsearch bằng Bulk API để nhanh.
5. Khi dùng `GenerateOnly`, script sinh `generated-data/events.ndjson` theo format NDJSON phù hợp Elasticsearch Bulk API:
   - mỗi document gồm 2 dòng: metadata action `index` và source document;
   - metadata có `_index` và `_id` deterministic;
   - file dùng để xem/debug hoặc seed lại khi Elasticsearch volume bị mất.
6. Khi dùng `SeedFromFile`, script đọc NDJSON theo batch và gọi Elasticsearch Bulk API, không cần generate lại data.
7. Dùng `_id` deterministic cho document, ví dụ `seed-{Seed}-{i}`, để chạy lại cùng Count/Seed không nhân đôi dữ liệu mà ghi đè cùng document.
8. Không tạo file dataset vài triệu document trong repo.
9. `generated-data/`, `.tmp/` hoặc thư mục output tương tự phải nằm trong `.gitignore`; không commit dataset sinh ra.
10. Nếu vừa generate vừa seed trong một lần chạy là optional; mặc định ưu tiên seed trực tiếp nhanh, còn `GenerateOnly` dùng khi muốn inspect/backup local.
11. Tất cả document phải khớp mapping `soc-events-v1` và validation hiện tại của `IngestEventRequest`:
   - timestamp ISO-8601;
   - severity chỉ gồm low, medium, high, critical;
   - ip hợp lệ;
   - không sinh field ngoài mapping vì index đang kiểm soát dynamic mapping.
12. Dữ liệu không được là random rác. Phải có các nhóm scenario SOC có thể demo:
   - Authentication attack: nhiều `failed_login` từ `country_code = CN` trong 24 giờ gần nhất, tập trung vào một vài user như `admin`, `vpn.user`, `finance.user`.
   - Brute-force source IP: một vài IP cố định sinh nhiều event bất thường để demo "Top IP có nhiều alert nhất".
   - Malware outbreak: `malware_detected` severity `high`/`critical` trên một nhóm host endpoint trong 7 ngày gần nhất.
   - Suspicious outbound hoặc data exfiltration: `suspicious_outbound`, `large_transfer` hoặc `data_exfiltration` với message đủ rõ để full-text search.
   - Firewall/SIEM block: `firewall_block` từ `firewall`, có source IP, country_code và message thể hiện connection bị chặn.
   - Privilege escalation: `privilege_escalation` từ `windows-auth` hoặc `edr`, severity `high`/`critical`, liên quan user đặc quyền như `admin` hoặc `svc.backup`.
   - Account lockout: `account_lockout` từ `windows-auth` hoặc `vpn`, thường đi cùng failed login/brute-force để demo chuỗi điều tra.
   - Normal/background noise: `successful_login`, `dns_query`, `process_start`, `file_access` với severity `low`/`medium` trải đều 30 ngày để dataset không bị quá một màu.
13. Phân bố dữ liệu cần hợp lý cho demo:
   - event trải qua ít nhất 30 ngày;
   - luôn có dữ liệu trong 24 giờ gần nhất;
   - severity có đủ `low`, `medium`, `high`, `critical`, ví dụ gần đúng low 40-50%, medium 25-35%, high 15-25%, critical 5-10%;
   - source đa dạng, ví dụ `windows-auth`, `vpn`, `edr`, `firewall`, `proxy`, `dns`;
   - country_code đa dạng, ví dụ `VN`, `CN`, `US`, `RU`, `SG`, `DE`, nhưng scenario chính vẫn phải có CN.
14. Với Count nhỏ như 100, vẫn phải bảo đảm có tối thiểu một số "anchor events" cho các query demo chính:
   - failed login từ CN trong 24h;
   - ít nhất một critical malware event;
   - ít nhất một `firewall_block`, một `privilege_escalation` và một `account_lockout`;
   - ít nhất một IP lặp lại nhiều lần;
   - ít nhất một message chứa từ khóa `brute force`, `malware detected`, `suspicious outbound`, `firewall block`, `privilege escalation`, `account lockout`.
15. Message và raw phải có giá trị demo:
   - `message` là câu ngắn dễ đọc, có keyword phục vụ full-text search.
   - `raw` là chuỗi raw log giả lập có format tương đối thật, chứa timestamp, source, user, host, ip, severity, event_type; không dùng lorem ipsum.
   - Không dùng dữ liệu SOC thật, không dùng thông tin cá nhân thật, không dùng API key/password thật.
16. Script phải in progress theo batch và summary cuối:
   - requested_count
   - indexed_count
   - failed_count
   - elapsed_ms
   - output_file nếu có GenerateOnly;
   - scenario counters, ví dụ failed_login_cn_24h, malware_critical, repeated_attacker_ip_events.
17. Script cần kiểm tra index tồn tại; nếu chưa có, hướng dẫn chạy .\scripts\bootstrap-elasticsearch.ps1 hoặc tự gọi bootstrap nếu hợp lý.
18. Chỉ verify local với Count 100 hoặc 1000 trước, sau đó Count 10000 nếu máy ổn. Không chạy vài triệu document trong prompt này.
19. Cập nhật README hoặc infra/elasticsearch/README ngắn gọn cách dùng script và ghi rõ dataset là synthetic demo data:
   - seed trực tiếp;
   - generate NDJSON để xem/debug;
   - seed lại từ file NDJSON khi Elasticsearch volume bị mất;
   - cảnh báo không commit `generated-data/`.
20. Bổ sung một vài lệnh query Elasticsearch để chứng minh dữ liệu demo có pattern:
   - count tổng document;
   - filter failed login từ CN trong 24h;
   - aggregation severity;
   - top IP có nhiều event nhất;
   - full-text search message chứa `malware detected` hoặc `suspicious outbound`.
21. Báo file đã tạo hoặc sửa và lệnh verify.

Lưu ý quan trọng:
- Event trong Elasticsearch là document, không phải PostgreSQL row.
- Script phải scale được lên vài triệu document trước buổi bảo vệ, nhưng local development mặc định vẫn là 10000 để nhẹ máy.
- Dataset dùng để demo nghiệp vụ SOC, nên ưu tiên pattern có thể giải thích được hơn là random hoàn toàn.
- Không dùng dữ liệu SOC thật.
```

**Checkpoint:**

```powershell
.\scripts\bootstrap-elasticsearch.ps1
.\scripts\seed-events.ps1 -Count 100 -GenerateOnly
Get-Content .\generated-data\events.ndjson -TotalCount 6
.\scripts\seed-events.ps1 -SeedFromFile .\generated-data\events.ndjson -BatchSize 50
.\scripts\seed-events.ps1 -Count 100 -BatchSize 50
Invoke-RestMethod "http://localhost:9200/soc-events-v1/_count"
```

Nếu máy ổn:

```powershell
.\scripts\seed-events.ps1 -Count 10000 -BatchSize 1000
Invoke-RestMethod "http://localhost:9200/soc-events-v1/_count"
```

Không chạy vài triệu document ở local trong ngày 2.

## 9. Prompt 6 - Verify pattern dữ liệu và test ingest

**Mục tiêu:** chứng minh dataset seed có ích cho demo các ngày sau.

```text
Tiếp tục triển khai ngày 2 cho SOC AI Search MVP.

Hãy bổ sung smoke test nhẹ cho mapping, ingest API và dataset pattern.

Yêu cầu:
1. Đọc script seed, API ingest và mapping hiện có.
2. Tạo script smoke test PowerShell trong scripts/, ví dụ `scripts/smoke-test-day-02.ps1`, vì môi trường local là Windows.
   - Script giả định Docker Compose local đang chạy.
   - Không thêm công nghệ test/container test ngoài phạm vi MVP.
   - Không mở thêm phạm vi test ngoài smoke test cần thiết cho ngày 2.
3. Kiểm tra các case Elasticsearch trực tiếp:
   - count tổng document trong soc-events-v1;
   - filter failed login từ CN trong 24 giờ gần nhất;
   - aggregation severity;
   - top IP có nhiều event;
   - query message full-text;
   - các scenario SIEM quan trọng như `firewall_block`, `privilege_escalation`, `account_lockout`.
4. Kiểm tra ingest API:
   - POST /api/v1/events với event hợp lệ;
   - POST /api/v1/events/bulk với batch nhỏ;
   - request invalid trả 400.
5. Smoke script phải fail rõ ràng nếu một checkpoint không đạt, ví dụ count bằng 0, thiếu pattern demo hoặc ingest API không trả status mong đợi.
6. `scripts/smoke-test-day-02.ps1` phải chạy toàn bộ verify tự động:
   - kiểm tra Elasticsearch health;
   - kiểm tra index `soc-events-v1` tồn tại;
   - kiểm tra count tổng document;
   - kiểm tra failed_login từ CN trong 24h;
   - kiểm tra aggregation severity;
   - kiểm tra top IP;
   - kiểm tra full-text search message;
   - kiểm tra các scenario `firewall_block`, `privilege_escalation`, `account_lockout`;
   - kiểm tra `POST /api/v1/events` với event hợp lệ;
   - kiểm tra `POST /api/v1/events/bulk` với batch nhỏ;
   - kiểm tra request invalid trả 400.
7. Cập nhật README hoặc infra/elasticsearch/README ngắn gọn cách chạy smoke test.
8. Không triển khai SearchPlan, search API hoặc LLM.
9. Chạy verify phù hợp và báo kết quả.

Mục tiêu là có bằng chứng để ngày 3 bắt đầu search/filter trên dữ liệu thật.
Trade-off: ngày 2 dùng smoke script với Docker Compose và Elasticsearch thật để kiểm chứng end-to-end nhẹ. MVP yêu cầu có test và bằng chứng kiểm tra, nên không mở rộng thêm công nghệ test ngoài phạm vi cần thiết.
```

**Checkpoint:**

Các query nên trả dữ liệu:

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

.\scripts\smoke-test-day-02.ps1
```

## 10. Prompt 7 - Review Ngày 2 và cập nhật tài liệu chạy

**Mục tiêu:** chốt ngày 2 bằng checklist rõ ràng, không triển khai sang ngày 3.

```text
Hãy review và verify toàn bộ kết quả triển khai ngày 2 cho SOC AI Search MVP.

Đọc lại:
- docs/requirement.md
- docs/tech-stack.md
- docs/architecture.md
- docs/sequence-flow.md
- plan/14-day-mvp-plan.md
- README.md

Kiểm tra:
1. Elasticsearch mapping soc-events-v1 đúng và bootstrap idempotent.
2. Backend có Elasticsearch client/config qua environment variables.
3. API POST /api/v1/events hoạt động và có trong Swagger.
4. API POST /api/v1/events/bulk hoạt động và có giới hạn batch size.
5. Validation event trả lỗi rõ với input sai.
6. Script seed event synthetic có:
   - Count mặc định 10000.
   - BatchSize.
   - Seed cố định.
   - ElasticsearchUrl.
   - Index.
7. Script seed không commit dataset lớn.
8. Dataset có pattern:
   - failed login từ CN trong 24h;
   - top IP bất thường;
   - severity low/medium/high/critical;
   - dữ liệu trải qua ít nhất 30 ngày.
9. Có test hoặc smoke script kiểm tra ingest và pattern.
10. Backend test pass.
11. Frontend build/lint vẫn pass nếu có thay đổi liên quan.
12. docker compose config hợp lệ.
13. docker compose up -d chạy được.
14. Không có secret thật hoặc generated dataset lớn trong Git-tracked files.

Sau đó:
1. Sửa lỗi nhỏ nếu phát hiện.
2. Cập nhật README.md hoặc infra/elasticsearch/README.md với:
   - cách bootstrap index;
   - cách seed 100 event để test nhanh;
   - cách seed 10000 event local;
   - cảnh báo không seed vài triệu document ở local khi chưa cần;
   - một vài lệnh query kiểm tra pattern.
3. Chạy lệnh verify phù hợp.
4. Báo checklist PASS/FAIL theo từng mục.
5. Liệt kê việc còn cần làm ở ngày 3 nhưng không triển khai chúng.
```

**Checkpoint cuối ngày:**

```powershell
docker compose config
docker compose up -d
.\scripts\bootstrap-elasticsearch.ps1
.\scripts\seed-events.ps1 -Count 10000 -BatchSize 1000
Invoke-RestMethod "http://localhost:9200/soc-events-v1/_count"
cd backend
.\mvnw.cmd test
cd ..
```

Kết quả cần có:

- Elasticsearch có ít nhất `10.000` event document local.
- Swagger gọi được single ingest và bulk ingest.
- Query trực tiếp Elasticsearch trả đúng pattern demo.
- README đủ hướng dẫn người khác seed lại dữ liệu.

## 11. Checklist thủ công - Kibana optional

Kibana không bắt buộc để code chạy, nhưng hữu ích để debug Elasticsearch.

Nếu cần xem dữ liệu bằng UI:

```powershell
docker compose --profile tools up -d kibana
docker compose --profile tools ps
```

Mở:

```text
http://localhost:5601
```

Việc cần làm trong Kibana:

1. Tạo Data View cho `soc-events-v1`.
2. Chọn time field là `timestamp`.
3. Mở Discover để xem document.
4. Dùng Dev Tools chạy thử DSL filter `event_type`, `country_code`, `severity`.

Không expose Kibana public trên VPS.

## 12. Cách hỏi AI khi checkpoint lỗi

Không gửi lại toàn bộ prompt từ đầu. Dùng mẫu:

```text
Checkpoint của prompt <số prompt> ngày 2 đang lỗi.

Lệnh tôi đã chạy:
<command>

Output lỗi:
<paste output>

Hãy:
1. Chẩn đoán nguyên nhân.
2. Chỉ sửa phạm vi cần thiết để checkpoint pass.
3. Không triển khai task của prompt tiếp theo.
4. Chạy lại verify và báo file đã sửa.
```

## 13. Lưu ý quan trọng

- Local chỉ nên seed `10.000` đến `100.000` document khi phát triển.
- Vài triệu document chỉ seed ở giai đoạn chuẩn bị bảo vệ hội đồng hoặc môi trường VPS đủ tài nguyên.
- Script phải scale được, nhưng ngày 2 không cần chứng minh bằng cách chạy vài triệu document.
- Không commit file dữ liệu lớn.
- Không dùng dữ liệu SOC thật.
- Không thêm microservices.
- Docs là working draft: chỉ cập nhật phần phản ánh đúng code đã triển khai.
