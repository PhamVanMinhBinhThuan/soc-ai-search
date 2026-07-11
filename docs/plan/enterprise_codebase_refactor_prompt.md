# Prompt: Enterprise Codebase Refactor Review And Implementation

## Role

Bạn là Senior Software Engineer / Staff Engineer chuyên refactor hệ thống Spring Boot + React TypeScript theo chuẩn enterprise.

Nhiệm vụ của bạn là đọc kỹ source code hiện tại của dự án SOC AI Search, sau đó refactor theo hướng:

- Dễ bảo trì hơn.
- Ít duplication hơn.
- Contract giữa FE/BE rõ ràng hơn.
- Error handling, security, LLM provider, search pipeline và CSV export có cấu trúc nhất quán hơn.
- Không làm thay đổi behavior nghiệp vụ hiện tại.
- Không phá UI/UX hiện tại.
- Không làm hỏng CI/CD, test, coverage gate và deploy flow.

Đây là task refactor kỹ thuật, không phải task thêm tính năng mới.

## Bối Cảnh Dự Án

Dự án gồm:

- Backend: Spring Boot Java 21.
- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix UI).
- Database: PostgreSQL cho history/audit, Elasticsearch cho SOC events.
- Auth/RBAC: Keycloak + Spring Security Resource Server.
- LLM: Gemini / Anthropic / Mock provider.
- CI/CD: GitHub Actions, Docker Compose, VPS deploy, smoke test.

Các chức năng chính đang có:

- Natural-language search.
- SearchPlan intermediate contract.
- SearchPlan parser, validator, compiler sang Elasticsearch DSL.
- Search/aggregation result rendering.
- AI Summary.
- AI Follow-up Suggestions.
- Correct or Refine Query.
- Query Transparency.
- Query Library.
- Dashboard.
- Investigations.
- System Audit Logs.
- CSV export.
- RBAC viewer/analyst/admin.

## Nguyên Tắc Bắt Buộc

1. Không rewrite toàn bộ dự án.
2. Không đổi API public nếu không thật sự cần.
3. Không đổi database schema nếu không cần thiết.
4. Không đổi prompt logic theo hướng làm thay đổi kết quả search.
5. Không đổi SearchPlan contract nếu task refactor không yêu cầu.
6. Không làm mất các test hiện có.
7. Không làm giảm coverage.
8. Không làm thay đổi quyền RBAC hiện tại.
9. Không đưa API key, token, secret vào log.
10. Không làm UI xấu đi hoặc đổi layout chính.

Nếu có thay đổi behavior nhỏ, phải ghi rõ lý do và cập nhật test tương ứng.

## Các File / Khu Vực Cần Review Trước

Backend:

- `backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchService.java`
- `backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchController.java`
- `backend/src/main/java/com/soc/ai/search/search/execution/SearchController.java`
- `backend/src/main/java/com/soc/ai/search/search/execution/SearchPlanExecutor.java`
- `backend/src/main/java/com/soc/ai/search/search/validation/SearchPlanValidator.java`
- `backend/src/main/java/com/soc/ai/search/search/compiler/SearchPlanCompiler.java`
- `backend/src/main/java/com/soc/ai/search/llm/gemini/GeminiLlmClient.java`
- `backend/src/main/java/com/soc/ai/search/llm/anthropic/AnthropicLlmClient.java`
- `backend/src/main/java/com/soc/ai/search/llm/mock/MockLlmClient.java`
- `backend/src/main/java/com/soc/ai/search/llm/prompt/SearchPlanPromptBuilder.java`
- `backend/src/main/java/com/soc/ai/search/summary/SummaryPayloadBuilder.java`
- `backend/src/main/java/com/soc/ai/search/summary/ResultSummaryService.java`
- `backend/src/main/java/com/soc/ai/search/suggestions/FollowUpSuggestionPromptBuilder.java`
- `backend/src/main/java/com/soc/ai/search/search/refine/QueryRefinementPromptBuilder.java`
- `backend/src/main/java/com/soc/ai/search/csv/*`
- `backend/src/main/java/com/soc/ai/search/audit/*`
- `backend/src/main/java/com/soc/ai/search/security/*`
- `backend/src/main/resources/application.properties`
- `backend/pom.xml`

Frontend:

- `frontend/src/App.tsx`
- `frontend/src/components/soc/result-tabs.tsx`
- `frontend/src/components/soc/query-transparency.tsx`
- `frontend/src/components/soc/query-breakdown.tsx`
- `frontend/src/components/soc/search-section.tsx`
- `frontend/src/components/soc/event-detail-drawer.tsx`
- `frontend/src/components/soc/history-sheet.tsx`
- `frontend/src/components/soc/admin/audit-logs-page.tsx`
- `frontend/src/components/soc/investigations/*`
- `frontend/src/components/soc/investigations/investigations-master-list.tsx`
- `frontend/src/components/soc/dashboard/*`
- `frontend/src/components/soc/query-library-page.tsx`
- `frontend/src/lib/query-library.ts`
- `frontend/src/types/soc.ts`
- `frontend/src/services/api-client.ts`
- `frontend/src/services/search-api.ts`
- `frontend/src/services/search-plan-api.ts`
- `frontend/src/services/history-api.ts`
- `frontend/src/services/follow-up-suggestions-api.ts`
- `frontend/src/services/csv-export-api.ts`
- `frontend/src/auth/*`

Infra / CI:

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `docker-compose.yml`
- `docker-compose.deploy.yml`
- `frontend/Dockerfile`
- `backend/Dockerfile`
- `Caddyfile`
- `.env.example`
- `frontend/.env.example`

## Những Vấn Đề Đã Quan Sát Được

### 1. Frontend `App.tsx` đang ôm quá nhiều responsibility

`frontend/src/App.tsx` hiện đang quản lý cùng lúc:

- route/page selection;
- auth token registration;
- natural-language search;
- pagination;
- refined search plan execution;
- event detail modal;
- history modal;
- CSV export;
- pin/unpin;
- follow-up suggestion key;
- summary visibility;
- error/loading state.

Đây là dấu hiệu của "god component". Trong môi trường enterprise, nên tách orchestration logic thành custom hooks và page components rõ ràng hơn.

Mục tiêu refactor:

- `App.tsx` chỉ nên giữ routing/layout cấp cao.
- Search workflow nên tách thành `useSearchWorkflow`.
- Event detail nên tách thành `useEventDetail`.
- History modal nên tách thành `useSearchHistoryModal`.
- CSV export nên tách thành `useSearchExport`.
- Current route/page mapping nên tách thành helper hoặc route config.

### 2. `result-tabs.tsx` đang trộn nhiều UI và business logic

`frontend/src/components/soc/result-tabs.tsx` hiện chứa:

- analytics chart rendering;
- summary table pagination;
- raw event table;
- filter/sort controls;
- entity parsing;
- event ID parsing;
- tab rendering;
- export controls;
- permission-dependent UI.

Mục tiêu refactor:

- Tách `AnalyticsView` ra file riêng.
- Tách `SummaryTable` ra file riêng.
- Tách `RawEventsTable` ra file riêng.
- Tách `ResultControls` ra file riêng.
- Tách helper filter parsing vào `frontend/src/lib/search-plan-filters.ts`.
- Giữ public API của `ResultTabs` ổn định để không phải sửa nhiều file gọi.

### 3. Frontend response validation chưa đều

`search-api.ts` có validate response cho `/api/v1/search`, nhưng `search-plan-api.ts` đang cast mềm response từ `/api/v1/search/plan`.

Điều này từng có rủi ro che lỗi contract, ví dụ fallback summary `"Executed custom SearchPlan."` có thể xuất hiện khi response thiếu summary.

Mục tiêu refactor:

- Tạo type guard / parser cho `SearchPlanResponseDto`.
- Không dùng cast trực tiếp kiểu `payload as SearchPlanResponseDto` nếu payload đến từ network.
- Chuẩn hóa normalization logic từ `SearchPlanResponseDto` sang `NaturalLanguageSearchResponseDto`.
- Khi `include_summary=false`, không được vô tình overwrite summary hiện tại nếu flow là pagination/filter/sort không cần summary.

### 4. Backend exception handling đang rải rác trong nhiều controller

Nhiều controller đang có `@ExceptionHandler` riêng:

- `NaturalLanguageSearchController`
- `SearchController`
- `CsvExportController`
- `AuditQueryController`
- `EventController`
- `QueryRefinementController`
- `FollowUpSuggestionController`

Mục tiêu refactor:

- Tạo `@RestControllerAdvice` trung tâm, ví dụ `GlobalApiExceptionHandler`.
- Chuẩn hóa response lỗi dạng:

```json
{
  "message": "Invalid SearchPlan",
  "errors": ["filters.ip: must be a valid IPv4 address"],
  "request_id": "...optional...",
  "timestamp": "...optional..."
}
```

- Giữ nguyên status code hiện tại:
  - validation: `400`
  - unauthorized: `401`
  - forbidden: `403`
  - not found: `404`
  - conflict/invalid stored query: `409`
  - dependency unavailable: `503`
  - rate limit: `429`
- Không expose stacktrace hoặc sensitive data ra client.
- Cập nhật test controller tương ứng.

### 5. Gemini và Anthropic client có nhiều logic lặp

`GeminiLlmClient` và `AnthropicLlmClient` có nhiều đoạn giống nhau:

- validate base URL / API key / model;
- retry 5xx;
- map 429 / 4xx / 5xx;
- measure latency;
- read response bytes;
- parse JSON;
- provider error logging.

Mục tiêu refactor:

- Tạo helper/common layer cho LLM provider, ví dụ:
  - `LlmProviderSupport`
  - `LlmHttpExecutor`
  - `ProviderErrorMapper`
  - `LlmRequestTimer`
- Giữ provider-specific code chỉ còn:
  - build request body;
  - build URL;
  - provider headers;
  - extract text/model from provider response.
- Không đổi interface `LlmClient`.
- Không log API key, full prompt hoặc token.
- Test Gemini/Anthropic vẫn pass.

### 6. Prompt builder, validator và compiler có nguy cơ drift contract

Các rule SearchPlan đang xuất hiện ở nhiều nơi:

- prompt mô tả schema;
- `SearchPlan` record;
- `SearchFilters`;
- `SearchPlanValidator`;
- `SearchPlanCompiler`;
- frontend `types/soc.ts`;
- query breakdown UI.

Mục tiêu refactor nhẹ:

- Không cần xây codegen lớn.
- Tối thiểu hãy gom các allowlist / constants quan trọng về một chỗ ở backend:
  - allowed filter fields;
  - allowed aggregation fields;
  - allowed event types nếu có;
  - max page size;
  - max event ID filters;
  - max export rows;
  - max message query length.
- Prompt builder nên tham chiếu constant hoặc method tạo text từ cùng source nếu hợp lý.
- Validator và compiler không được lệch nhau về field được hỗ trợ.
- Frontend constants tương ứng nên gom ở một file rõ ràng, ví dụ `frontend/src/lib/search-plan-constants.ts`.

### 7. `SearchPlanValidator` và `SummaryPayloadBuilder` khá lớn

Hai file này đang chứa nhiều rule trong một class.

Mục tiêu refactor:

- Với `SearchPlanValidator`, có thể tách nhỏ:
  - `SearchPlanModeRules`
  - `SearchPlanTimeRangeRules`
  - `SearchPlanFilterRules`
  - `SearchPlanAggregationRules`
  - `DangerousValueGuard`
- Với `SummaryPayloadBuilder`, có thể tách:
  - `SummaryQueryContextBuilder`
  - `SummarySampleEventMapper`
  - `SummaryAggregationStatsBuilder`
  - `SummaryPayloadSizeGuard`
- Không thay đổi output payload nếu không cần.
- Test hiện có phải tiếp tục pass.

### 8. Mock data và query library đang khá lớn

`frontend/src/lib/query-library.ts` là file dữ liệu tĩnh lớn. Điều này chấp nhận được với MVP, nhưng enterprise hơn thì nên chia theo category.

Mục tiêu refactor:

- Tách query library theo nhóm:
  - `query-library/search.ts`
  - `query-library/aggregation.ts`
  - `query-library/time-series.ts`
  - `query-library/playbooks.ts`
  - `query-library/index.ts`
- Giữ export public cũ để không phá component đang dùng.

### 9. Dashboard dùng prepared SearchPlan, nên cần tách rõ khỏi search workflow

Dashboard hiện là dạng predefined SearchPlan queries gọi `/api/v1/search/plan`.

Mục tiêu refactor:

- Tạo file rõ ràng cho dashboard query definitions:
  - `frontend/src/components/soc/dashboard/dashboard-searchplans.ts`
  - hoặc `frontend/src/lib/dashboard-searchplans.ts`
- Tách transform từ `NaturalLanguageSearchResponseDto` sang dashboard metrics.
- Dashboard không nên phụ thuộc quá sâu vào UI search page state.

### 10. API client đã có token refresh retry nhưng cần chuẩn hóa hơn

`api-client.ts` đã có:

- attach bearer token;
- refresh token khi 401;
- share one refresh promise across concurrent requests;
- retry original request once.

Mục tiêu refactor nhẹ:

- Giữ nguyên behavior này.
- Tách `requestJson` thành:
  - low-level `fetchJson`;
  - auth wrapper;
  - response parser;
- Chuẩn hóa support cho blob/CSV export nếu hợp lý.
- Test concurrency refresh vẫn pass.

## Refactor Plan Đề Xuất

Hãy làm theo từng phase nhỏ. Không làm tất cả trong một commit khổng lồ nếu có thể.

### Phase 0: Baseline And Safety Check

Trước khi sửa:

```bash
cd backend
./mvnw test
./mvnw verify

cd ../frontend
npm test
npm run lint
npm run build
```

Nếu môi trường local thiếu Java/Node/Docker thì ghi rõ không chạy được lệnh nào.

### Phase 1: Frontend Contract And State Safety

Mục tiêu:

- Tăng độ an toàn contract FE/BE.
- Không đổi UI.

Việc cần làm:

1. Thêm parser/type guard cho `SearchPlanResponseDto`.
2. Refactor `search-plan-api.ts` để không cast thẳng network payload.
3. Tách normalization response `/search/plan` sang helper riêng.
4. Đảm bảo pagination/filter/sort không làm mất summary hiện tại nếu request đó không include summary.
5. Cập nhật test liên quan:
   - `frontend/src/services/search-api.test.ts`
   - `frontend/src/services/api-client.test.ts`
   - thêm test cho `search-plan-api.ts` nếu chưa có.

### Phase 2: Frontend Search Workflow Decomposition

Mục tiêu:

- Làm `App.tsx` nhỏ hơn và rõ responsibility hơn.

Việc cần làm:

1. Tạo `frontend/src/hooks/use-search-workflow.ts` hoặc `frontend/src/components/soc/search/use-search-workflow.ts`.
2. Di chuyển logic:
   - `executeSearch`
   - `changePage`
   - `runRefinedSearchPlan`
   - follow-up suggestion key update
   - active result tab decision
   - summary visible state
   - pin/unpin investigation (`onTogglePin` / current query pin state)
3. Tạo `use-event-detail.ts`.
4. Tạo `use-search-history-modal.ts`.
5. Tạo `use-search-export.ts`.
6. `App.tsx` chỉ còn:
   - auth permission context;
   - routing;
   - layout/sidebar;
   - wiring hooks vào components.
7. Cập nhật test `App.test.tsx` nếu snapshot/behavior bị ảnh hưởng.

### Phase 3: Frontend Result Tabs Decomposition

Mục tiêu:

- Làm `result-tabs.tsx` gọn hơn.

Việc cần làm:

1. Tách `AnalyticsView`.
2. Tách `SummaryTable`.
3. Tách `RawEventsTable`.
4. Tách `ResultControls`.
5. Tách helper:
   - `parseEntityInput`
   - `parseEventIdInput`
   - `toggleArrayValue`
   - `formatEntityInput`
6. Giữ behavior:
   - search mode có filter/sort;
   - aggregation bar/line/count không hiện control không cần thiết;
   - event detail click vẫn hoạt động;
   - pagination summary table vẫn hoạt động;
   - event ID filter giới hạn 20.
7. Cập nhật `result-tabs.test.tsx`.

### Phase 4: Backend Global Error Handling

Mục tiêu:

- Chuẩn hóa lỗi API.
- Giảm duplicate `@ExceptionHandler`.

Việc cần làm:

1. Tạo package/class:
   - `backend/src/main/java/com/soc/ai/search/config/GlobalApiExceptionHandler.java`
   - hoặc `backend/src/main/java/com/soc/ai/search/api/GlobalApiExceptionHandler.java`
2. Tạo response chuẩn nếu cần:
   - `ApiErrorResponse`
3. Di chuyển exception mapping chung vào controller advice.
4. Controller chỉ giữ endpoint logic.
5. Không phá `SecurityConfig` custom `AuthenticationEntryPoint` và `AccessDeniedHandler`, trừ khi tích hợp được sạch.
6. Cập nhật controller tests để verify status/message/errors.

### Phase 5: Backend LLM Provider Common Support

Mục tiêu:

- Giảm duplication giữa Gemini và Anthropic.

Việc cần làm:

1. Tạo helper chung cho:
   - config validation;
   - retry 5xx;
   - latency measurement;
   - response bytes parsing;
   - provider error message extraction;
   - HTTP status mapping.
2. Giữ `GeminiLlmClient` và `AnthropicLlmClient` dễ đọc:
   - provider URL;
   - headers;
   - request body;
   - response text/model extraction.
3. Không đổi public behavior:
   - 429 vẫn map sang `LlmRateLimitException`;
   - 4xx/5xx message vẫn hợp lý;
   - max attempts vẫn lấy từ `LlmProperties`.
4. Cập nhật tests:
   - `GeminiLlmClientTest`
   - `AnthropicLlmClientTest`
   - các service test dùng mock LLM.

### Phase 6: SearchPlan Contract Constants

Mục tiêu:

- Giảm nguy cơ prompt/validator/compiler/frontend lệch nhau.

Việc cần làm:

1. Backend tạo class constants, ví dụ:
   - `SearchPlanContract`
   - `SearchPlanFieldAllowlist`
   - `SearchPlanLimits`
2. Đưa các giá trị lặp vào đó:
   - supported filter fields;
   - supported aggregation fields;
   - max event IDs = 20;
   - max SearchPlan size/page;
   - max message query length;
   - export row limit = 10000 nếu đang lặp nhiều nơi.
3. Prompt builder dùng các constant này nếu không làm code khó đọc.
4. Validator/compiler dùng cùng source.
5. Frontend tạo file constants tương ứng cho UI controls.
6. Cập nhật tests để bắt drift.

### Phase 7: Observability And Operational Cleanups

Mục tiêu:

- Enterprise hơn khi vận hành thật.

Việc cần làm:

1. Log có `query_id` ở các flow chính:
   - natural search;
   - plan execution;
   - CSV export;
   - audit export;
   - LLM provider failures.
2. Khi có authenticated user, log thêm `user_identity`, `preferred_username` hoặc JWT `subject` ở mức an toàn để hỗ trợ audit SOC.
3. Không log prompt đầy đủ, token, API key, raw authorization header, raw event sensitive content hoặc secret.
4. Chuẩn hóa latency fields.
5. Nếu thêm `request_id` thì dùng MDC/filter nhẹ, không làm phức tạp quá.
6. Cập nhật docs nếu cần.

## Acceptance Criteria

Sau refactor:

### Backend

- `./mvnw test` pass.
- `./mvnw verify` pass.
- JaCoCo coverage gate vẫn pass.
- Không giảm security:
  - JWT validation vẫn hoạt động.
  - RBAC viewer/analyst/admin vẫn giữ nguyên.
  - CSV export vẫn replay SearchPlan bằng `query_id`.
  - SearchPlan vẫn parse/validate/compile qua backend.
- Không đổi SearchPlan output vô cớ.
- Không đổi DSL output vô cớ.
- Không expose stacktrace ra API response.

### Frontend

- `npm test` pass.
- `npm run lint` pass.
- `npm run build` pass.
- Search page vẫn hoạt động:
  - natural-language search;
  - query transparency;
  - AI summary;
  - next investigation steps;
  - result table;
  - analytics chart;
  - filter/sort/page;
  - event detail modal;
  - recent queries modal;
  - CSV export.
- Dashboard vẫn hoạt động.
- Investigations vẫn hoạt động.
- Audit logs vẫn hoạt động.
- Query library vẫn hoạt động.
- Token refresh retry vẫn hoạt động.

### UI

- Không redesign lớn trong task này.
- Không làm mất style dark SOC hiện tại.
- Không làm layout bị tràn.
- Không làm search input mất caret hoặc focus behavior.

## Testing Checklist Cụ Thể

Chạy tối thiểu:

```bash
cd backend
./mvnw test
./mvnw verify
```

```bash
cd frontend
npm test
npm run lint
npm run build
```

Nếu sửa file cụ thể, chạy thêm test tương ứng, ví dụ:

```bash
cd frontend
npm test -- --run src/services/api-client.test.ts src/services/search-api.test.ts
npm test -- --run src/components/soc/result-tabs.test.tsx
npm test -- --run src/components/soc/query-transparency.test.tsx
```

Backend targeted tests:

```bash
cd backend
./mvnw -Dtest=SearchPlanCompilerTest test
./mvnw -Dtest=SearchPlanValidatorTest test
./mvnw -Dtest=NaturalLanguageSearchServiceTest test
./mvnw -Dtest=CsvExportServiceTest test
./mvnw -Dtest=GeminiLlmClientTest,AnthropicLlmClientTest test
```

## Deliverables

Sau khi làm xong, hãy báo cáo:

1. Đã refactor những phần nào.
2. File nào thay đổi.
3. Behavior nào được giữ nguyên.
4. Test nào đã chạy.
5. Rủi ro còn lại.
6. Nếu có phần chưa làm, ghi rõ lý do và đề xuất phase tiếp theo.

## Ưu Tiên Nếu Không Đủ Thời Gian

Nếu không đủ thời gian làm hết, ưu tiên theo thứ tự:

1. FE contract validation cho `/api/v1/search/plan`.
2. Tách `App.tsx` search workflow thành hook.
3. Tách `result-tabs.tsx` thành component nhỏ.
4. Backend global exception handler.
5. LLM provider common support.
6. SearchPlan constants/allowlist centralization.
7. Observability cleanups.

## Lưu Ý Quan Trọng

Đây là dự án gần bảo vệ/demo, nên refactor phải thực dụng. Không theo đuổi kiến trúc quá phức tạp như microservices, CQRS, event sourcing, codegen lớn hoặc state management library mới nếu chưa cần.

Mục tiêu là làm code nhìn enterprise hơn theo nghĩa:

- module rõ;
- service/controller mỏng;
- contract rõ;
- lỗi nhất quán;
- test bảo vệ behavior;
- cấu hình có type;
- không duplication ở các vùng quan trọng;
- dễ giải thích trước hội đồng và dễ maintain sau MVP.
