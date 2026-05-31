# Tech Stack - SOC AI Event Search

## 1. Tổng quan

Đề tài: **Xây dựng tính năng Tìm kiếm Event bằng AI cho SOC Platform**.

Mục tiêu của giai đoạn MVP là xây dựng một hệ thống có thể:

- Ingest và lưu trữ event SOC.
- Nhận câu hỏi tìm kiếm hoặc thống kê bằng tiếng Việt và tiếng Anh.
- Dùng LLM chuyển câu hỏi tự nhiên thành kế hoạch truy vấn có cấu trúc.
- Validate kế hoạch truy vấn và compile thành Elasticsearch Query DSL.
- Hiển thị kết quả tìm kiếm, biểu đồ thống kê, summary, query history và audit log.
- Đóng gói bằng Docker Compose, deploy lên VPS AWS và truy cập qua domain HTTPS.

## 2. Tech stack đã chọn

| Thành phần | Công nghệ | Trạng thái | Vai trò |
| --- | --- | --- | --- |
| Frontend | React + TypeScript | Đã chọn | Search box, bảng kết quả, event detail, chart, query history |
| Backend | Java 21 + Spring Boot 3 | Đã chọn | REST API, business logic, validation, audit log, tích hợp Elasticsearch và LLM |
| Search Engine | Elasticsearch Basic self-managed | Đã chọn | Full-text search, filter, aggregation và lưu event |
| Database | PostgreSQL | Đã chọn | Lưu query history, application audit log và dữ liệu ứng dụng |
| API Docs | Swagger/OpenAPI | Đã chọn | Sinh tài liệu và thử REST API |
| Deployment | Docker Compose | Đã chọn | Chạy local và deploy trên một VPS |
| CI/CD | GitHub Actions | Đã chọn | Test, build Docker image và deploy |
| Hosting | AWS EC2 VPS + domain + HTTPS | Đã chọn | Host bản demo cho mentor truy cập |
| AI | Cloud LLM API hoặc Local LLM qua API | Chưa chốt | Chuyển natural language thành `SearchPlan`, hỗ trợ summary |
| Auth | Spring Security JWT hoặc Keycloak/OIDC | Chưa chốt | Xác thực người dùng và ghi nhận danh tính trong audit log |

Quyết định chi tiết về Elasticsearch được ghi tại [search-engine-decision.md](./search-engine-decision.md).

## 3. Frontend

### Công nghệ

- React.
- TypeScript.
- Vite.
- Recharts hoặc Apache ECharts cho bar chart, pie chart và time-series line chart.

### Trách nhiệm

- Nhập câu hỏi tự nhiên.
- Hiển thị summary 3-5 câu.
- Hiển thị Query DSL đã được backend compile để đảm bảo transparency.
- Hiển thị bảng kết quả có pagination.
- Hiển thị chi tiết event và raw log.
- Hiển thị bảng thống kê và biểu đồ phù hợp.
- Export CSV.
- Hiển thị lịch sử truy vấn gần đây.

Frontend không gọi trực tiếp Elasticsearch hoặc LLM API. Mọi request đi qua backend.

## 4. Backend

### Công nghệ

- Java 21.
- Spring Boot 3.
- Spring Web.
- Spring Validation.
- Spring Data Elasticsearch hoặc Elasticsearch Java API Client.
- Spring Data JPA.
- PostgreSQL Driver.
- Flyway hoặc Liquibase cho database migration.
- Springdoc OpenAPI để sinh Swagger UI.
- JUnit 5, Mockito và Testcontainers cho test.

### Trách nhiệm

- Cung cấp REST API ingest, search, history, export CSV và audit log.
- Gọi LLM để chuyển câu hỏi thành `SearchPlan` JSON.
- Validate `SearchPlan` bằng schema và allowlist.
- Compile `SearchPlan` thành Elasticsearch Query DSL.
- Thực thi query trên Elasticsearch.
- Tổng hợp dữ liệu ngắn gọn trước khi gọi LLM sinh summary.
- Lưu query history và audit log vào PostgreSQL.
- Không để LLM gửi Query DSL tùy ý trực tiếp vào Elasticsearch.

Luồng xử lý chính:

```text
React
  |
Spring Boot REST API
  |-- Natural language -> LLM -> SearchPlan JSON
  |-- Validate SearchPlan
  |-- Compile SearchPlan -> Elasticsearch Query DSL
  |-- Execute search or aggregation
  |-- Save history + audit log to PostgreSQL
  |
Elasticsearch
```

## 5. Search Engine

### Công nghệ

- Elasticsearch Basic self-managed.
- Elasticsearch Query DSL.

### Vai trò

- Lưu trữ event.
- Full-text search trên `message`.
- Filter theo thời gian, severity, event type, user, host, IP và country code.
- Aggregation: `COUNT`, `GROUP BY`, `TOP N`, bucket theo phút, giờ và ngày.

Schema event tối thiểu:

| Field | Kiểu Elasticsearch |
| --- | --- |
| `timestamp` | `date` |
| `source` | `keyword` |
| `severity` | `keyword` |
| `event_type` | `keyword` |
| `user` | `keyword` |
| `host` | `keyword` |
| `ip` | `ip` |
| `country_code` | `keyword` |
| `message` | `text` |
| `raw` | Không index, chỉ giữ trong `_source` |

## 6. Database

### Công nghệ

- PostgreSQL.

### Dữ liệu lưu trong PostgreSQL

- Query history.
- Application audit log.
- Thông tin user nếu MVP dùng auth nội bộ.
- Metadata của saved query nếu bổ sung sau MVP.

Audit log ứng dụng tối thiểu gồm:

- User.
- Thời điểm truy vấn.
- Câu hỏi gốc.
- `SearchPlan`.
- Elasticsearch Query DSL đã compile.
- Loại query: search hoặc aggregation.
- Số lượng kết quả.
- Latency.
- Trạng thái thành công hoặc thất bại.

Không dùng PostgreSQL để lưu toàn bộ event SOC. Event thuộc về Elasticsearch.

## 7. Swagger/OpenAPI

### Công nghệ

- Springdoc OpenAPI.
- Swagger UI.

Swagger dùng để:

- Mô tả REST API.
- Test ingest event.
- Test search và aggregation.
- Kiểm tra response trước khi nối frontend.

Trong bản deploy public, Swagger phải nằm sau lớp xác thực hoặc chỉ bật trong môi trường cần demo.

## 8. AI: quyết định còn mở

### Câu hỏi cần giải quyết

Event SOC có thể chứa dữ liệu nhạy cảm như:

- IP nội bộ và hostname.
- Username.
- Nội dung raw log.
- Security alert.
- Dấu hiệu tấn công và thông tin hạ tầng.

Vì vậy, **không nên mặc định gửi raw event hoặc toàn bộ kết quả tìm kiếm ra Cloud LLM API**. OWASP liệt kê sensitive information disclosure là một rủi ro quan trọng của ứng dụng LLM và khuyến nghị sanitization, giới hạn dữ liệu đưa vào model cùng kiểm soát truy cập chặt chẽ: [OWASP LLM02: Sensitive Information Disclosure](https://genai.owasp.org/llmrisk/llm022025-sensitive-information-disclosure/).

### Phương án A: Cloud LLM API

**Ưu điểm**

- Tích hợp nhanh.
- Chất lượng NL -> Query thường tốt.
- Không cần VPS GPU.
- Phù hợp hoàn thành MVP trong thời gian ngắn.

**Rủi ro**

- Dữ liệu gửi ra khỏi hệ thống.
- Cần kiểm tra chính sách lưu trữ, xử lý dữ liệu, training, data residency và thỏa thuận với nhà cung cấp.
- Không phù hợp nếu quy định nội bộ cấm đưa log SOC ra bên ngoài.

**Cách dùng phù hợp cho MVP**

- Chỉ dùng dataset synthetic hoặc dữ liệu demo đã ẩn danh.
- Với NL -> Query, chỉ gửi câu hỏi người dùng, schema cho phép và một số ví dụ; không cần gửi raw event.
- Với summary, backend tự aggregate trước, loại bỏ hoặc mask IP, username, hostname và chỉ gửi thống kê cần thiết.
- Không log API key hoặc prompt chứa dữ liệu nhạy cảm.
- Chỉ dùng Cloud API với dữ liệu thật khi mentor hoặc đơn vị phụ trách bảo mật phê duyệt.

### Phương án B: Local LLM qua API nội bộ

**Ưu điểm**

- Dữ liệu không rời khỏi hạ tầng kiểm soát.
- Phù hợp hơn khi xử lý event SOC thật.
- Có thể áp dụng chính sách mạng và audit nội bộ.

**Rủi ro**

- Cần thêm RAM, GPU hoặc máy inference riêng.
- Tốn thời gian vận hành model.
- Chất lượng tiếng Việt và NL -> Query cần được kiểm thử.

### Khuyến nghị

Cho giai đoạn MVP:

1. Tạo interface `LlmClient` trong backend để có thể đổi provider.
2. Dùng Cloud LLM API với **dataset synthetic hoặc đã ẩn danh** để hoàn thành demo nhanh.
3. Không gửi raw log ra ngoài.
4. Tạo mock LLM để chạy test và local development không phụ thuộc API key.
5. Thiết kế cấu hình để chuyển sang Local LLM API khi dùng dữ liệu SOC thật.

Ví dụ cấu hình:

```yaml
app:
  llm:
    provider: cloud # cloud | local | mock
    base-url: ${LLM_BASE_URL}
    api-key: ${LLM_API_KEY:}
    model: ${LLM_MODEL}
```

## 9. Auth: quyết định còn mở

### Làm rõ JWT và Keycloak

`JWT` là định dạng token. `Keycloak` là hệ thống Identity and Access Management, có thể đăng nhập người dùng và phát hành JWT theo OAuth 2.0/OpenID Connect. Đây không phải hai khái niệm loại trừ nhau.

### Phương án A: Spring Security + JWT nội bộ

**Ưu điểm**

- Nhanh triển khai cho MVP.
- Ít container và ít cấu hình.
- Đủ để định danh analyst và ghi audit log.

**Nhược điểm**

- Backend phải quản lý user, password hash, refresh token và revoke token nếu triển khai đầy đủ.
- Không nên tự mở rộng thành hệ thống IAM production.

### Phương án B: Keycloak + Spring Security Resource Server

**Ưu điểm**

- Có đăng nhập, quản lý user, role và token tập trung.
- Phù hợp hơn nếu mở rộng RBAC hoặc tích hợp SSO.
- Spring Boot có thể validate JWT từ OIDC issuer.

**Nhược điểm**

- Thêm container, cấu hình realm, client, role và vận hành.
- Tăng khối lượng công việc cho MVP trong khi đề bài không bắt buộc auth đầy đủ.

Tài liệu tham khảo: [Keycloak documentation](https://www.keycloak.org/documentation) và [Spring Security OAuth2 Resource Server JWT](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html).

### Khuyến nghị

- Bản MVP public trên VPS vẫn cần lớp bảo vệ truy cập.
- Dùng Spring Security với một demo user và JWT nội bộ nếu cần hoàn thành nhanh.
- Thiết kế backend để có thể chuyển sang OIDC Resource Server và Keycloak sau MVP.
- Không dành quá nhiều thời gian làm registration, forgot password hoặc social login vì không thuộc phạm vi đồ án.

## 10. Deployment

### Thành phần

- Docker Compose.
- AWS EC2 VPS.
- Domain trỏ bằng DNS record `A`.
- Caddy hoặc Nginx làm reverse proxy.
- HTTPS.
- GitHub Actions CI/CD.
- GitHub Container Registry (`ghcr.io`) hoặc Docker Hub.

Luồng deploy:

```text
Push code to GitHub
  |
GitHub Actions
  |-- Run backend tests
  |-- Run frontend build
  |-- Build Docker images
  |-- Push images to registry
  |-- SSH to AWS EC2
  |-- docker compose pull
  |-- docker compose up -d
  |
Domain HTTPS
```

Chỉ expose các port cần thiết:

- `22`: SSH, giới hạn theo IP cá nhân nếu có thể.
- `80`: HTTP để redirect hoặc cấp certificate.
- `443`: HTTPS.

Không expose trực tiếp:

- Elasticsearch `9200`.
- PostgreSQL `5432`.
- Local LLM API nếu có.

Secrets như database password, Elasticsearch password, JWT secret và LLM API key không được commit vào Git. Dùng `.env` trên VPS và GitHub Actions secrets cho pipeline.

## 11. Testing

### Công cụ

- JUnit 5.
- Mockito.
- Testcontainers.
- JaCoCo.

### Mục tiêu

- Unit test cho `SearchPlan` validator và compiler.
- Integration test cho PostgreSQL và Elasticsearch.
- Mock LLM trong test.
- Test API ingest, search, aggregation, history và CSV export.
- Coverage tối thiểu 50% theo yêu cầu MVP; đặt mục tiêu 60% để có khoảng an toàn.

## 12. Quyết định MVP tóm tắt

| Hạng mục | Quyết định MVP |
| --- | --- |
| Frontend | React + TypeScript |
| Backend | Java 21 + Spring Boot 3 |
| Search | Elasticsearch Basic self-managed |
| Database | PostgreSQL |
| API docs | Springdoc OpenAPI + Swagger UI |
| AI | Interface `LlmClient`; Cloud API với dữ liệu synthetic hoặc đã ẩn danh; sẵn đường chuyển Local LLM |
| Auth | Spring Security JWT tối giản; nâng cấp Keycloak/OIDC sau MVP nếu cần |
| Deploy | Docker Compose + GitHub Actions + AWS EC2 + domain HTTPS |

## 13. Việc cần xác nhận với mentor

Trước khi dùng dữ liệu SOC thật, cần hỏi mentor:

1. Có được gửi bất kỳ phần nào của event hoặc kết quả thống kê ra Cloud LLM API không?
2. Có yêu cầu bắt buộc chạy Local LLM trong mạng nội bộ không?
3. Có hệ thống SSO hoặc Keycloak sẵn để tích hợp không?
4. Có yêu cầu RBAC cụ thể cho analyst không?
5. Bản demo public cần mở cho internet hay chỉ whitelist IP?
