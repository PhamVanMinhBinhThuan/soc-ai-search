# SOC AI Search

Đề tài: **Xây dựng tính năng Tìm kiếm Event bằng AI cho SOC Platform**.

## Trạng thái

Repository đã hoàn thành foundation **ngày 5** cho MVP: backend/frontend scaffold, Docker Compose local, Elasticsearch mapping/bootstrap, PostgreSQL/Flyway, API ingest single/bulk event, script seed synthetic dataset, SearchPlan validator/compiler/executor, endpoint search kỹ thuật, event detail, LLM abstraction, mock LLM, Gemini client foundation, endpoint natural language search, aggregation MVP và smoke test ngày 5. CI/CD, summary, audit persistence, frontend chart UI và CSV export chưa được triển khai.

## Kiến trúc

Hệ thống được triển khai theo **Modular Monolith**:

- Backend là một ứng dụng Java 21 + Spring Boot 3 duy nhất.
- Frontend dùng React + TypeScript + Vite với Tailwind CSS + shadcn/ui foundation.
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

Kibana chỉ là công cụ debug Elasticsearch tùy chọn:

```powershell
docker compose --profile tools up -d kibana
```

Kibana mở tại `http://localhost:5601`. Các cổng quản trị local chỉ bind vào `127.0.0.1`.

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
