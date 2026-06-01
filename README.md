# SOC AI Search

Đề tài: **Xây dựng tính năng Tìm kiếm Event bằng AI cho SOC Platform**.

## Trạng thái

Repository đang ở giai đoạn **scaffold ngày 1**. Backend Spring Boot và frontend React đã được khởi tạo. Các phần Tailwind CSS + shadcn/ui, Elasticsearch, PostgreSQL, Docker Compose và CI/CD chưa được tích hợp.

## Kiến trúc

Hệ thống được triển khai theo **Modular Monolith**:

- Backend là một ứng dụng Java 21 + Spring Boot 3 duy nhất.
- Frontend dùng React + TypeScript + Vite; Tailwind CSS + shadcn/ui là UI foundation đã chọn và sẽ được tích hợp trong bước tiếp theo.
- Elasticsearch lưu event SOC để search và aggregation.
- PostgreSQL lưu metadata truy vấn, query history và application audit log.
- Docker Compose được dùng cho môi trường local và deploy MVP.

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

## Tài liệu

- [Yêu cầu đề tài](docs/requirement.md)
- [Tech stack](docs/tech-stack.md)
- [Kiến trúc hệ thống](docs/architecture.md)
- [Kế hoạch MVP 14 ngày](plan/14-day-mvp-plan.md)
