# Kế hoạch 2 tuần hoàn thiện MVP SOC AI Search

## 1. Mục tiêu

Hoàn thiện bản MVP cho đề tài **"Xây dựng tính năng Tìm kiếm Event bằng AI cho SOC Platform"** trong 14 ngày, có thể demo end-to-end và deploy lên VPS AWS.

Phạm vi chỉ tập trung vào các chức năng MVP:

- Ingest và lưu trữ event.
- Tìm kiếm và thống kê bằng ngôn ngữ tự nhiên.
- Sinh, hiển thị và thực thi Elasticsearch Query DSL.
- Bảng kết quả, pagination, event detail, biểu đồ và export CSV.
- AI summarization 3-5 câu.
- Query history và audit log.
- Swagger/OpenAPI, Docker Compose, test coverage tối thiểu 50%.
- CI/CD GitHub Actions và deploy VPS để có thể truy cập bản demo.

CI/CD, VPS AWS, domain và HTTPS là hạ tầng bàn giao bản demo, không phải chức năng khuyến khích của sản phẩm.

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

Chưa cần bảng user riêng vì auth đầy đủ không thuộc phạm vi MVP.

## 3. Timeline 2 Tuần

### Tuần 1 - Data Model, Backend Core và Frontend MVP

| Ngày | Công việc trọng tâm | Kết quả cần đạt |
| --- | --- | --- |
| Ngày 1 | Chốt kiến trúc monolith, thiết kế Elasticsearch mapping và bảng PostgreSQL; tạo skeleton Spring Boot, React và Docker Compose | Project chạy local, health API và Swagger hoạt động |
| Ngày 2 | Hoàn thiện mapping, migration PostgreSQL, pipeline ingest và script sinh tối thiểu (10.000 - vài triệu event) event mẫu | Có dataset demo và ingest API |
| Ngày 3 | Xây dựng search API: filter thời gian, severity, event type, user, host, IP; pagination và event detail … (tùy vào schema thiết kế) | Search cơ bản chạy đúng trên Elasticsearch |
| Ngày 4 | Tích hợp LLM: natural language -> `SearchPlan` -> validate -> Elasticsearch DSL | Tìm kiếm bằng câu hỏi Việt/Anh, hiển thị DSL đã sinh |
| Ngày 5 | Xây dựng aggregation API: `COUNT`, `GROUP BY`, `TOP N`, time bucket phút/giờ/ngày | Các truy vấn thống kê trả đúng dữ liệu |
| Ngày 6 | Xây dựng frontend: search box, bảng kết quả, pagination, event detail, bảng thống kê và biểu đồ | Demo được search và aggregation trên giao diện |
| Ngày 7 | Bổ sung AI summary, query history, audit log và export CSV; tích hợp toàn bộ luồng local | MVP chạy end-to-end trên máy local |

### Tuần 2 - Testing, Deployment và Hoàn thiện Demo

| Ngày | Công việc trọng tâm | Kết quả cần đạt |
| --- | --- | --- |
| Ngày 8 | Tạo cấu hình production Docker Compose; chuẩn bị EC2 Ubuntu, Nginx và volume dữ liệu | Deploy thủ công được lên VPS |
| Ngày 9 | Trỏ domain, cấu hình SSL bằng Certbot, seed dataset và chạy smoke test | Website HTTPS truy cập được |
| Ngày 10 | Viết unit test và integration test cho ingest, search, aggregation, audit và export | Coverage backend đạt tối thiểu 50% |
| Ngày 11 | Hoàn thiện Swagger/OpenAPI, README và GitHub Actions CI | Push code chạy test và build tự động |
| Ngày 12 | Cấu hình GitHub Actions CD deploy lên EC2 | Push `main` có thể cập nhật bản demo |
| Ngày 13 | Test end-to-end, kiểm tra lỗi, dữ liệu sau restart và diễn tập demo | Luồng demo ổn định |
| Ngày 14 | Buffer sửa lỗi, chốt tài liệu, tạo release và gửi mentor | Bàn giao link GitHub và URL demo |

## 4. Kết quả Bàn Giao

- Source code trên GitHub.
- Website demo qua domain HTTPS.
- Dataset mẫu từ 10.000 event.
- Swagger/OpenAPI.
- Docker Compose local và production.
- GitHub Actions CI/CD.
- Test coverage backend tối thiểu 50%.
- README hướng dẫn chạy và kịch bản demo.

## 5. Ngoài Phạm Vi 2 Tuần

Các chức năng khuyến khích như multi-turn, semantic search, hybrid search, anomaly detection, dashboard nâng cao, Kubernetes và monitoring chưa nằm trong timeline MVP. Chỉ xem xét sau khi bản bắt buộc đã ổn định.
