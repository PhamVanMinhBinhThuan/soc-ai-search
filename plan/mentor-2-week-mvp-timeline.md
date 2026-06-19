# Kế hoạch 2 tuần hoàn thiện MVP SOC AI Search

## 1. Mục tiêu

Hoàn thiện bản MVP cho đề tài **"Xây dựng tính năng Tìm kiếm Event bằng AI cho SOC Platform"** trong 14 ngày, có thể demo end-to-end và deploy lên VPS DigitalOcean.

Phạm vi chỉ tập trung vào các chức năng MVP:

- Ingest và lưu trữ event.
- Tìm kiếm và thống kê bằng ngôn ngữ tự nhiên.
- Sinh, hiển thị và thực thi Elasticsearch Query DSL.
- Bảng kết quả, pagination, event detail, biểu đồ và export CSV.
- AI summarization 3-5 câu.
- Query history và audit log.
- Đăng nhập và phân quyền RBAC bằng Keycloak với role `SOC_VIEWER`, `SOC_ANALYST`, `SOC_ADMIN`.
- Swagger/OpenAPI, Docker Compose, test coverage tối thiểu 50%.
- CI/CD GitHub Actions và deploy VPS để có thể truy cập bản demo.

CI/CD, VPS DigitalOcean, domain và HTTPS là hạ tầng bàn giao bản demo, không phải chức năng khuyến khích của sản phẩm.

## 2. Data Model MVP

### Elasticsearch

Event SOC được lưu trong index `soc-events-v1`.

| Field | Mục đích |
| --- | --- |
| `timestamp` | Filter thời gian, time bucket |
| `source` | Nguồn event |
| `severity` | Filter và thống kê mức độ |
| `event_type` | Filter loại event |
| `user` | Filter và top user |
| `host` | Filter và top host |
| `ip` | Filter và top IP |
| `message` | Full-text search |
| `raw` | Xem chi tiết raw log |
| `country_code` | Bổ sung để demo tìm kiếm theo quốc gia |

### PostgreSQL

MVP chỉ cần một bảng `search_query_logs` để phục vụ recent history, audit log và export lại theo `query_id`.

Thông tin chính được lưu:

- User thực hiện truy vấn.
- Câu hỏi gốc.
- `SearchPlan` đã validate.
- Elasticsearch Query DSL đã compile.
- Loại query: search hoặc aggregation.
- Số kết quả, latency, trạng thái, lỗi nếu có.
- Summary và thời điểm truy vấn.

Không tạo bảng user riêng trong app. User, đăng nhập và role được quản lý bởi Keycloak; PostgreSQL chỉ lưu identity từ JWT vào audit/history.

### Công cụ hỗ trợ local

- PostgreSQL chạy self-managed trong Docker Compose và quản lý schema bằng Flyway. Dùng pgAdmin Desktop khi cần xem database; không thêm pgAdmin vào stack mặc định.
- Kibana `9.4.2` chỉ là công cụ debug Elasticsearch tùy chọn qua Docker Compose profile `tools`. Kibana không thay thế frontend React và không bật public trên VPS.

## 3. Timeline 2 Tuần

### Tuần 1 - Data Model, Backend Core và Frontend MVP

| Ngày | Công việc trọng tâm | Kết quả cần đạt |
| --- | --- | --- |
| Ngày 1 | Chốt kiến trúc monolith, thiết kế Elasticsearch mapping và bảng PostgreSQL; tạo skeleton Spring Boot, React, Tailwind CSS, shadcn/ui và Docker Compose | Project chạy local, health API và Swagger hoạt động |
| Ngày 2 | Hoàn thiện mapping, migration PostgreSQL, pipeline ingest và script sinh event có tham số số lượng; seed mặc định 10.000 event local | Có dataset local nhẹ máy và ingest API |
| Ngày 3 | Xây dựng search API: filter thời gian, severity, event type, user, host, IP; pagination và event detail … (tùy vào schema thiết kế) | Search cơ bản chạy đúng trên Elasticsearch |
| Ngày 4 | Tích hợp LLM: natural language -> `SearchPlan` -> validate -> Elasticsearch DSL | Tìm kiếm bằng câu hỏi Việt/Anh, hiển thị DSL đã sinh |
| Ngày 5 | Xây dựng aggregation API: `COUNT`, `GROUP BY`, `TOP N`, time bucket phút/giờ/ngày | Các truy vấn thống kê trả đúng dữ liệu |
| Ngày 6 | Xây dựng frontend bằng Tailwind CSS và shadcn/ui: search box, bảng kết quả, pagination, event detail, bảng thống kê và biểu đồ | Demo được search và aggregation trên giao diện |
| Ngày 7 | Bổ sung AI summary, query history, audit log và export CSV; tích hợp toàn bộ luồng local | MVP chạy end-to-end trên máy local |

### Tuần 2 - Auth/RBAC, Testing, Deployment và Hoàn thiện Demo

| Ngày | Công việc trọng tâm | Kết quả cần đạt |
| --- | --- | --- |
| Ngày 8 | Tích hợp Keycloak foundation: realm/client/roles, Spring Security Resource Server, frontend login/logout; tắt self-registration | Đăng nhập được, API protected trả 401 nếu chưa login |
| Ngày 9 | Hoàn thiện RBAC và UI permission cho 3 role `SOC_VIEWER`, `SOC_ANALYST`, `SOC_ADMIN`; audit/history lấy identity từ JWT | 3 role demo hoạt động khác nhau và có smoke test |
| Ngày 10 | Viết unit/integration/regression test cho ingest, search, aggregation, audit, export và RBAC | Coverage backend đạt tối thiểu 50%, frontend lint/build pass |
| Ngày 11 | Deploy đơn giản trong 1 ngày: production Docker Compose, DigitalOcean VPS, Caddy HTTPS, Keycloak, seed dataset và GitHub Actions CI/CD cơ bản | Website HTTPS truy cập được, login hoạt động, push/deploy được hoặc có lệnh deploy ngắn gọn |
| Ngày 12 | Hardening, kiểm tra secret/port/volume/restart, smoke test domain và hoàn thiện README deploy/Auth | Bản demo public ổn định, có tài liệu chạy và rollback |
| Ngày 13 | Viết report, slide, chụp screenshot và quay video dự phòng | Có report/slide draft và kịch bản demo 7-10 phút |
| Ngày 14 | Diễn tập demo, buffer sửa lỗi, tạo release và gửi mentor | Bàn giao link GitHub, URL demo, credential riêng, report/slide draft |

## 4. Kết quả Bàn Giao

- Source code trên GitHub.
- Website demo qua domain HTTPS.
- Dataset local và demo mentor từ `10.000` event document.
- Script seed có tham số số lượng để nạp vài triệu event document trước buổi bảo vệ hội đồng.
- Swagger/OpenAPI.
- Docker Compose local và production.
- GitHub Actions CI/CD.
- Keycloak login/RBAC demo.
- Test coverage backend tối thiểu 50%.
- README hướng dẫn chạy và kịch bản demo.

## 5. Ngoài Phạm Vi 2 Tuần

Các chức năng khuyến khích như multi-turn, semantic search, hybrid search, anomaly detection, dashboard nâng cao, Kubernetes và monitoring chưa nằm trong timeline MVP. Chỉ xem xét sau khi bản bắt buộc đã ổn định.

