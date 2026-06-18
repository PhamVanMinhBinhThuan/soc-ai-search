# Kế hoạch 14 ngày hoàn thiện MVP SOC AI Search

## 1. Mục tiêu

Hoàn thiện một bản MVP có thể demo end-to-end, chạy ổn định trên VPS AWS và gửi mentor kiểm tra sau 14 ngày.

Thời gian giả định:

- Bắt đầu: **Thứ Hai, 01/06/2026**.
- Hoàn thành và gửi mentor: **Chủ Nhật, 14/06/2026**.
- Nếu bắt đầu vào ngày khác, giữ nguyên thứ tự công việc và dịch các mốc tương ứng.

Kết quả cuối kỳ phải có:

- Repository GitHub có README, tài liệu kiến trúc và hướng dẫn chạy local.
- Website truy cập được bằng domain HTTPS.
- Pipeline GitHub Actions chạy test, build image và deploy lên VPS.
- Dataset synthetic local và demo mentor từ `10.000` event document trở lên.
- Script seed có tham số số lượng để nạp vài triệu event document trước buổi bảo vệ hội đồng.
- Data model Elasticsearch và PostgreSQL được mô tả rõ ràng.
- Demo được tìm kiếm, thống kê, biểu đồ, tóm tắt LLM, export CSV, lịch sử và audit log.
- Có đăng nhập và phân quyền RBAC bằng Keycloak với 3 role demo: `SOC_ADMIN`, `SOC_ANALYST`, `SOC_VIEWER`.
- OpenAPI/Swagger hoạt động.
- Test coverage backend tối thiểu 50%, đặt mục tiêu 60% để có khoảng an toàn.

## 2. Nguyên tắc khóa phạm vi

Trong 14 ngày, ưu tiên theo thứ tự:

1. Luồng demo end-to-end chạy được.
2. Đủ toàn bộ chức năng MVP trong [requirement.md](../docs/requirement.md).
3. Auth/RBAC đủ bảo vệ bản demo public, không mở self-registration.
4. Deploy ổn định, có CI/CD đơn giản và tài liệu.
5. Không đưa chức năng khuyến khích vào timeline 2 tuần.

CI/CD, VPS AWS, domain và HTTPS là hạ tầng bàn giao bản demo theo mục tiêu triển khai của đồ án. Đây không phải chức năng khuyến khích của sản phẩm.

Không triển khai trong 14 ngày đầu:

- Vector search, hybrid search và embedding.
- Native Elastic ML anomaly detection.
- Kubernetes, Helm, Prometheus và Grafana.
- Multi-tenant production-grade.
- Workflow tự đăng ký rồi chờ admin duyệt trong app riêng; MVP dùng quy trình admin tạo user trong Keycloak.
- Fine-tuning model.
- Kiến trúc nhiều search engine.

Các chức năng này có giá trị, nhưng làm sớm sẽ đẩy rủi ro sang phần MVP.

### 2.1. Chiến lược dataset theo giai đoạn

- **Local development:** script seed mặc định `10.000` event document để chạy nhẹ máy và phát triển nhanh.
- **CI:** dùng fixture nhỏ hơn để workflow không timeout.
- **Demo mentor sau 2 tuần:** dùng tối thiểu `10.000` event document để kiểm tra đầy đủ luồng MVP.
- **Bảo vệ hội đồng:** trước buổi demo, chạy cùng script với tham số số lượng để seed vài triệu event document theo batch và benchmark lại disk, RAM cùng latency.

Event SOC được lưu dưới dạng document trong Elasticsearch, không phải row trong PostgreSQL. PostgreSQL chỉ lưu dữ liệu ứng dụng như query history và audit log.

## 3. Stack đề xuất

| Thành phần | Lựa chọn | Lý do |
| --- | --- | --- |
| Backend | Java 21 + Spring Boot 3 | Phù hợp stack đã chọn, có hệ sinh thái REST API, validation, test và OpenAPI tốt |
| Validation | Bean Validation + Jackson | Khai báo `SearchPlan`, parse JSON và chặn query LLM không hợp lệ |
| App database | PostgreSQL self-managed + Flyway | Lưu query history và audit log, tách khỏi kho event |
| Search engine | Elasticsearch `9.4.2` Basic | Theo quyết định tại [search-engine-decision.md](../docs/search-engine-decision.md) |
| Local PostgreSQL UI | pgAdmin Desktop, tùy chọn | Xem schema, table và chạy SQL khi phát triển |
| Local Elasticsearch UI | Kibana `9.4.2`, tùy chọn qua Docker Compose profile `tools` | Kiểm tra mapping, document và DSL; không thay thế frontend React |
| Frontend | React + TypeScript + Vite + Tailwind CSS + shadcn/ui | Làm giao diện dashboard nhanh, dùng component có thể chỉnh sửa và dễ kết hợp chart library |
| Chart | Recharts hoặc Apache ECharts | Hỗ trợ bar, pie và time-series line chart |
| Identity & RBAC | Keycloak + Spring Security OAuth2 Resource Server | Đăng nhập OIDC, quản lý user/role ngoài app và bảo vệ API |
| Reverse proxy và TLS | Nginx + Certbot | Reverse proxy trên host EC2, cấp và gia hạn HTTPS với Let's Encrypt |
| Đóng gói | Docker Compose | Đúng yêu cầu MVP và phù hợp một VPS |
| CI/CD | GitHub Actions + GitHub Container Registry (`ghcr.io`) | Build, lưu image và deploy từ GitHub |
| VPS | AWS EC2 Ubuntu, khuyến nghị `t3.large` 8 GiB RAM | Đủ chỗ chạy Elasticsearch và các container MVP trên cùng máy |
| DNS | Route 53 hoặc DNS của nhà cung cấp domain | Trỏ bản ghi `A` về Elastic IP của EC2 |

`t3.large` là mức khởi đầu hợp lý cho demo, không phải sizing production. Nếu VPS thiếu RAM khi chạy Elasticsearch cùng PostgreSQL và frontend, nâng lên `t3.xlarge` thay vì mất thời gian tối ưu sớm. Không dùng Spot Instance cho bản demo mentor vì máy có thể bị thu hồi.

## 4. Kiến trúc mục tiêu

```text
Browser
   |
Domain HTTPS
   |
Nginx :80/:443
   |-- /auth/* -> Keycloak
   |-- /api/*  -> Spring Boot backend
   |-- /*      -> React static frontend
   |
Spring Boot backend
   |-- Spring Security: verify JWT + role guard
   |-- LLM API: natural language -> SearchPlan JSON
   |-- Validator + compiler: SearchPlan -> Elasticsearch Query DSL
   |-- Elasticsearch: event search + aggregation
   |-- PostgreSQL: query history + application audit log
   |
Keycloak
   |-- OIDC login
   |-- users and roles: SOC_ADMIN, SOC_ANALYST, SOC_VIEWER
   |
Elasticsearch 9.4.2 Basic
```

Chỉ publish `80`, `443` và `22` ra internet:

- `80` và `443`: cho Nginx.
- `22`: SSH, giới hạn theo IP cá nhân nếu có thể.
- Không publish Elasticsearch `9200`, PostgreSQL `5432`, Keycloak internal port, Kibana `5601` hoặc backend port trực tiếp ra internet.

Trên VPS, cần đặt `vm.max_map_count=1048576` theo [tài liệu Elastic](https://www.elastic.co/docs/deploy-manage/deploy/self-managed/vm-max-map-count).

## 5. Phạm vi MVP phải hoàn tất

### 5.1. Data model tối thiểu

Đồ án cần thiết kế data model cho cả Elasticsearch và PostgreSQL:

- Elasticsearch lưu event SOC để search và aggregation.
- PostgreSQL lưu dữ liệu ứng dụng. Với MVP chỉ cần **một bảng `search_query_logs`** để phục vụ recent history, application audit log và export lại theo `query_id`.
- Không tạo bảng user trong app. Keycloak quản lý user, role và login; PostgreSQL chỉ lưu identity lấy từ JWT vào `search_query_logs`.

Elasticsearch index đề xuất: `soc-events-v1`.

| Field | Kiểu Elasticsearch | Bắt buộc? | Mục đích |
| --- | --- | --- | --- |
| `timestamp` | `date` | Có | Filter thời gian và time bucket |
| `source` | `keyword` | Có | Nguồn phát sinh event |
| `severity` | `keyword` | Có | Filter và biểu đồ phân bố |
| `event_type` | `keyword` | Có | Filter loại event |
| `user` | `keyword` | Có | Filter và top user |
| `host` | `keyword` | Có | Filter và top host |
| `ip` | `ip` | Có | Filter và top IP |
| `message` | `text` | Có | Full-text search |
| `raw` | Không index | Có | Hiển thị chi tiết raw log |
| `country_code` | `keyword` | Bổ sung cho demo | Hỗ trợ truy vấn theo quốc gia |

PostgreSQL table đề xuất: `search_query_logs`.

| Column | Kiểu PostgreSQL | Mục đích |
| --- | --- | --- |
| `id` | `uuid` | Query ID, dùng cho history và export CSV |
| `identity` | `varchar` | Subject/username/email lấy từ JWT Keycloak hoặc identity demo khi chạy local mock |
| `question` | `text` | Câu hỏi tự nhiên gốc |
| `search_plan` | `jsonb` nullable | Plan đã validate; có thể chưa tồn tại nếu lỗi sớm |
| `generated_dsl` | `jsonb` nullable | Elasticsearch Query DSL đã compile; có thể chưa tồn tại nếu lỗi sớm |
| `mode` | `varchar` nullable | `search` hoặc `aggregation` |
| `result_count` | `bigint` | Số kết quả |
| `latency_ms` | `bigint` | Thời gian xử lý |
| `status` | `varchar` | `SUCCESS` hoặc `FAILED` |
| `error_message` | `text` nullable | Lỗi đã sanitize nếu có |
| `summary` | `text` nullable | Summary để hiển thị lại nếu cần |
| `created_at` | `timestamptz` | Thời điểm truy vấn |

Index PostgreSQL tối thiểu:

- Index `created_at DESC` để lấy recent history.
- Index `(identity, created_at DESC)` để lọc lịch sử theo user.

Nếu sau MVP cần audit bất biến nghiêm ngặt hơn, có thể tách `query_history` khỏi `audit_logs`. Không cần tạo bảng `app_users` nếu Keycloak tiếp tục là identity provider chính.

### 5.2. Event và ingest

- Schema tối thiểu: `timestamp`, `source`, `severity`, `event_type`, `user`, `host`, `ip`, `message`, `raw`.
- Bổ sung `country_code` để demo truy vấn theo quốc gia.
- Script sinh dữ liệu synthetic có seed cố định, nhận tham số số lượng và mặc định tạo `10.000` event document khi chạy local.
- Có pattern dễ quan sát: burst login thất bại, IP gây nhiều alert, severity khác nhau và event trải theo thời gian.
- REST API ingest một event.
- Endpoint bulk ingest hoặc script seed gọi Elasticsearch Bulk API theo batch để nạp nhanh cả dataset local và dataset vài triệu document trước buổi bảo vệ.

### 5.3. Natural language thành query

- Hỗ trợ tiếng Việt và tiếng Anh.
- LLM chỉ sinh `SearchPlan` JSON, không sinh DSL tự do để gửi thẳng vào Elasticsearch.
- Backend validate và compile `SearchPlan` thành Elasticsearch Query DSL.
- Hỗ trợ hai mode:
  - `search`: trả danh sách event.
  - `aggregate`: trả bucket thống kê.
- Backend có execution router phân loại mode và chọn Elasticsearch. MVP chỉ dùng một engine nên không thêm logic đồng bộ dữ liệu giữa nhiều engine.
- Hỗ trợ filter: thời gian, severity, event type, user, host, IP và country code.
- Hỗ trợ thống kê: `COUNT`, `GROUP BY`, `TOP N`, bucket phút, giờ và ngày.
- UI hiển thị câu hỏi gốc và DSL đã compile.

### 5.4. Kết quả và giao diện

- Search box.
- Summary 3-5 câu.
- Bảng kết quả có pagination.
- Modal hoặc trang chi tiết event hiển thị toàn bộ field và raw log.
- Bảng thống kê và biểu đồ bar, pie hoặc line tùy loại aggregation.
- Export CSV.
- Query history gần đây.

### 5.5. Phi chức năng

- Docker Compose local và production.
- Swagger UI tại `/swagger-ui.html`, OpenAPI JSON tại `/v3/api-docs`.
- Audit log ứng dụng: identity từ JWT hoặc demo identity khi chạy local mock, timestamp, câu hỏi gốc, DSL, mode, số kết quả, latency và trạng thái thành công/thất bại.
- Auth/RBAC:
  - Keycloak tắt public self-registration;
  - admin tạo user trong Keycloak và gửi email `VERIFY_EMAIL`/`UPDATE_PASSWORD`;
  - backend verify JWT;
  - frontend redirect login/logout qua Keycloak;
  - role tối thiểu: `SOC_ADMIN`, `SOC_ANALYST`, `SOC_VIEWER`.
- Unit test và integration test, coverage tối thiểu 50%.
- Health endpoint:
  - `/api/v1/health/live`: backend đang chạy.
  - `/api/v1/health/ready`: backend kết nối được PostgreSQL và Elasticsearch.

### 5.6. Guardrail tối thiểu

- Allowlist field và operation.
- `size <= 100` cho search UI.
- `top_n <= 50`.
- Export CSV giới hạn tối đa 10.000 dòng.
- Timeout cho Elasticsearch query.
- Không cho LLM dùng script query hoặc wildcard tùy ý.
- Không gửi toàn bộ raw event vào LLM khi summarization; chỉ gửi statistics và sample đã giới hạn.
- Có mock LLM cho test và local development khi chưa có API key.

## 6. API tối thiểu

| Method | Endpoint | Mục đích |
| --- | --- | --- |
| `POST` | `/api/v1/events` | Ingest một event |
| `POST` | `/api/v1/events/bulk` | Nạp dataset demo nhanh |
| `GET` | `/api/v1/events/{event_id}` | Xem chi tiết event |
| `POST` | `/api/v1/search` | Nhận câu hỏi tự nhiên, compile DSL, thực thi và trả kết quả |
| `GET` | `/api/v1/search/history` | Lấy lịch sử truy vấn gần đây |
| `GET` | `/api/v1/search/{query_id}/export.csv` | Export kết quả |
| `GET` | `/api/v1/audit-logs` | Xem audit log phục vụ demo |
| `GET` | `/api/v1/health/live` | Liveness |
| `GET` | `/api/v1/health/ready` | Readiness |

RBAC MVP:

- `SOC_VIEWER`: xem dashboard, search, aggregation và event detail cơ bản.
- `SOC_ANALYST`: toàn bộ quyền viewer, thêm export CSV, xem raw log và query history của mình.
- `SOC_ADMIN`: toàn bộ quyền analyst, thêm xem audit log và hỗ trợ quản lý user/role trong Keycloak Admin Console.

## 7. Kế hoạch chi tiết từng ngày

Mỗi ngày dành 6-8 giờ tập trung. Cuối ngày luôn commit code, cập nhật checklist và ghi ngắn gọn lỗi còn tồn tại.

### Ngày 1 - Thứ Hai, 01/06: Khởi tạo, thiết kế data model và giảm rủi ro hạ tầng

**Mục tiêu:** chốt stack, thiết kế data model, tạo skeleton chạy được và bắt đầu domain sớm.

Việc cần làm:

- Tạo cấu trúc repo:
  - `backend/`
  - `frontend/`
  - `infra/`
  - `scripts/`
  - `tests/`
  - `.github/workflows/`
- Khởi tạo Java 21 + Spring Boot 3, endpoint `/api/v1/health/live`, cấu hình Maven hoặc Gradle, lint và test.
- Khởi tạo React TypeScript, tạo trang placeholder và gọi health API.
- Tích hợp Tailwind CSS và shadcn/ui foundation; chỉ thêm component tối thiểu để kiểm tra cấu hình.
- Tạo Dockerfile cho backend và frontend.
- Tạo `docker-compose.yml` cho local gồm backend, frontend, Elasticsearch và PostgreSQL.
- Thêm Kibana `9.4.2` trong Docker Compose profile `tools` để bật khi cần debug Elasticsearch; không chạy mặc định.
- Pin image Elasticsearch `9.4.2`; nếu dùng Kibana thì pin cùng version. Không dùng tag `latest`.
- Chốt Elasticsearch index `soc-events-v1`, mapping event và PostgreSQL table `search_query_logs`.
- Tạo migration PostgreSQL ban đầu bằng Flyway.
- Cài pgAdmin Desktop trên máy cá nhân nếu cần xem schema hoặc chạy SQL; không thêm pgAdmin container vào stack mặc định.
- Tạo `.env.example`, `.gitignore`; tuyệt đối không commit API key hoặc password.
- Mua domain qua Route 53 hoặc nhà cung cấp tùy chọn. Nếu mua qua Route 53, hoàn tất email xác minh ngay.
- Tạo GitHub repository và push skeleton.

**Điều kiện hoàn thành:**

- Chạy được `docker compose up -d`.
- Chạy được `docker compose --profile tools up -d kibana` khi cần kiểm tra Elasticsearch bằng Kibana.
- Mở frontend thấy trạng thái backend sống.
- Swagger mở được.
- Domain đã được đặt mua hoặc có domain sẵn sàng sử dụng.

### Ngày 2 - Thứ Ba, 02/06: Mapping, ingest pipeline và dataset demo

**Mục tiêu:** có kho event local đủ dùng để phát triển mọi luồng sau đó và script có thể scale khi chuẩn bị bảo vệ.

Việc cần làm:

- Tạo index template hoặc script bootstrap Elasticsearch.
- Mapping đúng kiểu:
  - `timestamp`: `date`
  - `message`: `text`
  - `raw`: không index
  - field filter: `keyword`
  - `ip`: `ip`
- Viết script sinh event synthetic với seed cố định, nhận tham số số lượng và mặc định tạo `10.000` document local.
- Đảm bảo event có pattern demo:
  - login thất bại từ `CN` trong 24 giờ gần nhất;
  - một số IP tạo nhiều alert;
  - severity phân bố `low`, `medium`, `high`, `critical`;
  - dữ liệu trải qua ít nhất 30 ngày.
- Viết script seed bằng Elasticsearch Bulk API.
- Có thể dùng Kibana Discover và Dev Tools để kiểm tra mapping, document và DSL trong môi trường local.
- Cài API `POST /api/v1/events` và `/api/v1/events/bulk`.
- Viết smoke test PowerShell cho mapping, ingest và dataset pattern bằng Docker Compose local.

**Điều kiện hoàn thành:**

- Elasticsearch local chứa ít nhất `10.000` event document.
- Script seed có tham số số lượng để dùng lại khi nạp vài triệu document trước buổi bảo vệ hội đồng.
- Có thể ingest thêm event qua Swagger.
- Query trực tiếp Elasticsearch trả đúng pattern đã seed.

### Ngày 3 - Thứ Tư, 03/06: SearchPlan, validator và compiler

**Mục tiêu:** tạo lõi an toàn trước khi nối LLM.

Việc cần làm:

- Định nghĩa `SearchPlan` và các DTO con bằng Java `record` với Bean Validation để giữ dữ liệu truy vấn bất biến, dễ parse từ JSON và dễ test.
- Dùng `class` hoặc Spring `@Service` cho phần có logic xử lý như validator, compiler và executor; không nhồi business logic vào record.
- Hỗ trợ filter thời gian, severity, event type, user, host, IP và country code.
- Compile `SearchPlan` thành Query DSL:
  - `bool.filter`
  - `term`
  - `range`
  - `match`
- Tạo executor cho mode `search`, có pagination.
- Tạo service lấy event detail.
- Áp dụng allowlist, timeout và giới hạn `size`.
- Viết unit test theo table-driven cases.

**Điều kiện hoàn thành:**

- Gọi backend bằng `SearchPlan` cố định trả đúng event.
- Pagination và event detail hoạt động.
- Query không hợp lệ bị từ chối rõ ràng.

### Ngày 4 - Thứ Năm, 04/06: Tích hợp LLM cho NL -> SearchPlan

**Mục tiêu:** chạy được tìm kiếm bằng câu hỏi tự nhiên.

Việc cần làm:

- Chọn một hosted LLM API để giảm tải VPS. Không host model local trong sprint này.
- Viết system prompt mô tả schema, field allowlist và JSON schema của `SearchPlan`.
- Yêu cầu LLM sinh trực tiếp JSON `SearchPlan` thuần:
  - không sinh Elasticsearch DSL;
  - không sinh prose;
  - không sinh markdown;
  - không thêm field ngoài schema.
- Tạo LLM client có timeout, retry giới hạn và mock implementation.
- Parse JSON bằng Jackson và validate bằng Bean Validation cùng `SearchPlanValidator`.
- Nếu JSON không parse được hoặc không khớp schema:
  - cho phép retry/repair tối đa một lần bằng prompt sửa JSON;
  - sau lần repair vẫn lỗi thì trả lỗi rõ ràng;
  - không tự suy đoán field ngoài `SearchPlan` schema.
- Tạo endpoint `POST /api/v1/search`.
- Ghi nhận câu hỏi gốc, generated `SearchPlan`, generated DSL và latency trong response hoặc application log để debug.
- Chưa persist audit log vào PostgreSQL trong ngày 4; query history/audit log để ngày 7.
- Kiểm thử tối thiểu 10 câu hỏi Việt/Anh:
  - "Show me failed login attempts from China in the last 24h"
  - "Tìm alert critical trong 7 ngày qua"
  - "Tìm event của user admin trên host srv-01"

**Điều kiện hoàn thành:**

- Ba câu demo search trả kết quả hợp lý.
- UI hoặc Swagger hiển thị được câu hỏi gốc và DSL cuối cùng.
- Khi không có API key, test vẫn chạy bằng mock.

### Ngày 5 - Thứ Sáu, 05/06: Aggregation API

**Mục tiêu:** hoàn thành phần thống kê cốt lõi.

Việc cần làm:

- Mở rộng `SearchMode` từ ngày 4:
  - `SEARCH`;
  - `AGGREGATION`.
- Mở rộng `SearchPlan` cho aggregation bằng DTO rõ ràng, ví dụ `AggregationPlan`:
  - `type`: `COUNT`, `GROUP_BY`, `TOP_N`, `DATE_HISTOGRAM`;
  - `field`: field dùng để group/top nếu cần;
  - `top_n`: giới hạn số bucket cho `TOP_N` hoặc `GROUP_BY`;
  - `interval`: `minute`, `hour`, `day` cho `DATE_HISTOGRAM`.
- Cập nhật prompt builder để LLM có thể sinh `SearchPlan` mode `aggregation`, nhưng vẫn giữ nguyên nguyên tắc:
  - LLM chỉ sinh JSON `SearchPlan`;
  - không sinh Elasticsearch DSL;
  - không sinh prose/markdown;
  - không thêm field ngoài schema.
- Cập nhật validator cho aggregation:
  - chỉ cho phép aggregation field trong allowlist: `source`, `severity`, `event_type`, `user`, `host`, `ip`, `country_code`;
  - không cho group/top trên `message`, `raw`, `timestamp` hoặc field lạ như `password`;
  - `top_n` phải có giới hạn an toàn, ví dụ 1-100;
  - `DATE_HISTOGRAM` chỉ chạy trên `timestamp`;
  - `COUNT` không cần `field`.
- Compile và execute aggregation DSL:
  - `COUNT`: dùng search request `size = 0` và lấy `hits.total`, không cần aggregation DSL riêng;
  - `GROUP_BY` và `TOP_N`: dùng Elasticsearch `terms` aggregation;
  - `DATE_HISTOGRAM`: dùng Elasticsearch `date_histogram` trên field `timestamp`;
  - field trong aggregation dùng đúng mapping hiện tại như `user`, `host`, `ip`, `severity`, không tự thêm `.keyword` vì các field này đã là `keyword` trong mapping `soc-events-v1`.
- Chuẩn hóa response để frontend không phụ thuộc DSL, ví dụ:
  - `mode`;
  - `aggregation_type`;
  - `generated_dsl`;
  - `total`;
  - `aggregation_results`: danh sách `{ key, value }`;
  - `chart_metadata`: `{ chart_type, x_axis_label, y_axis_label }`.
- Gợi ý chart metadata:
  - `TOP_N` hoặc `GROUP_BY` -> `BAR`;
  - phân bố severity/country nếu có -> `PIE` hoặc `BAR`;
  - `DATE_HISTOGRAM` -> `LINE`.
- Tái sử dụng guardrail pagination/size từ ngày 4:
  - request `size` hoặc `top_n` phải được giới hạn;
  - không để LLM tự nâng số bucket quá giới hạn.
- Viết test cho compiler và executor aggregation:
  - `COUNT` dùng `hits.total`;
  - `terms` aggregation cho `GROUP_BY`/`TOP_N`;
  - `date_histogram` aggregation cho time bucket;
  - reject field ngoài allowlist;
  - response có `aggregation_results` và `chart_metadata`.
- Demo các câu:
  - "Đếm số lần login thất bại theo từng user trong 7 ngày qua"
  - "Top 10 IP có nhiều alert nhất tháng này"
  - "Số event theo giờ trong 24h qua"

**Điều kiện hoàn thành:**

- Ba câu demo aggregation trả đúng table data và chart metadata.
- DSL được hiển thị cho người dùng.
- Frontend có thể render aggregation bằng `aggregation_results` và `chart_metadata` mà không cần hiểu Elasticsearch DSL.
- Aggregation không dùng field ngoài allowlist và không dùng `.keyword` sai với mapping hiện tại.

### Ngày 6 - Thứ Bảy, 06/06: Frontend search, event detail và biểu đồ

**Mục tiêu:** có luồng demo trực quan cho search và aggregation.

Việc cần làm:

- Làm search box và trạng thái loading/error.
- Dùng Tailwind CSS và các component shadcn/ui phù hợp để giữ giao diện nhất quán; chỉ thêm component khi màn hình thực sự cần.
- Hiển thị DSL đã compile trong panel có thể thu gọn.
- Làm bảng event với pagination.
- Làm modal hoặc trang event detail hiển thị raw log.
- Hiển thị bảng thống kê và chọn biểu đồ:
  - time bucket -> line chart;
  - top N -> bar chart;
  - phân bố severity -> pie hoặc bar chart.
- Chuẩn bị UI hiển thị identity/role ở header nhưng chưa bắt buộc đăng nhập trong ngày 6; Auth/RBAC làm ở tuần 2 bằng Keycloak.

**Điều kiện hoàn thành:**

- Người dùng nhập câu tự nhiên, xem bảng, chuyển trang và mở raw log.
- Ba câu demo aggregation hiển thị bảng và chart đúng loại.
- Không cần Swagger để demo luồng search cơ bản.

### Ngày 7 - Chủ Nhật, 07/06: Summary, history, audit và CSV

**Mục tiêu:** kết thúc tuần một với full vertical slice.

Việc cần làm:

- Lưu mọi search attempt đã đi vào orchestration của `POST /api/v1/search` vào bảng `search_query_logs`, gồm cả thành công và thất bại.
- Dùng identity cấu hình được, mặc định `demo-analyst` khi chưa bật Keycloak; sau ngày 8 identity sẽ lấy từ JWT Keycloak.
- Lưu query ID, timestamp, câu hỏi, `SearchPlan` đầy đủ, mode, result count, latency, status, lỗi đã sanitize và summary nếu có.
- Lưu generated DSL để debug nhưng giới hạn JSON đã serialize tối đa 100 KB tính theo UTF-8 bytes. Nếu vượt giới hạn thì không truncate làm hỏng JSON; lưu `null` cho DSL, ghi warning nội bộ và vẫn tiếp tục trả kết quả search.
- Trả `query_id` trong response search thành công để frontend có thể export lại đúng truy vấn.
- Tạo endpoint recent history và audit log có pagination từ cùng bảng `search_query_logs`; không tạo thêm table trong MVP:
  - history mặc định `page=0&size=20`;
  - audit mặc định `page=0&size=50`;
  - `page >= 0`, `size` từ 1 đến 100.
- Tạo payload summary nhỏ gọn từ Elasticsearch:
  - tổng số event;
  - top user, host và IP;
  - phân bố severity;
  - tối đa 5 sample event, chỉ chứa field cần thiết;
  - tổng payload gửi LLM tối đa 5.000 ký tự.
- Không gửi `raw`, toàn bộ event result hoặc secret vào LLM khi summarization.
- Xem AI summary là best-effort enhancement: kết quả search/aggregation luôn được ưu tiên và không được thất bại chỉ vì summary lỗi.
- Gọi LLM tối đa một lần để sinh summary 3-5 câu, có timeout riêng `LLM_SUMMARY_TIMEOUT_MS=5000`; không hạ timeout chung đang dùng cho NL -> SearchPlan.
- Nếu summary LLM lỗi, timeout, hết quota hoặc output rỗng thì dùng fallback deterministic, đánh dấu `summary_source=fallback` và vẫn trả HTTP 200 cùng kết quả search.
- Lưu summary cuối cùng vào `search_query_logs` và hiển thị phía trên kết quả trên frontend.
- Làm export CSV theo `query_id`:
  - search mode export các field event chính, không export raw log mặc định;
  - aggregation mode export `key,value`;
  - chạy lại `SearchPlan` đã validate được lưu trong PostgreSQL, không nhận DSL tùy ý từ client;
  - đọc theo batch 500 hoặc 1.000 dòng, bảo đảm `from + size <= 10.000`;
  - không dùng Scroll API hoặc `search_after` trong MVP;
  - nếu kết quả lớn hơn 10.000 thì export 10.000 dòng đầu và trả cảnh báo bị truncate, không trả lỗi 500.
- Hiển thị recent query history dạng gọn, có chuyển trang, gồm thời gian, câu hỏi, mode, status và result count; cho phép chạy lại câu hỏi, không hiển thị SearchPlan/DSL dài trong danh sách.
- Kiểm tra history, audit, summary và CSV bằng backend test, Swagger và smoke test ngày 7.

**Điều kiện hoàn thành:**

- Demo end-to-end đủ các mục chức năng của MVP trên máy local.
- LLM summary lỗi hoặc quá 5 giây không làm hỏng kết quả search; fallback deterministic được trả về.
- Mỗi search attempt đã vào orchestration, dù thành công hoặc thất bại, đều có audit record phù hợp.
- Recent history phân trang và hiển thị được câu hỏi, trạng thái, mode, result count và thời gian.
- CSV tải xuống, mở được, không vượt quá 10.000 dòng dữ liệu và báo rõ khi kết quả bị truncate.

### Ngày 8 - Thứ Hai, 08/06: Keycloak auth foundation

**Mục tiêu:** thay demo identity bằng đăng nhập thật qua Keycloak, nhưng vẫn giữ code đơn giản cho MVP.

Việc cần làm:

- Thêm Keycloak vào Docker Compose local bằng profile hoặc service rõ ràng; không expose public ngoài reverse proxy khi deploy.
- Tạo realm demo, client OIDC cho frontend/backend và roles:
  - `SOC_VIEWER`;
  - `SOC_ANALYST`;
  - `SOC_ADMIN`.
- Tắt self-registration trong Keycloak. Quy trình cấp tài khoản MVP:
  - Admin tạo user trong Keycloak Admin Console;
  - Admin gán role phù hợp;
  - Admin gửi email required actions `VERIFY_EMAIL` và `UPDATE_PASSWORD`;
  - user tự đặt mật khẩu qua link email.
- Backend dùng Spring Security OAuth2 Resource Server để verify JWT từ Keycloak.
- Map role từ JWT sang quyền trong backend; không hardcode user/password trong app.
- Frontend tích hợp OIDC login/logout, hiển thị identity và role ở header.
- Local development vẫn có mode mock auth hoặc cấu hình tắt auth nếu cần chạy test nhanh, nhưng bản demo public dùng Keycloak.
- Cập nhật `.env.example` với các biến Keycloak, không commit secret.

**Điều kiện hoàn thành:**

- User đăng nhập bằng Keycloak rồi gọi được API.
- Không đăng nhập thì API protected trả 401.
- Token hợp lệ được backend đọc identity/role.
- Không có self-registration công khai.

### Ngày 9 - Thứ Ba, 09/06: RBAC và UI permission

**Mục tiêu:** role hoạt động đúng theo luồng SOC demo.

Việc cần làm:

- Áp quyền theo role:
  - `SOC_VIEWER`: xem dashboard, search, aggregation và event detail cơ bản;
  - `SOC_ANALYST`: quyền viewer, thêm xem raw log, export CSV và query history của mình;
  - `SOC_ADMIN`: quyền analyst, thêm xem audit log và hỗ trợ quản trị user/role trong Keycloak Admin Console.
- Backend dùng method/security filter guard cho endpoint nhạy cảm:
  - export CSV;
  - raw event detail nếu muốn giới hạn;
  - audit logs;
  - history.
- Audit/history lấy `identity` từ JWT thay vì `demo-analyst` khi auth bật.
- Frontend ẩn/disable action theo role:
  - export;
  - raw log;
  - audit/history;
  - admin-only links.
- Tạo smoke test auth/RBAC:
  - unauthenticated -> 401;
  - viewer bị chặn export/audit;
  - analyst export được;
  - admin xem audit được.
- Ghi rõ trong README cách tạo user demo bằng Keycloak Admin Console.

**Điều kiện hoàn thành:**

- 3 role demo hoạt động khác nhau và có thể trình bày được.
- Identity trong search history/audit không còn là giá trị giả khi đăng nhập thật.
- UI không hiện action mà role hiện tại không được dùng.

### Ngày 10 - Thứ Tư, 10/06: Test suite, coverage và regression

**Mục tiêu:** ổn định lại toàn bộ MVP sau khi thêm auth.

Việc cần làm:

- Bổ sung unit/integration test:
  - validator;
  - compiler search;
  - compiler aggregation;
  - natural language orchestration;
  - summary payload builder;
  - CSV export limit;
  - audit/history;
  - RBAC endpoint guard.
- Mock LLM trong CI để test không tốn tiền và không phụ thuộc mạng.
- Test frontend build/lint và các component state chính.
- Chạy coverage, sửa các nhánh quan trọng chưa được test.
- Đặt coverage gate từ 50%, hướng tới 60%.
- Chạy smoke test ngày 1-7 và smoke auth/RBAC.

**Điều kiện hoàn thành:**

- Backend test pass.
- Frontend lint/build pass.
- Coverage backend đạt ít nhất 50%.
- Auth không phá các luồng search, aggregation, summary, history và CSV.

### Ngày 11 - Thứ Năm, 11/06: Deploy VPS một ngày, CI/CD đơn giản

**Mục tiêu:** có bản demo HTTPS public chạy được trên VPS, deploy đủ đơn giản để kịp bảo vệ.

Việc cần làm:

- Tạo VPS/EC2 Ubuntu, Elastic IP, security group chỉ mở:
  - `22/tcp`: chỉ IP cá nhân nếu có thể;
  - `80/tcp`: internet;
  - `443/tcp`: internet.
- Cài Docker Engine, Docker Compose plugin, Nginx và Certbot.
- Thiết lập `vm.max_map_count=1048576`.
- Tạo hoặc hoàn thiện `docker-compose.prod.yml`:
  - backend;
  - frontend;
  - PostgreSQL;
  - Elasticsearch;
  - Keycloak;
  - named volumes;
  - restart policy;
  - không public Elasticsearch/PostgreSQL/Keycloak internal port.
- Trỏ domain/subdomain về VPS và cấp HTTPS bằng Certbot.
- Cấu hình Nginx:
  - `/` -> frontend;
  - `/api/*` -> backend;
  - `/auth/*` -> Keycloak nếu dùng chung domain.
- Seed dataset phù hợp cho demo mentor.
- Tạo GitHub Actions đơn giản:
  - CI: backend test, frontend lint/build;
  - build/push image hoặc SSH deploy trực tiếp tùy cách ít rủi ro nhất;
  - CD qua SSH: pull/update, `docker compose up -d`, chạy smoke test.
- Lưu runtime secrets trong `.env.prod` trên VPS hoặc GitHub Environment secrets; không commit secret.

**Điều kiện hoàn thành:**

- Website truy cập được bằng `https://<domain>`.
- Login Keycloak hoạt động trên domain.
- Smoke test domain pass.
- Có cách deploy lại từ GitHub Actions hoặc command SSH ngắn gọn đã ghi trong README.
- Biết cách rollback về image/tag hoặc commit trước.

### Ngày 12 - Thứ Sáu, 12/06: Hardening, tài liệu kỹ thuật và demo data

**Mục tiêu:** làm bản deploy đủ chắc để mentor/hội đồng dùng thử.

Việc cần làm:

- Chạy toàn bộ test và smoke test local + domain.
- Kiểm tra không lộ secret bằng `git grep`, GitHub Actions log và README.
- Kiểm tra container restart, volumes và dataset còn tồn tại sau reboot/restart.
- Kiểm tra Nginx HTTPS, redirect HTTP -> HTTPS, CORS và exposed headers cho CSV.
- Kiểm tra port exposure:
  - Elasticsearch `9200` không public;
  - PostgreSQL `5432` không public;
  - Kibana `5601` không public;
  - backend port không public trực tiếp;
  - Keycloak chỉ đi qua Nginx.
- Chuẩn hóa README:
  - chạy local;
  - bật Keycloak;
  - tạo user demo;
  - seed data;
  - chạy test;
  - deploy;
  - rollback;
  - URL demo và credential gửi riêng.
- Chuẩn bị bộ câu hỏi demo cố định và dataset seed ổn định.

**Điều kiện hoàn thành:**

- Một người khác có thể đọc README và chạy local.
- Domain chạy ổn sau restart.
- Demo account và role đã sẵn sàng.

### Ngày 13 - Thứ Bảy, 13/06: Report, slide và video dự phòng

**Mục tiêu:** chuyển project kỹ thuật thành nội dung bảo vệ rõ ràng.

Việc cần làm:

- Viết report theo cấu trúc:
  - vấn đề và động lực;
  - kiến trúc hệ thống;
  - data model Elasticsearch/PostgreSQL;
  - NL -> SearchPlan -> Validator -> DSL -> Elasticsearch;
  - Keycloak/RBAC;
  - summary/history/audit/export;
  - test và deploy;
  - hạn chế và hướng phát triển.
- Làm slide 10-15 trang:
  - problem;
  - architecture;
  - key workflow;
  - demo screenshots;
  - security/RBAC;
  - results;
  - limitations.
- Chụp screenshot UI:
  - search;
  - aggregation chart;
  - generated DSL/SearchPlan;
  - event detail/raw log;
  - AI summary;
  - history/audit/export;
  - login/RBAC.
- Quay video dự phòng 3-5 phút.
- Chuẩn bị script demo 7-10 phút.

**Điều kiện hoàn thành:**

- Có bản draft report.
- Có slide demo.
- Có video dự phòng.
- Demo story mạch lạc từ bài toán SOC đến kết quả hệ thống.

### Ngày 14 - Chủ Nhật, 14/06: Diễn tập, buffer sửa lỗi và gửi mentor

**Mục tiêu:** không thêm tính năng lớn, chỉ ổn định và bàn giao.

Việc cần làm:

- Diễn tập demo ít nhất hai lần theo script.
- Sửa lỗi phát hiện khi diễn tập.
- Chạy CI/CD lần cuối.
- Chạy smoke test domain.
- Kiểm tra dataset còn tồn tại sau restart.
- Tạo release tag, ví dụ `v0.1.0-mvp`.
- Chuẩn bị nội dung gửi mentor:
  - link GitHub;
  - link website HTTPS;
  - credential demo gửi riêng;
  - video dự phòng;
  - report/slide draft;
  - danh sách chức năng hoàn thành;
  - hạn chế còn tồn tại;
  - câu hỏi cần mentor review.

**Điều kiện hoàn thành:**

- Gửi mentor trước cuối ngày `14/06/2026`.
- Không còn lỗi chặn luồng demo chính.
- Report và slide đủ dùng cho buổi review tiếp theo.

## 8. CI/CD mục tiêu

```text
Pull request / push
   |
GitHub Actions CI
   |-- backend lint + tests + coverage
   |-- frontend lint + build
   |
Push main
   |
Build backend/frontend Docker images
   |
Push ghcr.io/<account>/<image>:<commit-sha>
   |
SSH into EC2
   |-- docker compose pull
   |-- docker compose up -d
   |-- smoke test
   |-- rollback previous tag if failed
```

GitHub Actions có thể dùng `GITHUB_TOKEN` để publish package gắn với repository theo [GitHub Container Registry docs](https://docs.github.com/packages/working-with-a-github-packages-registry/working-with-the-container-registry). Secrets nên đặt trong GitHub Environment hoặc repository secrets theo [GitHub Actions secrets docs](https://docs.github.com/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions).

## 9. Kịch bản demo mentor hoặc hội đồng 7-10 phút

1. Mở website HTTPS và giới thiệu schema event cùng quy mô dataset: tối thiểu `10.000` document cho demo mentor, vài triệu document cho buổi bảo vệ hội đồng.
2. Đăng nhập bằng Keycloak với account `SOC_ANALYST`, chỉ identity và role trên giao diện.
3. Search tiếng Anh: `"Show me failed login attempts from China in the last 24h"`.
4. Chỉ DSL được sinh, bảng kết quả, pagination và raw event detail.
5. Search tiếng Việt: `"Tìm alert critical trong 7 ngày qua"`.
6. Aggregation: `"Top 10 IP có nhiều alert nhất tháng này"`.
7. Chỉ bar chart và bảng.
8. Aggregation time-series: `"Số event theo giờ trong 24h qua"`.
9. Chỉ line chart, summary LLM 3-5 câu và export CSV.
10. Chỉ query history và audit log gắn với identity đã đăng nhập.
11. Giải thích nhanh RBAC: `SOC_VIEWER`, `SOC_ANALYST`, `SOC_ADMIN`; admin quản lý user trong Keycloak, không mở self-registration.
12. Mở Swagger, GitHub Actions xanh và giải thích deploy đơn giản lên VPS.

## 10. Checklist AWS và domain

- [ ] Domain đã đăng ký và xác minh email.
- [ ] EC2 Ubuntu đã tạo.
- [ ] Elastic IP đã allocate và associate.
- [ ] Security group chỉ mở `22`, `80`, `443`.
- [ ] SSH key không commit vào repo.
- [ ] `vm.max_map_count=1048576`.
- [ ] Docker và Compose plugin đã cài.
- [ ] DNS record `A` trỏ domain về Elastic IP.
- [ ] Certbot cấp SSL certificate cho Nginx thành công.
- [ ] Keycloak realm, client và roles đã cấu hình.
- [ ] Self-registration Keycloak đã tắt.
- [ ] Có ít nhất 3 user demo tương ứng `SOC_VIEWER`, `SOC_ANALYST`, `SOC_ADMIN`.
- [ ] Elasticsearch `9200` không public.
- [ ] PostgreSQL `5432` không public.
- [ ] Keycloak internal port không public trực tiếp, chỉ đi qua Nginx HTTPS.
- [ ] Kibana `5601` không public.
- [ ] Runtime secrets chỉ nằm trong `.env.prod` trên VPS.
- [ ] Volume PostgreSQL và Elasticsearch tồn tại sau restart.
- [ ] Có backup tối thiểu của `.env.prod` ở nơi bảo mật và có script seed lại dữ liệu demo.

AWS khuyến nghị dùng Elastic IP để địa chỉ EC2 không đổi khi trỏ domain. Xem [EC2 Elastic IP docs](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/working-with-eips.html), [Route 53 routing to EC2 docs](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-ec2-instance.html) và [security group rules](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules-reference.html). Elastic IP public IPv4 có tính phí kể cả khi đang dùng; cần theo dõi billing và release resource khi không còn sử dụng.

## 11. Rủi ro và cách xử lý

| Rủi ro | Dấu hiệu | Cách xử lý |
| --- | --- | --- |
| LLM sinh query không đúng | Kết quả rỗng hoặc sai filter | Dùng `SearchPlan`, validator, prompt examples và regression cases |
| LLM API lỗi hoặc hết quota | Search trả lỗi | Timeout, retry giới hạn, mock và summary fallback deterministic |
| VPS thiếu RAM | Elasticsearch restart hoặc OOM | Giới hạn container, không bật Kibana mặc định hoặc nâng instance |
| Domain chưa active | Không lấy được HTTPS | Mua domain ngày 1, vẫn test qua Elastic IP trước |
| CI integration test chậm | Workflow timeout | Dùng fixture nhỏ cho CI, seed mặc định `10.000` document khi phát triển local và chỉ seed vài triệu document riêng cho môi trường bảo vệ |
| Keycloak cấu hình sai | Login redirect lỗi hoặc backend trả 401 | Làm auth ngày 8-9 trên local trước, giữ realm export và smoke test RBAC |
| Deploy lỗi sát deadline | Website down | Deploy gọn trong ngày 11, giữ command rollback/image tag trước và không thêm Jenkins, ArgoCD hoặc Kubernetes |
| Lộ API key | Key xuất hiện trong Git hoặc log | `.env.example`, GitHub secrets, kiểm tra log và rotate key ngay nếu lộ |
| Scope phình | MVP chưa xong nhưng bắt đầu vector hoặc K8S | Không triển khai chức năng khuyến khích trong timeline 2 tuần |

## 12. Nguồn tham khảo triển khai

- [Elasticsearch Docker Compose](https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-docker-compose)
- [Elasticsearch Docker production recommendations](https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-docker-prod)
- [Kibana Discover](https://www.elastic.co/guide/en/kibana/current/discover.html)
- [Kibana Console](https://www.elastic.co/docs/explore-analyze/query-filter/tools/console)
- [PostgreSQL COPY](https://www.postgresql.org/docs/current/sql-copy.html)
- [GitHub Actions publishing Docker images](https://docs.github.com/actions/tutorials/publish-packages/publish-docker-images)
- [GitHub Container Registry](https://docs.github.com/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [AWS Route 53 domain registration](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/registrar.html)
- [AWS Route 53 routing domain to EC2](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-ec2-instance.html)
- [NGINX reverse proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Certbot instructions for Nginx](https://certbot.eff.org/instructions?ws=nginx&os=snap)
- [Keycloak Server Administration Guide](https://www.keycloak.org/docs/latest/server_admin/)
- [Spring Security OAuth2 Resource Server](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/index.html)
