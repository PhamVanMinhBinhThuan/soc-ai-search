# Yêu Cầu Hệ Thống - SOC AI Search MVP

## 1. Mục tiêu

SOC AI Search MVP giúp SOC analyst tìm kiếm, thống kê và điều tra event bằng câu hỏi tự nhiên tiếng Việt hoặc tiếng Anh. Hệ thống dùng LLM để sinh `SearchPlan` có cấu trúc, sau đó backend validate, compile thành Elasticsearch Query DSL và thực thi trên Elasticsearch.

Mục tiêu quan trọng nhất là minh bạch và an toàn: người dùng nhìn thấy câu hỏi gốc, `SearchPlan` đã validate và DSL cuối cùng. LLM không được gửi DSL tự do trực tiếp vào Elasticsearch.

## 2. Phạm vi MVP bắt buộc

### 2.1. Lưu trữ và indexing event

- Dùng Elasticsearch `9.4.2` Basic self-managed làm event store.
- Index tối thiểu 10.000 synthetic SOC event để demo local.
- Hỗ trợ seed dataset bằng script PowerShell và Elasticsearch Bulk API.
- Event schema tối thiểu:
  - `timestamp`
  - `source`
  - `severity`
  - `event_type`
  - `user`
  - `host`
  - `ip`
  - `country_code`
  - `message`
  - `raw`
- Có API ingest single/bulk event.
- PostgreSQL không lưu event SOC; PostgreSQL chỉ lưu audit/history/export metadata.

### 2.2. Natural language to SearchPlan

- Endpoint natural language: `POST /api/v1/search`.
- Input:
  - `question`
  - `page`
  - `size`
- Hỗ trợ tiếng Việt và tiếng Anh.
- LLM chỉ sinh JSON `SearchPlan` thuần, không markdown, không prose, không DSL.
- Backend parse JSON bằng Jackson, reject unknown field và validate bằng Bean Validation + `SearchPlanValidator`.
- Nếu LLM output sai, backend repair/retry tối đa một lần.
- Nếu vẫn sai, trả lỗi có kiểm soát, không lộ stack trace.

### 2.3. Search mode

Search mode hỗ trợ:

- Time range: `now`, `now-24h`, `now-7d`, `now-30d`, ISO-8601.
- Filter exact match/list:
  - `severity`
  - `event_type`
  - `user`
  - `host`
  - `ip`
  - `country_code`
- Full-text query `message_query` trên field Elasticsearch `message`.
- Pagination `page`, `size`, giới hạn `size <= 100`.
- Sort mặc định `timestamp desc`.
- Response có:
  - `query_id`
  - `original_question`
  - `mode`
  - `search_plan`
  - `generated_dsl`
  - `summary`
  - `summary_source`
  - `total`
  - `page`
  - `size`
  - `total_pages`
  - `events`

### 2.4. Aggregation mode

Aggregation mode hỗ trợ:

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

Guardrail:

- Không cho field ngoài allowlist.
- Không cho `.keyword` do user/LLM sinh ra.
- `COUNT` không được có `field`, `top_n`, `interval`.
- `TOP_N` bắt buộc có `top_n` từ 1 đến 100.
- `GROUP_BY` nếu thiếu `top_n` dùng default bucket limit 20 ở compiler.
- `DATE_HISTOGRAM` chạy trên `timestamp`, dùng `fixed_interval`: `minute -> 1m`, `hour -> 1h`, `day -> 1d`.

Response aggregation có:

- `mode = aggregation`
- `aggregation_type`
- `generated_dsl`
- `total`
- `aggregation_results`
- `chart_metadata`
- `events = []` với endpoint natural language.

### 2.5. Event detail

- Endpoint: `GET /api/v1/events/{event_id}`.
- `{event_id}` chính là Elasticsearch document `_id`.
- Response detail trả `raw` log.
- Blank event id trả 400.
- Event không tồn tại trả 404 rõ ràng.

### 2.6. Summary

- Summary là best-effort enhancement.
- Search/aggregation result luôn được ưu tiên trả về.
- Nếu LLM summary timeout hoặc invalid, response vẫn thành công với deterministic fallback.
- Summary output là plain text 3-5 câu.
- Không gửi raw log đầy đủ vào LLM.
- Search summary payload giới hạn số sample event và kích thước payload.
- Aggregation summary dùng trực tiếp `aggregation_results`, không chạy thêm query Elasticsearch thứ hai.

### 2.7. Audit, history và export

- PostgreSQL table `search_query_logs` lưu:
  - `query_id`
  - user identity
  - question
  - mode
  - status
  - failure stage
  - `SearchPlan`
  - `generated_dsl`
  - result count
  - latency
  - summary
  - error message đã sanitize
  - created time
- History API có phân trang.
- CSV export qua `query_id`:
  - Không nhận DSL từ client.
  - Load SearchPlan đã lưu, validate, compile và replay live trên Elasticsearch.
  - Giới hạn 10.000 dòng.
  - Nếu truncate thì trả `X-Export-Truncated: true`.

### 2.8. Auth/RBAC

- Dùng Keycloak OIDC.
- Roles:
  - `SOC_VIEWER`
  - `SOC_ANALYST`
  - `SOC_ADMIN`
- Backend verify JWT bằng Spring Security Resource Server.
- Role hierarchy:
  - `SOC_ADMIN > SOC_ANALYST > SOC_VIEWER`
  - `SOC_ANALYST > SOC_VIEWER`
- Viewer xem/search được nhưng không export CSV.
- Analyst export CSV được.
- Admin xem audit log và có quyền cao nhất.

### 2.9. Frontend

- React + TypeScript + Vite.
- Tailwind CSS + shadcn/ui + lucide-react.
- Recharts cho aggregation chart.
- UI gồm:
  - Search box.
  - Suggested queries.
  - Pipeline/inspection panels.
  - SearchPlan và generated DSL viewer.
  - Raw events table.
  - Analytics chart + summary table.
  - Event detail drawer.
  - AI summary block.
  - Recent investigations history.
  - CSV export action theo role.

### 2.10. Deployment và vận hành

- Local và production chạy bằng Docker Compose.
- Production dùng DigitalOcean Droplet + Name.com DNS + Caddy HTTPS.
- Public only: `22`, `80`, `443`.
- Không public trực tiếp `3000`, `8081`, `8082`, `9200`, `5433`, `5601`.
- CI/CD bằng GitHub Actions qua SSH.
- Smoke test domain kiểm tra HTTPS, CORS và port exposure.

## 3. Phạm vi mở rộng sau MVP

- Multi-turn investigation chat.
- Semantic/vector search.
- Saved dashboards.
- Advanced anomaly detection.
- Multi-tenant isolation.
- Production-grade SIEM ingestion pipeline.
- Advanced monitoring with Prometheus/Grafana.
- Kubernetes/Helm nếu cần scale sau MVP.

## 4. Yêu cầu phi chức năng

- Swagger/OpenAPI đầy đủ cho API.
- Backend unit/service/controller tests.
- Frontend Vitest + React Testing Library tests.
- Backend coverage gate tối thiểu 50% cho business logic.
- Không commit secret thật.
- Không log API key, token, raw event hoặc stack trace ra response.
- Docker volumes phải giữ dữ liệu qua restart.
- Không chạy `docker compose down -v` nếu không chủ ý xóa dữ liệu.