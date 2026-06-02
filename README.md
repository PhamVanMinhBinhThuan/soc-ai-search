# SOC AI Search

Đề tài: **Xây dựng tính năng Tìm kiếm Event bằng AI cho SOC Platform**.

## Trạng thái

Repository đang ở giai đoạn **scaffold ngày 1**. Backend Spring Boot, frontend React với Tailwind CSS + shadcn/ui foundation, Elasticsearch mapping, PostgreSQL/Flyway foundation và Docker Compose local đã được khởi tạo. CI/CD chưa được tích hợp.

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

### Lưu ý về PostgreSQL password

Tạo `.env` trước lần chạy Docker đầu tiên. PostgreSQL chỉ dùng `POSTGRES_PASSWORD` để khởi tạo role khi named volume chưa có dữ liệu. Nếu đổi password trong `.env` sau đó, password bên trong database không tự thay đổi.

## Tài liệu

- [Yêu cầu đề tài](docs/requirement.md)
- [Tech stack](docs/tech-stack.md)
- [Kiến trúc hệ thống](docs/architecture.md)
- [Kế hoạch MVP 14 ngày](plan/14-day-mvp-plan.md)
