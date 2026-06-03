# Prompt triển khai Ngày 3 - SOC AI Search MVP

## 1. Cách sử dụng

Ngày 3 nên chia thành **7 prompt cho AI coding agent**. Không gửi toàn bộ ngày 3 trong một prompt lớn.

Sau mỗi prompt:

1. Đọc tóm tắt thay đổi của AI.
2. Kiểm tra file đã tạo hoặc sửa.
3. Chạy lệnh verify mà AI báo cáo.
4. Chỉ chuyển prompt tiếp theo khi checkpoint đạt.
5. Commit sau một nhóm thay đổi ổn định, không commit dữ liệu seed lớn hoặc secret.

Các prompt dưới đây giả định kết quả ngày 2 đã chạy được:

- Elasticsearch `soc-events-v1` đã bootstrap idempotent.
- Dataset synthetic đã seed tối thiểu `10.000` event local.
- Backend đã có Elasticsearch client/config.
- API ingest đã có:
  - `POST /api/v1/events`
  - `POST /api/v1/events/bulk`
- Có smoke test ngày 2:
  - `scripts/smoke-test-day-02.ps1`

## 2. Phạm vi Ngày 3

Kết quả cần đạt cuối ngày:

- Có `SearchPlan` và các DTO con bằng Java `record`.
- Có validator/guardrail cho `SearchPlan`.
- Có compiler chuyển `SearchPlan` hợp lệ thành Elasticsearch Query DSL cho mode `search`.
- Có executor tìm kiếm event trên Elasticsearch với pagination.
- Có endpoint kỹ thuật để test SearchPlan core trước khi nối LLM:
  - `POST /api/v1/search/plan`
- Có endpoint xem chi tiết event:
  - `GET /api/v1/events/{event_id}`
- Có unit test table-driven cho validator/compiler.
- Có smoke test ngày 3 kiểm tra search và event detail trên dataset thật.

Không làm trong ngày 3:

- Natural language search.
- LLM integration.
- AI summarization.
- Aggregation API cho thống kê.
- Chart/frontend search UI.
- Query history/audit log.
- Export CSV.
- Auth.
- CI/CD hoặc production deploy.
- Vector search, hybrid search hoặc chức năng khuyến khích.

Các nội dung này thuộc ngày sau trong [14-day-mvp-plan.md](./14-day-mvp-plan.md).

## 3. Chuẩn bị trước khi gửi Prompt 1

Chạy stack local và đảm bảo dataset ngày 2 sẵn sàng:

```powershell
docker compose up -d
.\scripts\bootstrap-elasticsearch.ps1
.\scripts\seed-events.ps1 -Count 10000 -BatchSize 1000
.\scripts\smoke-test-day-02.ps1
docker compose ps
```

Kiểm tra nhanh:

```powershell
Invoke-RestMethod http://localhost:8081/api/v1/health/live
Invoke-RestMethod "http://localhost:9200/soc-events-v1/_count"
Invoke-WebRequest http://localhost:8081/swagger-ui.html -UseBasicParsing
```

## 4. Prompt 1 - Tạo SearchPlan records và contract JSON

**Mục tiêu:** định nghĩa contract có cấu trúc để backend validate/compile, chưa gọi Elasticsearch.

```text
Tiếp tục triển khai ngày 3 cho SOC AI Search MVP.

Hãy đọc trước các file:
- docs/requirement.md
- docs/tech-stack.md
- docs/architecture.md
- docs/sequence-flow.md
- plan/14-day-mvp-plan.md
- infra/elasticsearch/soc-events-v1-index.json
- backend/src/main/java/com/soc/ai/search/event/IngestEventRequest.java
- backend/src/main/java/com/soc/ai/search/config/ElasticsearchProperties.java

Yêu cầu:
1. Kiểm tra trạng thái repository trước khi sửa.
2. Tạo package rõ ràng cho search core, ví dụ:
   - com.soc.ai.search.search.plan
   - com.soc.ai.search.search.validation
   - com.soc.ai.search.search.compiler
   - com.soc.ai.search.search.execution
3. Định nghĩa `SearchPlan` và các DTO con bằng Java `record`, không dùng mutable class cho data model.
4. Dùng class hoặc Spring `@Service` cho logic về sau; không nhồi business logic vào record.
5. Contract JSON cho ngày 3 chỉ phục vụ mode `search`, ví dụ:
   {
     "mode": "search",
     "filters": {
       "timestamp": { "gte": "now-24h", "lte": "now" },
       "severity": ["high", "critical"],
       "event_type": ["failed_login"],
       "user": "admin",
       "host": "vpn-gw-01",
       "ip": "203.0.113.45",
       "country_code": ["CN"]
     },
     "message_query": "malware detected",
     "page": 0,
     "size": 20
   }
6. DTO tối thiểu nên có:
   - SearchPlan
   - SearchMode
   - SearchFilters
   - TimeRange
7. Dùng `@JsonProperty` cho field snake_case:
   - event_type
   - country_code
   - message_query
8. Dùng Bean Validation mức cơ bản:
   - mode not null;
   - page >= 0;
   - size từ 1 đến 100;
   - string nếu có thì không blank;
   - list nếu có thì không chứa blank.
9. Chưa implement validator nghiệp vụ sâu, compiler, executor hoặc controller trong prompt này.
10. Thêm unit test nhỏ cho deserialize/serialize contract nếu hữu ích.
11. Chạy backend test và báo file đã tạo hoặc sửa.

Không triển khai natural language, LLM, aggregation, audit log, CSV hoặc frontend.
```

**Checkpoint:**

```powershell
cd backend
.\mvnw.cmd test
cd ..
```

Kết quả cần có:

- Records compile được.
- JSON contract dùng snake_case rõ ràng.
- Chưa có endpoint search mới trong prompt này.

## 5. Prompt 2 - SearchPlan validator và guardrail MVP

**Mục tiêu:** chặn SearchPlan không hợp lệ trước khi compile thành DSL.

```text
Tiếp tục triển khai ngày 3 cho SOC AI Search MVP.

Hãy triển khai validator/guardrail cho SearchPlan.

Yêu cầu:
1. Đọc SearchPlan records vừa tạo, mapping Elasticsearch và docs/requirement.md trước khi sửa.
2. Tạo class/service validator, ví dụ:
   - SearchPlanValidator
   - SearchPlanValidationException
3. Validator phải áp dụng allowlist field theo mapping MVP:
   - timestamp
   - severity
   - event_type
   - user
   - host
   - ip
   - country_code
   - message/message_query
4. Ngày 3 chỉ hỗ trợ `mode = search`.
   - Nếu mode khác search, trả lỗi rõ.
   - Không triển khai aggregation trong prompt này.
5. Validate filter:
   - severity chỉ gồm low, medium, high, critical;
   - country_code là ISO alpha-2 uppercase;
   - ip là IPv4 hợp lệ;
   - event_type/user/host không blank nếu xuất hiện;
   - timestamp.gte/lte hỗ trợ ISO-8601 hoặc relative time đơn giản: now, now-24h, now-7d, now-30d;
   - page >= 0;
   - size từ 1 đến 100.
6. Reject input nguy hiểm hoặc không thuộc MVP:
   - wildcard tùy ý;
   - script query;
   - field ngoài allowlist;
   - size > 100.
7. Error message phải đủ rõ để debug qua Swagger, nhưng không lộ stack trace.
8. Thêm unit test table-driven cho các case:
   - valid failed_login CN last 24h;
   - valid critical severity 7 ngày;
   - invalid severity;
   - invalid IP;
   - invalid country_code;
   - invalid size > 100;
   - unsupported mode aggregate.
9. Chạy backend test và báo kết quả.

Không gọi Elasticsearch, không tạo endpoint search, không tích hợp LLM.
```

**Checkpoint:**

```powershell
cd backend
.\mvnw.cmd test
cd ..
```

Kết quả cần có:

- Validator pass test.
- Query sai bị reject trước khi compile.

## 6. Prompt 3 - Compiler SearchPlan thành Elasticsearch Query DSL

**Mục tiêu:** chuyển SearchPlan hợp lệ thành DSL an toàn, chưa execute.

```text
Tiếp tục triển khai ngày 3 cho SOC AI Search MVP.

Hãy triển khai compiler chuyển SearchPlan đã validate thành Elasticsearch Query DSL cho mode search.

Yêu cầu:
1. Đọc SearchPlan records, SearchPlanValidator và mapping Elasticsearch trước khi sửa.
2. Tạo class/service compiler, ví dụ:
   - SearchPlanCompiler
   - CompiledSearchQuery
3. Compiler nhận SearchPlan hợp lệ và sinh DSL dạng object/map/json có thể trả về API để đảm bảo transparency.
4. DSL tối thiểu:
   - bool.filter cho filter chính xác;
   - terms hoặc term cho severity, event_type, country_code;
   - term cho user, host, ip;
   - range cho timestamp;
   - match hoặc match_phrase cho message_query;
   - from = page * size;
   - size = size;
   - sort timestamp desc;
   - timeout phù hợp, ví dụ 3s;
   - track_total_hits = true nếu dễ thực hiện.
5. Compiler không được sinh script query, wildcard query hoặc query ngoài phạm vi MVP.
6. Giữ output DSL dễ đọc để ngày sau UI có thể hiển thị.
7. Thêm unit test table-driven cho DSL shape:
   - failed_login từ CN trong 24h;
   - critical trong 7 ngày;
   - message_query malware detected;
   - pagination page 2 size 20 => from 40.
8. Chạy backend test.

Không execute Elasticsearch trong prompt này. Không triển khai aggregation.
```

**Checkpoint:**

```powershell
cd backend
.\mvnw.cmd test
cd ..
```

Kết quả cần có:

- DSL có `bool.filter`.
- Pagination và sort đúng.
- Compiler không gọi Elasticsearch.

## 7. Prompt 4 - Search executor và endpoint POST /api/v1/search/plan

**Mục tiêu:** gọi backend bằng SearchPlan cố định và nhận kết quả search có pagination.

```text
Tiếp tục triển khai ngày 3 cho SOC AI Search MVP.

Hãy triển khai search executor và endpoint kỹ thuật:
POST /api/v1/search/plan

Endpoint này dùng để kiểm thử SearchPlan core trước khi nối LLM. Không phải endpoint natural language cuối cùng.

Yêu cầu:
1. Đọc compiler, validator, Elasticsearch config hiện có và docs/sequence-flow.md trước khi sửa.
2. Tạo search executor dùng Elasticsearch hiện có:
   - ưu tiên Elasticsearch Java client hoặc RestClient đã cấu hình;
   - không thêm search engine mới;
   - không gọi PostgreSQL trong prompt này.
3. Flow xử lý:
   - nhận SearchPlan JSON;
   - Bean Validation;
   - SearchPlanValidator;
   - SearchPlanCompiler;
   - execute DSL trên Elasticsearch index `soc-events-v1`;
   - trả response đã chuẩn hóa.
4. Response tối thiểu:
   - mode;
   - generated_dsl;
   - total;
   - page;
   - size;
   - took_ms hoặc latency_ms;
   - events: danh sách event gồm event_id và các field event.
5. Nếu SearchPlan không hợp lệ, trả 400 rõ ràng.
6. Nếu Elasticsearch lỗi, trả lỗi có kiểm soát, không lộ stack trace.
7. Endpoint có Swagger/OpenAPI annotation hữu ích.
8. Thêm controller test hoặc service test tối thiểu:
   - SearchPlan hợp lệ trả response;
   - size > 100 trả 400;
   - unsupported mode trả 400.
9. Nếu Docker đang chạy và đã seed data, test thật endpoint bằng Invoke-RestMethod.
10. Không triển khai natural language, LLM, summary, audit log, aggregation hoặc frontend.

Giữ endpoint phục vụ ngày 3 và có thể reuse khi ngày 4 thêm LLM.
```

**Checkpoint:**

```powershell
cd backend
.\mvnw.cmd test
cd ..

$body = @{
  mode = "search"
  filters = @{
    timestamp = @{
      gte = "now-24h"
      lte = "now"
    }
    event_type = @("failed_login")
    country_code = @("CN")
  }
  page = 0
  size = 5
} | ConvertTo-Json -Depth 10

Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8081/api/v1/search/plan `
  -ContentType "application/json" `
  -Body $body
```

Kết quả cần có:

- Response có `total > 0`.
- `events` có tối đa 5 item.
- Response có `generated_dsl`.

## 8. Prompt 5 - Event detail endpoint GET /api/v1/events/{event_id}

**Mục tiêu:** mở được chi tiết một event và xem raw log.

```text
Tiếp tục triển khai ngày 3 cho SOC AI Search MVP.

Hãy triển khai endpoint xem chi tiết event:
GET /api/v1/events/{event_id}

Yêu cầu:
1. Đọc EventController/EventIngestService hiện có và mapping Elasticsearch trước khi sửa.
2. Tạo service lookup event theo id từ Elasticsearch index `soc-events-v1`.
3. Response tối thiểu:
   - event_id;
   - index;
   - timestamp;
   - source;
   - severity;
   - event_type;
   - user;
   - host;
   - ip;
   - country_code;
   - message;
   - raw.
4. Nếu event không tồn tại, trả 404 rõ ràng.
5. Không tạo bảng PostgreSQL mới.
6. Không thêm auth, audit log, frontend hoặc LLM.
7. Thêm test:
   - event tồn tại trả 200;
   - event không tồn tại trả 404.
8. Nếu Docker đang chạy, lấy event_id từ `POST /api/v1/search/plan` rồi gọi thử detail endpoint.
9. Chạy backend test và báo file đã tạo/sửa.
```

**Checkpoint:**

```powershell
$search = Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8081/api/v1/search/plan `
  -ContentType "application/json" `
  -Body $body

$eventId = $search.events[0].event_id
Invoke-RestMethod "http://localhost:8081/api/v1/events/$eventId"
```

Kết quả cần có:

- Response detail có `raw`.
- ID không tồn tại trả 404.

## 9. Prompt 6 - Smoke test ngày 3

**Mục tiêu:** chứng minh search core ngày 3 chạy được trên dataset thật.

```text
Tiếp tục triển khai ngày 3 cho SOC AI Search MVP.

Hãy tạo smoke test PowerShell cho ngày 3:
scripts/smoke-test-day-03.ps1

Yêu cầu:
1. Đọc scripts/smoke-test-day-02.ps1 để giữ style nhất quán.
2. Script giả định Docker Compose local đang chạy và dataset ngày 2 đã seed.
3. Script nhận tham số:
   - BackendUrl, mặc định http://localhost:8081
   - ElasticsearchUrl, mặc định http://localhost:9200
   - Index, mặc định soc-events-v1
4. Script kiểm tra:
   - backend health;
   - Elasticsearch health;
   - OpenAPI có `/api/v1/search/plan`;
   - OpenAPI có `/api/v1/events/{event_id}` hoặc endpoint detail tương đương;
   - search failed_login từ CN trong 24h trả total > 0;
   - search message_query `malware detected` trả total > 0;
   - size = 5 thì events trả về không vượt quá 5;
   - request invalid size > 100 trả 400;
   - lấy event_id từ search response và gọi GET detail, response có raw.
5. Smoke script phải fail rõ ràng nếu checkpoint không đạt.
6. Cập nhật README hoặc infra/elasticsearch/README ngắn gọn cách chạy smoke test ngày 3.
7. Không triển khai LLM, aggregation, frontend hoặc audit log.
8. Chạy smoke test và báo kết quả.
```

**Checkpoint:**

```powershell
.\scripts\smoke-test-day-03.ps1
```

Kết quả cần có:

- Smoke test PASS.
- Có bằng chứng search core dùng dataset thật.

## 10. Prompt 7 - Review Ngày 3 và cập nhật tài liệu

**Mục tiêu:** chốt ngày 3 bằng checklist rõ ràng, không triển khai sang ngày 4.

```text
Hãy review và verify toàn bộ kết quả triển khai ngày 3 cho SOC AI Search MVP.

Đọc lại:
- docs/requirement.md
- docs/tech-stack.md
- docs/architecture.md
- docs/sequence-flow.md
- plan/14-day-mvp-plan.md
- README.md
- plan/day-03-ai-prompts.md

Kiểm tra:
1. `SearchPlan` và DTO con dùng Java record.
2. Validator/guardrail là class/service riêng, không nhồi logic vào record.
3. Validator chỉ cho phép field và operation thuộc MVP.
4. Size bị giới hạn tối đa 100.
5. Mode ngày 3 chỉ hỗ trợ `search`; aggregation chưa triển khai.
6. Compiler sinh Elasticsearch DSL có:
   - bool.filter;
   - term/terms;
   - range timestamp;
   - match message_query;
   - pagination;
   - sort timestamp desc.
7. `POST /api/v1/search/plan` hoạt động và có trong Swagger.
8. `GET /api/v1/events/{event_id}` hoạt động, trả raw log.
9. Input search sai trả 400.
10. Event không tồn tại trả 404.
11. Backend test pass.
12. Smoke test ngày 3 pass.
13. docker compose config hợp lệ và stack local vẫn healthy.
14. Không có secret thật hoặc generated dataset lớn trong Git-tracked files.
15. Không triển khai LLM, natural language endpoint, aggregation, frontend search UI, audit log hoặc CSV trong ngày 3.

Sau đó:
1. Sửa lỗi nhỏ nếu phát hiện.
2. Cập nhật README.md nếu cần với:
   - cách gọi SearchPlan endpoint;
   - cách gọi event detail;
   - cách chạy smoke test ngày 3;
   - ghi rõ natural language/LLM sẽ làm ngày 4.
3. Chạy lệnh verify phù hợp.
4. Báo checklist PASS/FAIL theo từng mục.
5. Liệt kê việc còn cần làm ở ngày 4 nhưng không triển khai chúng.
```

**Checkpoint cuối ngày:**

```powershell
docker compose config
docker compose up -d
.\scripts\bootstrap-elasticsearch.ps1
.\scripts\seed-events.ps1 -Count 10000 -BatchSize 1000
.\scripts\smoke-test-day-02.ps1
.\scripts\smoke-test-day-03.ps1

cd backend
.\mvnw.cmd test
cd ..
```

Kết quả cần có:

- Backend có search core an toàn trước khi nối LLM.
- SearchPlan cố định trả đúng event.
- Pagination hoạt động.
- Event detail trả raw log.
- Query không hợp lệ bị từ chối rõ ràng.

## 11. Lưu ý quan trọng

- Ngày 3 là search core kỹ thuật, chưa phải natural language search.
- `POST /api/v1/search/plan` là endpoint để kiểm thử SearchPlan core; ngày 4 mới thêm LLM/NL flow.
- Không triển khai aggregation trong ngày 3 dù MVP có yêu cầu thống kê; phần đó thuộc ngày 5.
- Không gửi raw log vào LLM vì ngày 3 chưa có LLM.
- Không thêm microservices.
- Không thêm công nghệ test/container test ngoài phạm vi MVP.
- Docs là working draft: chỉ cập nhật phần phản ánh đúng code đã triển khai.
