# Ngày 7: STAR War Stories, 6 Kịch Bản Stress-Test, Mock Interview 60 Phút & Cheat Sheet

- **Thời lượng gợi ý:** 2.5 – 3 giờ
- **Tỷ trọng:** Tổng hợp thực chiến 70% Backend Java / AI Engineering / Security & Guardrails • 30% Frontend Engineering
- **Mục tiêu cuối ngày:** Kể mượt mà **3 War Stories** thật theo khung STAR (90 giây/câu), xử lý gọn **6 kịch bản Stress-test phá hệ thống**, hoàn thành **1 bài Mock Interview 60 phút bấm giờ thật**, và nắm lòng **Cheat Sheet 1 trang** trước giờ G.

---

## Phần A — 3 STAR War Stories Thực Tế Từ Dự Án (Kịch Bản Nói 90 Giây)

> **Mẹo phỏng vấn:** Khi nhà tuyển dụng hỏi *"Kể về một bug khó nhất / quyết định thiết kế quan trọng nhất em từng xử lý"*, luôn giữ cấu trúc **S (Bối cảnh) → T (Vấn đề/Yêu cầu) → A (Hành động kỹ thuật cụ thể) → R (Kết quả & Bài học)** trong 60–90 giây.

### War Story #1 — Auth Hydration Race Condition Khi Hard Refresh `/dashboard`
- **Tài liệu gốc:** [fix_dashboard_refresh_auth_race.md](../plan/fix_dashboard_refresh_auth_race.md)
- **Kịch bản nói mẫu (75–90s):**
  - **S (Situation):** Sau khi deploy bản chạy Keycloak OIDC lên production `https://soc-ai-search.app`, khi đang ở trang `/dashboard` và bấm F5 hard refresh, toàn bộ 5 biểu đồ đều hiện `0` và console báo hàng loạt lỗi `401 Unauthorized` cho `POST /api/v1/search/plan`.
  - **T (Task):** Tìm nguyên nhân gốc và xử lý dứt điểm mà **tuyệt đối không được thỏa hiệp bảo mật** (không mở public endpoint `/api/v1/search/plan` vì nó truy vấn log SOC).
  - **A (Action):** Kiểm tra Network tab, em thấy CORS hợp lệ nhưng request gửi đi hoàn toàn thiếu header `Authorization: Bearer`. Lần ngược vòng đời React, em phát hiện **auth race condition do thứ tự `useEffect` con chạy trước cha**: `SocDashboard` vừa mount đã bắn ngay 5 request trước khi OIDC hydrate xong hoặc trước khi `App.tsx` chạy `useEffect` gọi `setAuthTokenHandlers`. Em sửa bằng cách truyền `authLoading`, `authenticated`, `accessTokenReady` xuống `SocDashboard` để dựng cổng `canFetchDashboard`, đồng thời kiểm tra nhánh `401` riêng trong `Promise.allSettled` để báo trạng thái đăng nhập rõ ràng thay vì hiện giả số `0`.
  - **R (Result):** Hard refresh `/dashboard` hoạt động ổn định 100%, không còn lỗi 401 giả và em bổ sung unit test trong `soc-dashboard.test.tsx` để chống tái diễn.

---

### War Story #2 — Stale Token `401` Stampede Khi 5 Widget Dashboard Bắn Song Song
- **Tài liệu gốc:** [fix_api_client_401_token_refresh_retry.md](../plan/fix_api_client_401_token_refresh_retry.md)
- **Kịch bản nói mẫu (75–90s):**
  - **S (Situation):** Ngay cả sau khi chặn race condition lúc mount, người dùng để mở Dashboard lâu hơn thời gian sống của access token rồi refresh hoặc tới chu kỳ auto-refresh 3 phút vẫn dính hàng loạt `401` vì token cũ trong bộ nhớ đã hết hạn (`stale`), và 5 widget cùng lúc bắn 5 request dùng chung token cũ.
  - **T (Task):** Xây dựng cơ chế tự động gia hạn token (`signinSilent`) và thử lại request mượt mà trên toàn bộ API client mà không tạo ra **refresh stampede** (5 request gọi refresh song song làm hỏng phiên Keycloak) hay vòng lặp retry vô hạn.
  - **A (Action):** Em thiết kế mẫu **Single-Flight Promise Lock (`refreshTokenOnce`)** trong `auth-token.ts`: khi nhiều request cùng nhận `401`, chỉ request đầu tiên tạo `tokenRefreshPromise = refreshAccessTokenProvider()`, các request song song còn lại cùng `await` đúng promise đó, và khối `.finally()` giải phóng lock khi xong. Tại `http-client.ts`, khi nhận `401` (và signal chưa abort), client chờ `freshToken` rồi retry request ban đầu **đúng 1 lần** bằng `tokenOverride`.
  - **R (Result):** Trải nghiệm trực SOC kéo dài nhiều giờ mượt mà không bị đứt quãng khi access token hết hạn; toàn bộ kịch bản concurrent 401 và single-flight đều được khóa bằng unit test trong `api-client.test.ts`.

---

### War Story #3 — Thiết Kế Bounded AI Summary Context & Output Guardrail Chống Rò Rỉ Raw Log
- **Tài liệu gốc:** [SummaryPayloadBuilder.java](../../backend/src/main/java/com/soc/ai/search/summary/application/SummaryPayloadBuilder.java) & [SummaryTextValidator.java](../../backend/src/main/java/com/soc/ai/search/summary/domain/SummaryTextValidator.java)
- **Kịch bản nói mẫu (75–90s):**
  - **S (Situation):** Khi bổ sung tính năng AI tóm tắt kết quả tìm kiếm bằng Gemini/Claude, xuất hiện 3 rủi ro lớn: (1) gửi raw log ra cloud LLM sẽ lộ thông tin nhạy cảm & tốn rất nhiều token; (2) LLM có thể timeout hoặc dính HTTP 429 làm hỏng cả màn hình search; (3) LLM có thể sinh Markdown/HTML phá layout hoặc gây rủi ro XSS.
  - **T (Task):** Xây dựng pipeline tóm tắt vừa đủ thông tin cho analyst, vừa không lộ `raw` log, vừa không bao giờ làm sập trải nghiệm search khi LLM gặp sự cố.
  - **A (Action):** Em tách `ResultSummaryService` với 3 lớp bảo vệ: (1) `SummaryPayloadBuilder` loại bỏ hoàn toàn `raw`, chỉ gửi thống kê Top-5 buckets và tối đa 5 event mẫu đã cắt `message <= 300` ký tự, tổng JSON `<= 5.000` ký tự và redact secrets bằng regex `SECRET_PATTERN`; (2) `LlmConfig` cấp riêng `summaryRestClient` với timeout ngắn `5s` để fail-fast; (3) `SummaryTextValidator` kiểm duyệt output (chặn HTML/Markdown/JSON, ép đúng 3–5 câu sau khi mask IPv4/số thập phân để không đếm sai dấu chấm) — bất kỳ lỗi nào cũng rơi êm về `DeterministicSummaryGenerator` gắn nhãn `summary_source = fallback`.
  - **R (Result):** Analyst luôn nhận được tóm tắt chính xác bằng đúng ngôn ngữ câu hỏi (Anh/Việt) kể cả khi cloud LLM down hoặc bị rate limit, đồng thời chi phí token và bề mặt rò rỉ dữ liệu được khóa chặt.

---

## Phần B — 6 Kịch Bản System Design & Stress-Test Phá Hệ Thống (Đáp Án Mẫu)

### Stress-Test 1: Cloud LLM (Gemini/Anthropic) đột ngột chậm 15 giây hoặc dính HTTP 429 giữa ca trực SOC?
- **Phản ứng hiện tại của hệ thống:**
  1. **SearchPlan (`POST /api/v1/search`):** `searchPlanRestClient` ngắt sau `10s`; `LlmHttpSupport` không retry mù quáng `429`, map về HTTP `429` (`NaturalLanguageSearchRateLimitException`) hoặc `502` (`NaturalLanguageSearchException`), đồng thời ghi bản ghi `FAILED` audit (`REQUIRES_NEW`) sau khi qua `AuditErrorSanitizer`.
  2. **AI Summary:** `summaryRestClient` fail-fast sau `5s` → rơi ngay sang `DeterministicSummaryGenerator` (`summary_source = fallback`), analyst vẫn xem đủ log & số liệu.
  3. **Follow-up Suggestions:** Ẩn êm khu vực gợi ý trên UI, không chặn luồng làm việc.
  4. **Các luồng Deterministic vẫn sống 100%:** Dashboard, Filter/Sort kết quả, Edit `SearchPlan`, Query Library (nếu chạy bằng plan) và Export CSV đều gọi `/api/v1/search/plan` hoặc ES trực tiếp, không hề phụ thuộc LLM!
- **Nâng cấp production:** Gắn **Resilience4j Circuit Breaker** + **Composite Failover `LlmClient`** (tự chuyển từ Gemini → Anthropic → Local Ollama khi circuit OPEN) + metrics `llm_error_rate` / `summary_fallback_total`.

### Stress-Test 2: Attacker thực hiện Prompt Injection đa lớp cố ép chạy Painless script hoặc dump 100.000 raw events?
- **Lớp chặn thực tế trong code:**
  - *Lớp 1 (Prompt):* `SearchPlanPromptBuilder` cấm sinh DSL, `script`, `wildcard`, `query_string`.
  - *Lớp 2 (Parser):* `SearchPlanJsonParser` bật `FAIL_ON_UNKNOWN_PROPERTIES` + `FAIL_ON_TRAILING_TOKENS`, cấm markdown fences `` ``` ``, và `parseWithPaginationOverride` ghi đè `page`/`size` từ API request (không tin `size` của LLM).
  - *Lớp 3 (Validator):* `SearchPlanValidator` + `SearchPlanContract` chặn `MAX_PAGE_SIZE = 100`, allowlist fields, `rejectDangerousValue`.
  - *Lớp 4 (Compiler & RBAC):* `SearchPlanCompiler` chỉ biên dịch từ schema tĩnh; `EventController` cắt bỏ `raw` nếu user là `SOC_VIEWER`; `SearchPlanExecutor` áp `timeout = 3s`.
  - *Lớp 5 (Audit):* Toàn bộ câu hỏi độc hại + trạng thái `FAILED` vẫn bị lưu vào PostgreSQL gắn `user_identity` để SOC Admin điều tra ngược.

### Stress-Test 3: Dữ liệu tăng từ 10.000 lên 50 triệu events/ngày (~1.5 tỷ events/tháng). Hệ thống gãy ở đâu và scale thế nào?
- **Các điểm gãy trên thiết kế MVP hiện tại:**
  1. Một index đơn `soc-events-v1` trên single-node ES (`-Xmx512m`) sẽ phình shard quá 50GB → chậm query, cạn heap, không thể xóa dữ liệu cũ nhanh (`delete_by_query` cực nặng).
  2. `SearchPlanCompiler` dùng Painless `_script` sort theo `severity` → ngốn CPU khi tập kết quả lớn.
  3. `track_total_hits: true` trên mọi search → mất tối ưu WAND cắt nhánh.
  4. `ExportSearchExecutor` dùng `from + size` → vượt trần `10,000` và mất snapshot consistency.
- **Kiến trúc scale chuẩn production:**
  - Chuyển sang **Data Stream / Time-based Rolling Indices** (`soc-events-2026.11.20`) gắn alias đọc `soc-events-read` + **Index Lifecycle Management (ILM)**: Hot tier (SSD, 7 ngày) → Warm tier (force-merge, 30 ngày) → Cold/Delete (90 ngày), mỗi shard giữ kích thước tối ưu 20–50GB.
  - Tính sẵn **`severity_rank` (integer)** tại index-time (Ingest Pipeline) thay thế hoàn toàn Painless script sort.
  - Dùng **`PIT + search_after`** + Async Export Worker (Kafka/RabbitMQ + S3/MinIO) cho xuất CSV lớn.
  - Bổ sung bộ đệm **Kafka + Logstash/Vector** trước ES để hấp thụ đỉnh lưu lượng ingest mà không làm nghẽn cụm search.

### Stress-Test 4: 100 SOC Analyst cùng mở màn hình Dashboard (auto-refresh 3 phút/lần) → Thundering Herd lên Elasticsearch?
- **Tác động:** 100 user × 5 query song song = **500 truy vấn aggregation** bắn vào ES mỗi 3 phút (thậm chí dồn đúng cùng giây nếu mọi người vào ca trực cùng lúc).
- **Giải pháp nhiều tầng:**
  1. **Backend:** Tách endpoint `GET /api/v1/dashboard/metrics` (không nhận plan tùy ý) và đặt **Cache ngắn hạn (Caffeine in-memory hoặc Redis TTL 30–60 giây)** với stampede protection (single-flight cache loader) — vì tất cả analyst đều xem chung bức tranh 24h toàn SOC! Tải ES lập tức giảm từ 500 query/3p xuống chỉ còn **5 query/phút** bất kể 100 hay 1.000 user.
  2. **Frontend:** Thêm **random jitter (±15 giây)** vào chu kỳ `DASHBOARD_REFRESH_INTERVAL_MS` và tạm dừng polling khi tab trình duyệt ẩn (`document.visibilityState === 'hidden'`).

### Stress-Test 5: Một tài khoản `SOC_VIEWER` bị chiếm hoặc chạy script spam `POST /api/v1/search` 50 req/giây làm cháy quota Gemini/Anthropic?
- **Đánh giá hiện trạng:** Thừa nhận thẳng hiện tại chưa có lớp Rate Limiting ở Backend (mới xử lý `429` phản hồi ngược từ LLM provider).
- **Thiết kế vá triệt để:**
  - Đặt **Rate Limiting (Bucket4j + Redis Token Bucket / Sliding Window)** ngay tại Spring Filter / Interceptor theo khóa `user_identity` và phân bậc theo role (ví dụ `SOC_VIEWER`: 10 req/phút, `SOC_ANALYST`: 30 req/phút, `SOC_ADMIN`: 60 req/phút) + trần ngân sách token theo ngày cho toàn hệ thống.
  - Khi vượt ngưỡng, trả chuẩn HTTP `429 Too Many Requests` kèm header `Retry-After` trước khi gọi LLM, đồng thời đẩy cảnh báo bất thường về hệ thống monitoring (Prometheus Alertmanager).

### Stress-Test 6: PostgreSQL đột ngột chậm hoặc mất kết nối trong khi Elasticsearch vẫn sống khỏe?
- **Hành vi hiện tại:** `NaturalLanguageSearchService` gọi `saveSuccessAudit` (hoặc `saveFailureAudit`) đồng bộ với `REQUIRES_NEW` + `saveAndFlush`; nếu PG down → ném `AuditPersistenceException` → `GlobalApiExceptionHandler` trả `503 Service Unavailable` (**Fail-Closed**).
- **Phân tích Trade-off:**
  - Với **hệ thống SOC đòi hỏi tuân thủ nghiêm ngặt (Compliance-first)**, Fail-Closed là có chủ ý để không phát sinh truy vấn "không dấu vết".
  - Tuy nhiên cần bảo vệ HikariCP bằng **`connection-timeout` ngắn (2–3s)** và **Circuit Breaker** để tránh toàn bộ thread Tomcat bị treo chờ PG làm sập lây cả endpoint `/health/live` hoặc Dashboard.
  - Nếu tổ chức chọn **Availability-first** trong tình huống khẩn cấp (đang bị tấn công DDoS cần điều tra ngay dù PG bảo trì), có thể thiết kế cơ chế **Local Write-Ahead Audit Fallback (Outbox file/Kafka)** ghi đệm tạm rồi đồng bộ bù vào PostgreSQL khi DB phục hồi.

---

## Phần C — Đề Thi Mock Interview 60 Phút & Rubric Tự Chấm Điểm

Hãy đặt đồng hồ **60 phút**, **đóng toàn bộ ghi chú**, và trả lời thành tiếng (tốt nhất là ghi âm lại để nghe lại xem mình nói có dài dòng hay bị vấp không).

### Vòng 1: Architecture & Business Flow (20 phút)
1. *(3p)* Giới thiệu dự án SOC AI Search và giải thích kiến trúc Trust Boundary.
2. *(4p)* Vẽ luồng End-to-End khi user gõ *"Top 5 IP có nhiều failed login trong 24h qua"* từ lúc bấm Enter ở React tới khi biểu đồ hiện lên.
3. *(4p)* Vì sao hệ thống cần cả Elasticsearch và PostgreSQL? Giải thích thiết kế mapping `soc-events-v1` và 2 index của bảng `search_query_logs`.
4. *(5p)* Phân tích bài toán bảo mật OIDC + Keycloak + Spring Security: vì sao `csrf.disable()`, vì sao tách `issuer-uri` & `jwk-set-uri`, và làm sao ngăn `SOC_VIEWER` xem `raw` log?
5. *(4p)* Giải thích luồng Safe Replay CSV Export và cách chống CSV Formula Injection.

### Vòng 2: Code Deep-Dive — 70% BE/AI/Security • 30% FE (25 phút)
6. *(4p — AI/Guardrails)* Nếu LLM trả `"ip": "10.0.0.1"` thay vì mảng, hoặc trả thêm key `"script"` hay `"size": 50000`, chính xác class nào xử lý từng trường hợp?
7. *(4p — AI/Resilience)* Giải thích cấu hình 2 `RestClient` timeout trong `LlmConfig`, chiến lược retry trong `LlmHttpSupport`, và cách `SummaryTextValidator` tránh đếm sai số câu khi có IPv4.
8. *(4p — BE/ES)* Phân tích câu hỏi bẫy: tại sao `SearchPlanCompiler` dùng Painless `_script` cho `severity` sort, và `ExportSearchExecutor` dùng `from + size` có hạn chế gì?
9. *(4p — BE/JPA & MDC)* Tại sao `AuditPersistenceService` dùng `REQUIRES_NEW` + `saveAndFlush`? Tại sao `CorrelationIdFilter` phải `MDC.remove()` trong `finally`?
10. *(5p — FE)* Giải thích 3 cơ chế thực chiến ở Frontend: (a) `AbortController` trong `useSearchWorkflow`, (b) Single-Flight `refreshTokenOnce()` khi 5 request Dashboard dính `401`, và (c) vì sao thứ tự `useEffect` cha-con giữa `App.tsx` và `SocDashboard` từng gây lỗi 401 khi hard refresh?
11. *(4p — Self-Audit)* Nêu 3 điểm Tech Debt bạn tự phát hiện trong code hiện tại và thứ tự ưu tiên sửa.

### Vòng 3: Stress-Test & Behavioral STAR (15 phút)
12. *(5p — Behavioral)* Kể 1 **War Story** đáng nhớ nhất theo mô hình STAR (tối đa 90 giây).
13. *(5p — System Scale)* Dữ liệu lên 50 triệu events/ngày và 100 analyst mở Dashboard cùng lúc → sửa kiến trúc thế nào?
14. *(5p — Security/AI Abuse)* Một tài khoản `SOC_VIEWER` spam `/api/v1/search` liên tục hoặc Cloud LLM chết 30 phút → hệ thống ứng phó ra sao?

### Rubric Tự Chấm Điểm (Thang 1 – 5)

| Mức điểm | Tiêu chí đánh giá | Hành động sau chấm |
| :---: | :--- | :--- |
| **1 – 2** | Trả lời chung chung, quên tên class/luồng thực tế, lúng túng khi bị hỏi "tại sao" | Mở lại đúng file ngày tương ứng, đọc lại code thật và nói lại 2 lần |
| **3** | Mô tả đúng hệ thống đang làm gì, nhớ luồng FE → BE → DB nhưng chưa nêu rõ trade-off hoặc điểm gãy | Ôn kỹ mục **Follow-up trap** của từng câu hỏi |
| **4** | Nêu rõ **What + Why + Trade-off**, đọc đúng tên class/cấu hình cốt lõi, nói gọn trong 45–60s | Đạt chuẩn Pass vòng Technical Interview Middle/Junior+ |
| **5** | Chủ động chỉ ra giới hạn/tech debt hiện tại + đề xuất giải pháp production cụ thể kèm cách đo đạc metrics | Sẵn sàng phỏng vấn tự tin cho vị trí Backend Java / AI / Security |

---

## Phần D — 1-Page Emergency Cheat Sheet (Đọc 15 Phút Trước Giờ Phỏng Vấn)

- **1 câu tóm tắt (Trust Boundary):** *"LLM và Browser đều là untrusted. LLM chỉ sinh `SearchPlan` JSON; Backend Spring Boot thực hiện parse nghiêm ngặt (+ 1x repair), validate allowlist, compile ES DSL, enforce Keycloak RBAC, thực thi có timeout, tóm tắt có DLP/fallback và ghi fail-closed audit vào PostgreSQL."*
- **Con số & Hằng số vàng (`SearchPlanContract` & Config):**
  - `MAX_PAGE_SIZE = 100` | `MAX_MESSAGE_QUERY_LENGTH = 200` | `MAX_RELATIVE_HOURS = 720` | `MAX_RELATIVE_DAYS = 90` | `MAX_TOP_N = 100` | `MAX_EXPORT_ROWS = 10_000` (batch `1_000`)
  - Timeouts: ES search `3s` | ES export `10s` | LLM SearchPlan `10s` | LLM Summary `5s` | LLM `maxAttempts = 2` (chỉ retry 5xx/network, không retry 429)
  - Summary DLP: không gửi `raw`, `<= 5_000` chars, `<= 5` samples, `message <= 300` chars, `SECRET_PATTERN`, output `3–5` câu (mask IPv4 & số thập phân)
  - CSV Hardening: Replay theo `query_id`, UTF-8 BOM, `message <= 4KB`, `X-Export-Truncated`, chống Formula Injection (`= + - @ \t \r`)
  - Roles: `SOC_ADMIN > SOC_ANALYST > SOC_VIEWER` (`raw` log cắt ở `EventController.withoutRaw()`)
  - Ops: Caddy auto-HTTPS (3 subdomains), ports `22/80/443`, `vm.max_map_count=262144`, JaCoCo `>= 50%` business logic
- **5 Trade-offs / Nâng cấp đắt giá nhất cần thuộc:**
  1. Painless `_script` sort `severity` → nâng cấp **index-time `severity_rank`**.
  2. CSV Export `from + size` (10k) → nâng cấp **`PIT + search_after` + Async Export Job**.
  3. Synchronous Summary Waterfall → nâng cấp **Async Summary / SSE + Caffeine/Redis cache Dashboard**.
  4. Chưa có Rate Limit & Metrics → bổ sung **Bucket4j/Redis Rate Limiting + Actuator/Micrometer/Prometheus**.
  5. Hardcoded `KNOWN_USERS/HOSTS` trong prompt → nâng cấp **Entity Resolution / RAG + Golden Dataset Eval Harness**.
- **3 điểm Frontend ăn điểm nhất:**
  1. `AbortController` trong `useSearchWorkflow` & `useSearchExport` (chống out-of-order race condition).
  2. Single-Flight `refreshTokenOnce()` trong `auth-token.ts` + thứ tự `useEffect` con-trước-cha giữa `SocDashboard` & `App.tsx`.
  3. Runtime contract check (`assertSearchResponse`), `Promise.allSettled` trên Dashboard, `URL.revokeObjectURL` tránh memory leak Blob.
