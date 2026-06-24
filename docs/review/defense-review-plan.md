# Kế Hoạch Ôn Tập Bảo Vệ - SOC AI Search

Mục tiêu của tài liệu này là giúp bạn ôn lại project theo đúng thứ tự ưu tiên trước buổi bảo vệ. Bạn không cần đọc toàn bộ source code từ đầu đến cuối. Hãy tập trung vào các phần hội đồng dễ hỏi nhất: **bài toán, luồng Natural Language -> SearchPlan -> DSL, AI guardrails, RBAC, audit/export, deployment và demo**.

Thời gian ôn khuyến nghị: 2-3 ngày nếu còn ít thời gian. Nếu chỉ còn 1 ngày, hãy ưu tiên các mục P0 và luyện demo.

---

## Cách Ôn Nhanh

1. Đọc mục **P0** trước. Đây là phần chắc chắn phải nắm.
2. Với mỗi mục, đọc phần "Bạn cần nói được" trước, sau đó mới mở code/tài liệu liên quan.
3. Không cố học thuộc code. Hãy hiểu vai trò của từng lớp và luồng dữ liệu.
4. Luyện trả lời các câu hỏi khó ở cuối file.
5. Chạy demo ít nhất 3 lần trước ngày bảo vệ.

---

# P0 - Bắt Buộc Nắm Chắc

## 1. Bài Toán Và Ý Tưởng Chính

### Bạn cần nói được

- SOC analyst phải xử lý nhiều log/cảnh báo bảo mật.
- Viết Elasticsearch DSL thủ công dài, khó, dễ sai.
- SOC AI Search cho phép hỏi bằng tiếng Anh/tiếng Việt.
- LLM không truy vấn Elasticsearch trực tiếp.
- LLM chỉ sinh `SearchPlan`.
- Backend validate `SearchPlan`, compile thành Elasticsearch DSL rồi mới execute.

### Câu nói trọng tâm

> AI chỉ hỗ trợ tạo SearchPlan. Backend mới là nơi kiểm soát schema, validate, compile DSL, RBAC và audit. Vì vậy hệ thống dùng AI nhưng vẫn giữ guardrail an toàn.

### Tài liệu/code cần đọc

- `README.md`
- `docs/architecture.md`
- `docs/sequence-flow.md`
- `docs/presentation/presentation-outline.md`
- `backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchService.java`
- `backend/src/main/java/com/soc/ai/search/search/plan/SearchPlan.java`
- `backend/src/main/java/com/soc/ai/search/search/validation/SearchPlanValidator.java`
- `backend/src/main/java/com/soc/ai/search/search/compiler/SearchPlanCompiler.java`

### Cách tự kiểm tra

Bạn tự trả lời trong 30 giây:

- Tại sao không cho LLM sinh Elasticsearch DSL trực tiếp?
- SearchPlan có vai trò gì?
- Backend kiểm soát an toàn ở bước nào?

---

## 2. Luồng Natural Language Search

### Bạn cần nói được

Luồng chính khi user search:

1. Frontend gọi `POST /api/v1/search` với `question`, `page`, `size`.
2. Backend build prompt cho LLM.
3. LLM trả raw text chứa SearchPlan JSON.
4. Parser kiểm tra JSON thuần, không markdown/prose.
5. Bean Validation + `SearchPlanValidator` kiểm tra rule nghiệp vụ.
6. Backend override `page/size` từ request.
7. Compiler sinh Elasticsearch DSL.
8. Executor gọi Elasticsearch.
9. Response trả về `search_plan`, `generated_dsl`, `events`, latency, summary.
10. Audit log lưu vào PostgreSQL.

### Code cần đọc

- `backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchController.java`
- `backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchService.java`
- `backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchRequest.java`
- `backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchResponse.java`
- `backend/src/main/java/com/soc/ai/search/llm/LlmClient.java`
- `backend/src/main/java/com/soc/ai/search/llm/prompt/SearchPlanPromptBuilder.java`
- `backend/src/main/java/com/soc/ai/search/llm/prompt/SearchPlanJsonParser.java`
- `backend/src/main/java/com/soc/ai/search/llm/mock/MockLlmClient.java`
- `backend/src/main/java/com/soc/ai/search/llm/gemini/GeminiLlmClient.java`

### Frontend cần đọc

- `frontend/src/services/search-api.ts`
- `frontend/src/App.tsx`
- `frontend/src/components/soc/search-section.tsx`
- `frontend/src/components/soc/query-transparency.tsx`
- `frontend/src/components/soc/result-tabs.tsx`

### Câu hỏi hội đồng có thể hỏi

- Nếu Gemini lỗi thì sao?
- Nếu LLM trả markdown thì sao?
- Nếu LLM tự thêm field lạ thì sao?
- Vì sao backend override page/size?

### Câu trả lời ngắn

- LLM lỗi thì response lỗi có kiểm soát hoặc fallback/mock tùy config.
- Parser chỉ chấp nhận một JSON object thuần.
- Unknown field bị reject.
- Page/size do backend lấy từ request để LLM không tự tăng size gây tốn tài nguyên.

---

## 3. SearchPlan, Validator Và Compiler

### Bạn cần nói được

- `SearchPlan` là contract trung gian giữa ngôn ngữ tự nhiên và DSL.
- Validator kiểm tra field allowlist, mode, filter, severity, size, aggregation rule.
- Compiler là nơi duy nhất sinh Elasticsearch DSL.
- Frontend/LLM không được sinh hoặc edit DSL trực tiếp.

### Code cần đọc

- `backend/src/main/java/com/soc/ai/search/search/plan/SearchPlan.java`
- `backend/src/main/java/com/soc/ai/search/search/plan/SearchMode.java`
- `backend/src/main/java/com/soc/ai/search/search/plan/SearchFilters.java`
- `backend/src/main/java/com/soc/ai/search/search/plan/AggregationPlan.java`
- `backend/src/main/java/com/soc/ai/search/search/plan/AggregationType.java`
- `backend/src/main/java/com/soc/ai/search/search/plan/HistogramInterval.java`
- `backend/src/main/java/com/soc/ai/search/search/validation/SearchPlanValidator.java`
- `backend/src/main/java/com/soc/ai/search/search/compiler/SearchPlanCompiler.java`

### Test nên xem

- `backend/src/test/java/com/soc/ai/search/search/plan/SearchPlanJacksonTest.java`
- `backend/src/test/java/com/soc/ai/search/search/validation/SearchPlanValidatorTest.java`
- `backend/src/test/java/com/soc/ai/search/search/compiler/SearchPlanCompilerTest.java`

### Điều cần nhớ

Aggregation mapping:

| Aggregation | Ý nghĩa | Chart |
| --- | --- | --- |
| `count` | đếm tổng số event | Number |
| `group_by` | gom nhóm theo field | Bar |
| `top_n` | top N giá trị nhiều nhất | Bar |
| `date_histogram` | thống kê theo thời gian | Line |

### Câu trả lời mẫu

> SearchPlan giúp em giới hạn những gì AI được phép yêu cầu. Validator chỉ cho phép field hợp lệ, aggregation hợp lệ. Sau đó compiler mới sinh DSL. Như vậy nếu AI hoặc user cố tình đưa field nguy hiểm, backend sẽ reject trước khi query Elasticsearch.

---

## 4. AI Guardrails Và Repair

### Bạn cần nói được

- Prompt yêu cầu LLM trả duy nhất một JSON object.
- Parser reject markdown, prose, array, scalar, multiple JSON object, unknown field.
- Validator reject rule sai.
- Repair/retry tối đa một lần, không retry vô hạn.
- Summary là best-effort; summary lỗi không làm search fail.

### Code cần đọc

- `backend/src/main/java/com/soc/ai/search/llm/prompt/SearchPlanPromptBuilder.java`
- `backend/src/main/java/com/soc/ai/search/llm/prompt/SearchPlanJsonParser.java`
- `backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchService.java`
- `backend/src/main/java/com/soc/ai/search/llm/LlmResponse.java`
- `backend/src/main/java/com/soc/ai/search/llm/LlmSummaryRequest.java`
- `backend/src/main/java/com/soc/ai/search/summary` nếu có package summary riêng

### Test nên xem

- `backend/src/test/java/com/soc/ai/search/llm/prompt/SearchPlanJsonParserTest.java`
- `backend/src/test/java/com/soc/ai/search/llm/prompt/SearchPlanPromptBuilderTest.java`
- `backend/src/test/java/com/soc/ai/search/search/nl/NaturalLanguageSearchServiceTest.java`

### Câu hỏi dễ gặp

**Nếu AI sinh sai field thì sao?**

> Jackson parser và validator reject unknown field/rule sai. Không compile DSL.

**Nếu AI timeout khi summary thì sao?**

> Search result vẫn trả về. Summary là optional best-effort, có fallback hoặc null.

**Làm sao để phân trang (Pagination) mà không bị chậm?**

> Khi user chuyển trang (Next Page), hệ thống KHÔNG gọi lại LLM. Frontend tái sử dụng `SearchPlan` cũ và chỉ thay đổi số `page`. Backend compile lại DSL và gọi Elasticsearch. Nhờ vậy tốc độ chuyển trang đạt mức tức thời (chỉ vài chục ms) và tiết kiệm 100% chi phí token LLM.

---


## 5. LLM Trong Project: Cách Hệ Thống Sử Dụng Gemini/Mock

### Vì sao cần ôn phần này?

Bạn chưa từng tiếp xúc nhiều với LLM, nhưng hội đồng rất có thể sẽ hỏi: "Em tích hợp AI như thế nào?", "Prompt nằm ở đâu?", "Gemini trả gì về?", "Nếu Gemini lỗi thì sao?". Phần này giúp bạn nắm đủ để giải thích tự tin mà không cần hiểu sâu toàn bộ machine learning.

### Bạn cần nói được

- Project không tự train model.
- Project sử dụng LLM dạng hosted provider, hiện hỗ trợ `mock` và `gemini`.
- LLM được dùng để chuyển câu hỏi tự nhiên thành `SearchPlan` JSON.
- LLM cũng có thể dùng để sinh summary best-effort.
- Backend không gửi raw log/search result đầy đủ vào LLM trong bước tạo SearchPlan.
- Backend không để LLM sinh Elasticsearch DSL trực tiếp.
- `mock` dùng cho local/demo/test khi không muốn tốn tiền hoặc phụ thuộc mạng.
- `gemini` dùng khi muốn gọi AI thật qua HTTP API.

### Luồng LLM trong project

```text
User question
    -> SearchPlanPromptBuilder tạo system prompt + schema/allowlist
    -> LlmClient.generateSearchPlan(...)
    -> MockLlmClient hoặc GeminiLlmClient
    -> LlmResponse(content, model, latencyMs)
    -> SearchPlanJsonParser parse raw content
    -> SearchPlanValidator validate
    -> SearchPlanCompiler compile DSL
```

### Các class quan trọng

- `backend/src/main/java/com/soc/ai/search/llm/LlmClient.java`
  - Interface chung cho mọi provider.
  - Method chính: generate SearchPlan, return `LlmResponse`.

- `backend/src/main/java/com/soc/ai/search/llm/LlmResponse.java`
  - Record chứa raw content, model, latency.
  - `content` là raw text từ LLM, chưa parse thành SearchPlan.

- `backend/src/main/java/com/soc/ai/search/llm/LlmProperties.java`
  - Bind config từ environment.
  - Các biến quan trọng: `LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_TIMEOUT_MS`, `LLM_MAX_ATTEMPTS`.

- `backend/src/main/java/com/soc/ai/search/llm/LlmProvider.java`
  - Enum provider: `MOCK`, `GEMINI`.

- `backend/src/main/java/com/soc/ai/search/llm/mock/MockLlmClient.java`
  - Provider mock.
  - Không gọi mạng.
  - Trả JSON SearchPlan deterministic cho các câu demo.

- `backend/src/main/java/com/soc/ai/search/llm/gemini/GeminiLlmClient.java`
  - Provider Gemini thật.
  - Gọi Gemini REST API.
  - Lấy text từ `candidates[0].content.parts[0].text`.
  - Không parse SearchPlan, không gọi Elasticsearch.

- `backend/src/main/java/com/soc/ai/search/llm/prompt/SearchPlanPromptBuilder.java`
  - Xây prompt cho LLM.
  - Mô tả nhiệm vụ, schema, allowlist, rule không markdown/prose/DSL.

- `backend/src/main/java/com/soc/ai/search/llm/prompt/SearchPlanJsonParser.java`
  - Parse raw output từ LLM thành `SearchPlan`.
  - Reject output không phải JSON object thuần.

### Environment config cần nhớ

Local/test dùng mock:

```env
LLM_PROVIDER=mock
```

Gemini thật:

```env
LLM_PROVIDER=gemini
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta
LLM_API_KEY=...
LLM_MODEL=gemini-2.5-flash
LLM_TIMEOUT_MS=10000
LLM_MAX_ATTEMPTS=2
```

### Câu trả lời mẫu: Em tích hợp Gemini như thế nào?

> Em tạo một interface `LlmClient` để tách logic gọi LLM khỏi phần search. Hệ thống có hai provider: mock và Gemini. Với Gemini, backend lấy cấu hình từ environment, gọi HTTP API, lấy text output từ response của Gemini rồi đóng gói vào `LlmResponse`. Gemini client không parse SearchPlan, không sinh DSL và không gọi Elasticsearch. Việc parse, validate và compile do backend service riêng xử lý.

### Câu trả lời mẫu: Vì sao cần mock LLM?

> Mock LLM giúp local development, test và CI ổn định, không tốn tiền, không phụ thuộc mạng, không phụ thuộc quota Gemini. Khi demo hoặc production có thể đổi `LLM_PROVIDER=gemini` để gọi AI thật.

### Câu trả lời mẫu: Nếu Gemini trả text không hợp lệ thì sao?

> Backend parser sẽ reject nếu output không phải JSON object thuần hoặc có markdown/prose/unknown field. Service có thể repair tối đa một lần. Nếu vẫn lỗi thì trả lỗi có kiểm soát, không sinh DSL và không query Elasticsearch.

### Câu trả lời mẫu: Prompt của em kiểm soát LLM như thế nào?

> Prompt nói rõ nhiệm vụ duy nhất là chuyển natural language thành JSON SearchPlan. Prompt cấm markdown, prose, Elasticsearch DSL và field ngoài schema. Prompt cũng mô tả allowlist filter, aggregation type, severity hợp lệ và rule không hallucinate filter nếu user không nói rõ.

### Câu hỏi tự ôn

- `LlmClient` khác gì `GeminiLlmClient`?
- Vì sao `GeminiLlmClient` không parse JSON thành SearchPlan?
- Vì sao `mock` hữu ích cho CI/demo?
- `LLM_PROVIDER=gemini` cần những env nào?
- LLM có được gửi raw event/search result không?
- LLM có được sinh DSL không?

---
## 6. Demo Flow Phải Thuộc

### Luồng demo 5 phút

1. Login analyst.
2. Vào Dashboard, chỉ nhanh KPI/charts.
3. Vào Event Search.
4. Chạy:

```text
Show me failed login attempts from China in the last 24h
```

5. Chỉ `SearchPlan` và `Generated DSL`.
6. Chạy aggregation bar:

```text
Show the top 10 source IPs with the most alerts in the last 30 days
```

7. Chạy aggregation line:

```text
Show failed login trend by hour in the last 24 hours
```

8. Mở All Investigations, pin query, xem SearchPlan/DSL detail.
9. Export CSV nếu còn thời gian.
10. Nếu có thời gian, login viewer/admin để chứng minh RBAC.

### File/UI cần nhớ

- `frontend/src/components/soc/dashboard/soc-dashboard.tsx`
- `frontend/src/components/soc/investigations/investigations-page.tsx`
- `frontend/src/components/soc/query-transparency.tsx`
- `frontend/src/components/soc/result-tabs.tsx`

---

# P1 - Rất Quan Trọng

## 7. RBAC Và Keycloak

### Bạn cần nói được

Có 3 role:

| Role | Ý nghĩa |
| --- | --- |
| `SOC_VIEWER` | xem/search cơ bản |
| `SOC_ANALYST` | điều tra, edit SearchPlan, export, pin |
| `SOC_ADMIN` | quản trị, audit logs, toàn quyền |

### Capability matrix

| Chức năng | Viewer | Analyst | Admin |
| --- | :---: | :---: | :---: |
| Search | Yes | Yes | Yes |
| Event detail cơ bản | Yes | Yes | Yes |
| Raw log sâu | No/limited | Yes | Yes |
| Edit SearchPlan | No | Yes | Yes |
| Export CSV | No | Yes | Yes |
| Pin/unpin investigation | No | Yes | Yes |
| Audit logs | No | No | Yes |

### Code cần đọc

- `backend/src/main/java/com/soc/ai/search/security/SecurityConfig.java`
- `backend/src/main/java/com/soc/ai/search/security/RbacPermissionService.java`
- `backend/src/main/java/com/soc/ai/search/security/CurrentUserService.java`
- `backend/src/main/java/com/soc/ai/search/security/RoleNames.java`
- `frontend/src/auth/permissions.ts`
- `infra/keycloak/realm-export/soc-ai-search-realm.json`

### Test nên xem

- `backend/src/test/java/com/soc/ai/search/security/RbacEndpointGuardTest.java`
- `backend/src/test/java/com/soc/ai/search/security/KeycloakJwtGrantedAuthoritiesConverterTest.java`
- `frontend/src/auth/permissions.test.ts`

### Câu hỏi hội đồng có thể hỏi

**Ẩn button trên UI có đủ bảo mật không?**

> Không. UI chỉ cải thiện UX. Backend vẫn dùng Spring Security và role check để chặn request trái quyền.

---

## 8. Audit, History, Investigations

### Bạn cần nói được

- Mỗi search lưu một record trong PostgreSQL.
- Lưu question, identity, mode, status, SearchPlan, generated DSL, result count, latency, summary/error.
- Recent Queries là quick access.
- All Investigations là workspace đầy đủ để xem history, pin, rerun, export.
- Admin dùng audit logs để truy vết hệ thống.

### Code cần đọc

- `backend/src/main/java/com/soc/ai/search/audit/SearchAuditService.java`
- `backend/src/main/java/com/soc/ai/search/audit/AuditPersistenceService.java`
- `backend/src/main/java/com/soc/ai/search/audit/AuditQueryService.java`
- `backend/src/main/java/com/soc/ai/search/audit/AuditQueryController.java`
- `backend/src/main/java/com/soc/ai/search/audit/SearchQueryLog.java`
- `backend/src/main/resources/db/migration/V1__create_search_query_logs.sql`
- `frontend/src/services/history-api.ts`
- `frontend/src/components/soc/history-sheet.tsx`
- `frontend/src/components/soc/investigations/investigations-page.tsx`
- `frontend/src/components/soc/investigations/investigation-detail-panel.tsx`

### Câu trả lời mẫu

> Audit/history giúp truy vết: user hỏi gì, hệ thống sinh SearchPlan nào, DSL nào được chạy, kết quả bao nhiêu, latency ra sao và có lỗi gì không. 
> Về mặt UX, trang Investigations và Audit Logs dùng thiết kế **Master-Detail (chia đôi màn hình 35/65)** với hai thanh cuộn dọc độc lập, giúp user không bị mất bối cảnh (context) khi đối chiếu hàng loạt log chi tiết.

---

## 9. CSV Export An Toàn

### Bạn cần nói được

- Export không nhận DSL từ client.
- Client chỉ gửi `query_id`.
- Backend lấy SearchPlan đã lưu trong PostgreSQL.
- Backend validate/compile lại rồi query Elasticsearch.
- Export giới hạn tối đa 10,000 rows.
- Có chống CSV formula injection.

### Code cần đọc

- `backend/src/main/java/com/soc/ai/search/csv/CsvExportController.java`
- `backend/src/main/java/com/soc/ai/search/csv/CsvExportService.java`
- `backend/src/main/java/com/soc/ai/search/csv/CsvRowWriter.java`
- `backend/src/main/java/com/soc/ai/search/audit/SearchQueryLogLookupService.java`
- `frontend/src/services/csv-export-api.ts`
- `frontend/src/components/soc/result-tabs.tsx`

### Test nên xem

- `backend/src/test/java/com/soc/ai/search/csv/CsvExportServiceTest.java`
- `backend/src/test/java/com/soc/ai/search/csv/CsvRowWriterTest.java`
- `frontend/src/services/csv-export-api.test.ts`

### Câu hỏi dễ gặp

**Tại sao không cho frontend gửi DSL để export?**

> Vì DSL tùy ý có thể bypass validator. Export bằng query_id giúp backend replay SearchPlan đã lưu và kiểm soát lại toàn bộ.

---

## 10. Dashboard Và Suggestions

### Bạn cần nói được

- Dashboard dùng aggregation API cố định.
- Dashboard không gọi LLM.
- Auto-refresh 10 phút.
- Nếu một card lỗi, các card khác vẫn hiển thị.
- Suggestions/playbooks là static/deterministic, không tốn thêm LLM.

### Code cần đọc

- `frontend/src/components/soc/dashboard/soc-dashboard.tsx`
- `frontend/src/components/soc/dashboard/kpi-cards.tsx`
- `frontend/src/components/soc/dashboard/events-over-time.tsx`
- `frontend/src/components/soc/dashboard/severity-distribution.tsx`
- `frontend/src/components/soc/dashboard/top-source-ips.tsx`
- `frontend/src/lib/investigation-suggestions.ts`
- `frontend/src/services/search-api.ts`

### Câu trả lời mẫu

> Dashboard không cần AI vì nó chạy các SearchPlan aggregation cố định. Điều này giúp dashboard nhanh, ổn định, ít tốn chi phí LLM và không làm nhiễu audit history.

---

# P2 - Cần Biết Để Trả Lời Sâu

## 11. Elasticsearch Mapping Và Dataset

### Bạn cần nói được

- SOC events được lưu trong Elasticsearch index `soc-events-v1`.
- Có synthetic dataset để demo.
- Field search/aggregation được allowlist.
- Aggregation dùng field keyword/ip trực tiếp, không tự thêm `.keyword` nếu mapping đã phù hợp.

### Code/tài liệu cần đọc

- `infra/elasticsearch/soc-events-v1-index.json`
- `scripts/bootstrap-elasticsearch.ps1`
- `scripts/seed-events.ps1`
- `docs/search-engine-decision.md`

### Lệnh seed dữ liệu

```powershell
.\scripts\bootstrap-elasticsearch.ps1
.\scripts\seed-events.ps1 -Count 10000
```

Trên VPS Linux:

```bash
pwsh ./scripts/bootstrap-elasticsearch.ps1
pwsh ./scripts/seed-events.ps1 -Count 10000
```

---

## 12. Deployment, Domain, Caddy

### Bạn cần nói được

- Deploy bằng DigitalOcean VPS.
- DNS ở Name.com.
- Caddy làm reverse proxy HTTPS.
- Docker Compose chạy frontend/backend/postgres/elasticsearch/keycloak.
- Không dùng AWS/Nginx/Certbot trong deployment hiện tại.

### Code/tài liệu cần đọc

- `docker-compose.yml`
- `docker-compose.deploy.yml`
- `Caddyfile`
- `.github/workflows/deploy.yml`
- `docs/deployment.md` nếu có
- `plan/day-11-implements.md`

### Public endpoints cần nhớ

- Frontend: `https://soc-ai-search.app`
- API: `https://api.soc-ai-search.app`
- Auth: `https://auth.soc-ai-search.app`

### Câu hỏi dễ gặp

**Vì sao dùng Caddy?**

> Caddy đơn giản cho MVP, tự động HTTPS, cấu hình reverse proxy gọn hơn Nginx + Certbot.

---

## 13. CI/CD Và Smoke Test

### Bạn cần nói được

- CI kiểm tra backend/frontend/test/build/docker compose config.
- CD SSH vào VPS, pull/build/restart containers.
- Smoke test domain kiểm tra public app/API/auth.

### File cần đọc

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `scripts/smoke-test-day-11-domain.ps1`
- `scripts/smoke-test-day-10-regression.ps1`
- `scripts/smoke-test-day-09-rbac.ps1`

### Câu trả lời mẫu

> CI/CD giúp em phát hiện lỗi trước khi demo: test fail, build fail, Docker config sai hoặc domain public không phản hồi.

---

## 14. Testing Và Coverage

### Bạn cần nói được

- Backend có test cho parser, validator, compiler, executor, RBAC, audit, CSV.
- Frontend có test cho API client, permissions, UI flows.
- JaCoCo dùng để xem coverage backend.
- Test tập trung business logic, không chỉ getter/setter.

### File nên xem

- `backend/target/site/jacoco/index.html`
- `backend/pom.xml`
- `frontend/package.json`
- `backend/src/test/java/com/soc/ai/search/search/validation/SearchPlanValidatorTest.java`
- `backend/src/test/java/com/soc/ai/search/search/compiler/SearchPlanCompilerTest.java`
- `backend/src/test/java/com/soc/ai/search/security/RbacEndpointGuardTest.java`
- `frontend/src/auth/permissions.test.ts`
- `frontend/src/services/search-api.test.ts`

### Lệnh verify

```powershell
cd backend
.\mvnw.cmd test
cd ..

cd frontend
npm test
npm run build
cd ..
```

### Câu hỏi dễ gặp

**Làm sao để test độc lập các API bảo mật (có check quyền) khi chưa code xong Frontend?**

> Em sử dụng **Swagger UI** (thư viện `springdoc-openapi`). Em đã tạo class `OpenApiConfig.java` để thêm module Security (Bearer Token). Khi test, em chỉ cần lấy JWT từ Keycloak dán vào nút "Authorize" trên Swagger là có thể gọi thử mọi API phân quyền (như Export, Audit Logs) hệt như một user thật.

---

# Kế Hoạch Ôn Theo Ngày

## Nếu Còn 3 Ngày

### Ngày 1 - Core Backend + AI Guardrails

- Đọc P0 mục 1-4.
- Mở code `NaturalLanguageSearchService`, `SearchPlanValidator`, `SearchPlanCompiler`.
- Tự vẽ lại luồng NL -> SearchPlan -> DSL trên giấy.
- Trả lời thử: “Nếu AI sinh sai thì sao?”.

### Ngày 2 - UI + RBAC + Audit/Export

- Đọc P1 mục 6-9.
- Mở UI và chạy demo search/aggregation/dashboard/investigations.
- Ôn role Viewer/Analyst/Admin.
- Ôn CSV export bằng query_id.

### Ngày 3 - Deploy + Demo Rehearsal

- Đọc P2 mục 10-13.
- Chạy thử demo 3 lần.
- Chuẩn bị backup screenshots/video.
- Kiểm tra tài khoản demo, Gemini/mock mode, data seed.

## Nếu Chỉ Còn 1 Ngày

Ưu tiên theo thứ tự:

1. Core flow NL -> SearchPlan -> DSL.
2. AI Guardrails.
3. Demo search + aggregation + investigations.
4. RBAC role matrix.
5. Deploy/CI/CD nói ngắn.
6. Future work.

Không dành quá nhiều thời gian đọc từng dòng frontend CSS.

---

# Checklist Trước Khi Bảo Vệ

## Kỹ thuật

- [ ] App public mở được.
- [ ] Login analyst được.
- [ ] Search query demo chạy được.
- [ ] Aggregation bar chạy được.
- [ ] Aggregation line chạy được.
- [ ] Dashboard có data.
- [ ] All Investigations có history.
- [ ] Export CSV hoạt động hoặc có ảnh backup.
- [ ] Viewer không export/edit/pin.
- [ ] Admin audit logs hoạt động nếu demo RBAC.
- [ ] Có backup screenshots/video.

## Thuyết trình

- [ ] Nói được bài toán trong 30 giây.
- [ ] Nói được core idea trong 30 giây.
- [ ] Giải thích được SearchPlan.
- [ ] Giải thích được vì sao không cho LLM sinh DSL.
- [ ] Giải thích được RBAC.
- [ ] Giải thích được audit/export an toàn.
- [ ] Demo dưới 5 phút.

---

# Câu Hỏi Khó Và Câu Trả Lời Mẫu

## 1. Nếu AI sinh sai thì sao?

LLM không được chạy query trực tiếp. Output của LLM phải là SearchPlan JSON. Backend parser chỉ nhận JSON object thuần, reject markdown/prose/unknown field. Sau đó validator kiểm tra rule nghiệp vụ. Nếu sai, hệ thống repair tối đa một lần hoặc trả lỗi có kiểm soát, không sinh DSL.

## 2. Vì sao không cho LLM sinh Elasticsearch DSL trực tiếp?

DSL có thể chứa query không mong muốn hoặc field ngoài allowlist. Nếu để LLM sinh DSL trực tiếp thì bypass validator và compiler. SearchPlan là contract trung gian giúp backend kiểm soát field, mode, pagination, aggregation, RBAC và audit.

## 3. Người dùng sửa SearchPlan độc hại thì sao?

SearchPlan do user sửa vẫn đi qua cùng parser/validator/compiler. DSL không cho edit trực tiếp. Vì vậy user không thể bypass guardrail bằng cách sửa UI.

## 4. Viewer có thể làm gì?

Viewer được search và xem kết quả cơ bản theo policy hiện tại. Viewer không được edit SearchPlan, export CSV, pin/unpin investigation hoặc xem audit logs. Backend vẫn chặn bằng RBAC, không chỉ ẩn button trên frontend.

## 5. CSV export có rủi ro không?

Export không nhận DSL từ client. Client chỉ gửi query_id. Backend lấy SearchPlan đã lưu, validate/compile lại, query ES và export tối đa 10,000 rows. CsvRowWriter cũng xử lý escaping/formula injection.

## 6. Dashboard có dùng LLM không?

Không. Dashboard dùng các SearchPlan aggregation cố định để lấy KPI/chart. Điều này giúp dashboard nhanh, ổn định và không tốn thêm chi phí LLM.

## 7. Nếu Gemini bị lỗi hoặc hết quota thì sao?

Hệ thống có provider mock cho local/demo/test. Với Gemini thật, lỗi được trả có kiểm soát. Summary là best-effort nên summary lỗi không làm search result fail.

## 8. Dữ liệu demo từ đâu?

Dữ liệu demo là synthetic SOC events được seed vào Elasticsearch bằng script. PostgreSQL chỉ lưu metadata như audit/history/SearchPlan/DSL/summary, không lưu raw event chính.

## 9. Tại sao dùng PostgreSQL và Elasticsearch cùng lúc?

Elasticsearch phù hợp search/filter/aggregation trên log. PostgreSQL phù hợp lưu metadata có cấu trúc như audit logs, query history, pin, summary, export replay.

## 10. Vì sao dùng Caddy?

Caddy đơn giản cho MVP, tự động HTTPS, cấu hình reverse proxy gọn, phù hợp deploy nhanh trên DigitalOcean VPS.

---

# Một Trang Tóm Tắt Để Học Thuộc

SOC AI Search là hệ thống giúp SOC analyst tìm kiếm và thống kê log bảo mật bằng ngôn ngữ tự nhiên. Người dùng hỏi bằng tiếng Anh hoặc tiếng Việt. LLM chỉ sinh SearchPlan JSON, không được sinh DSL chạy trực tiếp. Backend parse, validate, enforce guardrails, compile thành Elasticsearch DSL rồi execute. Kết quả trả về gồm events/aggregation, SearchPlan, generated DSL, latency, summary và được audit vào PostgreSQL. Frontend có dashboard, event search, query transparency, editable SearchPlan, investigations, CSV export. RBAC dùng Keycloak với Viewer, Analyst, Admin. Hệ thống deploy public bằng DigitalOcean, Docker Compose, Caddy HTTPS và CI/CD GitHub Actions.

