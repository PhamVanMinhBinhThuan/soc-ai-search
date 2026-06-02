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
- Dataset synthetic từ 10.000 event trở lên.
- Data model Elasticsearch và PostgreSQL được mô tả rõ ràng.
- Demo được tìm kiếm, thống kê, biểu đồ, tóm tắt LLM, export CSV, lịch sử và audit log.
- OpenAPI/Swagger hoạt động.
- Test coverage backend tối thiểu 50%, đặt mục tiêu 60% để có khoảng an toàn.

## 2. Nguyên tắc khóa phạm vi

Trong 14 ngày, ưu tiên theo thứ tự:

1. Luồng demo end-to-end chạy được.
2. Đủ toàn bộ chức năng MVP trong [requirement.md](../docs/requirement.md).
3. Deploy ổn định, có CI/CD và tài liệu.
4. Không đưa chức năng khuyến khích vào timeline 2 tuần.

CI/CD, VPS AWS, domain và HTTPS là hạ tầng bàn giao bản demo theo mục tiêu triển khai của đồ án. Đây không phải chức năng khuyến khích của sản phẩm.

Không triển khai trong 14 ngày đầu:

- Vector search, hybrid search và embedding.
- Native Elastic ML anomaly detection.
- Kubernetes, Helm, Prometheus và Grafana.
- Multi-tenant production-grade.
- Fine-tuning model.
- Kiến trúc nhiều search engine.

Các chức năng này có giá trị, nhưng làm sớm sẽ đẩy rủi ro sang phần MVP.

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
   |-- /api/*  -> Spring Boot backend
   |-- /*      -> React static frontend
   |
Spring Boot backend
   |-- LLM API: natural language -> SearchPlan JSON
   |-- Validator + compiler: SearchPlan -> Elasticsearch Query DSL
   |-- Elasticsearch: event search + aggregation
   |-- PostgreSQL: query history + application audit log
   |
Elasticsearch 9.4.2 Basic
```

Chỉ publish `80`, `443` và `22` ra internet:

- `80` và `443`: cho Nginx.
- `22`: SSH, giới hạn theo IP cá nhân nếu có thể.
- Không publish Elasticsearch `9200`, PostgreSQL `5432`, Kibana `5601` hoặc backend port trực tiếp ra internet.

Trên VPS, cần đặt `vm.max_map_count=1048576` theo [tài liệu Elastic](https://www.elastic.co/docs/deploy-manage/deploy/self-managed/vm-max-map-count).

## 5. Phạm vi MVP phải hoàn tất

### 5.1. Data model tối thiểu

Đồ án cần thiết kế data model cho cả Elasticsearch và PostgreSQL:

- Elasticsearch lưu event SOC để search và aggregation.
- PostgreSQL lưu dữ liệu ứng dụng. Với MVP chỉ cần **một bảng `search_query_logs`** để phục vụ recent history, application audit log và export lại theo `query_id`.
- Chưa cần bảng user vì auth không thuộc phạm vi bắt buộc. MVP có thể ghi một identity demo như `demo-analyst`.

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
| `user_identity` | `varchar` | Ai thực hiện truy vấn |
| `question` | `text` | Câu hỏi tự nhiên gốc |
| `search_plan` | `jsonb` nullable | Plan đã validate; có thể chưa tồn tại nếu lỗi sớm |
| `generated_dsl` | `jsonb` nullable | Elasticsearch Query DSL đã compile; có thể chưa tồn tại nếu lỗi sớm |
| `mode` | `varchar` nullable | `search` hoặc `aggregate` |
| `result_count` | `bigint` | Số kết quả |
| `latency_ms` | `bigint` | Thời gian xử lý |
| `status` | `varchar` | `SUCCESS` hoặc `FAILED` |
| `error_message` | `text` nullable | Lỗi đã sanitize nếu có |
| `summary` | `text` nullable | Summary để hiển thị lại nếu cần |
| `created_at` | `timestamptz` | Thời điểm truy vấn |

Index PostgreSQL tối thiểu:

- Index `created_at DESC` để lấy recent history.
- Index `(user_identity, created_at DESC)` để lọc lịch sử theo user.

Nếu sau MVP cần auth đầy đủ hoặc audit bất biến nghiêm ngặt hơn, có thể bổ sung `app_users` và tách `query_history` khỏi `audit_logs`. Không cần làm việc đó trước khi MVP chạy ổn định.

### 5.2. Event và ingest

- Schema tối thiểu: `timestamp`, `source`, `severity`, `event_type`, `user`, `host`, `ip`, `message`, `raw`.
- Bổ sung `country_code` để demo truy vấn theo quốc gia.
- Script sinh dữ liệu synthetic có seed cố định, tạo ít nhất 10.000 event.
- Có pattern dễ quan sát: burst login thất bại, IP gây nhiều alert, severity khác nhau và event trải theo thời gian.
- REST API ingest một event.
- Endpoint bulk ingest hoặc script seed gọi Elasticsearch Bulk API để nạp dataset demo nhanh.

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
- Audit log ứng dụng: user demo, timestamp, câu hỏi gốc, DSL, mode, số kết quả, latency và trạng thái thành công/thất bại.
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

**Mục tiêu:** có kho event thật để phát triển mọi luồng sau đó.

Việc cần làm:

- Tạo index template hoặc script bootstrap Elasticsearch.
- Mapping đúng kiểu:
  - `timestamp`: `date`
  - `message`: `text`
  - `raw`: không index
  - field filter: `keyword`
  - `ip`: `ip`
- Viết script sinh ít nhất 10.000 event synthetic với seed cố định.
- Đảm bảo event có pattern demo:
  - login thất bại từ `CN` trong 24 giờ gần nhất;
  - một số IP tạo nhiều alert;
  - severity phân bố `low`, `medium`, `high`, `critical`;
  - dữ liệu trải qua ít nhất 30 ngày.
- Viết script seed bằng Elasticsearch Bulk API.
- Có thể dùng Kibana Discover và Dev Tools để kiểm tra mapping, document và DSL trong môi trường local.
- Cài API `POST /api/v1/events` và `/api/v1/events/bulk`.
- Viết integration test cho mapping và ingest.

**Điều kiện hoàn thành:**

- Elasticsearch chứa ít nhất 10.000 event.
- Có thể ingest thêm event qua Swagger.
- Query trực tiếp Elasticsearch trả đúng pattern đã seed.

### Ngày 3 - Thứ Tư, 03/06: SearchPlan, validator và compiler

**Mục tiêu:** tạo lõi an toàn trước khi nối LLM.

Việc cần làm:

- Định nghĩa Java record hoặc class `SearchPlan` với Bean Validation.
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
- Tạo LLM client có timeout, retry giới hạn và mock implementation.
- Parse JSON bằng Jackson và validate bằng Bean Validation; nếu sai schema, trả lỗi thân thiện hoặc repair tối đa một lần.
- Tạo endpoint `POST /api/v1/search`.
- Log câu hỏi gốc, `SearchPlan`, DSL và latency.
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

- Mở rộng `SearchPlan` cho aggregation:
  - `count`
  - `group_by`
  - `top_n`
  - `date_histogram`: minute, hour, day
- Compile và execute DSL aggregation.
- Chuẩn hóa response để frontend không phụ thuộc DSL.
- Viết test cho compiler và executor aggregation.
- Demo các câu:
  - "Đếm số lần login thất bại theo từng user trong 7 ngày qua"
  - "Top 10 IP có nhiều alert nhất tháng này"
  - "Số event theo giờ trong 24h qua"

**Điều kiện hoàn thành:**

- Ba câu demo aggregation trả đúng table data và chart metadata.
- DSL được hiển thị cho người dùng.

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
- Thêm demo identity đơn giản để ghi audit, ví dụ `demo-analyst`.
- Với bản host public, chuẩn bị một lớp bảo vệ bằng password ở reverse proxy; chưa cần RBAC production.

**Điều kiện hoàn thành:**

- Người dùng nhập câu tự nhiên, xem bảng, chuyển trang và mở raw log.
- Ba câu demo aggregation hiển thị bảng và chart đúng loại.
- Không cần Swagger để demo luồng search cơ bản.

### Ngày 7 - Chủ Nhật, 07/06: Summary, history, audit và CSV

**Mục tiêu:** kết thúc tuần một với full vertical slice.

Việc cần làm:

- Lưu recent history và audit log vào bảng `search_query_logs`.
- Lưu user, timestamp, câu hỏi, `SearchPlan`, DSL, mode, result count, latency, status và error nếu có.
- Hiển thị lịch sử truy vấn gần đây.
- Tạo payload summary nhỏ gọn:
  - tổng số event;
  - top user, host và IP;
  - phân bố severity;
  - tối đa một số sample event đã giới hạn.
- Gọi LLM để sinh summary 3-5 câu; có fallback summary deterministic nếu LLM lỗi.
- Làm export CSV có giới hạn dòng.
- Kiểm tra mọi endpoint bằng Swagger.

**Điều kiện hoàn thành:**

- Demo end-to-end đủ các mục chức năng của MVP trên máy local.
- LLM lỗi không làm hỏng kết quả search.
- CSV tải xuống và mở được.

### Ngày 8 - Thứ Hai, 08/06: Docker Compose production và EC2

**Mục tiêu:** deploy thủ công lần đầu khi vẫn còn gần một tuần sửa lỗi.

Việc cần làm:

- Tạo EC2 Ubuntu tại region phù hợp, khuyến nghị `t3.large`, EBS gp3 từ 30 GiB.
- Tạo Elastic IP và associate vào EC2.
- Tạo security group:
  - `22/tcp`: chỉ IP cá nhân nếu có thể;
  - `80/tcp`: internet;
  - `443/tcp`: internet.
- Cài Docker Engine và Docker Compose plugin.
- Thiết lập vĩnh viễn `vm.max_map_count=1048576`.
- Tạo `docker-compose.prod.yml`:
  - Elasticsearch, PostgreSQL dùng named volume;
  - frontend và backend chỉ bind loopback để Nginx trên host gọi;
  - có healthcheck;
  - container app có restart policy.
- Không bật Kibana mặc định trên VPS; profile `tools` chỉ dùng tạm khi debug và không expose public cổng `5601`.
- Cài Nginx trên host EC2 và tạo server block reverse proxy frontend cùng `/api`.
- Deploy thủ công lên EC2 và seed dataset.

**Điều kiện hoàn thành:**

- Truy cập được website qua Elastic IP.
- Elasticsearch và PostgreSQL không truy cập trực tiếp từ internet.
- Restart VPS không làm mất data.

### Ngày 9 - Thứ Ba, 09/06: Domain, HTTPS và smoke test VPS

**Mục tiêu:** có URL thật để mentor truy cập.

Việc cần làm:

- Trỏ DNS record `A` của domain hoặc subdomain về Elastic IP.
- Cài Certbot với Nginx plugin để lấy SSL certificate từ Let's Encrypt.
- Bảo vệ website demo bằng password tại reverse proxy hoặc cơ chế demo tương đương.
- Kiểm tra HTTPS, redirect HTTP -> HTTPS và API qua domain.
- Chạy seed data trên VPS.
- Viết script smoke test:
  - health live;
  - health ready;
  - một search;
  - một aggregation;
  - export CSV.

**Điều kiện hoàn thành:**

- Website truy cập bằng `https://<domain>`.
- Swagger truy cập được sau lớp password.
- Smoke test VPS pass.

### Ngày 10 - Thứ Tư, 10/06: Test suite và coverage

**Mục tiêu:** đạt yêu cầu test trước khi tự động hóa deploy.

Việc cần làm:

- Bổ sung unit test:
  - validator;
  - compiler search;
  - compiler aggregation;
  - chart response mapper;
  - summary payload builder;
  - CSV export limit.
- Bổ sung integration test với Elasticsearch và PostgreSQL.
- Mock LLM trong CI để test không tốn tiền và không phụ thuộc mạng.
- Chạy coverage, sửa các nhánh quan trọng chưa được test.
- Đặt coverage gate từ 50%, hướng tới 60%.

**Điều kiện hoàn thành:**

- Test local pass.
- Coverage backend đạt ít nhất 50%.
- Có báo cáo coverage đọc được.

### Ngày 11 - Thứ Năm, 11/06: GitHub Actions CI và GHCR

**Mục tiêu:** mọi push đều được kiểm tra và tạo image có version.

Việc cần làm:

- Tạo workflow CI chạy khi pull request và push:
  - backend lint;
  - backend unit + integration test;
  - coverage gate;
  - frontend lint;
  - frontend build.
- Tạo workflow build image khi merge hoặc push vào `main`.
- Login GHCR bằng `GITHUB_TOKEN`.
- Push image backend và frontend với tag commit SHA; có thể thêm tag `latest` cho tiện quan sát nhưng deploy bằng SHA.
- Không lưu secret trong repo hoặc workflow plaintext.

**Điều kiện hoàn thành:**

- Push code lên GitHub làm CI chạy xanh.
- GHCR có image backend và frontend gắn tag SHA.

### Ngày 12 - Thứ Sáu, 12/06: GitHub Actions CD lên VPS

**Mục tiêu:** deploy tự động và có đường rollback đơn giản.

Việc cần làm:

- Tạo GitHub Environment `production`.
- Thêm environment secrets:
  - `VPS_HOST`
  - `VPS_USER`
  - `VPS_SSH_KEY`
  - `DEPLOY_PATH`
- Lưu secret runtime trên VPS trong `.env.prod`, không đưa LLM API key vào GitHub nếu workflow không cần dùng:
  - `ELASTIC_PASSWORD`
  - `POSTGRES_PASSWORD`
  - `LLM_API_KEY`
  - `APP_SECRET_KEY`
  - demo access credential
- Nếu GHCR package private, cấu hình VPS login bằng token chỉ có `read:packages`. Nếu package public, pull image không cần token.
- CD qua SSH:
  - ghi tag SHA mới vào biến deploy;
  - `docker compose pull`;
  - `docker compose up -d`;
  - chạy smoke test;
  - giữ tag trước đó để rollback nếu smoke test fail.
- Test một deploy thật từ commit nhỏ.

**Điều kiện hoàn thành:**

- Merge hoặc push `main` tự deploy lên VPS.
- Website vẫn hoạt động sau deploy.
- Biết cách rollback về SHA trước.

### Ngày 13 - Thứ Bảy, 13/06: Hardening, tài liệu và diễn tập demo

**Mục tiêu:** biến project đang chạy thành project mentor có thể kiểm tra.

Việc cần làm:

- Chạy toàn bộ test và smoke test.
- Kiểm tra không lộ secret bằng `git grep`, lịch sử commit và GitHub Actions log.
- Kiểm tra container restart, volume, timeout và error message.
- Kiểm tra Nginx HTTPS và port exposure.
- Hoàn thiện README:
  - mục tiêu;
  - kiến trúc;
  - chạy local;
  - seed data;
  - chạy test;
  - deploy;
  - URL demo;
  - demo credential gửi riêng mentor.
- Chụp screenshot hoặc quay video dự phòng 3-5 phút.
- Diễn tập demo theo mục 10.

**Điều kiện hoàn thành:**

- Một người khác có thể đọc README và chạy local.
- Demo liên tục hai lần không lỗi.
- Có video dự phòng.

### Ngày 14 - Chủ Nhật, 14/06: Buffer sửa lỗi và gửi mentor

**Mục tiêu:** không thêm tính năng lớn, chỉ ổn định và bàn giao.

Việc cần làm:

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
  - danh sách chức năng hoàn thành;
  - hạn chế còn tồn tại;
  - câu hỏi cần mentor review.

**Điều kiện hoàn thành:**

- Gửi mentor trước cuối ngày `14/06/2026`.
- Không còn lỗi chặn luồng demo chính.

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

## 9. Kịch bản demo mentor 7-10 phút

1. Mở website HTTPS và giới thiệu schema event cùng dataset trên 10.000 dòng.
2. Search tiếng Anh: `"Show me failed login attempts from China in the last 24h"`.
3. Chỉ DSL được sinh, bảng kết quả, pagination và raw event detail.
4. Search tiếng Việt: `"Tìm alert critical trong 7 ngày qua"`.
5. Aggregation: `"Top 10 IP có nhiều alert nhất tháng này"`.
6. Chỉ bar chart và bảng.
7. Aggregation time-series: `"Số event theo giờ trong 24h qua"`.
8. Chỉ line chart, summary LLM 3-5 câu và export CSV.
9. Chỉ query history và audit log.
10. Mở Swagger, GitHub Actions xanh và giải thích deploy tự động lên EC2.

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
- [ ] Elasticsearch `9200` không public.
- [ ] PostgreSQL `5432` không public.
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
| CI integration test chậm | Workflow timeout | Seed dataset nhỏ hơn cho CI, dataset 10.000 chỉ dùng demo |
| Deploy lỗi sát deadline | Website down | Deploy thủ công ngày 8, CD ngày 12, giữ tag SHA trước để rollback |
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
