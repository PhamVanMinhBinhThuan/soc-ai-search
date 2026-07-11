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
- Prompt 1-2 ưu tiên filter search trên các field có mapping `keyword`/`date`/`ip`; `message_query` full-text trên field `message` chỉ bổ sung từ Prompt 3 khi triển khai compiler.

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

**Mục tiêu:** định nghĩa contract filter-first có cấu trúc để backend validate/compile, chưa gọi Elasticsearch.

```text
Tiếp tục triển khai ngày 3 cho SOC AI Search MVP.

Hãy đọc trước các file:
- docs/requirement.md
- docs/tech-stack.md
- docs/architecture.md
- docs/sequence-flow.md
- docs/plan/14-day-mvp-plan.md
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
       "timestamp": { "from": "now-24h", "to": "now" },
       "severity": ["high", "critical"],
       "event_type": ["failed_login"],
       "user": "admin",
       "host": "vpn-gw-01",
       "ip": "203.0.113.45",
       "country_code": ["CN"]
     },
     "page": 0,
     "size": 20
   }
6. DTO tối thiểu nên có:
   - SearchPlan
   - SearchMode
   - SearchFilters
   - TimeRange
7. `SearchMode` dùng Java enum. Ngày 3 chỉ định nghĩa và hỗ trợ `SEARCH`; chưa thêm `AGGREGATION` trong ngày 3. Thiết kế enum để ngày 5 có thể mở rộng thêm aggregation.
8. JSON contract vẫn dùng lowercase `"mode": "search"` để thân thiện với API/LLM; backend map vào `SearchMode.SEARCH`.
9. Dùng `@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)` trên các record DTO search để Java dùng camelCase còn JSON dùng snake_case. Không cần annotate từng field bằng `@JsonProperty` trừ khi có field đặc biệt không theo quy tắc. Tối thiểu phải map đúng:
   - eventType <-> event_type
   - countryCode <-> country_code
10. `TimeRange` dùng `from`/`to` theo business representation, không dùng `gte`/`lte` trong SearchPlan. Compiler sẽ dịch `from` -> Elasticsearch `gte` và `to` -> Elasticsearch `lte`.
11. Chưa đưa `message_query` vào Prompt 1. Full-text search trên field `message` sẽ được bổ sung ở Prompt 3 khi triển khai compiler `match` query.
12. Dùng Bean Validation mức cơ bản:
   - mode not null;
   - page >= 0;
   - size từ 1 đến 100;
   - string nếu có thì không blank;
   - list nếu có thì không chứa blank;
   - severity nếu có chỉ nhận low, medium, high, critical bằng Bean Validation trên từng phần tử list, ví dụ `List<@Pattern(regexp = "low|medium|high|critical") String> severity`;
   - country_code nếu có phải là ISO alpha-2 uppercase, regex `^[A-Z]{2}$`, bằng Bean Validation trên từng phần tử list;
   - chưa viết validator service trong Prompt 1; Prompt 2 mới xử lý guardrail nghiệp vụ sâu.
13. Chưa implement validator nghiệp vụ sâu, compiler, executor hoặc controller trong prompt này.
14. Bắt buộc thêm Jackson contract test:
   - ít nhất 1 test deserialize JSON snake_case thành Java record camelCase;
   - ít nhất 1 test serialize Java record camelCase thành JSON snake_case;
   - test phải verify tối thiểu `event_type`, `country_code`;
   - chưa test `message_query` trong Prompt 1 vì field này chưa thuộc filter contract ban đầu.
15. Chạy backend test và báo file đã tạo hoặc sửa.

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
3. `SearchPlan` hiện là DTO cố định bằng Java record, nên validator không cần quét dynamic field lạ. Validator chỉ kiểm tra các field đã khai báo trong `SearchFilters`; compiler ở Prompt 3 chỉ được compile DSL từ các field này.
4. Ngày 3 chỉ hỗ trợ `mode = search`.
   - Nếu mode null hoặc parse không hợp lệ, trả lỗi rõ ở tầng Bean Validation/Jackson/controller khi có endpoint.
   - Vì `SearchMode` hiện chỉ có `SEARCH`, JSON `"mode": "aggregate"` có thể fail deserialize trước khi tới validator; chưa triển khai aggregation trong prompt này.
5. Validate filter và pagination:
   - severity chỉ gồm low, medium, high, critical;
   - country_code là ISO alpha-2 uppercase;
   - ip là IPv4 hợp lệ; ưu tiên dùng helper/library đáng tin cậy hoặc Bean Validation đã có, nếu dùng regex thì giữ đơn giản và phải có test;
   - event_type/user/host không blank nếu xuất hiện;
   - timestamp.from/to hỗ trợ ISO-8601 hoặc relative time đơn giản: now, now-24h, now-7d, now-30d;
   - Prompt 2 chỉ kiểm tra format thời gian hợp lệ, chưa convert relative time sang Instant/ZonedDateTime;
   - việc dịch `from`/`to` thành Elasticsearch `gte`/`lte` để Prompt 3 xử lý trong compiler;
   - nếu cả from và to đều có thì from không được lớn hơn to với ISO-8601 tuyệt đối;
   - page >= 0;
   - size từ 1 đến 100.
6. Reject input nguy hiểm hoặc không thuộc MVP:
   - wildcard tùy ý;
   - script query;
   - cú pháp query tùy ý không nằm trong DTO cố định;
   - size > 100.
7. Error message phải đủ rõ để debug qua Swagger, nhưng không lộ stack trace.
8. Thêm unit test table-driven cho các case:
   - valid failed_login CN last 24h;
   - valid critical severity 7 ngày;
   - invalid severity;
   - invalid IP;
   - invalid country_code;
   - invalid size > 100;
   - mode null;
   - invalid mode value nếu test được ở tầng Jackson deserialize.
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
2. Bổ sung optional `messageQuery` vào `SearchPlan` nếu Prompt 1 chưa có field này.
   - Java vẫn dùng camelCase `messageQuery`;
   - JSON dùng snake_case `message_query` thông qua `@JsonNaming`;
   - đây là full-text query trên field Elasticsearch `message`, không phải keyword filter.
3. Cập nhật Jackson contract test để verify thêm `message_query`.
4. Cập nhật Bean Validation/SearchPlanValidator cho `messageQuery` nếu có:
   - nếu xuất hiện thì không được blank;
   - giới hạn độ dài hợp lý cho MVP, ví dụ tối đa 200 ký tự;
   - không cho phép wildcard/script hoặc cú pháp query tùy ý.
5. Tạo class/service compiler, ví dụ:
   - SearchPlanCompiler
   - CompiledSearchQuery
6. Compiler nhận SearchPlan hợp lệ và sinh Elasticsearch search spec dưới dạng Java structure, ví dụ `Map<String, Object>` hoặc object nội bộ `CompiledSearchQuery` tương thích với Elasticsearch Java Client. Không serialize thành JSON string trong compiler và không dùng `StringBuilder`/string concatenation để tạo DSL.
7. DSL tối thiểu:
   - bool.filter cho filter chính xác;
   - luôn dùng `terms` cho các field dạng list: severity, event_type, country_code, kể cả khi list chỉ có một phần tử; không dùng `term` với array;
   - dùng `term` cho field scalar: user, host, ip; không dùng `terms` cho scalar field trong MVP;
   - range cho timestamp: `from` map sang Elasticsearch `gte`, `to` map sang Elasticsearch `lte`;
   - giữ nguyên Elasticsearch date math string như `now`, `now-24h`, `now-7d`, `now-30d` trong range query; không convert relative time sang `Instant` trong compiler vì Elasticsearch tự hiểu date math;
   - nếu có `messageQuery`, compile thành `match` trên field `message` và đặt trong `bool.must`, không dùng `match_phrase` trong MVP và không đặt full-text query trong `bool.filter`;
   - from = page * size;
   - size = size;
   - sort timestamp desc.
8. Compiler không được sinh script query, wildcard query hoặc query ngoài phạm vi MVP.
9. Timeout và `track_total_hits` không xử lý trong compiler; các cấu hình này thuộc tầng executor/SearchRequest ở Prompt 4.
10. Giữ output DSL/search spec dễ đọc để ngày sau UI có thể hiển thị.
11. Thêm unit test table-driven cho DSL shape:
   - failed_login từ CN trong 24h;
   - critical trong 7 ngày;
   - severity=["high","critical"] sinh `terms` trên field `severity`, không sinh `term` với array;
   - event_type và country_code là list nên cũng dùng `terms`;
   - user/host/ip sinh `term`, không sinh `terms`;
   - timestamp from=`now-24h`, to=`now` sinh range `{ "gte": "now-24h", "lte": "now" }` và giữ nguyên date math string;
   - message_query malware detected tạo `match` trên field `message`;
   - pagination page 2 size 20 => from 40;
   - DSL/search spec luôn có sort timestamp desc.
12. Chạy backend test.

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
   - không gọi PostgreSQL trong prompt này;
   - lấy tên index event từ `ElasticsearchProperties.indexEvents`, không hardcode `soc-events-v1` trong service/executor.
3. Flow xử lý:
   - nhận SearchPlan JSON;
   - Bean Validation;
   - SearchPlanValidator;
   - SearchPlanCompiler;
   - nếu có `message_query`, dùng DSL full-text trên field `message` do compiler sinh;
   - build Elasticsearch SearchRequest từ `CompiledSearchQuery`;
   - áp dụng timeout phù hợp, ví dụ 3s, ở tầng executor/SearchRequest;
   - bật `track_total_hits = true` ở tầng executor/SearchRequest để response pagination có tổng kết quả rõ;
   - execute DSL trên Elasticsearch index lấy từ cấu hình `ELASTICSEARCH_INDEX_EVENTS`;
   - trả response đã chuẩn hóa.
4. Response tối thiểu:
   - mode;
   - generated_dsl dạng JSON object/map, không phải string, để frontend có thể render pretty JSON;
   - total;
   - page;
   - size;
   - total_pages, tính bằng ceil(total / size), nếu total = 0 thì total_pages = 0;
   - latency_ms, dùng tên này để đồng bộ với cột `search_query_logs.latency_ms` về sau;
   - events: danh sách event gồm event_id và các field chính của MVP: timestamp, source, severity, event_type, user, host, ip, country_code, message;
   - khi map Elasticsearch hit, lấy hit metadata `_id` làm `event_id`; các field event còn lại lấy từ `_source`;
   - raw có thể không bắt buộc trong search list để response gọn; Prompt 5 event detail mới bắt buộc trả raw.
5. Nếu SearchPlan không hợp lệ, trả 400 rõ ràng.
6. Nếu search không có kết quả, vẫn trả 200 với `total = 0`, `total_pages = 0` và `events = []`; không trả 404 cho no-result search.
7. Nếu Elasticsearch lỗi, trả lỗi có kiểm soát, không lộ stack trace.
8. Endpoint có Swagger/OpenAPI annotation hữu ích.
9. Thêm controller test hoặc service test tối thiểu:
   - SearchPlan hợp lệ trả response;
   - SearchPlan có `message_query` hợp lệ vẫn trả response;
   - response event map đúng `_id` của Elasticsearch hit thành `event_id`;
   - search không có kết quả trả 200, total = 0 và events = [];
   - size > 100 trả 400;
   - unsupported mode trả 400.
10. Nếu Docker đang chạy và đã seed data, test thật endpoint bằng Invoke-RestMethod.
11. Không triển khai natural language, LLM, summary, audit log, aggregation, frontend hoặc event detail endpoint trong prompt này. Event detail để riêng ở Prompt 5.

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
      from = "now-24h"
      to = "now"
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
2. Tạo service lookup event theo id từ Elasticsearch index lấy từ `ElasticsearchProperties.indexEvents`, không hardcode `soc-events-v1`.
3. `{event_id}` trong URL chính là Elasticsearch document `_id`; khi gọi Elasticsearch Get API, dùng giá trị này làm document id.
4. Validate path variable `event_id`:
   - không null;
   - không blank sau khi trim;
   - trim khoảng trắng đầu/cuối trước khi gọi Elasticsearch;
   - nếu `event_id` blank, trả 400 rõ ràng, không gọi Elasticsearch.
5. Tạo DTO riêng cho detail, ví dụ `EventDetailResponse`. Không tái sử dụng DTO search list như `SearchEvent`, vì detail cần trả thêm `raw` và có contract riêng.
6. Response tối thiểu:
   - event_id;
   - index_name;
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
7. Khi map response:
   - lấy Elasticsearch `_id` làm `event_id`;
   - lấy Elasticsearch `_index` làm `index_name`, hoặc dùng index từ `ElasticsearchProperties.indexEvents` nếu API client không trả `_index` rõ ràng;
   - các field event còn lại lấy từ `_source`, bao gồm `raw`.
8. Nếu document không tồn tại:
   - trả HTTP 404;
   - response body chứa message rõ ràng, ví dụ `{ "message": "Event not found: seed-42-999999" }`;
   - không lộ exception/stack trace từ Elasticsearch.
9. Nếu Elasticsearch hoặc hạ tầng search gặp lỗi:
   - trả HTTP 503 có kiểm soát vì đây là lỗi dependency search engine;
   - response body ngắn gọn, ví dụ `{ "message": "Event detail lookup failed" }`;
   - không lộ stack trace, exception class hoặc thông tin nội bộ qua Swagger/API;
   - có thể log lỗi ở backend để debug nội bộ.
10. Không tạo bảng PostgreSQL mới.
11. Không thêm auth, audit log, frontend hoặc LLM.
12. Thêm test:
   - event tồn tại trả 200;
   - response map đúng Elasticsearch `_id` thành `event_id`;
   - response có `index_name` và `raw`;
   - detail endpoint dùng DTO riêng, không tái sử dụng DTO search list;
   - event không tồn tại trả 404 với body message rõ;
   - `event_id` blank, ví dụ `%20`, trả 400;
   - Elasticsearch lookup lỗi trả 503 có kiểm soát, không lộ stack trace.
13. Nếu Docker đang chạy, lấy event_id từ `POST /api/v1/search/plan` rồi gọi thử detail endpoint.
14. Chạy backend test và báo file đã tạo/sửa.
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
   - search full-text với `message_query = malware detected` trên field `message` trả total > 0;
   - search response phải có `generated_dsl` để chứng minh compiler SearchPlan -> DSL hoạt động;
   - search response phải có `total_pages >= 0`;
   - size = 5 thì events trả về không vượt quá 5;
   - event đầu tiên trong search response phải có `event_id` không blank để chứng minh mapping Elasticsearch `_id` -> API `event_id`;
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
- docs/plan/14-day-mvp-plan.md
- README.md
- docs/plan/day-03-ai-prompts.md

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
   - match trên field `message` khi có `message_query`;
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
16. Search response trả `generated_dsl` dạng JSON object/map, không phải string.
17. Search result map đúng Elasticsearch `_id` thành `event_id`.
18. Search executor và event detail service dùng `ElasticsearchProperties.indexEvents`, không hardcode `soc-events-v1`.

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
- `message_query` nếu được bổ sung từ Prompt 3 chỉ là full-text query kỹ thuật trên field `message`, không phải natural language search hay LLM.
- Không triển khai aggregation trong ngày 3 dù MVP có yêu cầu thống kê; phần đó thuộc ngày 5.
- Không gửi raw log vào LLM vì ngày 3 chưa có LLM.
- Không thêm microservices.
- Không thêm công nghệ test/container test ngoài phạm vi MVP.
- Docs là working draft: chỉ cập nhật phần phản ánh đúng code đã triển khai.
