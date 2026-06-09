# Prompt triển khai Ngày 5 - SOC AI Search MVP

## 1. Cách sử dụng

Ngày 5 nên chia thành **7 prompt cho AI coding agent**. Không gửi toàn bộ ngày 5 trong một prompt lớn.

Sau mỗi prompt:

1. Đọc tóm tắt thay đổi của AI.
2. Kiểm tra file đã tạo hoặc sửa.
3. Chạy lệnh verify mà AI báo cáo.
4. Chỉ chuyển prompt tiếp theo khi checkpoint đạt.
5. Không commit API key, `.env`, generated dataset lớn hoặc secret.

Các prompt dưới đây giả định kết quả ngày 4 đã hoàn thành:

- Có `SearchPlan`, `SearchFilters`, `TimeRange`, `SearchMode`.
- Có `SearchPlanValidator`.
- Có `SearchPlanCompiler`.
- Có `SearchPlanExecutor`.
- Có endpoint kỹ thuật:
  - `POST /api/v1/search/plan`
- Có endpoint natural language:
  - `POST /api/v1/search`
- Có LLM abstraction, mock provider và Gemini provider.
- Có `SearchPlanPromptBuilder` và `SearchPlanJsonParser`.
- Có smoke test ngày 4:
  - `scripts/smoke-test-day-04.ps1`

## 2. Phạm vi Ngày 5

Kết quả cần đạt cuối ngày:

- Hỗ trợ natural language aggregation/statistics trong MVP:
  - `COUNT`;
  - `GROUP_BY`;
  - `TOP_N`;
  - `DATE_HISTOGRAM`.
- LLM vẫn chỉ sinh **JSON SearchPlan thuần**, không sinh Elasticsearch DSL.
- Backend validate aggregation bằng allowlist field.
- Backend compile aggregation thành Elasticsearch DSL an toàn.
- Response aggregation được chuẩn hóa để frontend không cần hiểu Elasticsearch DSL:
  - `aggregation_results`;
  - `chart_metadata`.
- Có regression test cho các câu aggregation chính.
- Có smoke test ngày 5 chạy trên Docker Compose local.

Không làm trong ngày 5:

- AI summarization.
- Query history/audit persistence vào PostgreSQL.
- CSV export.
- Frontend search UI hoặc chart UI.
- Auth/RBAC.
- Vector search, hybrid search hoặc tính năng khuyến khích.
- Local LLM hosting.
- Gửi raw log, search result hoặc event data vào LLM.

## 3. Chuẩn bị trước khi gửi Prompt 1

Chạy stack local và đảm bảo Day 4 vẫn pass:

```powershell
docker compose up -d
.\scripts\bootstrap-elasticsearch.ps1
.\scripts\seed-events.ps1 -Count 10000 -BatchSize 1000
.\scripts\smoke-test-day-04.ps1

cd backend
.\mvnw.cmd test
cd ..
```

Kiểm tra nhanh:

```powershell
Invoke-RestMethod http://localhost:8081/api/v1/health/live
Invoke-WebRequest http://localhost:8081/swagger-ui.html -UseBasicParsing
```

## 4. Prompt 1 - Aggregation contract trong SearchPlan

**Mục tiêu:** mở rộng contract `SearchPlan` để biểu diễn aggregation, chưa compile DSL và chưa gọi Elasticsearch.

```text
Tiếp tục triển khai ngày 5 cho SOC AI Search MVP.

Hãy đọc trước các file:
- docs/requirement.md
- docs/tech-stack.md
- docs/architecture.md
- docs/sequence-flow.md
- plan/14-day-mvp-plan.md
- plan/day-04-ai-prompts.md
- backend/src/main/java/com/soc/ai/search/search/plan/SearchPlan.java
- backend/src/main/java/com/soc/ai/search/search/plan/SearchMode.java
- backend/src/main/java/com/soc/ai/search/search/plan/SearchFilters.java
- backend/src/main/java/com/soc/ai/search/search/plan/TimeRange.java
- backend/src/test/java/com/soc/ai/search/search/plan/SearchPlanJacksonTest.java

Yêu cầu:
1. Kiểm tra trạng thái repository trước khi sửa.
2. Mở rộng `SearchMode` để hỗ trợ:
   - `SEARCH`;
   - `AGGREGATION`.
3. JSON contract vẫn dùng lowercase:
   - `"search"`;
   - `"aggregation"`.
4. Thêm DTO aggregation bằng Java `record`, ví dụ:
   - `AggregationPlan`;
   - `AggregationType`;
   - `HistogramInterval`;
   - nếu cần có `ChartType`, chỉ tạo enum đơn giản, chưa tạo frontend.
5. `AggregationType` tối thiểu gồm:
   - `COUNT`;
   - `GROUP_BY`;
   - `TOP_N`;
   - `DATE_HISTOGRAM`.
6. `HistogramInterval` tối thiểu gồm:
   - `minute`;
   - `hour`;
   - `day`.
7. `AggregationPlan` tối thiểu có:
   - `type`;
   - `field`;
   - `top_n`;
   - `interval`.
8. Mở rộng `SearchPlan` để có optional `aggregation`.
   - Với `mode = search`, `aggregation` có thể null.
   - Với `mode = aggregation`, `aggregation` sẽ được validator kiểm tra ở Prompt 2.
9. Tiếp tục dùng Java `record` cho DTO data model; không nhồi business logic vào record.
10. Dùng `@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)` để JSON dùng snake_case:
    - `topN` <-> `top_n`;
    - `eventType` <-> `event_type`;
    - `countryCode` <-> `country_code`.
11. Không sửa compiler, executor hoặc endpoint trong prompt này.
12. Không thêm summary, audit log, CSV, frontend hoặc auth.
13. Thêm Jackson contract test:
    - deserialize SearchPlan aggregation `TOP_N` từ JSON snake_case;
    - serialize SearchPlan aggregation ra JSON snake_case;
    - verify `mode = "aggregation"`;
    - verify `aggregation.type`, `aggregation.field`, `aggregation.top_n`, `aggregation.interval`;
    - verify SearchPlan search ngày 4 vẫn serialize/deserialize như cũ.
14. Chạy backend test và báo file đã tạo hoặc sửa.

Giữ thay đổi nhỏ gọn. Đây chỉ là contract data model cho aggregation.
```

**Checkpoint:**

```powershell
cd backend
.\mvnw.cmd test
cd ..
```

Kết quả cần có:

- `SearchMode` hỗ trợ `aggregation`.
- Có `AggregationPlan`.
- Jackson test pass.
- Search flow ngày 4 chưa bị phá.

## 5. Prompt 2 - Validator/guardrail cho aggregation

**Mục tiêu:** chặn aggregation ngoài MVP trước khi compile DSL.

```text
Tiếp tục triển khai ngày 5 cho SOC AI Search MVP.

Hãy triển khai validator/guardrail cho aggregation trong SearchPlan.

Yêu cầu:
1. Đọc SearchPlan aggregation contract vừa tạo, SearchPlanValidator hiện có và mapping Elasticsearch:
   - infra/elasticsearch/soc-events-v1-index.json
2. Cập nhật `SearchPlanValidator` hoặc tạo helper/service nhỏ nếu cần, nhưng không tách abstraction quá lớn.
3. Validator phải hỗ trợ:
   - `mode = search`;
   - `mode = aggregation`.
4. Với `mode = search`:
   - giữ nguyên behavior ngày 4;
   - nếu `aggregation` xuất hiện thì reject rõ ràng.
5. Với `mode = aggregation`:
   - `aggregation` bắt buộc không null;
   - `filters` vẫn dùng lại filter ngày 4;
   - `message_query` không dùng cho aggregation trong MVP, nếu xuất hiện thì reject rõ ràng;
   - `page` vẫn phải hợp lệ nếu contract yêu cầu, nhưng aggregation không dùng pagination event list;
   - `size` là upper bound cho số bucket khi cần, vẫn giới hạn 1-100.
6. Allowlist field cho aggregation:
   - `source`;
   - `severity`;
   - `event_type`;
   - `user`;
   - `host`;
   - `ip`;
   - `country_code`.
7. Reject các field ngoài allowlist:
   - `message`;
   - `raw`;
   - `timestamp` cho group/top;
   - field lạ như `password`;
   - field có `.keyword` do user/LLM sinh ra.
8. Quy tắc theo `AggregationType`:
   - `COUNT`: không cần `field`, không cần `top_n`, không cần `interval`;
   - `GROUP_BY`: cần `field` trong allowlist, `top_n` optional nhưng nếu có phải 1-100;
   - `TOP_N`: cần `field` trong allowlist, `top_n` bắt buộc 1-100;
   - `DATE_HISTOGRAM`: không dùng `field` tùy ý, luôn chạy trên `timestamp`; cần `interval` là `minute`, `hour` hoặc `day`.
9. Không tự thêm `.keyword` vào field trong validator. Mapping MVP hiện tại đã định nghĩa `user`, `host`, `ip`, `severity`, `event_type`, `country_code`, `source` là keyword/ip trực tiếp.
10. Error message phải rõ để debug qua Swagger, không lộ stack trace.
11. Thêm unit test table-driven:
    - valid COUNT với filter failed_login 7 ngày;
    - valid GROUP_BY user;
    - valid TOP_N ip top 10;
    - valid DATE_HISTOGRAM hour;
    - invalid aggregation null khi mode aggregation;
    - invalid aggregation trong mode search;
    - invalid field `message`;
    - invalid field `raw`;
    - invalid field `user.keyword`;
    - invalid top_n > 100;
    - invalid DATE_HISTOGRAM interval;
    - invalid message_query trong aggregation.
12. Chạy backend test và báo file đã tạo hoặc sửa.

Không gọi Elasticsearch trong prompt này. Không triển khai LLM prompt, executor, summary, audit log, CSV hoặc frontend.
```

**Checkpoint:**

```powershell
cd backend
.\mvnw.cmd test
cd ..
```

Kết quả cần có:

- Aggregation guardrail pass.
- Field ngoài allowlist bị reject.
- Search validator ngày 4 vẫn pass.

## 6. Prompt 3 - Compiler aggregation DSL

**Mục tiêu:** compile `SearchPlan` aggregation thành Elasticsearch search spec an toàn, chưa execute Elasticsearch.

```text
Tiếp tục triển khai ngày 5 cho SOC AI Search MVP.

Hãy triển khai compiler chuyển SearchPlan aggregation đã validate thành Elasticsearch DSL/search spec.

Yêu cầu:
1. Đọc:
   - SearchPlan aggregation contract;
   - SearchPlanValidator;
   - SearchPlanCompiler hiện có;
   - mapping `infra/elasticsearch/soc-events-v1-index.json`.
2. Có thể mở rộng `SearchPlanCompiler` hiện tại hoặc tạo class compiler nhỏ cho aggregation, nhưng API phải dễ dùng cho executor ngày 5.
3. Compiler không serialize JSON string bằng `StringBuilder`; output là Java structure như `Map<String, Object>` hoặc object nội bộ tương thích với RestClient.
4. Giữ compiler search ngày 4 hoạt động như cũ.
5. Với mọi aggregation:
   - vẫn compile filter vào `bool.filter` giống search;
   - không dùng wildcard query;
   - không dùng script query;
   - không dùng query string tự do.
6. `COUNT`:
   - sinh search spec với `size = 0`;
   - không cần `aggs`;
   - executor sẽ lấy `hits.total`.
7. `GROUP_BY`:
   - dùng Elasticsearch `terms` aggregation;
   - field lấy từ allowlist;
   - size bucket dùng `aggregation.top_n` nếu có, nếu không dùng request `size`, capped 100;
   - không thêm `.keyword`.
8. `TOP_N`:
   - dùng Elasticsearch `terms` aggregation;
   - field lấy từ allowlist;
   - size bucket dùng `aggregation.top_n`, capped 100;
   - không thêm `.keyword`.
9. `DATE_HISTOGRAM`:
   - dùng Elasticsearch `date_histogram` trên field `timestamp`;
   - interval map:
     - `minute` -> `calendar_interval` hoặc `fixed_interval` phù hợp, ví dụ `1m`;
     - `hour` -> `1h`;
     - `day` -> `1d`;
   - sort bucket theo thời gian tăng dần nếu DSL hỗ trợ rõ ràng.
10. Aggregation name nên ổn định, ví dụ:
    - `count_by_field`;
    - `top_values`;
    - `events_over_time`.
11. Output DSL/search spec phải có `generated_dsl` dễ đọc để frontend render pretty JSON.
12. Timeout và `track_total_hits` vẫn thuộc executor, không đặt ở compiler nếu hiện kiến trúc đang làm vậy.
13. Thêm unit test table-driven cho DSL shape:
    - COUNT failed_login 7 ngày -> `size = 0`, không có `aggs`;
    - GROUP_BY user -> `terms.field = "user"`;
    - TOP_N ip top 10 -> `terms.field = "ip"`, `terms.size = 10`;
    - DATE_HISTOGRAM hour -> aggregation trên `timestamp`;
    - filter severity/event_type/country_code vẫn compile đúng `terms`;
    - field không có `.keyword`;
    - compiler không sinh script/wildcard/query_string.
14. Chạy backend test và báo file đã tạo hoặc sửa.

Không execute Elasticsearch trong prompt này. Không triển khai LLM, summary, audit log, CSV hoặc frontend.
```

**Checkpoint:**

```powershell
cd backend
.\mvnw.cmd test
cd ..
```

Kết quả cần có:

- Compiler aggregation DSL pass.
- Không dùng `.keyword` sai mapping.
- Search compiler ngày 4 vẫn pass.

## 7. Prompt 4 - Aggregation executor và endpoint kỹ thuật

**Mục tiêu:** chạy được aggregation bằng SearchPlan cố định qua endpoint kỹ thuật trước khi nối LLM.

```text
Tiếp tục triển khai ngày 5 cho SOC AI Search MVP.

Hãy triển khai aggregation executor và mở rộng endpoint kỹ thuật:
POST /api/v1/search/plan

Yêu cầu:
1. Đọc:
   - SearchPlanCompiler aggregation vừa tạo;
   - SearchPlanExecutor hiện có;
   - SearchController hiện có;
   - ElasticsearchSearchResponseMapper hiện có;
   - docs/sequence-flow.md.
2. Endpoint `/api/v1/search/plan` phải tiếp tục hỗ trợ mode `search` như ngày 4, không phá response search hiện có.
3. Với `mode = aggregation`, endpoint phải:
   - validate SearchPlan;
   - compile DSL aggregation;
   - execute Elasticsearch trên index từ `ElasticsearchProperties.indexEvents`, không hardcode `soc-events-v1`;
   - trả response aggregation chuẩn hóa.
4. Tạo response DTO riêng cho aggregation, ví dụ:
   - `AggregationSearchResponse`;
   - `AggregationResultItem`;
   - `ChartMetadata`.
5. Response aggregation tối thiểu:
   - `mode`;
   - `aggregation_type`;
   - `generated_dsl` dạng object/map, không phải string;
   - `total`;
   - `latency_ms`;
   - `aggregation_results`: danh sách `{ key, value }`;
   - `chart_metadata`: object `{ chart_type, x_axis_label, y_axis_label }`.
6. Mapping response:
   - `COUNT`: `total` lấy từ `hits.total`, `aggregation_results` có thể chứa một item `{ key: "total", value: total }`;
   - `GROUP_BY`/`TOP_N`: map buckets thành `{ key, value }`;
   - `DATE_HISTOGRAM`: map buckets thành `{ key, value }`, key là timestamp bucket dạng string.
7. Chart metadata gợi ý:
   - `GROUP_BY`/`TOP_N` -> `BAR`;
   - nếu field là `severity` hoặc `country_code`, có thể dùng `PIE` hoặc `BAR`; để MVP đơn giản, chọn `BAR` cũng được;
   - `DATE_HISTOGRAM` -> `LINE`;
   - `COUNT` -> `NUMBER` hoặc `BAR` nếu chưa có enum `NUMBER`.
8. Executor áp dụng:
   - timeout hợp lý, ví dụ 3s;
   - `track_total_hits = true`;
   - không dùng script/wildcard/query_string.
9. Nếu aggregation không có bucket, vẫn trả HTTP 200 với `aggregation_results = []`, không trả 404.
10. Nếu Elasticsearch lỗi, trả lỗi có kiểm soát, không lộ stack trace.
11. Swagger/OpenAPI phải hiển thị endpoint vẫn dùng được cho search và aggregation.
12. Thêm test:
    - SearchPlan search cũ vẫn trả response như trước;
    - COUNT response lấy từ total;
    - TOP_N response map buckets;
    - DATE_HISTOGRAM response map buckets;
    - response có `chart_metadata`;
    - `generated_dsl` là object/map, không phải string;
    - no-bucket aggregation trả 200 với `aggregation_results = []`;
    - Elasticsearch lỗi trả lỗi có kiểm soát.
13. Nếu Docker đang chạy và dataset đã seed, test thật bằng Invoke-RestMethod với:
    - COUNT failed_login 7 ngày;
    - TOP_N ip;
    - DATE_HISTOGRAM hour.
14. Chạy backend test và báo file đã tạo hoặc sửa.

Không triển khai natural language aggregation trong prompt này. Không triển khai summary, audit log, CSV hoặc frontend.
```

**Checkpoint:**

```powershell
cd backend
.\mvnw.cmd test
cd ..

$body = @{
  mode = "aggregation"
  filters = @{
    timestamp = @{ from = "now-7d"; to = "now" }
    event_type = @("failed_login")
  }
  aggregation = @{
    type = "top_n"
    field = "user"
    top_n = 10
  }
  page = 0
  size = 10
} | ConvertTo-Json -Depth 20

Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8081/api/v1/search/plan `
  -ContentType "application/json" `
  -Body $body
```

Kết quả cần có:

- Aggregation technical endpoint chạy được.
- Response có `aggregation_results` và `chart_metadata`.
- Search technical endpoint cũ vẫn chạy.

## 8. Prompt 5 - Natural language aggregation và mock regression

**Mục tiêu:** LLM/mock sinh được aggregation SearchPlan cho 3 câu demo MVP.

```text
Tiếp tục triển khai ngày 5 cho SOC AI Search MVP.

Hãy mở rộng natural language search để hỗ trợ aggregation mode.

Yêu cầu:
1. Đọc:
   - `SearchPlanPromptBuilder`;
   - `SearchPlanJsonParser`;
   - `MockLlmClient`;
   - `NaturalLanguageSearchService`;
   - endpoint `/api/v1/search`;
   - aggregation executor/response vừa tạo.
2. Cập nhật `SearchPlanPromptBuilder`:
   - mô tả mode `aggregation`;
   - mô tả `AggregationPlan` schema;
   - cho LLM sinh `COUNT`, `GROUP_BY`, `TOP_N`, `DATE_HISTOGRAM`;
   - nhắc lại LLM chỉ sinh JSON SearchPlan, không sinh Elasticsearch DSL;
   - nhắc lại field allowlist aggregation;
   - nhắc không dùng `.keyword`;
   - không gửi raw log, search result hoặc event document vào LLM.
3. Cập nhật `MockLlmClient` để hỗ trợ 3 câu aggregation MVP:
   - "Đếm số lần login thất bại theo từng user trong 7 ngày qua"
   - "Top 10 IP có nhiều alert nhất tháng này"
   - "Số event theo giờ trong 24h qua"
4. Mapping bắt buộc:
   - Câu 1:
     - `mode = "aggregation"`;
     - `filters.timestamp.from = "now-7d"`;
     - `filters.timestamp.to = "now"`;
     - `filters.event_type = ["failed_login"]`;
     - `aggregation.type = "top_n"` hoặc `"group_by"` theo lựa chọn nhất quán;
     - `aggregation.field = "user"`;
     - `aggregation.top_n = 10`.
   - Câu 2:
     - `mode = "aggregation"`;
     - timestamp trong tháng này nếu đã hỗ trợ relative time phù hợp; nếu chưa hỗ trợ `now/M`, dùng `now-30d` cho MVP và ghi rõ trade-off;
     - `aggregation.type = "top_n"`;
     - `aggregation.field = "ip"`;
     - `aggregation.top_n = 10`.
   - Câu 3:
     - `mode = "aggregation"`;
     - `filters.timestamp.from = "now-24h"`;
     - `filters.timestamp.to = "now"`;
     - `aggregation.type = "date_histogram"`;
     - `aggregation.interval = "hour"`.
5. Cập nhật `NaturalLanguageSearchService`:
   - route `mode = search` sang search executor như ngày 4;
   - route `mode = aggregation` sang aggregation executor;
   - response `/api/v1/search` phải hỗ trợ cả search và aggregation.
6. Response natural language aggregation tối thiểu:
   - `original_question`;
   - `mode`;
   - `search_plan`;
   - `generated_dsl`;
   - `total`;
   - `llm_latency_ms`;
   - `search_latency_ms` hoặc `aggregation_latency_ms` nếu bạn chọn tên mới;
   - `latency_ms`;
   - `aggregation_type`;
   - `aggregation_results`;
   - `chart_metadata`;
   - `events` có thể là `[]` hoặc null với aggregation, nhưng nên dùng `[]` để frontend dễ xử lý.
7. Pagination/bucket guardrail:
   - backend vẫn override `page` và `size` từ request;
   - với aggregation, request `size` là upper bound cho số bucket;
   - final `top_n = min(LLM top_n nếu có, request size, 100)`;
   - nếu LLM không trả `top_n` cho `TOP_N/GROUP_BY`, dùng request `size`;
   - không để LLM tự nâng số bucket vượt request.
8. Repair/retry một lần từ ngày 4 vẫn hoạt động với aggregation.
9. Thêm unit/service/controller test:
   - 3 câu aggregation mock parse thành `SearchPlan` đúng mapping;
   - 3 plan pass validator;
   - endpoint `/api/v1/search` với mock trả response aggregation;
   - response có `aggregation_results` và `chart_metadata`;
   - `generated_dsl` là object/map, không phải string;
   - request `size = 5`, LLM `top_n = 10` thì final bucket size không vượt 5;
   - unsupported aggregation field bị reject rõ;
   - search câu ngày 4 vẫn chạy.
10. Nếu Docker đang chạy và dataset đã seed, test thật 3 câu bằng Invoke-RestMethod với provider mock.
11. Chạy backend test và báo file đã tạo hoặc sửa.

Không triển khai summary, audit persistence, CSV, frontend hoặc auth.
```

**Checkpoint:**

```powershell
cd backend
.\mvnw.cmd test
cd ..

$body = @{
  question = "Top 10 IP có nhiều alert nhất tháng này"
  page = 0
  size = 10
} | ConvertTo-Json -Depth 20

Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8081/api/v1/search `
  -ContentType "application/json" `
  -Body $body
```

Kết quả cần có:

- Natural language aggregation chạy được bằng mock.
- Không cần API key thật.
- Response có `aggregation_results`, `chart_metadata`, `generated_dsl`.

## 9. Prompt 6 - Smoke test ngày 5 và README

**Mục tiêu:** chứng minh aggregation ngày 5 chạy end-to-end trên Docker Compose local.

```text
Tiếp tục triển khai ngày 5 cho SOC AI Search MVP.

Hãy tạo smoke test PowerShell cho ngày 5:
scripts/smoke-test-day-05.ps1

Yêu cầu:
1. Đọc:
   - `scripts/smoke-test-day-04.ps1`;
   - README.md.
2. Script giả định Docker Compose local đang chạy, backend dùng `LLM_PROVIDER=mock` và dataset ngày 2 đã seed.
3. Script nhận tham số:
   - BackendUrl, mặc định http://localhost:8081
   - ElasticsearchUrl, mặc định http://localhost:9200
   - Index, mặc định soc-events-v1
4. Script kiểm tra:
   - backend health;
   - Elasticsearch health;
   - OpenAPI có `/api/v1/search`;
   - OpenAPI có `/api/v1/search/plan`;
   - technical aggregation `COUNT` qua `/api/v1/search/plan`;
   - technical aggregation `TOP_N` qua `/api/v1/search/plan`;
   - technical aggregation `DATE_HISTOGRAM` qua `/api/v1/search/plan`;
   - natural language câu "Đếm số lần login thất bại theo từng user trong 7 ngày qua";
   - natural language câu "Top 10 IP có nhiều alert nhất tháng này";
   - natural language câu "Số event theo giờ trong 24h qua".
5. Với mỗi response aggregation, verify:
   - `mode = "aggregation"`;
   - `search_plan.mode = "aggregation"` nếu endpoint NL trả `search_plan`;
   - `generated_dsl` là object/map, không phải string;
   - `aggregation_type` tồn tại;
   - `aggregation_results` tồn tại;
   - `chart_metadata` tồn tại;
   - `chart_metadata.chart_type` phù hợp:
     - TOP_N/GROUP_BY -> BAR;
     - DATE_HISTOGRAM -> LINE;
   - số item trong `aggregation_results` không vượt quá request `size` hoặc `top_n` với TOP_N/GROUP_BY;
   - không có field `.keyword` trong generated_dsl.
6. Smoke script phải fail rõ ràng nếu checkpoint không đạt.
7. Cập nhật README.md với:
   - cách gọi aggregation bằng `/api/v1/search`;
   - ví dụ 3 câu aggregation demo;
   - cách chạy smoke test ngày 5;
   - ghi rõ ngày 5 chưa làm summary, audit persistence, CSV và frontend chart UI.
8. Không triển khai summary, audit log, CSV, frontend hoặc auth.
9. Chạy smoke test và báo kết quả.
```

**Checkpoint:**

```powershell
.\scripts\smoke-test-day-05.ps1
```

Kết quả cần có:

- Smoke test ngày 5 PASS.
- Không cần API key thật để pass.
- Aggregation response đủ `aggregation_results` và `chart_metadata`.

## 10. Prompt 7 - Review ngày 5 và cập nhật tài liệu

**Mục tiêu:** chốt ngày 5 bằng checklist rõ ràng, không triển khai sang ngày 6.

```text
Hãy review và verify toàn bộ kết quả triển khai ngày 5 cho SOC AI Search MVP.

Đọc lại:
- docs/requirement.md
- docs/tech-stack.md
- docs/architecture.md
- docs/sequence-flow.md
- plan/14-day-mvp-plan.md
- plan/day-05-ai-prompts.md
- README.md

Kiểm tra:
1. `SearchMode` có `SEARCH` và `AGGREGATION`.
2. Có `AggregationPlan` hoặc DTO tương đương.
3. Aggregation type hỗ trợ `COUNT`, `GROUP_BY`, `TOP_N`, `DATE_HISTOGRAM`.
4. Validator reject aggregation field ngoài allowlist.
5. Validator reject `.keyword` do LLM/user sinh ra.
6. COUNT dùng `hits.total` và `size = 0`, không cần aggregation DSL riêng.
7. GROUP_BY/TOP_N dùng `terms` aggregation.
8. DATE_HISTOGRAM dùng `date_histogram` trên `timestamp`.
9. Compiler không sinh wildcard/script/query_string.
10. Aggregation field dùng mapping hiện tại, không tự thêm `.keyword`.
11. `/api/v1/search/plan` vẫn chạy được mode search ngày 4.
12. `/api/v1/search/plan` chạy được mode aggregation.
13. `/api/v1/search` chạy được câu natural language search ngày 4.
14. `/api/v1/search` chạy được 3 câu natural language aggregation ngày 5 bằng mock.
15. Response aggregation có `generated_dsl` object/map, không phải string.
16. Response aggregation có `aggregation_results`.
17. Response aggregation có `chart_metadata`.
18. Bucket count không vượt quá request `size` hoặc `top_n` đã giới hạn.
19. No-result/no-bucket aggregation trả 200 với `aggregation_results = []`.
20. Backend test pass.
21. Smoke test ngày 5 pass.
22. docker compose config hợp lệ và stack local healthy.
23. Không persist audit log vào PostgreSQL trong ngày 5.
24. Không triển khai summary, frontend chart UI, CSV hoặc auth trong ngày 5.
25. Không có API key thật hoặc generated dataset lớn trong Git-tracked files.

Sau đó:
1. Sửa lỗi nhỏ nếu phát hiện.
2. Cập nhật README.md nếu cần với:
   - cách gọi aggregation;
   - cách chạy smoke test ngày 5;
   - response contract `aggregation_results` và `chart_metadata`;
   - ghi rõ frontend chart UI sẽ làm ngày 6.
3. Chạy verify phù hợp.
4. Báo checklist PASS/FAIL theo từng mục.
5. Liệt kê việc còn cần làm ở ngày 6 nhưng không triển khai chúng.
```

**Checkpoint cuối ngày:**

```powershell
docker compose config
docker compose up -d
.\scripts\bootstrap-elasticsearch.ps1
.\scripts\seed-events.ps1 -Count 10000 -BatchSize 1000
.\scripts\smoke-test-day-04.ps1
.\scripts\smoke-test-day-05.ps1

cd backend
.\mvnw.cmd test
cd ..
```

Kết quả cần có:

- Search ngày 4 vẫn chạy.
- Aggregation ngày 5 chạy qua SearchPlan và natural language mock.
- Response có `aggregation_results`, `chart_metadata`, `generated_dsl`.
- Backend vẫn kiểm soát validate và compile DSL.

## 11. Lưu ý quan trọng

- Ngày 5 chỉ làm **natural language aggregation -> SearchPlan -> Elasticsearch aggregation**.
- Ngày 5 chưa làm summary LLM; phần đó thuộc ngày 7.
- Ngày 5 chưa persist query history/audit log vào PostgreSQL; phần đó thuộc ngày 7.
- Ngày 5 chưa làm frontend chart UI; phần đó thuộc ngày 6.
- Ngày 5 chưa làm CSV export; phần đó thuộc ngày 7.
- Không gửi raw log hoặc event data vào Cloud LLM.
- Không commit API key thật.
- Không thêm local LLM hosting trong sprint này.
- Docs là working draft: chỉ cập nhật phần phản ánh đúng code đã triển khai.
