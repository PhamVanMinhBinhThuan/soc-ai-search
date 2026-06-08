# Prompt triển khai Ngày 4 - SOC AI Search MVP

## 1. Cách sử dụng

Ngày 4 nên chia thành **7 prompt cho AI coding agent**. Không gửi toàn bộ ngày 4 trong một prompt lớn.

Sau mỗi prompt:

1. Đọc tóm tắt thay đổi của AI.
2. Kiểm tra file đã tạo hoặc sửa.
3. Chạy lệnh verify mà AI báo cáo.
4. Chỉ chuyển prompt tiếp theo khi checkpoint đạt.
5. Không commit API key, `.env`, generated dataset lớn hoặc secret.

Các prompt dưới đây giả định kết quả ngày 3 đã hoàn thành:

- Có `SearchPlan`, `SearchFilters`, `TimeRange`, `SearchMode` bằng Java `record`/enum.
- Có `SearchPlanValidator`.
- Có `SearchPlanCompiler`.
- Có `SearchPlanExecutor`.
- Có endpoint kỹ thuật:
  - `POST /api/v1/search/plan`
- Có endpoint event detail:
  - `GET /api/v1/events/{event_id}`
- Có smoke test ngày 3:
  - `scripts/smoke-test-day-03.ps1`

## 2. Phạm vi Ngày 4

Kết quả cần đạt cuối ngày:

- Có LLM abstraction trong backend.
- Có mock LLM để chạy local/test khi không có API key.
- Có hosted LLM provider target là **Gemini**, nhưng provider mặc định vẫn là `mock`.
- Có system prompt mô tả `SearchPlan` schema, field allowlist và output rule.
- LLM chỉ được sinh **JSON SearchPlan thuần**:
  - không sinh Elasticsearch DSL;
  - không sinh prose;
  - không sinh markdown;
  - không thêm field ngoài schema.
- Có parser parse JSON bằng Jackson và validate bằng Bean Validation + `SearchPlanValidator`.
- Có repair/retry tối đa một lần nếu LLM trả JSON lỗi.
- Có endpoint natural language MVP:
  - `POST /api/v1/search`
- Response hiển thị được:
  - câu hỏi gốc;
  - generated `SearchPlan`;
  - generated DSL;
  - kết quả search có pagination.
- Không có API key thì test vẫn chạy bằng mock.
- Có regression test tối thiểu 10 câu hỏi Việt/Anh.
- Có smoke test ngày 4 trên Docker Compose local.

Không làm trong ngày 4:

- Aggregation/statistics mode.
- AI summarization.
- Query history/audit persistence vào PostgreSQL.
- CSV export.
- Frontend search UI.
- Auth/RBAC.
- Vector search, hybrid search hoặc tính năng khuyến khích.
- Local LLM hosting.
- Gửi raw log, search result hoặc event data vào LLM.

## 3. Chuẩn bị trước khi gửi Prompt 1

Chạy stack local và đảm bảo Day 3 vẫn pass:

```powershell
docker compose up -d
.\scripts\bootstrap-elasticsearch.ps1
.\scripts\seed-events.ps1 -Count 10000 -BatchSize 1000
.\scripts\smoke-test-day-03.ps1

cd backend
.\mvnw.cmd test
cd ..
```

Kiểm tra nhanh:

```powershell
Invoke-RestMethod http://localhost:8081/api/v1/health/live
Invoke-WebRequest http://localhost:8081/swagger-ui.html -UseBasicParsing
```

## 4. Prompt 1 - LLM foundation, config và mock provider

**Mục tiêu:** tạo nền LLM có thể chạy bằng mock, chưa gọi API thật và chưa tạo endpoint `/api/v1/search`.

```text
Tiếp tục triển khai ngày 4 cho SOC AI Search MVP.

Hãy đọc trước các file:
- docs/requirement.md
- docs/tech-stack.md
- docs/architecture.md
- docs/sequence-flow.md
- plan/14-day-mvp-plan.md
- plan/day-03-ai-prompts.md
- backend/src/main/java/com/soc/ai/search/search/plan/SearchPlan.java
- backend/src/main/java/com/soc/ai/search/search/validation/SearchPlanValidator.java
- backend/src/main/java/com/soc/ai/search/search/execution/SearchPlanExecutor.java

Yêu cầu:
1. Kiểm tra trạng thái repository trước khi sửa.
2. Tạo package LLM rõ ràng, ví dụ:
   - `com.soc.ai.search.llm`
   - `com.soc.ai.search.llm.mock`
   - `com.soc.ai.search.llm.gemini`
   - `com.soc.ai.search.llm.prompt` cho Prompt 2; Prompt 1 chưa cần tạo class prompt nếu chưa dùng.
3. Tạo cấu hình LLM qua environment variables, không hardcode API key:
   - `LLM_PROVIDER`, mặc định `mock`;
   - `LLM_BASE_URL`, nullable;
   - `LLM_API_KEY`, nullable;
   - `LLM_MODEL`, nullable;
   - `LLM_TIMEOUT_MS`, mặc định `10000`;
   - `LLM_MAX_ATTEMPTS`, mặc định `2`.
4. Tạo enum `LlmProvider`:
   - `MOCK`;
   - `GEMINI`.
5. `LlmProperties` phải dùng `LlmProvider`, không dùng string literal xuyên suốt codebase. Environment value vẫn thân thiện dạng lowercase như `mock` hoặc `gemini`.
6. Tạo `LlmProperties` bằng `@ConfigurationProperties(prefix = "app.llm")`.
7. Cập nhật `application.properties` để bind các biến trên.
8. Cập nhật `.env.example` với placeholder LLM, tuyệt đối không ghi API key thật.
9. Tạo record response nội bộ cho LLM, ví dụ:
   - `LlmResponse(String content, String model, long latencyMs)`.
   - `content` là raw text từ LLM.
   - `model` lấy từ cấu hình hoặc mock model name.
   - `latencyMs` đo thời gian gọi provider/mock để sau này dùng cho log và audit.
10. Tạo interface `LlmClient` tối thiểu:
   - method `generateSearchPlan(...)`;
   - return `LlmResponse`, không return `String` thuần;
   - chưa parse JSON thành `SearchPlan` trong client;
   - chưa gọi Elasticsearch hoặc PostgreSQL trong client;
   - chưa tạo method repair riêng trong Prompt 1. Khi cần repair ở prompt sau, có thể gọi lại `generateSearchPlan(...)` với repair prompt.
11. Tạo DTO nội bộ nếu cần, ví dụ:
   - `LlmSearchPlanRequest`
12. Tạo `MockLlmClient` là implementation mặc định khi `LLM_PROVIDER=mock`.
13. `MockLlmClient` phải trả `LlmResponse` có `content` là JSON SearchPlan thuần, không markdown/prose.
14. Mock provider ban đầu hỗ trợ tối thiểu 3 nhóm câu demo:
   - "Show me failed login attempts from China in the last 24h"
   - "Tìm alert critical trong 7 ngày qua"
   - "Tìm malware detected trong 7 ngày qua"
15. Mock provider không so sánh exact string cứng. Hãy nhận diện keyword đơn giản để các biến thể gần nghĩa vẫn chạy được, ví dụ:
   - `failed login` + `china` hoặc `cn`;
   - `critical` + `7 day` hoặc `7 ngày`;
   - `malware detected` hoặc `malware`.
16. Mock provider không gọi mạng, không gọi Elasticsearch và không gọi PostgreSQL.
17. Không tạo endpoint `/api/v1/search` trong prompt này.
18. Không tích hợp Gemini thật trong prompt này; Gemini để Prompt 3.
19. Thêm unit test cho:
   - `LlmProperties` bind/default nếu phù hợp;
   - `LlmProperties` dùng enum `LlmProvider`;
   - `MockLlmClient` trả `LlmResponse`;
   - `LlmResponse.content` là JSON thuần;
   - mock mapping 3 nhóm câu demo bằng keyword, không phụ thuộc exact string.
20. Chạy backend test và báo file đã tạo hoặc sửa.

Không triển khai aggregation, summary, audit log, CSV, frontend hoặc auth.
```

**Checkpoint:**

```powershell
cd backend
.\mvnw.cmd test
cd ..
```

Kết quả cần có:

- Backend test pass.
- Có `LlmClient`.
- Có `LlmResponse` để giữ `content`, `model`, `latencyMs`.
- Có `LlmProvider` enum, không dùng string literal xuyên suốt codebase.
- Có mock provider chạy không cần API key.
- `.env.example` có placeholder LLM nhưng không có secret thật.

## 5. Prompt 2 - Prompt builder, structured output parser và repair guardrail

**Mục tiêu:** đảm bảo LLM chỉ sinh JSON `SearchPlan` hợp lệ, không sinh DSL/prose/markdown.

```text
Tiếp tục triển khai ngày 4 cho SOC AI Search MVP.

Hãy triển khai prompt builder và parser cho NL -> SearchPlan.

Yêu cầu:
1. Đọc LLM foundation vừa tạo, SearchPlan records, SearchPlanValidator và SearchPlanCompiler trước khi sửa.
2. Tạo service build prompt, ví dụ `SearchPlanPromptBuilder`.
3. System prompt phải nói rõ:
   - nhiệm vụ duy nhất là chuyển natural language question thành JSON `SearchPlan`;
   - output phải là JSON object thuần;
   - không markdown;
   - không prose;
   - không Elasticsearch DSL;
   - không field ngoài schema;
   - ngày 4 chỉ support `mode = "search"`;
   - aggregation chưa support trong ngày 4.
4. Prompt phải mô tả field allowlist:
   - `timestamp.from`
   - `timestamp.to`
   - `severity`
   - `event_type`
   - `user`
   - `host`
   - `ip`
   - `country_code`
   - `message_query`
   - `page`
   - `size`
5. Prompt phải mô tả format thời gian được hỗ trợ:
   - `now`
   - `now-24h`
   - `now-7d`
   - `now-30d`
   - ISO-8601 absolute time nếu cần.
6. Prompt phải mô tả severity hợp lệ:
   - `low`
   - `medium`
   - `high`
   - `critical`
7. Prompt phải yêu cầu country code ISO alpha-2 uppercase, ví dụ `CN`, `VN`, `US`.
8. Prompt không được chứa raw log, search result hoặc event document.
9. Tạo repair prompt builder:
   - input gồm output lỗi và lỗi parse/validation;
   - yêu cầu LLM sửa thành JSON `SearchPlan` hợp lệ;
   - vẫn cấm markdown/prose/DSL;
   - không tự thêm field ngoài schema.
10. Tạo parser service, ví dụ `SearchPlanJsonParser`:
   - nhận raw text từ LLM;
   - trim;
   - parse bằng Jackson;
   - chỉ chấp nhận root JSON object;
   - map sang `SearchPlan`;
   - validate bằng Bean Validation và `SearchPlanValidator`;
   - reject output có markdown/prose/code fence, không extract JSON từ text lẫn prose.
11. Nếu parse/validate lỗi, parser phải trả lỗi rõ cho service phía trên, không lộ stack trace ra API.
12. Chưa gọi LLM thật trong prompt này.
13. Chưa tạo endpoint `/api/v1/search` trong prompt này.
14. Thêm unit test:
   - prompt chứa schema/allowlist;
   - prompt cấm DSL/prose/markdown;
   - parser parse JSON SearchPlan hợp lệ;
   - parser reject markdown code fence;
   - parser reject prose trước/sau JSON;
   - parser reject field ngoài schema nếu Jackson/config hiện tại hỗ trợ, hoặc ít nhất validator/service không dùng field đó;
   - parser reject invalid severity/size.
15. Chạy backend test và báo file đã tạo hoặc sửa.

Không triển khai aggregation, summary, audit log, CSV, frontend hoặc auth.
```

**Checkpoint:**

```powershell
cd backend
.\mvnw.cmd test
cd ..
```

Kết quả cần có:

- Parser nhận JSON thuần hợp lệ.
- Parser từ chối markdown/prose.
- Prompt không đưa raw log hoặc event data vào LLM.

## 6. Prompt 3 - Hosted Gemini client sau cấu hình, mock vẫn là mặc định

**Mục tiêu:** có đường tích hợp hosted LLM API, nhưng local/test vẫn chạy bằng mock khi không có API key.

```text
Tiếp tục triển khai ngày 4 cho SOC AI Search MVP.

Hãy triển khai hosted LLM client cho Gemini, nhưng giữ `mock` là provider mặc định.

Yêu cầu:
1. Đọc `LlmClient`, `LlmProperties`, prompt builder/parser hiện có trước khi sửa.
2. Provider được hỗ trợ trong MVP ngày 4:
   - `mock`: mặc định, không cần API key;
   - `gemini`: hosted provider qua HTTP API.
3. Không thêm OpenAI/Claude/local LLM trong prompt này.
4. `GeminiLlmClient` chỉ được active khi `app.llm.provider=gemini`.
5. `MockLlmClient` active khi `app.llm.provider=mock` hoặc chưa cấu hình provider.
6. Gemini client phải lấy toàn bộ cấu hình từ `LlmProperties`:
   - baseUrl;
   - apiKey;
   - model;
   - timeoutMs;
   - maxAttempts.
7. Không hardcode API key, model hoặc base URL trong service. Có thể đặt placeholder trong `.env.example`.
8. Gemini request chỉ gửi:
   - system prompt;
   - user question;
   - schema/allowlist/examples.
9. Gemini request không gửi:
   - raw log;
   - search result;
   - event document;
   - Elasticsearch DSL từ kết quả trước.
10. Gemini response parser trong client chỉ lấy text output từ response provider và trả raw string cho parser/service; client không tự compile DSL.
11. Retry giới hạn:
   - tối đa `LLM_MAX_ATTEMPTS`;
   - retry cho lỗi mạng hoặc HTTP 5xx;
   - không retry vô hạn;
   - HTTP 4xx trả lỗi có kiểm soát.
12. Timeout phải dùng `LLM_TIMEOUT_MS`.
13. Nếu provider là `gemini` mà thiếu `LLM_API_KEY` hoặc `LLM_MODEL`, trả lỗi cấu hình rõ ràng khi gọi, không fail mơ hồ.
14. Thêm test bằng mock HTTP server hoặc mock RestClient:
   - Gemini client parse text response thành raw JSON string;
   - Gemini client không log/return API key;
   - lỗi 5xx retry theo giới hạn;
   - lỗi 4xx không retry vô hạn.
15. Không gọi API Gemini thật trong test.
16. Cập nhật README hoặc `.env.example` ngắn gọn cách bật Gemini:
   - `LLM_PROVIDER=gemini`;
   - `LLM_API_KEY=...`;
   - `LLM_MODEL=...`;
   - mặc định vẫn là `mock`.
17. Chạy backend test và báo file đã tạo hoặc sửa.

Không triển khai aggregation, summary, audit log, CSV, frontend hoặc auth.
```

**Checkpoint:**

```powershell
cd backend
.\mvnw.cmd test
cd ..
```

Kết quả cần có:

- Test không gọi API thật.
- Không có API key trong Git-tracked files.
- Nếu không có API key, app vẫn chạy với mock.

## 7. Prompt 4 - Endpoint natural language POST /api/v1/search

**Mục tiêu:** chạy được natural language search MVP qua Swagger, dùng mock nếu không có API key.

```text
Tiếp tục triển khai ngày 4 cho SOC AI Search MVP.

Hãy triển khai endpoint natural language search:
POST /api/v1/search

Yêu cầu:
1. Đọc:
   - `SearchPlanExecutor`;
   - `SearchPlanValidator`;
   - `SearchPlanCompiler`;
   - LLM client/prompt/parser vừa tạo;
   - docs/sequence-flow.md.
2. Tạo package orchestration rõ ràng nếu cần, ví dụ:
   - `com.soc.ai.search.search.nl`
3. Tạo request DTO bằng Java record:
   - `question` string, required, not blank, max length hợp lý ví dụ 500;
   - `page` required, `>= 0`;
   - `size` required, từ 1 đến 100.
4. Tạo response DTO riêng, ví dụ `NaturalLanguageSearchResponse`.
5. Response tối thiểu:
   - `original_question`;
   - `mode`;
   - `search_plan` dạng JSON object, không phải string;
   - `generated_dsl` dạng JSON object/map, không phải string;
   - `total`;
   - `page`;
   - `size`;
   - `total_pages`;
   - `latency_ms`;
   - `events`.
6. Flow xử lý:
   - nhận question/page/size;
   - build prompt bằng `SearchPlanPromptBuilder`;
   - gọi `LlmClient` để sinh raw JSON;
   - parse bằng `SearchPlanJsonParser`;
   - validate bằng Bean Validation + `SearchPlanValidator`;
   - nếu parse/validation lỗi, gọi repair tối đa một lần;
   - sau repair vẫn lỗi thì trả lỗi rõ ràng;
   - gọi `SearchPlanExecutor.search(searchPlan)`;
   - trả response chuẩn hóa.
7. `page` và `size` trong request phải được đưa vào `SearchPlan` cuối cùng. Nếu LLM trả page/size khác request, backend ưu tiên page/size từ request để tránh LLM tự nâng size.
8. Chỉ support `mode = search` trong ngày 4.
9. Không triển khai aggregation trong endpoint này.
10. Không persist audit log vào PostgreSQL trong ngày 4.
11. Có thể log application log để debug, nhưng không log API key, raw event hoặc secret.
12. Không gửi raw log, search result hoặc event data vào LLM.
13. Error handling:
   - request invalid -> HTTP 400;
   - LLM unavailable hoặc output vẫn invalid sau repair -> HTTP 502 hoặc 503 có kiểm soát;
   - Elasticsearch error -> dùng lỗi có kiểm soát từ search executor;
   - không lộ stack trace.
14. Endpoint có Swagger/OpenAPI annotation hữu ích.
15. Thêm controller/service test:
   - question hợp lệ với mock trả 200;
   - response có `original_question`;
   - response có `search_plan` object;
   - response có `generated_dsl` object;
   - response có `events`;
   - blank question trả 400;
   - size > 100 trả 400;
   - LLM output invalid rồi repair thành công;
   - LLM output invalid sau repair trả lỗi có kiểm soát.
16. Nếu Docker đang chạy và dataset đã seed, test thật endpoint bằng Invoke-RestMethod với provider mock.
17. Chạy backend test và báo file đã tạo hoặc sửa.

Không triển khai summary, audit persistence, history, CSV, aggregation, frontend hoặc auth.
```

**Checkpoint:**

```powershell
cd backend
.\mvnw.cmd test
cd ..

$body = @{
  question = "Show me failed login attempts from China in the last 24h"
  page = 0
  size = 5
} | ConvertTo-Json -Depth 10

Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8081/api/v1/search `
  -ContentType "application/json" `
  -Body $body
```

Kết quả cần có:

- Response có `original_question`.
- Response có `search_plan`.
- Response có `generated_dsl`.
- Response có `total > 0`.
- Response có `events` tối đa 5 item.

## 8. Prompt 5 - Regression test 10 câu hỏi Việt/Anh cho mock LLM

**Mục tiêu:** có bộ câu hỏi cố định để kiểm tra NL -> SearchPlan trước khi dùng API thật.

```text
Tiếp tục triển khai ngày 4 cho SOC AI Search MVP.

Hãy bổ sung regression test cho 10 câu hỏi Việt/Anh.

Yêu cầu:
1. Đọc `MockLlmClient`, `SearchPlanJsonParser`, `SearchPlanValidator` và endpoint `/api/v1/search`.
2. Mở rộng mock LLM để hỗ trợ chính xác các câu hỏi sau:
   1. "Show me failed login attempts from China in the last 24h"
   2. "Tìm login thất bại từ Trung Quốc trong 24 giờ qua"
   3. "Tìm alert critical trong 7 ngày qua"
   4. "Show critical alerts in the last 7 days"
   5. "Tìm malware detected trong 7 ngày qua"
   6. "Show malware detected events in the last 7 days"
   7. "Tìm firewall block từ CN"
   8. "Show privilege escalation by admin"
   9. "Tìm account lockout trong 7 ngày qua"
   10. "Show failed login events for user admin"
3. Mapping bắt buộc:
   - Câu 1 và 2:
     - `event_type = ["failed_login"]`
     - `country_code = ["CN"]`
     - `timestamp.from = "now-24h"`
     - `timestamp.to = "now"`
   - Câu 3 và 4:
     - `severity = ["critical"]`
     - `timestamp.from = "now-7d"`
     - `timestamp.to = "now"`
   - Câu 5 và 6:
     - `message_query = "malware detected"`
     - `timestamp.from = "now-7d"`
     - `timestamp.to = "now"`
   - Câu 7:
     - `event_type = ["firewall_block"]`
     - `country_code = ["CN"]`
     - `timestamp.from = "now-30d"`
     - `timestamp.to = "now"`
   - Câu 8:
     - `event_type = ["privilege_escalation"]`
     - `user = "admin"`
     - `timestamp.from = "now-30d"`
     - `timestamp.to = "now"`
   - Câu 9:
     - `event_type = ["account_lockout"]`
     - `timestamp.from = "now-7d"`
     - `timestamp.to = "now"`
   - Câu 10:
     - `event_type = ["failed_login"]`
     - `user = "admin"`
     - `timestamp.from = "now-30d"`
     - `timestamp.to = "now"`
4. Mọi mock response phải là JSON `SearchPlan` thuần, không markdown/prose.
5. Mock phải set `page` và `size` theo request từ endpoint, không tự nâng size.
6. Nếu mock nhận câu chưa hỗ trợ, trả lỗi có kiểm soát, không đoán mò.
7. Thêm table-driven unit test:
   - 10 câu hỏi đều parse thành `SearchPlan`;
   - 10 plan đều pass `SearchPlanValidator`;
   - mapping từng câu đúng field bắt buộc;
   - mock không sinh DSL.
8. Thêm controller/service test cho ít nhất 3 câu:
   - failed login China 24h;
   - critical 7 ngày;
   - malware detected 7 ngày.
9. Chạy backend test và báo file đã tạo hoặc sửa.

Không triển khai aggregation, summary, audit log, CSV, frontend hoặc auth.
```

**Checkpoint:**

```powershell
cd backend
.\mvnw.cmd test
cd ..
```

Kết quả cần có:

- 10 câu hỏi regression pass.
- Mock provider đủ dùng khi không có API key.

## 9. Prompt 6 - Smoke test ngày 4 và README

**Mục tiêu:** chứng minh NL search ngày 4 chạy được end-to-end trên Docker Compose local.

```text
Tiếp tục triển khai ngày 4 cho SOC AI Search MVP.

Hãy tạo smoke test PowerShell cho ngày 4:
scripts/smoke-test-day-04.ps1

Yêu cầu:
1. Đọc `scripts/smoke-test-day-03.ps1` để giữ style nhất quán.
2. Script giả định Docker Compose local đang chạy, backend dùng `LLM_PROVIDER=mock` và dataset ngày 2 đã seed.
3. Script nhận tham số:
   - BackendUrl, mặc định http://localhost:8081
   - ElasticsearchUrl, mặc định http://localhost:9200
   - Index, mặc định soc-events-v1
4. Script kiểm tra:
   - backend health;
   - Elasticsearch health;
   - OpenAPI có `/api/v1/search`;
   - OpenAPI vẫn có `/api/v1/search/plan`;
   - câu "Show me failed login attempts from China in the last 24h" trả total > 0;
   - câu "Tìm alert critical trong 7 ngày qua" trả total > 0;
   - câu "Tìm malware detected trong 7 ngày qua" trả total > 0;
   - response có `original_question`;
   - response có `search_plan` dạng object, không phải string;
   - response có `generated_dsl` dạng object, không phải string;
   - response có `total_pages >= 0`;
   - events trả về không vượt quá size request;
   - nếu total > 0 thì event đầu tiên có `event_id` không blank;
   - blank question trả 400;
   - size > 100 trả 400.
5. Smoke script phải fail rõ ràng nếu checkpoint không đạt.
6. Cập nhật README.md với:
   - cách chạy provider mock;
   - cách bật Gemini bằng env var placeholder;
   - cách gọi `POST /api/v1/search`;
   - cách chạy smoke test ngày 4;
   - ghi rõ ngày 4 chưa persist audit log vào PostgreSQL.
7. Không triển khai LLM summary, aggregation, frontend, audit log hoặc CSV.
8. Chạy smoke test và báo kết quả.
```

**Checkpoint:**

```powershell
.\scripts\smoke-test-day-04.ps1
```

Kết quả cần có:

- Smoke test PASS.
- Không cần API key thật để pass.

## 10. Prompt 7 - Review ngày 4 và cập nhật tài liệu

**Mục tiêu:** chốt ngày 4 bằng checklist rõ ràng, không triển khai sang ngày 5.

```text
Hãy review và verify toàn bộ kết quả triển khai ngày 4 cho SOC AI Search MVP.

Đọc lại:
- docs/requirement.md
- docs/tech-stack.md
- docs/architecture.md
- docs/sequence-flow.md
- plan/14-day-mvp-plan.md
- plan/day-04-ai-prompts.md
- README.md

Kiểm tra:
1. Có `LlmClient` interface.
2. `LLM_PROVIDER=mock` là mặc định và chạy không cần API key.
3. Hosted provider Gemini chỉ active khi cấu hình `LLM_PROVIDER=gemini`.
4. Không có API key thật trong Git-tracked files.
5. System prompt yêu cầu JSON SearchPlan thuần.
6. Prompt cấm prose, markdown, Elasticsearch DSL và field ngoài schema.
7. Backend không gửi raw log/search result/event document vào LLM.
8. Parser dùng Jackson và validate bằng Bean Validation + `SearchPlanValidator`.
9. Repair/retry tối đa một lần, không retry vô hạn.
10. Endpoint `POST /api/v1/search` hoạt động và có trong Swagger.
11. Response có `original_question`.
12. Response có `search_plan` dạng object, không phải string.
13. Response có `generated_dsl` dạng object, không phải string.
14. Response có pagination và events.
15. Input search sai trả 400.
16. LLM lỗi hoặc output invalid sau repair trả lỗi có kiểm soát.
17. Backend test pass.
18. Smoke test ngày 4 pass.
19. docker compose config hợp lệ và stack local healthy.
20. Không persist audit log vào PostgreSQL trong ngày 4.
21. Không triển khai aggregation, summary, frontend search UI, CSV hoặc auth trong ngày 4.

Sau đó:
1. Sửa lỗi nhỏ nếu phát hiện.
2. Cập nhật README.md nếu cần với:
   - cách gọi natural language search;
   - cách cấu hình mock/Gemini;
   - cách chạy smoke test ngày 4;
   - ghi rõ aggregation sẽ làm ngày 5.
3. Chạy verify phù hợp.
4. Báo checklist PASS/FAIL theo từng mục.
5. Liệt kê việc còn cần làm ở ngày 5 nhưng không triển khai chúng.
```

**Checkpoint cuối ngày:**

```powershell
docker compose config
docker compose up -d
.\scripts\bootstrap-elasticsearch.ps1
.\scripts\seed-events.ps1 -Count 10000 -BatchSize 1000
.\scripts\smoke-test-day-03.ps1
.\scripts\smoke-test-day-04.ps1

cd backend
.\mvnw.cmd test
cd ..
```

Kết quả cần có:

- Gọi được `POST /api/v1/search` bằng câu hỏi tự nhiên.
- Không có API key vẫn chạy bằng mock.
- Response hiển thị được câu hỏi gốc, SearchPlan, DSL và kết quả search.
- LLM không được sinh DSL trực tiếp.
- Backend vẫn kiểm soát validate và compile DSL.

## 11. Lưu ý quan trọng

- Ngày 4 chỉ làm **natural language -> SearchPlan -> search**.
- Ngày 4 chưa làm aggregation dù MVP có yêu cầu thống kê; phần đó thuộc ngày 5.
- Ngày 4 chưa làm summary LLM; phần đó thuộc ngày 7.
- Ngày 4 chưa persist query history/audit log vào PostgreSQL; phần đó thuộc ngày 7.
- Không gửi raw log hoặc event data vào Cloud LLM.
- Không commit API key thật.
- Không thêm local LLM hosting trong sprint này.
- Docs là working draft: chỉ cập nhật phần phản ánh đúng code đã triển khai.
