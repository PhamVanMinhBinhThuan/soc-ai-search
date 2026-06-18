# SOC AI Search

Đề tài: **Xây dựng tính năng Tìm kiếm Event bằng AI cho SOC Platform**.

## Trạng thái

Repository đã hoàn thành **ngày 7** cho MVP: backend/frontend scaffold, Docker Compose local, Elasticsearch mapping/bootstrap, PostgreSQL/Flyway, API ingest single/bulk event, script seed synthetic dataset, SearchPlan validator/compiler/executor, endpoint search kỹ thuật, event detail, LLM abstraction, mock/Gemini provider, natural language search, aggregation, summary best-effort, audit/history, CSV export và giao diện SOC kết nối API thật.

Frontend hiện có search box, trạng thái loading/empty/error, bảng event có pagination, event detail drawer hiển thị raw log, SearchPlan/DSL transparency, aggregation table, biểu đồ Recharts, summary LLM/fallback, recent investigation history, chạy lại truy vấn và tải CSV. CI/CD và triển khai VPS nằm ở các ngày tiếp theo.

## Kiến trúc

Hệ thống được triển khai theo **Modular Monolith**:

- Backend là một ứng dụng Java 21 + Spring Boot 3 duy nhất.
- Frontend dùng React + TypeScript + Vite với Tailwind CSS, shadcn/ui và Recharts để cung cấp SOC investigation console.
- Elasticsearch lưu event SOC để search và aggregation.
- PostgreSQL self-managed lưu metadata truy vấn, query history và application audit log; Flyway quản lý migration.
- Docker Compose được dùng cho môi trường local và deploy MVP.

Khi phát triển local, có thể dùng pgAdmin Desktop để xem PostgreSQL và bật Kibana tùy chọn qua Docker Compose profile `tools` để debug Elasticsearch. Hai công cụ này không thay thế frontend React và không được expose public trên VPS.

## Cấu trúc Repository

```text
backend/             Spring Boot monolith
frontend/            React web application
infra/               Cấu hình hạ tầng
scripts/             Script hỗ trợ
tests/               Test hoặc tài nguyên test dùng chung
.github/workflows/   GitHub Actions workflows
docs/                Tài liệu thiết kế và yêu cầu
plan/                Kế hoạch triển khai
```

## Chạy Local Bằng Docker

Yêu cầu: Docker Desktop hoặc Docker Engine cùng Docker Compose plugin.

```powershell
Copy-Item .env.example .env
docker compose up -d --build
.\scripts\bootstrap-elasticsearch.ps1
docker compose ps
```

Các URL local:

- Frontend: `http://localhost:3000`
- Backend health API: `http://localhost:8081/api/v1/health/live`
- Swagger UI: `http://localhost:8081/swagger-ui.html`
- Elasticsearch: `http://localhost:9200`
- PostgreSQL for pgAdmin Desktop: `localhost:5433`
- Keycloak Admin Console, khi bật profile `auth`: `http://localhost:8082/admin`

Kibana chỉ là công cụ debug Elasticsearch tùy chọn:

```powershell
docker compose --profile tools up -d kibana
```

Kibana mở tại `http://localhost:5601`. Các cổng quản trị local chỉ bind vào `127.0.0.1`.

### Keycloak auth foundation ngày 8

Keycloak dùng để chuẩn bị login/RBAC cho bản demo public. Mặc định stack local không bật auth để không làm chậm luồng phát triển và test hiện tại.

Bật Keycloak local:

```powershell
docker compose --profile auth up -d keycloak
```

Keycloak mở tại:

- Admin Console: `http://localhost:8082/admin`
- Realm issuer: `http://localhost:8082/realms/soc-ai-search`
- OpenID configuration: `http://localhost:8082/realms/soc-ai-search/.well-known/openid-configuration`

Realm `soc-ai-search`, frontend client `soc-ai-search-frontend` và 3 role `SOC_VIEWER`, `SOC_ANALYST`, `SOC_ADMIN` được auto-import từ:

```text
infra/keycloak/realm-export/soc-ai-search-realm.json
```

Self-registration được tắt. Quy trình cấp tài khoản MVP là admin tạo user trong Keycloak, gán role, rồi gửi required actions email `VERIFY_EMAIL` và `UPDATE_PASSWORD`. Chi tiết xem [infra/keycloak/README.md](infra/keycloak/README.md).

Prompt đầu của ngày 8 chỉ chuẩn bị hạ tầng Keycloak. Backend JWT verification, frontend OIDC login và RBAC chi tiết được triển khai ở các prompt sau.

### Kiểm tra service

```powershell
docker compose config
docker compose --profile tools config
docker compose ps
Invoke-RestMethod -Uri http://localhost:8081/api/v1/health/live
```

### Seed dữ liệu demo ngày 2

Seed nhanh 100 event để kiểm tra local:

```powershell
.\scripts\bootstrap-elasticsearch.ps1
.\scripts\seed-events.ps1 -Count 100 -BatchSize 50
```

Seed dataset local mặc định cho MVP:

```powershell
.\scripts\seed-events.ps1 -Count 10000 -BatchSize 1000
```

Không seed vài triệu document trên máy local khi chưa cần. Khi chuẩn bị bảo vệ hội đồng, dùng cùng script với tham số số lượng trên môi trường đủ tài nguyên.

Sinh file NDJSON để xem/debug mà không gọi Elasticsearch:

```powershell
.\scripts\seed-events.ps1 -Count 100 -GenerateOnly
Get-Content .\generated-data\events.ndjson -TotalCount 6
```

`generated-data/` được Git ignore và không được commit.

### Smoke test ngày 2

Sau khi Docker Compose đang chạy và đã seed dữ liệu:

```powershell
.\scripts\smoke-test-day-02.ps1
```

Smoke test kiểm tra Elasticsearch health, mapping, dataset pattern, single ingest, bulk ingest và validation lỗi `400`.

### Smoke test ngày 3

Sau khi Docker Compose đang chạy, backend đã được rebuild và dataset ngày 2 đã seed:

```powershell
.\scripts\smoke-test-day-03.ps1
```

Smoke test ngày 3 kiểm tra SearchPlan endpoint, `generated_dsl`, pagination, mapping Elasticsearch `_id` sang `event_id`, event detail endpoint và raw log.

### LLM provider ngày 4

Mặc định local/dev/test dùng provider `mock`. Provider này không cần API key và đủ để demo luồng natural language search MVP:

```env
LLM_PROVIDER=mock
```

Gemini là provider hosted dùng cho integration thật khi cần gọi Cloud LLM:

```env
LLM_PROVIDER=gemini
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta
LLM_API_KEY=your-api-key
LLM_MODEL=gemini-2.5-flash
LLM_TIMEOUT_MS=10000
LLM_MAX_ATTEMPTS=2
```

Không commit API key thật vào Git. Ngày 4 không gửi raw log, search result hoặc event document vào LLM.

### Natural language search endpoint ngày 4

Endpoint natural language MVP:

```text
POST http://localhost:8081/api/v1/search
```

Ví dụ request:

```json
{
  "question": "Show me failed login attempts from China in the last 24h",
  "page": 0,
  "size": 5
}
```

Response có `original_question`, `search_plan`, `generated_dsl`, `llm_latency_ms`, `search_latency_ms`, `latency_ms`, pagination và danh sách `events`. Backend luôn override `page`/`size` từ request, không để LLM tự quyết định pagination.

Ngày 4 chưa persist audit log/query history vào PostgreSQL. `search_query_logs` sẽ dùng ở các ngày sau khi triển khai audit/history. Aggregation/statistics sẽ được triển khai ở ngày 5.

### Smoke test ngày 4

Sau khi Docker Compose đang chạy, backend đã được rebuild với ngày 4 và dataset ngày 2 đã seed:

```powershell
.\scripts\smoke-test-day-04.ps1
```

Smoke test ngày 4 kiểm tra health, OpenAPI, natural language search bằng mock provider, `search_plan`, `generated_dsl`, latency fields, pagination guardrail, no-result search qua `/api/v1/search/plan`, và validation lỗi `400`.

### Aggregation ngày 5

Ngày 5 mở rộng `SearchPlan` và natural language search để hỗ trợ aggregation MVP.

Aggregation type đang hỗ trợ:

- `count`
- `group_by`
- `top_n`
- `date_histogram`

Aggregation field allowlist:

- `source`
- `severity`
- `event_type`
- `user`
- `host`
- `ip`
- `country_code`

Ví dụ gọi aggregation bằng natural language:

```text
POST http://localhost:8081/api/v1/search
```

```json
{
  "question": "Đếm số lần login thất bại theo từng user trong 7 ngày qua",
  "page": 0,
  "size": 10
}
```

Ba câu demo aggregation bằng mock provider:

- `Đếm số lần login thất bại theo từng user trong 7 ngày qua`
- `Top 10 IP có nhiều alert nhất tháng này`
- `Số event theo giờ trong 24h qua`

Response aggregation có `aggregation_type`, `aggregation_results`, `chart_metadata`, `generated_dsl`, `search_latency_ms` và `events = []`. Ngày 5 chưa làm summary, audit persistence, CSV và frontend chart UI.

### Smoke test ngày 5

Sau khi Docker Compose đang chạy, backend đã được rebuild với ngày 5 và dataset ngày 2 đã seed:

```powershell
.\scripts\smoke-test-day-05.ps1
```

Smoke test ngày 5 kiểm tra health, OpenAPI, aggregation kỹ thuật qua `/api/v1/search/plan`, natural language aggregation qua `/api/v1/search`, response contract `aggregation_results`/`chart_metadata`, `generated_dsl`, bucket limit và mock provider không cần API key.

### Frontend SOC Console ngày 6

Ngày 6 hoàn thiện luồng demo trên React mà không cần thao tác qua Swagger.

Frontend sử dụng:

- React + TypeScript + Vite.
- Tailwind CSS + shadcn/ui.
- lucide-react.
- Recharts.
- Native `fetch`, không dùng Axios.

Các chức năng đã hoàn thành:

- Search box nhận câu hỏi tự nhiên tiếng Việt hoặc tiếng Anh.
- Suggested Queries tự điền câu hỏi và chạy search.
- Hỗ trợ hai mode response:
  - `search`: tự mở tab **Raw Events**;
  - `aggregation`: tự mở tab **Analytics View**.
- Loading skeleton, empty state, error alert và nút retry.
- KPI hiển thị mode, total event, trạng thái SearchPlan và latency.
- Panel SearchPlan/Generated DSL có thể thu gọn và copy JSON.
- Bảng event có pagination, severity badge, source và cờ quốc gia.
- Click event để mở drawer:
  - **Formatted Fields**;
  - **Raw Log**.
- Aggregation chart:
  - `GROUP_BY`/`TOP_N` -> bar chart;
  - `DATE_HISTOGRAM` -> line chart;
  - `COUNT` -> number card.
- Summary Table dùng cùng `aggregation_results` với biểu đồ.
- Sidebar mặc định thu gọn, có tooltip và demo identity `demo-analyst`.

Frontend không render đồng thời raw events và aggregation data. Backend trả mode nào thì tab tương ứng được kích hoạt; tab còn lại bị disable.

#### Cấu hình frontend

Tạo file môi trường từ file mẫu:

```powershell
Copy-Item .\frontend\.env.example .\frontend\.env
```

Chạy với Backend API thật:

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=
```

`VITE_API_BASE_URL` để trống khi dùng proxy `/api`:

- Vite dev proxy tới `http://localhost:8081`.
- Nginx trong frontend container proxy tới `http://backend:8080`.

Chạy giao diện bằng mock data, không cần backend:

```env
VITE_USE_MOCK=true
VITE_API_BASE_URL=
```

Sau khi đổi biến `VITE_*`, cần restart Vite dev server hoặc build lại frontend container.

#### Chạy frontend local

Chạy toàn bộ stack bằng Docker:

```powershell
docker compose up -d --build
docker compose ps
```

Mở:

```text
http://localhost:3000
```

Hoặc chạy frontend bằng Vite trong khi backend/Docker services đang hoạt động:

```powershell
cd frontend
npm install
npm run dev
```

#### Luồng demo frontend

1. Mở `http://localhost:3000`.
2. Chọn `Failed login from China` hoặc nhập:

   ```text
   Show me failed login attempts from China in the last 24h
   ```

3. Kiểm tra SearchPlan, Generated DSL và bảng Raw Events.
4. Chuyển trang rồi click một event để xem raw log.
5. Chạy ba câu aggregation:
   - `Đếm số lần login thất bại theo từng user trong 7 ngày qua`
   - `Top 10 IP có nhiều alert nhất tháng này`
   - `Số event theo giờ trong 24h qua`
6. Kiểm tra Summary Table và chart lần lượt dùng bar, bar và line.
7. Kiểm tra **AI Summary** hoặc **Fallback Summary** phía trên Query Transparency.
8. Mở **Investigations** để xem history, phân trang và chạy lại một câu hỏi.
9. Bấm **Export CSV** để tải kết quả search hoặc aggregation theo `query_id`.

#### Verify frontend

```powershell
cd frontend
npm run lint
npm run build
npm audit --audit-level=high
cd ..

docker compose config --quiet
docker compose up -d --build
docker compose ps

Invoke-WebRequest http://localhost:3000 -UseBasicParsing
Invoke-RestMethod http://localhost:8081/api/v1/health/live
```

Kết quả review frontend:

- Frontend lint/build: PASS.
- `npm audit --audit-level=high`: không có vulnerability mức high.
- Backend test: PASS.
- Docker Compose local: PostgreSQL, Elasticsearch, backend và frontend healthy.
- Search, pagination, event detail, summary, history, CSV và ba aggregation demo hoạt động end-to-end.

Password protection cho website public sẽ được cấu hình tại reverse proxy khi triển khai VPS/domain.

### Summary, audit và query history ngày 7

Mỗi request đã đi vào orchestration của `POST /api/v1/search` có một `query_id` UUID. UUID này đồng thời là khóa của record trong bảng PostgreSQL `search_query_logs` và được dùng cho history, audit và CSV export.

Identity demo local:

```env
APP_DEMO_USER_IDENTITY=demo-analyst
```

Query history:

```powershell
Invoke-RestMethod "http://localhost:8081/api/v1/search/history?page=0&size=20"
```

Audit log:

```powershell
Invoke-RestMethod "http://localhost:8081/api/v1/audit-logs?page=0&size=50"
```

History và audit dùng cùng bảng `search_query_logs`, phân trang theo `created_at DESC, id DESC`. Status MVP gồm `SUCCESS` và `FAILED`; record thất bại có thể có `mode`, `result_count` hoặc `latency_ms` bằng null.

Summary là enhancement **best effort**:

- kết quả Elasticsearch luôn được ưu tiên;
- summary output là plain text 3-5 câu;
- timeout riêng dùng `LLM_SUMMARY_TIMEOUT_MS`, mặc định `5000`;
- nếu LLM, payload builder hoặc summary query lỗi, response search vẫn trả HTTP 200 với deterministic fallback;
- `summary_source` là `llm` hoặc `fallback`;
- search mode chỉ chạy tối đa một summary query Elasticsearch bổ sung;
- aggregation mode dùng trực tiếp tối đa 10 `aggregation_results`, không chạy summary query thứ hai;
- payload gửi LLM được giới hạn kích thước và không chứa raw log.

Frontend hiển thị summary source và latency, mở history qua menu **Investigations**, hỗ trợ phân trang và chạy lại câu hỏi. Mock mode dùng history local deterministic và không gọi backend.

### CSV export ngày 7

Sau khi `POST /api/v1/search` trả về `query_id`, tải CSV bằng:

```powershell
New-Item -ItemType Directory -Force ".tmp" | Out-Null

curl.exe `
  --fail-with-body `
  -D ".tmp/search-export.headers.txt" `
  -o ".tmp/search-export.csv" `
  "http://localhost:8081/api/v1/search/{query_id}/export.csv"
```

Endpoint:

```text
GET /api/v1/search/{query_id}/export.csv
```

CSV search có header:

```text
event_id,timestamp,source,severity,event_type,user,host,ip,country_code,message
```

CSV aggregation có header:

```text
key,value
```

Quy tắc export:

- chỉ export query `SUCCESS` thuộc `APP_DEMO_USER_IDENTITY` hiện tại;
- backend đọc lại SearchPlan đã lưu, validate và chạy lại trên Elasticsearch;
- client không được gửi DSL hoặc SearchPlan mới vào endpoint export;
- search export theo batch 1.000 event và tối đa 10.000 dòng;
- response có `X-Export-Truncated: true` khi kết quả hiện tại vượt 10.000 event;
- `raw` không được export; `message` dài được giới hạn tối đa 4 KB mỗi cell;
- file dùng UTF-8 BOM và RFC 4180 escaping để mở ổn định trên Excel Windows;
- timeout Elasticsearch riêng cho export dùng `EXPORT_ES_TIMEOUT_MS`, mặc định `10000`;
- export không tạo thêm record trong `search_query_logs`.

Export là **live replay**, không phải frozen snapshot. File phản ánh dữ liệu Elasticsearch tại thời điểm tải và có thể khác `result_count` đã lưu khi query ban đầu chạy. Trong MVP không dùng PIT, Scroll API hoặc `search_after`; không nên chạy seed/ingest đồng thời khi kiểm tra export nhiều batch.

Frontend gọi export bằng `query_id`, đọc filename từ `Content-Disposition` và cảnh báo khi `X-Export-Truncated: true`. Khi `VITE_API_BASE_URL` để trống, Vite/Nginx proxy `/api` tạo luồng same-origin nên frontend đọc được các header này. Nếu chủ động cấu hình API sang origin khác, Spring CORS phải expose `Content-Disposition` và `X-Export-Truncated`.

### Smoke test ngày 7

Checkpoint Day 7 dùng mock provider để không phụ thuộc quota Gemini:

```powershell
$env:LLM_PROVIDER="mock"
docker compose up -d --build --force-recreate backend

cd frontend
npm run lint
npm run build
npm audit --audit-level=high
cd ..

docker compose config --quiet
.\scripts\smoke-test-day-07.ps1
```

Smoke test kiểm tra health, OpenAPI, summary search/aggregation, history, audit `SUCCESS`/`FAILED`, CSV search/aggregation, giới hạn 10.000 dòng, frontend URL và build artifact.

Để quay lại Gemini theo file `.env`:

```powershell
Remove-Item Env:LLM_PROVIDER -ErrorAction SilentlyContinue
docker compose up -d --build --force-recreate backend
```

### SearchPlan endpoint ngày 3

Endpoint kỹ thuật này dùng để kiểm tra lõi `SearchPlan -> validate -> compile DSL -> execute Elasticsearch` trước khi nối LLM:

```text
POST http://localhost:8081/api/v1/search/plan
```

Ví dụ request:

```json
{
  "mode": "search",
  "filters": {
    "timestamp": {
      "from": "now-24h",
      "to": "now"
    },
    "event_type": ["failed_login"],
    "country_code": ["CN"]
  },
  "page": 0,
  "size": 5
}
```

Response có `generated_dsl` dạng JSON object/map, `total`, `total_pages`, `latency_ms` và danh sách `events`. Mỗi event trong search result có `event_id` được map từ Elasticsearch `_id`.

### Event detail endpoint ngày 3

Sau khi lấy `event_id` từ search response, gọi:

```text
GET http://localhost:8081/api/v1/events/{event_id}
```

Endpoint detail trả đầy đủ field chính và `raw` log. Đây là luồng dùng để demo: search list trả gọn, mở detail để xem raw log.

Endpoint `/api/v1/search/plan` vẫn được giữ làm endpoint kỹ thuật để debug SearchPlan/DSL. Endpoint natural language cuối cùng của ngày 4 là `/api/v1/search`.

### Lưu ý về PostgreSQL password

Tạo `.env` trước lần chạy Docker đầu tiên. PostgreSQL chỉ dùng `POSTGRES_PASSWORD` để khởi tạo role khi named volume chưa có dữ liệu. Nếu đổi password trong `.env` sau đó, password bên trong database không tự thay đổi.

## Tài liệu

- [Yêu cầu đề tài](docs/requirement.md)
- [Tech stack](docs/tech-stack.md)
- [Kiến trúc hệ thống](docs/architecture.md)
- [Kế hoạch MVP 14 ngày](plan/14-day-mvp-plan.md)
## Day 8 backend auth notes

- Mac dinh `APP_AUTH_ENABLED=false` de local/dev/test chay nhu cac ngay truoc.
- Khi `APP_AUTH_ENABLED=true`, cac business API yeu cau JWT Bearer token tu Keycloak.
- Health va Swagger van permit trong local/dev: `/api/v1/health/**`, `/swagger-ui/**`, `/v3/api-docs/**`.
- Backend verify JWT bang `KEYCLOAK_ISSUER_URI` va map role Keycloak thanh `ROLE_SOC_VIEWER`, `ROLE_SOC_ANALYST`, `ROLE_SOC_ADMIN`.
- Khi chay backend trong Docker, dung `KEYCLOAK_JWK_SET_URI=http://keycloak:8080/realms/soc-ai-search/protocol/openid-connect/certs` de backend lay JWKS qua network noi bo Docker.
- Endpoint kiem tra user hien tai: `GET /api/v1/auth/me`.
- Khi auth tat, `/api/v1/auth/me` tra demo identity `demo-analyst` va role `SOC_ANALYST`.
- Khi auth bat ma khong co token, `/api/v1/auth/me` tra `401 Unauthorized`.

Vi du bat backend auth local:

```powershell
$env:APP_AUTH_ENABLED="true"
$env:KEYCLOAK_ISSUER_URI="http://localhost:8082/realms/soc-ai-search"
cd backend
.\mvnw.cmd spring-boot:run
```

## Day 8 frontend OIDC notes

- Frontend dung `react-oidc-context` + `oidc-client-ts` cho Authorization Code + PKCE.
- OIDC state/token duoc luu bang `sessionStorage` trong MVP, khong dung `localStorage`.
- Mac dinh `VITE_AUTH_ENABLED=false`, dashboard vao thang voi demo identity.
- Khi `VITE_AUTH_ENABLED=true`, user phai login bang Keycloak truoc khi vao dashboard.
- Frontend tu gan `Authorization: Bearer <access_token>` vao backend API request khi da login.
- Mock mode `VITE_USE_MOCK=true` van khong can token.
- Header/sidebar hien identity va role; RBAC chi tiet theo role se lam o Day 9.

Frontend env local:

```powershell
VITE_AUTH_ENABLED=false
VITE_KEYCLOAK_AUTHORITY=http://localhost:8082/realms/soc-ai-search
VITE_KEYCLOAK_CLIENT_ID=soc-ai-search-frontend
VITE_KEYCLOAK_REDIRECT_URI=http://localhost:3000/auth/callback
VITE_KEYCLOAK_POST_LOGOUT_REDIRECT_URI=http://localhost:3000
VITE_KEYCLOAK_SCOPE=openid profile email
```

Chay smoke test Day 8:

```powershell
.\scripts\smoke-test-day-08.ps1

# Khi backend da bat APP_AUTH_ENABLED=true va ban co access token that:
.\scripts\smoke-test-day-08.ps1 -AuthEnabled -AccessToken "<access_token>"
```

## Day 9 RBAC notes

Day 9 adds role-based access control on top of the Day 8 Keycloak foundation.
Keycloak is still the source of users and roles. The app does not create a
local user table.

### Role matrix

| Role | Search | Event metadata | Raw log | CSV export | Own history | Audit logs | Ingest |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SOC_VIEWER` | Yes | Yes | No | No | No | No | No |
| `SOC_ANALYST` | Yes | Yes | Yes | Yes | Yes | No | No |
| `SOC_ADMIN` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

Role hierarchy is enforced in backend:

```text
ROLE_SOC_ADMIN > ROLE_SOC_ANALYST
ROLE_SOC_ANALYST > ROLE_SOC_VIEWER
```

That means an admin does not need to be assigned analyst/viewer roles again in
Keycloak just to pass `SOC_ANALYST` endpoints.

Frontend permission is UX only. It hides or disables actions such as Export,
History, Raw Log and Admin Console based on the token role. Backend RBAC is the
real protection and returns `401`/`403` if a caller bypasses the UI.

### Create demo users in Keycloak

Self-registration remains disabled. Create users manually from the Keycloak
Admin Console:

1. Open `http://localhost:8082/admin`.
2. Switch to realm `soc-ai-search`.
3. Create users:
   - `viewer.demo`
   - `analyst.demo`
   - `admin.demo`
4. Assign exactly one realm role:
   - `viewer.demo` -> `SOC_VIEWER`
   - `analyst.demo` -> `SOC_ANALYST`
   - `admin.demo` -> `SOC_ADMIN`
5. Set a temporary password locally, or configure SMTP and send required
   actions email for `VERIFY_EMAIL` and `UPDATE_PASSWORD`.

### Test UI by role

Run the stack with auth enabled, then log in as each demo user:

```powershell
docker compose --profile auth up -d
docker compose up -d
```

Expected UI behavior:

- Viewer can run search and open event metadata, but Raw Log is locked, Export
  is disabled, History is hidden, and Admin Console is hidden.
- Analyst can run search, view raw logs, export CSV and open Recent
  Investigations, but cannot see Audit/Admin entry.
- Admin can do everything analyst can do and also sees the Admin Console entry.

### Run Day 9 RBAC smoke test

Base smoke test without tokens:

```powershell
.\scripts\smoke-test-day-09-rbac.ps1
```

This checks backend health, frontend HTTP 200, OpenAPI paths and no-token auth
behavior. It does not invent credentials and does not hardcode passwords.

To run full role checks, pass real Keycloak access tokens:

```powershell
.\scripts\smoke-test-day-09-rbac.ps1 `
  -ViewerToken "<viewer-access-token>" `
  -AnalystToken "<analyst-access-token>" `
  -AdminToken "<admin-access-token>" `
  -RequireTokens
```

Manual token workflow for local testing:

1. Start Keycloak and frontend with auth enabled.
2. Log in as the target demo user.
3. Open browser DevTools -> Application -> Session Storage.
4. Find `oidc.user:<authority>:soc-ai-search-frontend`.
5. Copy the `access_token` value.

The smoke test verifies:

- viewer raw log redaction and forbidden export/history/audit;
- analyst raw log, export and history access, but forbidden audit;
- admin audit access plus inherited analyst permissions.

## Day 10 backend regression and coverage

Day 10 adds a backend JaCoCo coverage gate for regression safety. The gate is
set to at least 50% instruction coverage and excludes DTO/entity/configuration
style classes so coverage is measured against business logic rather than simple
data holders.

Run backend tests:

```powershell
cd backend
.\mvnw.cmd test
cd ..
```

Run backend tests plus coverage check:

```powershell
cd backend
.\mvnw.cmd verify
cd ..
```

The HTML coverage report is generated at:

```text
backend/target/site/jacoco/index.html
```

Backend automated tests use mocks/stubs and must not call Gemini or require a
real `LLM_API_KEY` in CI.
