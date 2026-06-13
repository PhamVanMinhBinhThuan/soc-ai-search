# Prompt triển khai Ngày 7 - SOC AI Search MVP

## 1. Review kế hoạch Day 7

Day 7 là phạm vi bắt buộc của MVP vì `requirement.md` yêu cầu:

- summary 3-5 câu;
- export CSV;
- recent query history;
- audit log mọi truy vấn nghiệp vụ.

Một bảng `search_query_logs` hiện tại đã đủ cho history, audit và export theo `query_id`; không cần thêm table. Các điểm cần khóa rõ khi triển khai:

- chỉ audit những request đã đi vào orchestration; request bị Spring Bean Validation chặn trước controller service có thể không có audit record;
- response search thành công cần trả `query_id`;
- summary phải dùng statistics của toàn bộ tập matched event, không chỉ page hiện tại;
- không gửi raw log hoặc toàn bộ result vào LLM;
- summary lỗi phải fallback và không làm search thất bại;
- CSV phải chạy lại SearchPlan đã lưu, không nhận DSL từ client, và giới hạn 10.000 dòng;
- mode lưu trong database dùng `search` hoặc `aggregation`, thống nhất với contract hiện tại.

## 2. Phạm vi và thứ tự thực hiện

Ngày 7 được chia thành **4 prompt**:

1. PostgreSQL audit log và recent history.
2. LLM summarization có deterministic fallback.
3. Export CSV theo `query_id`.
4. Frontend integration, smoke test và review cuối ngày.

Chỉ chuyển sang prompt tiếp theo khi prompt trước đã chạy test thành công. Không triển khai auth/RBAC, saved query, multi-turn conversation, vector search hoặc bảng PostgreSQL mới.

Các prompt giả định:

- `POST /api/v1/search` đã hỗ trợ `search` và `aggregation`.
- Frontend đã gọi API thật, hiển thị event table, chart và event detail.
- PostgreSQL đã có Flyway migration tạo đúng một bảng `search_query_logs`.
- `demo-analyst` là identity demo của MVP.
- Gemini và mock provider đã hoạt động; mock vẫn dùng cho test.

---

## Prompt 1 - Audit persistence và recent history

```text
Tiếp tục triển khai ngày 7 cho SOC AI Search MVP.

Hãy triển khai audit persistence và recent query history bằng PostgreSQL.

Đọc trước:
- docs/requirement.md
- docs/architecture.md
- docs/sequence-flow.md
- plan/14-day-mvp-plan.md
- backend/src/main/resources/db/migration/V1__create_search_query_logs.sql
- backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchService.java
- backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchResponse.java
- backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchController.java
- backend/src/main/java/com/soc/ai/search/search/plan/SearchPlan.java

Yêu cầu:
1. Kiểm tra trạng thái repository trước khi sửa. Không ghi đè thay đổi hiện có.
2. MVP tiếp tục chỉ dùng một bảng PostgreSQL `search_query_logs`; không tạo bảng users, audit_logs, query_history hoặc saved_queries mới.
3. Tạo package phù hợp, ví dụ:
   - `com.soc.ai.search.audit`
   - `com.soc.ai.search.history`
4. Map bảng `search_query_logs` bằng Spring Data JPA/Hibernate:
   - `id`: UUID;
   - `user_identity`;
   - `question`;
   - `search_plan`: JSONB nullable;
   - `generated_dsl`: JSONB nullable;
   - `mode`;
   - `result_count`;
   - `latency_ms`;
   - `status`;
   - `error_message`;
   - `summary`;
   - `created_at`.
5. Dùng enum nội bộ cho status:
   - `SUCCESS`;
   - `FAILED`.
   Database vẫn lưu string rõ ràng.
6. JSONB phải được lưu bằng mapping JSON có cấu trúc như `JsonNode` hoặc kiểu phù hợp với Hibernate 6. Không tự nối JSON bằng string và không tạo migration mới nếu schema V1 hiện tại đã đủ.
7. Thêm cấu hình:
   - `APP_DEMO_USER_IDENTITY`, mặc định `demo-analyst`;
   - cập nhật `application.properties`, `.env.example` và `docker-compose.yml`;
   - không hardcode identity ở nhiều service.
8. Mỗi lần gọi `POST /api/v1/search` phải có một `query_id` UUID được tạo ở backend.
9. Truy vấn thành công phải lưu:
   - identity;
   - original question;
   - validated SearchPlan;
   - generated DSL;
   - mode `search` hoặc `aggregation`;
   - result count;
   - total latency;
   - status SUCCESS;
   - error null;
   - created_at.
10. Truy vấn thất bại ở LLM, parser/validator, Elasticsearch hoặc dependency phải cố gắng lưu FAILED:
    - lưu những field đã có tại thời điểm lỗi;
    - `error_message` phải sanitize, giới hạn độ dài hợp lý và không chứa stack trace, API key, prompt đầy đủ hoặc secret;
    - không lưu raw event.
11. Không dùng AOP phức tạp. Giữ orchestration trong service rõ ràng và test được.
12. Mở rộng response thành công của `/api/v1/search` có:
    - `query_id`;
    - giữ nguyên toàn bộ contract ngày 4-6.
13. Tạo API:
    - `GET /api/v1/search/history?limit=20`
    - `GET /api/v1/audit-logs?limit=50`
14. Guardrail cho limit:
    - history mặc định 20, audit mặc định 50;
    - minimum 1;
    - maximum 100.
15. History chỉ lấy identity demo hiện tại, sắp xếp `created_at DESC`, response gọn gồm:
    - query_id;
    - question;
    - mode;
    - result_count;
    - latency_ms;
    - status;
    - summary nullable;
    - created_at.
16. Audit endpoint dùng cùng table nhưng có thể trả thêm `user_identity` và `error_message` đã sanitize. Không trả raw prompt nội bộ, secret hoặc stack trace.
17. Nếu PostgreSQL persistence lỗi, trả lỗi dependency có kiểm soát; không lộ stack trace qua API.
18. Thêm Swagger/OpenAPI annotation hữu ích.
19. Thêm test:
    - save SUCCESS search;
    - save SUCCESS aggregation;
    - save FAILED khi LLM lỗi;
    - save FAILED khi Elasticsearch lỗi;
    - JSONB SearchPlan/DSL được round-trip đúng;
    - error message không chứa stack trace/secret;
    - response search có query_id;
    - history sắp xếp mới nhất trước và lọc theo demo identity;
    - limit > 100 trả 400;
    - audit endpoint trả status và error đã sanitize.
20. Không thêm Testcontainers trong Day 7. Unit/controller test dùng mock; verify JSONB/PostgreSQL thật bằng Docker Compose local và smoke test.
21. Chạy backend test. Nếu Docker đang chạy, gọi một search thành công và một request lỗi đã đi vào orchestration rồi kiểm tra record bằng API history/audit.
22. Báo file đã tạo/sửa, lệnh verify và kết quả.

Không triển khai summary LLM, CSV hoặc frontend trong prompt này.
```

### Checkpoint Prompt 1

```powershell
cd backend
.\mvnw.cmd test
cd ..

Invoke-RestMethod "http://localhost:8081/api/v1/search/history?limit=10"
Invoke-RestMethod "http://localhost:8081/api/v1/audit-logs?limit=10"
```

---

## Prompt 2 - LLM summarization và fallback

```text
Tiếp tục triển khai ngày 7 cho SOC AI Search MVP.

Hãy triển khai summary 3-5 câu cho kết quả search và aggregation, có deterministic fallback.

Đọc trước:
- docs/requirement.md
- plan/14-day-mvp-plan.md
- implementation audit/history từ Prompt 1
- backend/src/main/java/com/soc/ai/search/llm/LlmClient.java
- backend/src/main/java/com/soc/ai/search/llm/gemini/GeminiLlmClient.java
- backend/src/main/java/com/soc/ai/search/llm/mock/MockLlmClient.java
- backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchService.java
- backend/src/main/java/com/soc/ai/search/search/execution/SearchPlanExecutor.java

Yêu cầu:
1. Kiểm tra repository và đọc code hiện tại trước khi sửa.
2. Tạo các model/service nhỏ, ví dụ:
   - `SummaryPayload`;
   - `SummaryPayloadBuilder`;
   - `ResultSummaryService`;
   - `SummarySource` với `LLM` và `FALLBACK`.
3. Summary payload chỉ được chứa dữ liệu đã giới hạn:
   - mode;
   - total;
   - top 5 user;
   - top 5 host;
   - top 5 IP;
   - severity distribution;
   - tối đa 5 sample event với field cần thiết như timestamp, severity, event_type, user, host, ip, country_code và message.
4. Tuyệt đối không đưa vào summary prompt:
   - `raw`;
   - toàn bộ search result;
   - API key/password/secret;
   - Elasticsearch DSL nếu không cần;
   - quá 5 sample event.
5. Dữ liệu top user/host/IP và severity phải được lấy bằng một Elasticsearch summary query nhỏ gọn trên cùng filter đã validate:
   - dùng `size` tối đa 5 cho sample hits;
   - terms aggregation size tối đa 5;
   - không dùng script, wildcard hoặc query_string;
   - không tự thêm `.keyword` vì mapping hiện tại là keyword/ip trực tiếp.
6. Không tính top statistics chỉ từ page hiện tại vì kết quả sẽ sai với toàn bộ tập matched event.
7. Mở rộng abstraction LLM ở mức tối thiểu để hỗ trợ `generateSummary(...)`:
   - Gemini dùng cùng provider/config hiện tại;
   - mock provider trả summary deterministic để test không gọi mạng;
   - không phá method NL -> SearchPlan hiện có.
8. Summary prompt phải yêu cầu:
   - 3-5 câu ngắn;
   - nêu total, top entities và đặc điểm severity nổi bật nếu có;
   - không bịa dữ liệu ngoài payload;
   - không markdown, không code fence;
   - không đưa ra kết luận chắc chắn vượt quá dữ liệu;
   - ưu tiên trả cùng ngôn ngữ với câu hỏi gốc.
9. Chỉ gọi LLM summary tối đa một lần cho mỗi search thành công.
10. Nếu summary LLM gặp timeout, 429, 4xx/5xx, response rỗng hoặc không hợp lệ:
    - không làm hỏng kết quả search/aggregation;
    - sinh summary deterministic 3-5 câu từ SummaryPayload;
    - response vẫn HTTP 200.
11. Mở rộng `NaturalLanguageSearchResponse`:
    - `summary`: string;
    - `summary_source`: `llm` hoặc `fallback`;
    - `summary_latency_ms`;
    - giữ nguyên query_id và contract cũ.
12. `latency_ms` phải phản ánh toàn bộ flow; không làm sai `llm_latency_ms` và `search_latency_ms` hiện có.
13. Lưu summary cuối cùng vào cột `summary` của đúng audit record theo `query_id`.
14. Nếu search không có kết quả:
    - vẫn trả summary deterministic rõ rằng không tìm thấy event;
    - không cần gọi LLM để tiết kiệm quota.
15. Thêm test:
    - summary payload có đúng top user/host/IP và severity;
    - sample tối đa 5;
    - payload/prompt không chứa raw hoặc secret;
    - Gemini/mock summary success;
    - LLM summary lỗi dùng fallback và search vẫn 200;
    - LLM trả blank dùng fallback;
    - no-result không gọi LLM summary;
    - summary có 3-5 câu theo cách đếm hợp lý;
    - summary được lưu vào đúng audit record;
    - response search và aggregation đều có summary fields;
    - search behavior ngày 4-6 không bị phá.
16. Cập nhật Swagger example nếu cần.
17. Chạy backend test và test thật ít nhất:
    - một search;
    - một aggregation;
    - một lần dùng mock để chứng minh fallback/test không cần API key.
18. Báo file đã tạo/sửa và kết quả verify.

Không triển khai history UI, CSV hoặc auth trong prompt này.
```

### Checkpoint Prompt 2

Response của `POST /api/v1/search` phải có:

```json
{
  "query_id": "uuid",
  "summary": "3-5 câu...",
  "summary_source": "llm",
  "summary_latency_ms": 123
}
```

Khi Gemini lỗi hoặc hết quota, response vẫn HTTP 200 và `summary_source = "fallback"`.

---

## Prompt 3 - Export CSV theo query_id

```text
Tiếp tục triển khai ngày 7 cho SOC AI Search MVP.

Hãy triển khai export CSV theo query_id:
GET /api/v1/search/{query_id}/export.csv

Đọc trước:
- docs/requirement.md
- plan/14-day-mvp-plan.md
- audit/history implementation từ Prompt 1
- backend/src/main/java/com/soc/ai/search/search/execution/SearchPlanExecutor.java
- backend/src/main/java/com/soc/ai/search/search/compiler/SearchPlanCompiler.java
- backend/src/main/java/com/soc/ai/search/search/plan/SearchPlan.java

Yêu cầu:
1. Kiểm tra repository và implementation hiện tại trước khi sửa.
2. Export chỉ nhận `query_id` UUID. Không nhận Elasticsearch DSL, field tùy ý hoặc SearchPlan mới từ client.
3. Lookup `search_query_logs`:
   - query phải tồn tại;
   - status phải là SUCCESS;
   - phải có SearchPlan hợp lệ;
   - nếu không đạt, trả lỗi 404 hoặc 409 có kiểm soát.
4. Deserialize SearchPlan đã lưu, validate lại bằng Bean Validation và `SearchPlanValidator`, rồi chạy lại trên index từ `ElasticsearchProperties.indexEvents`.
5. Không thay đổi guardrail `size <= 100` của search UI.
6. Tạo execution path riêng cho export:
   - search mode lấy tối đa 10.000 event;
   - đọc theo batch hợp lý, ví dụ 500 hoặc 1000;
   - không vượt Elasticsearch `max_result_window` mặc định 10.000;
   - aggregation mode export các bucket hiện có, vẫn tuân thủ top_n/default bucket limit.
7. Search CSV dùng header ổn định:
   - event_id;
   - timestamp;
   - source;
   - severity;
   - event_type;
   - user;
   - host;
   - ip;
   - country_code;
   - message.
8. Không export `raw` mặc định vì dữ liệu có thể nhạy cảm và làm file quá lớn.
9. Aggregation CSV dùng header:
   - key;
   - value.
10. CSV phải:
    - UTF-8;
    - escape dấu phẩy, quote và newline đúng RFC 4180;
    - chống CSV formula injection cho cell bắt đầu bằng `=`, `+`, `-`, `@`;
    - có `Content-Type: text/csv`;
    - có `Content-Disposition` với filename an toàn chứa query_id.
11. Có thể dùng `StreamingResponseBody` để tránh giữ file lớn hoàn toàn trong RAM.
12. Nếu query có hơn 10.000 event:
    - chỉ export 10.000 dòng;
    - có header response hoặc metadata/log rõ rằng kết quả đã bị truncate, ví dụ `X-Export-Truncated: true`.
13. Elasticsearch lỗi trả 503 có kiểm soát; không lộ stack trace.
14. Thêm Swagger/OpenAPI annotation.
15. Thêm test:
    - export search thành công;
    - export aggregation thành công;
    - unknown query_id trả 404;
    - FAILED query trả 409;
    - invalid stored SearchPlan bị từ chối;
    - search CSV đúng header;
    - aggregation CSV đúng header;
    - comma/quote/newline được escape;
    - formula injection được neutralize;
    - không có raw column;
    - tối đa 10.000 data row;
    - filename và content type đúng;
    - Elasticsearch lỗi trả lỗi kiểm soát.
16. Chạy backend test.
17. Nếu Docker đang chạy:
    - gọi `/api/v1/search` lấy query_id;
    - tải `/api/v1/search/{query_id}/export.csv`;
    - kiểm tra file mở được và có header đúng.
18. Báo file đã tạo/sửa, lệnh verify và kết quả.

Không triển khai frontend hoặc auth trong prompt này.
```

### Checkpoint Prompt 3

```powershell
$search = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8081/api/v1/search" `
  -ContentType "application/json" `
  -Body (@{
    question = "Show me failed login attempts from China in the last 24h"
    page = 0
    size = 20
  } | ConvertTo-Json)

Invoke-WebRequest `
  -Uri "http://localhost:8081/api/v1/search/$($search.query_id)/export.csv" `
  -OutFile ".tmp/day-07-export.csv"
```

---

## Prompt 4 - Frontend, smoke test và review Day 7

```text
Tiếp tục triển khai ngày 7 cho SOC AI Search MVP.

Hãy tích hợp summary, recent history và CSV vào frontend, sau đó tạo smoke test ngày 7 và review toàn bộ kết quả.

Đọc trước:
- docs/requirement.md
- plan/14-day-mvp-plan.md
- README.md
- frontend/src/App.tsx
- frontend/src/types/soc.ts
- frontend/src/services/api-client.ts
- frontend/src/services/search-api.ts
- frontend/src/components/soc/metrics-summary.tsx
- frontend/src/components/soc/result-tabs.tsx
- frontend/src/components/soc/soc-sidebar.tsx
- scripts/smoke-test-day-05.ps1

Yêu cầu frontend:
1. Cập nhật TypeScript DTO theo backend:
   - query_id;
   - summary;
   - summary_source;
   - summary_latency_ms;
   - history/audit DTO cần thiết.
2. Hiển thị summary 3-5 câu phía trên query transparency và bảng/chart.
3. Khi chạy API thật:
   - label là `AI Summary` hoặc `Fallback Summary`;
   - không hiển thị `Mock AI Summary` hoặc `STATIC DEMO DATA`;
   - có badge nhỏ cho source `LLM` hoặc `FALLBACK`.
4. Mock mode vẫn hoạt động và mock DTO phải khớp contract mới.
5. Tích hợp recent history:
   - gọi `GET /api/v1/search/history?limit=20`;
   - hiển thị trong Sheet/Drawer hoặc panel gọn khi bấm mục `Investigations`/history;
   - mỗi item có question, mode, status, result_count, latency và created_at;
   - click item sẽ điền lại question và chạy lại search;
   - có loading, empty và error state.
6. Tích hợp CSV:
   - nút Export CSV hoạt động cho API thật bằng query_id;
   - gọi `GET /api/v1/search/{query_id}/export.csv`;
   - tải Blob với filename từ `Content-Disposition` nếu có;
   - có loading/disabled/error state;
   - mock mode có thể giữ export mock hiện tại.
7. Không fetch audit log cho UI nếu không cần; audit endpoint chỉ cần kiểm qua Swagger/smoke test.
8. Không thêm router/state-management library nếu chưa cần.
9. Giữ dark SOC UI, responsive và accessibility hiện tại.

Yêu cầu smoke test:
10. Tạo `scripts/smoke-test-day-07.ps1`, giữ style nhất quán với smoke test trước.
11. Script giả định Docker Compose đang chạy và dataset đã seed.
12. Verify:
    - backend health;
    - OpenAPI có history, audit và export endpoints;
    - search success trả query_id UUID;
    - search success trả summary không blank;
    - summary_source là `llm` hoặc `fallback`;
    - aggregation cũng trả summary;
    - history chứa query vừa chạy;
    - audit chứa SUCCESS record;
    - request invalid tạo FAILED audit record nếu flow đã vào orchestration;
    - export search trả HTTP 200, `text/csv`, header đúng và không có raw column;
    - export aggregation có header `key,value`;
    - CSV không vượt 10.000 data row;
    - unknown query_id trả 404;
    - frontend URL trả 200.
13. Smoke test không được phụ thuộc Gemini luôn còn quota:
    - có thể chạy backend với mock provider cho checkpoint deterministic;
    - phải có test backend chứng minh summary fallback khi Gemini lỗi.
14. Cập nhật README:
    - audit/history table và demo identity;
    - cách gọi history/audit;
    - summary LLM + fallback;
    - cách export CSV;
    - giới hạn 10.000 dòng;
    - cách chạy smoke test ngày 7.
15. Chạy verify:
    - backend test;
    - frontend lint;
    - frontend build;
    - npm audit high;
    - docker compose config;
    - smoke test ngày 7.
16. Sửa lỗi nhỏ nếu phát hiện nhưng không mở rộng ngoài MVP.
17. Báo checklist PASS/FAIL:
    - audit success/failed;
    - history UI;
    - summary LLM/fallback;
    - CSV search/aggregation;
    - frontend;
    - test và Docker.
18. Liệt kê việc ngày 8 nhưng không triển khai deployment trong prompt này.

Không triển khai auth/RBAC, saved query, multi-turn conversation, vector search, advanced dashboard hoặc feature khuyến khích.
```

## 3. Điều kiện hoàn thành Day 7

- `POST /api/v1/search` trả `query_id` và summary.
- LLM summary lỗi vẫn trả kết quả bằng fallback.
- PostgreSQL có audit record cho success và failure.
- Frontend hiển thị recent history.
- CSV search và aggregation tải được, không vượt 10.000 dòng.
- Backend test, frontend lint/build và smoke test ngày 7 đều PASS.
