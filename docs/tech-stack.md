# Tech Stack - SOC AI Event Search

## 1. Tổng quan

Đề tài: **Xây dựng tính năng Tìm kiếm Event bằng AI cho SOC Platform**.

Mục tiêu của giai đoạn MVP là xây dựng một hệ thống có thể:

- Ingest và lưu trữ event SOC.
- Nhận câu hỏi tìm kiếm hoặc thống kê bằng tiếng Việt và tiếng Anh.
- Dùng LLM chuyển câu hỏi tự nhiên thành kế hoạch truy vấn có cấu trúc.
- Validate kế hoạch truy vấn và compile thành Elasticsearch Query DSL.
- Hiển thị kết quả tìm kiếm, biểu đồ thống kê, summary, query history và audit log.
- Đóng gói bằng Docker Compose, deploy lên VPS DigitalOcean và truy cập qua domain HTTPS.

## 2. Tech stack đã chọn

| Thành phần | Công nghệ | Trạng thái | Vai trò |
| --- | --- | --- | --- |
| Architecture | Modular Monolith | Đã chọn | Một Spring Boot application, phân module nội bộ rõ ràng và deploy như một đơn vị |
| Frontend | React + TypeScript + Vite + Tailwind CSS + shadcn/ui | Đã chọn | Search box, bảng kết quả, event detail, chart, query history |
| Backend | Java 21 + Spring Boot 3 | Đã chọn | REST API, business logic, validation, audit log, tích hợp Elasticsearch và LLM |
| Search Engine | Elasticsearch `9.4.2` Basic self-managed | Đã chọn | Full-text search, filter, aggregation và lưu event |
| Database | PostgreSQL self-managed + Flyway | Đã chọn | Lưu query history, application audit log và dữ liệu ứng dụng |
| Local Data Tools | pgAdmin Desktop + Kibana `9.4.2` | Tùy chọn khi phát triển | Xem PostgreSQL và debug Elasticsearch; không thay thế frontend |
| API Docs | Swagger/OpenAPI | Đã chọn | Sinh tài liệu và thử REST API |
| Deployment | Docker Compose | Đã chọn | Chạy local và deploy trên một VPS |
| CI/CD | GitHub Actions | Đã chọn | Test, build Docker image và deploy |
| Hosting | DigitalOcean Droplet Ubuntu + domain HTTPS | Đã chọn | Host bản demo cho mentor truy cập |
| Reverse Proxy | Caddy | Đã chọn | Reverse proxy public `80/443`, tự cấp và gia hạn HTTPS bằng Let's Encrypt |
| AI | Cloud LLM API hoặc Local LLM qua API | Chưa chốt | Chuyển natural language thành `SearchPlan`, hỗ trợ summary |
| Auth | Spring Security JWT hoặc Keycloak/OIDC | Chưa chốt | Xác thực người dùng và ghi nhận danh tính trong audit log |

Quyết định chi tiết về Elasticsearch được ghi tại [search-engine-decision.md](./search-engine-decision.md).

## 3. Frontend

### Công nghệ

- React.
- TypeScript.
- Vite.
- Tailwind CSS để styling nhanh và nhất quán.
- shadcn/ui để dùng các component UI có thể chỉnh sửa trực tiếp trong source code.
- Recharts hoặc Apache ECharts cho bar chart, pie chart và time-series line chart.

shadcn/ui không phải một UI library đóng gói cần import toàn bộ vào ứng dụng. CLI thêm source code của từng component cần dùng vào frontend. Trong MVP chỉ thêm component phục vụ màn hình thực tế, ví dụ `Button`, `Card`, `Badge`, `Input`, `Table`, `Dialog` và `Pagination`; không sinh hàng loạt component chưa dùng.

Tài liệu cài đặt: [Tailwind CSS với Vite](https://tailwindcss.com/docs/installation) và [shadcn/ui cho existing Vite project](https://ui.shadcn.com/docs/installation/vite).

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
- Flyway cho database migration.
- Springdoc OpenAPI để sinh Swagger UI.
- JUnit 5, Mockito, MockMvc và smoke script PowerShell cho test/checkpoint MVP.

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
- Kibana `9.4.2` chạy tùy chọn bằng Docker Compose profile `tools` khi cần debug local.

### Vai trò

- Lưu trữ event.
- Full-text search trên `message`.
- Filter theo thời gian, severity, event type, user, host, IP và country code.
- Aggregation: `COUNT`, `GROUP BY`, `TOP N`, bucket theo phút, giờ và ngày.

### Quy mô dataset

- Khi phát triển local, seed mặc định `10.000` event document để chạy nhẹ máy.
- Script sinh dữ liệu phải nhận tham số số lượng và seed theo batch bằng Elasticsearch Bulk API.
- Trước buổi bảo vệ hội đồng, seed vài triệu event document trên môi trường demo và đo lại disk, RAM cùng latency truy vấn.
- PostgreSQL không lưu các event này; PostgreSQL chỉ lưu metadata ứng dụng như query history và audit log.

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
- Flyway.

### Dữ liệu lưu trong PostgreSQL

- Bảng `search_query_logs` cho query history, application audit log và export lại theo `query_id`.
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

### Công cụ quan sát local

- Dùng pgAdmin Desktop trên máy cá nhân khi cần xem schema, table hoặc chạy SQL. Không thêm pgAdmin vào Docker Compose mặc định và không deploy pgAdmin public trên VPS.
- Với import dữ liệu PostgreSQL số lượng lớn, ưu tiên lệnh [`COPY`](https://www.postgresql.org/docs/current/sql-copy.html) thay vì thao tác tay qua UI.
- Dữ liệu event SOC số lượng lớn không đi vào PostgreSQL; dùng Elasticsearch Bulk API để seed vào `soc-events-v1`.

### Quyết định MVP

MVP dùng PostgreSQL self-managed trong Docker Compose cùng Flyway. Không dùng Supabase trong giai đoạn này vì chỉ cần một bảng ứng dụng và muốn giữ local, VPS, CI/CD cùng một cách chạy. Có thể đánh giá PostgreSQL managed, AWS RDS hoặc Supabase managed sau MVP nếu cần giảm công vận hành.

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
- DigitalOcean Droplet Ubuntu.
- Domain mua tại Name.com, trỏ DNS record `A` về public IPv4 của Droplet.
- Caddy reverse proxy public `80/443`.
- HTTPS do Caddy tự cấp và gia hạn bằng Let's Encrypt.
- GitHub Actions CI/CD.
- CD qua SSH vào VPS, `git fetch/reset` về `origin/main` và rebuild Docker Compose.

Production MVP hiện dùng các domain:

```text
https://soc-ai-search.app       -> frontend
https://api.soc-ai-search.app   -> backend API
https://auth.soc-ai-search.app  -> Keycloak
```

Luồng deploy hiện tại:

```text
Push code to GitHub
  |
GitHub Actions CI
  |-- Run backend tests
  |-- Run frontend tests/lint/build
  |-- Validate Docker Compose config
  |
GitHub Actions CD
  |-- SSH to DigitalOcean Droplet
  |-- git fetch/reset to origin/main
  |-- docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy up -d --build
  |-- smoke check public domains
  |
Caddy HTTPS domains
```

Chỉ expose các port cần thiết:

- `22`: SSH, giới hạn theo IP cá nhân nếu có thể.
- `80`: HTTP challenge/redirect cho Caddy.
- `443`: HTTPS public.

Không expose trực tiếp:

- Frontend container port `3000`.
- Backend container port `8081`.
- Keycloak container port `8082`.
- Elasticsearch `9200`.
- PostgreSQL `5432/5433`.
- Kibana `5601`.
- Local LLM API nếu có.

Secrets như database password, Keycloak admin password, JWT/OIDC config và LLM API key không được commit vào Git. Dùng `.env` trên VPS và GitHub Actions secrets cho pipeline.

Lưu ý: `frontend/nginx.conf` vẫn có thể tồn tại bên trong container frontend để serve static React assets hoặc proxy nội bộ trong local Docker. Đây không phải reverse proxy host-level của production; production public edge hiện là Caddy.
## 11. Testing

### Công cụ

- JUnit 5.
- Mockito.
- MockMvc.
- Smoke script PowerShell chạy trên Docker Compose local.
- JaCoCo.

### Mục tiêu

- Unit test cho `SearchPlan` validator và compiler.
- Smoke/integration-style test cho PostgreSQL và Elasticsearch thông qua Docker Compose local trong MVP.
- Mock LLM trong test.
- Test API ingest, search, aggregation, history và CSV export.
- Coverage tối thiểu 50% theo yêu cầu MVP; đặt mục tiêu 60% để có khoảng an toàn.

MVP ưu tiên unit test, controller test và smoke script trên Docker Compose local để giữ phạm vi test gọn, dễ chạy trên máy phát triển và phù hợp timeline 2 tuần.

## 12. Quyết định MVP tóm tắt

| Hạng mục | Quyết định MVP |
| --- | --- |
| Architecture | Modular Monolith |
| Frontend | React + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| Backend | Java 21 + Spring Boot 3 |
| Search | Elasticsearch `9.4.2` Basic self-managed; Kibana `9.4.2` tùy chọn cho local debug |
| Database | PostgreSQL self-managed + Flyway; pgAdmin Desktop tùy chọn cho local debug |
| API docs | Springdoc OpenAPI + Swagger UI |
| AI | Interface `LlmClient`; Cloud API với dữ liệu synthetic hoặc đã ẩn danh; sẵn đường chuyển Local LLM |
| Auth | Spring Security JWT tối giản; nâng cấp Keycloak/OIDC sau MVP nếu cần |
| Deploy | Docker Compose + GitHub Actions + DigitalOcean Droplet + Caddy + Name.com domain HTTPS |

## 13. Việc cần xác nhận với mentor

Trước khi dùng dữ liệu SOC thật, cần hỏi mentor:

1. Có được gửi bất kỳ phần nào của event hoặc kết quả thống kê ra Cloud LLM API không?
2. Có yêu cầu bắt buộc chạy Local LLM trong mạng nội bộ không?
3. Có hệ thống SSO hoặc Keycloak sẵn để tích hợp không?
4. Có yêu cầu RBAC cụ thể cho analyst không?
5. Bản demo public cần mở cho internet hay chỉ whitelist IP?

