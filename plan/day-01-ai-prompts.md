# Prompt triển khai Ngày 1 - SOC AI Search MVP

## 1. Cách sử dụng

Ngày 1 nên chia thành **8 prompt cho AI coding agent** và **2 checklist thao tác thủ công**.

Không gửi toàn bộ task ngày 1 trong một prompt lớn. Sau mỗi prompt:

1. Đọc phần tóm tắt thay đổi của AI.
2. Kiểm tra các file được tạo hoặc sửa.
3. Chạy lệnh verify mà AI báo cáo.
4. Chỉ chuyển sang prompt tiếp theo khi checkpoint đã đạt.
5. Commit sau một nhóm thay đổi ổn định, không commit secret.

Các prompt dưới đây dành cho AI coding agent có quyền đọc và sửa repository. Bạn có thể copy nguyên khối từng prompt theo thứ tự.

## 2. Phạm vi Ngày 1

Kết quả cần đạt cuối ngày:

- Có skeleton monolith gồm Spring Boot backend và React frontend với Tailwind CSS + shadcn/ui foundation.
- Có PostgreSQL, Elasticsearch, backend và frontend chạy local bằng Docker Compose.
- Có thể bật Kibana tùy chọn bằng Docker Compose profile `tools` khi cần debug Elasticsearch.
- Có endpoint `GET /api/v1/health/live`.
- Frontend gọi health API và hiển thị trạng thái backend.
- Swagger UI mở được.
- Có Elasticsearch mapping cho index `soc-events-v1`.
- Có PostgreSQL migration tạo bảng `search_query_logs`.
- Có `.env.example`, `.gitignore`, Dockerfile và cấu trúc thư mục cơ bản.
- Đã bắt đầu mua domain và tạo GitHub repository.

Không làm trong ngày 1:

- Ingest API.
- Script seed event có mặc định `10.000` document local và tham số để scale lên vài triệu document trước buổi bảo vệ.
- LLM integration.
- Search API.
- Auth.
- CI/CD workflow hoàn chỉnh.
- Nginx production config.

Các nội dung này thuộc ngày sau.

## 3. Prompt 1 - Rà repo và scaffold cấu trúc

**Mục tiêu:** tạo cấu trúc thư mục ban đầu, chưa sinh code backend hoặc frontend.

```text
Bạn đang hỗ trợ tôi triển khai MVP cho đề tài "Xây dựng tính năng Tìm kiếm Event bằng AI cho SOC Platform".

Hãy đọc trước các file:
- docs/requirement.md
- docs/tech-stack.md
- docs/architecture.md
- plan/14-day-mvp-plan.md

Kiến trúc đã chốt:
- Modular monolith, không dùng microservices.
- Backend: Java 21 + Spring Boot 3.
- Frontend: React + TypeScript + Vite; tích hợp Tailwind CSS + shadcn/ui tại Prompt 4.
- Search engine: Elasticsearch `9.4.2` Basic self-managed.
- Database: PostgreSQL self-managed + Flyway.
- Local tooling: pgAdmin Desktop tùy chọn; Kibana `9.4.2` tùy chọn qua Docker Compose profile `tools`.
- Local deployment: Docker Compose.

Task hiện tại chỉ là scaffold cấu trúc repository:
- backend/
- frontend/
- infra/
- scripts/
- tests/
- .github/workflows/

Yêu cầu:
1. Kiểm tra trạng thái repository trước khi sửa.
2. Tạo các thư mục cần thiết. Với thư mục rỗng, thêm file .gitkeep nếu cần để Git track được.
3. Tạo hoặc cập nhật README.md ở mức tối thiểu: tên đề tài, kiến trúc monolith, danh sách thư mục và ghi rõ project đang ở giai đoạn scaffold.
4. Không sinh backend, frontend, Docker Compose hoặc workflow CI/CD trong bước này.
5. Không xóa hoặc ghi đè tài liệu hiện có.
6. Sau khi hoàn thành, liệt kê file đã tạo hoặc sửa và cấu trúc repo.
```

**Checkpoint:**

- Có đủ thư mục.
- Docs hiện có không bị xóa.
- README mô tả đúng trạng thái scaffold.

## 4. Prompt 2 - Khởi tạo Spring Boot backend

**Mục tiêu:** backend Java 21 chạy được và Swagger mở được.

```text
Tiếp tục triển khai ngày 1 cho SOC AI Search MVP.

Hãy tạo backend monolith trong thư mục backend/ bằng Java 21, Spring Boot 3 và Maven.

Yêu cầu:
1. Dùng package base rõ ràng, ví dụ com.soc.ai.search.
2. Thêm dependency tối thiểu:
   - spring-boot-starter-web
   - spring-boot-starter-validation
   - spring-boot-starter-actuator nếu hữu ích
   - springdoc-openapi-starter-webmvc-ui
   - spring-boot-starter-test
3. Tạo endpoint GET /api/v1/health/live trả JSON đơn giản:
   { "status": "UP" }
4. Cấu hình Swagger UI hoạt động.
5. Tạo unit hoặc integration test tối thiểu cho health endpoint.
6. Tạo backend/.gitignore nếu cần.
7. Không thêm Elasticsearch, PostgreSQL, Flyway, auth hoặc LLM trong bước này.
8. Chạy test backend và báo lệnh chạy cùng kết quả.
9. Liệt kê file đã tạo hoặc sửa.

Giữ code tối giản, dễ đọc và phù hợp monolith. Không tạo abstraction chưa cần thiết.
```

**Checkpoint:**

```bash
cd backend
./mvnw test
./mvnw spring-boot:run
```

Trên Windows PowerShell:

```powershell
cd backend
.\mvnw.cmd test
.\mvnw.cmd spring-boot:run
```

Kiểm tra:

- `GET http://localhost:8080/api/v1/health/live`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

## 5. Prompt 3 - Khởi tạo React frontend

**Mục tiêu:** frontend hiển thị trạng thái backend.

```text
Tiếp tục triển khai ngày 1 cho SOC AI Search MVP.

Hãy tạo frontend trong thư mục frontend/ bằng React + TypeScript + Vite.

Yêu cầu:
1. Tạo trang placeholder tên "SOC AI Event Search".
2. Khi mở trang, gọi GET /api/v1/health/live.
3. Hiển thị rõ một trong các trạng thái:
   - Backend connected
   - Backend unavailable
   - Loading
4. Trong môi trường dev, cấu hình Vite proxy để /api gọi tới backend localhost:8080 và tránh CORS không cần thiết.
5. Giao diện tối giản, chưa cần chart, search box nghiệp vụ hoặc UI library.
6. Tạo frontend/.gitignore nếu cần.
7. Chạy npm install, lint nếu có và npm run build.
8. Báo lệnh verify cùng kết quả và liệt kê file đã tạo hoặc sửa.

Không sửa backend trừ khi thực sự cần thiết để frontend gọi health API.
```

**Checkpoint:**

```bash
cd frontend
npm run dev
```

Kiểm tra:

- Mở `http://localhost:5173`.
- Trang hiển thị `Backend connected` khi backend đang chạy.
- Khi tắt backend, trang hiển thị `Backend unavailable`.

Bạn đã hoàn thành Prompt 1-3. Do frontend đã được chốt bổ sung Tailwind CSS + shadcn/ui sau khi scaffold React, hãy tiếp tục từ Prompt 4 dưới đây; không cần chạy lại các prompt trước.

## 6. Prompt 4 - Tích hợp Tailwind CSS và shadcn/ui foundation

**Mục tiêu:** bổ sung UI foundation cho frontend Vite hiện có trước khi phát triển màn hình nghiệp vụ.

```text
Tiếp tục triển khai ngày 1 cho SOC AI Search MVP.

Frontend React + TypeScript + Vite đã được khởi tạo trong thư mục frontend/. Hãy tích hợp Tailwind CSS và shadcn/ui theo hướng dẫn hiện hành dành cho existing Vite project.

Tài liệu chính thức:
- https://tailwindcss.com/docs/installation
- https://ui.shadcn.com/docs/installation/vite

Yêu cầu:
1. Kiểm tra trạng thái repository và đọc cấu hình frontend hiện có trước khi sửa.
2. Cài đặt Tailwind CSS cho Vite bằng dependency phù hợp với hướng dẫn hiện hành, ví dụ tailwindcss và @tailwindcss/vite. Giữ nguyên React plugin và Vite dev proxy /api tới http://localhost:8080.
3. Cấu hình alias @/* trỏ tới frontend/src trong tsconfig.json, tsconfig.app.json và vite.config.ts để shadcn/ui import component rõ ràng.
4. Chạy shadcn CLI init cho existing project để tạo cấu hình cần thiết như components.json và utility cn. Không dùng cấu hình Tailwind CSS v3 cũ nếu toolchain hiện hành không cần.
5. Chỉ thêm component shadcn/ui tối thiểu cần để kiểm tra foundation, ví dụ Card và Badge. Không sinh hàng loạt component chưa sử dụng.
6. Cập nhật trang placeholder "SOC AI Event Search" để dùng Tailwind CSS và component shadcn/ui vừa thêm. Giữ nguyên hành vi gọi GET /api/v1/health/live và ba trạng thái:
   - Backend connected
   - Backend unavailable
   - Loading
7. Không thêm chart, search box nghiệp vụ, routing, state management library hoặc sửa backend.
8. Chạy npm install nếu cần, npm run lint và npm run build.
9. Báo lệnh verify, kết quả và danh sách file đã tạo hoặc sửa.

Giữ thay đổi nhỏ gọn. shadcn/ui cung cấp source code component để chỉnh sửa trong frontend; chỉ thêm component khi có nhu cầu thực tế.
```

**Checkpoint:**

```bash
cd frontend
npm run lint
npm run build
npm run dev
```

Kiểm tra:

- Tailwind CSS class có hiệu lực.
- Có `components.json`, utility `cn` và component shadcn/ui tối thiểu.
- Vite proxy `/api` vẫn hoạt động.
- Trang vẫn hiển thị đúng trạng thái backend.

## 7. Prompt 5 - Thiết kế Elasticsearch mapping

**Mục tiêu:** chốt cấu trúc document event cho MVP.

```text
Tiếp tục triển khai ngày 1 cho SOC AI Search MVP.

Hãy tạo file mapping Elasticsearch cho index soc-events-v1 trong thư mục infra/elasticsearch/.

Yêu cầu:
1. Tạo index template hoặc JSON mapping có thể dùng để khởi tạo index soc-events-v1.
2. Mapping tối thiểu:
   - timestamp: date
   - source: keyword
   - severity: keyword
   - event_type: keyword
   - user: keyword
   - host: keyword
   - ip: ip
   - country_code: keyword
   - message: text
   - raw: text với index: false để giữ chuỗi raw log nhưng không tạo inverted index
3. Chọn dynamic mapping có kiểm soát để tránh field explosion. Giải thích ngắn lựa chọn dynamic: false hoặc strict.
4. Tạo README ngắn trong infra/elasticsearch/ giải thích:
   - soc-events-v1 là Elasticsearch index, không phải PostgreSQL table.
   - event là document.
   - field được mapping dùng cho search, filter hoặc aggregation.
   - raw được giữ để xem chi tiết nhưng không index.
5. Chưa tạo script seed hoặc ingest API.
6. Không thay đổi docs dài nếu chưa cần.
7. Liệt kê file đã tạo và giải thích trade-off mapping raw. Nếu sau này raw log cần lưu dạng JSON object, chỉ ghi chú hướng mở rộng; chưa đổi representation trong MVP.
```

**Checkpoint:**

- Có file mapping rõ ràng.
- `raw` dùng `type: text`, `index: false`.
- Không có script seed event trong bước này. Script sẽ được làm ở ngày 2 với mặc định `10.000` document local và tham số số lượng để scale trước buổi bảo vệ.

## 8. Prompt 6 - PostgreSQL migration cho bảng MVP

**Mục tiêu:** tạo đúng một bảng PostgreSQL cần thiết cho MVP.

```text
Tiếp tục triển khai ngày 1 cho SOC AI Search MVP.

Hãy tích hợp PostgreSQL và Flyway vào backend monolith.

MVP chỉ cần một bảng PostgreSQL: search_query_logs.
Sử dụng PostgreSQL self-managed trong Docker Compose. Không tích hợp Supabase trong giai đoạn MVP.

Yêu cầu:
1. Thêm dependency:
   - spring-boot-starter-data-jpa
   - postgresql driver
   - flyway-core
   - flyway-database-postgresql nếu phiên bản Flyway cần
2. Tạo migration Flyway V1 để tạo table search_query_logs:
   - id uuid primary key
   - user_identity varchar not null
   - question text not null
   - search_plan jsonb nullable
   - generated_dsl jsonb nullable
   - mode varchar nullable
   - result_count bigint nullable
   - latency_ms bigint nullable
   - status varchar not null
   - error_message text nullable
   - summary text nullable
   - created_at timestamptz not null
3. Tạo index:
   - created_at DESC
   - (user_identity, created_at DESC)
4. Cấu hình datasource qua environment variables, không hardcode password.
5. Tạo .env.example ở root nếu chưa có hoặc bổ sung biến PostgreSQL cần thiết.
6. Đảm bảo test backend hiện có vẫn chạy được sau khi thêm datasource. Dùng test profile hoặc Testcontainers nếu cần; không hardcode database password và không làm repository hoặc business service chưa cần thiết.
7. Không tạo bảng users, roles, sessions hoặc saved_queries.
8. Chạy test phù hợp và liệt kê file đã tạo hoặc sửa.

Giải thích ngắn vì sao một bảng search_query_logs đủ cho recent history, application audit log và export lại theo query_id trong MVP.
```

**Checkpoint:**

- Có migration Flyway.
- Password chỉ lấy từ environment variable.
- Chỉ có một bảng PostgreSQL cho MVP.

## 9. Prompt 7 - Dockerfile, Docker Compose và env

**Mục tiêu:** chạy toàn bộ skeleton local bằng một lệnh.

```text
Tiếp tục triển khai ngày 1 cho SOC AI Search MVP.

Hãy tạo cấu hình Docker local hoàn chỉnh.

Yêu cầu:
1. Tạo Dockerfile multi-stage cho backend Spring Boot.
2. Tạo Dockerfile multi-stage cho frontend React + Tailwind CSS + shadcn/ui:
   - build bằng Node
   - serve static files bằng Nginx trong container frontend
3. Tạo docker-compose.yml ở root gồm:
   - postgres
   - elasticsearch
   - backend
   - frontend
4. Thêm service kibana tùy chọn với profile tools. Không khởi động Kibana trong lệnh docker compose up mặc định.
5. Pin Elasticsearch và Kibana chính xác cùng version:
   docker.elastic.co/elasticsearch/elasticsearch:9.4.2
   docker.elastic.co/kibana/kibana:9.4.2
6. Elasticsearch local chạy single-node và dùng named volume.
7. PostgreSQL dùng named volume.
8. Không thêm pgAdmin container. pgAdmin Desktop là công cụ tùy chọn chạy trên máy cá nhân. Nếu publish cổng quản trị local `5432`, `9200` hoặc `5601`, chỉ bind vào `127.0.0.1`, không bind public.
9. Backend chờ hoặc retry hợp lý khi PostgreSQL chưa ready.
10. Frontend gọi backend qua /api.
11. Tạo healthcheck phù hợp cho PostgreSQL, Elasticsearch và backend nếu khả thi.
12. Tạo hoặc cập nhật .env.example với placeholder, không ghi secret thật.
13. Tạo hoặc cập nhật .gitignore để bỏ qua .env, build artifacts, IDE files và node_modules.
14. Tạo script bootstrap Elasticsearch hoặc hướng dẫn rõ cách apply mapping soc-events-v1 khi Elasticsearch đã ready.
15. Chạy docker compose config và docker compose --profile tools config. Nếu môi trường cho phép thì chạy docker compose up -d, kiểm tra health và Swagger. Bật Kibana riêng bằng docker compose --profile tools up -d kibana để kiểm tra cấu hình tùy chọn.
16. Báo lại:
   - lệnh đã chạy
   - service nào healthy
   - URL frontend
   - URL health API
   - URL Swagger
   - URL Kibana local tùy chọn
   - file đã tạo hoặc sửa

Không thêm Nginx host production, domain, SSL, auth, ingest API hoặc LLM.
```

**Checkpoint:**

Lần chạy đầu tiên hoặc sau khi thay đổi Dockerfile, dependency:

```powershell
Copy-Item .env.example .env
docker compose config
docker compose --profile tools config
docker compose up -d --build
.\scripts\bootstrap-elasticsearch.ps1
docker compose ps
```

Những lần chạy tiếp theo khi không thay đổi Dockerfile hoặc dependency:

```powershell
docker compose up -d
.\scripts\bootstrap-elasticsearch.ps1
docker compose ps
```

Kiểm tra trực tiếp các URL đã cấu hình:

```powershell
Invoke-RestMethod http://localhost:8081/api/v1/health/live
Invoke-RestMethod http://localhost:3000/api/v1/health/live
Invoke-WebRequest http://localhost:8081/swagger-ui.html -UseBasicParsing
Invoke-RestMethod http://localhost:9200/_cluster/health
```

Kiểm tra Flyway đã tạo PostgreSQL table:

```powershell
docker compose exec -T postgres psql -U soc_ai_search -d soc_ai_search -c "\dt"
docker compose exec -T postgres psql -U soc_ai_search -d soc_ai_search -c "SELECT installed_rank, version, description, success FROM flyway_schema_history ORDER BY installed_rank;"
```

Chỉ bật Kibana khi cần debug Elasticsearch:

```powershell
docker compose --profile tools up -d kibana
docker compose --profile tools ps
```

Mở trình duyệt:

- Frontend React: `http://localhost:3000`
- Health API trực tiếp: `http://localhost:8081/api/v1/health/live`
- Health API qua Nginx frontend proxy: `http://localhost:3000/api/v1/health/live`
- Swagger UI: `http://localhost:8081/swagger-ui.html`
- Elasticsearch: `http://localhost:9200`
- PostgreSQL cho pgAdmin Desktop: `localhost:5433`
- Kibana tùy chọn mở tại `http://localhost:5601` khi bật profile `tools`.

Lưu ý:

- Bên trong Docker network, backend vẫn chạy cổng `8080` và PostgreSQL vẫn chạy cổng `5432`.
- Cổng host local dùng `8081` cho backend và `5433` cho PostgreSQL để tránh xung đột với service khác đang chạy trên máy.
- Dùng `docker compose down` để dừng stack. Không thêm `-v` nếu muốn giữ dữ liệu PostgreSQL và Elasticsearch trong named volume.

## 10. Prompt 8 - Verify Ngày 1 và cập nhật README

**Mục tiêu:** kiểm tra end-to-end skeleton và ghi hướng dẫn chạy local.

```text
Hãy review và verify toàn bộ kết quả triển khai ngày 1 cho SOC AI Search MVP.

Đọc lại:
- docs/requirement.md
- docs/tech-stack.md
- docs/architecture.md
- plan/14-day-mvp-plan.md

Kiểm tra:
1. Cấu trúc repo có backend, frontend, infra, scripts, tests và .github/workflows.
2. Backend Java 21 + Spring Boot 3 chạy được.
3. GET /api/v1/health/live trả status UP.
4. Swagger UI mở được.
5. React frontend hiển thị trạng thái backend.
6. Tailwind CSS + shadcn/ui foundation đã được cấu hình; frontend lint và build thành công.
7. docker compose config hợp lệ.
8. docker compose up -d --build chạy được nếu môi trường có Docker.
9. Elasticsearch pin đúng phiên bản 9.4.2.
10. Kibana tùy chọn nằm trong profile tools và pin cùng phiên bản 9.4.2.
11. Không có pgAdmin container trong stack mặc định.
12. Có mapping soc-events-v1.
13. Có Flyway migration tạo đúng một PostgreSQL table search_query_logs.
14. Không có secret thật trong Git-tracked files.

Sau đó:
1. Sửa lỗi nhỏ nếu phát hiện.
2. Cập nhật README.md với:
   - prerequisites
   - cách tạo .env từ .env.example
   - cách chạy docker compose
   - cách bật Kibana tùy chọn bằng profile tools khi cần debug Elasticsearch
   - URL frontend, health API và Swagger
   - cách kiểm tra service
   - ghi rõ đây mới là skeleton ngày 1
3. Chạy các lệnh verify phù hợp.
4. Báo checklist PASS/FAIL theo từng mục.
5. Liệt kê thay đổi còn cần làm ở ngày 2 nhưng không triển khai chúng.
```

**Checkpoint cuối ngày:**

- `docker compose up -d --build` chạy được.
- Frontend thấy backend sống.
- Swagger mở được.
- Mapping và migration đã tồn tại.
- README đủ để chạy local.

## 11. Checklist thủ công A - Domain

AI coding agent không thể tự mua domain nếu bạn chưa cung cấp tài khoản và quyền truy cập. Bạn tự thực hiện:

1. Chọn domain hoặc subdomain cho demo.
2. Mua domain qua Route 53 hoặc nhà cung cấp tùy chọn.
3. Nếu dùng Route 53, xác minh email registrant ngay.
4. Lưu thông tin domain vào password manager hoặc ghi chú cá nhân an toàn.
5. Chưa cần trỏ DNS trong ngày 1 nếu chưa tạo EC2.

Kết quả cần ghi lại:

```text
Domain đã mua: ______________________
Nhà cung cấp: _______________________
Email đã xác minh: Có / Không
Ngày hết hạn: _______________________
```

Không commit credential nhà cung cấp domain vào repository.

## 12. Checklist thủ công B - GitHub Repository

Nếu AI coding agent chưa có quyền GitHub, bạn tự thực hiện:

1. Tạo GitHub repository.
2. Chọn private repository trong giai đoạn phát triển nếu chưa muốn public code.
3. Kiểm tra `.gitignore` trước khi commit.
4. Đảm bảo không có `.env`, API key hoặc password trong staged files.
5. Commit skeleton ngày 1.
6. Push branch lên GitHub.

Lệnh tham khảo:

```bash
git status
git add .
git status
git commit -m "chore: scaffold SOC AI search MVP"
git remote add origin <repository-url>
git push -u origin main
```

Nếu repository đã có remote, không chạy lại `git remote add origin`.

## 13. Cách hỏi AI khi một checkpoint lỗi

Không gửi lại toàn bộ prompt từ đầu. Dùng mẫu:

```text
Checkpoint của prompt <số prompt> đang lỗi.

Lệnh tôi đã chạy:
<command>

Output lỗi:
<paste output>

Hãy:
1. Chẩn đoán nguyên nhân.
2. Chỉ sửa phạm vi cần thiết để checkpoint pass.
3. Không triển khai task của prompt tiếp theo.
4. Chạy lại verify và báo file đã sửa.
```

## 14. Lưu ý về phạm vi

- Prompt ngày 1 chỉ tạo foundation chạy được.
- Không yêu cầu AI xây toàn bộ MVP ngay trong ngày đầu.
- Không thêm microservices.
- Không commit secret.
- Docs là working draft: chỉ cập nhật phần cần thiết để phản ánh code đã triển khai.
