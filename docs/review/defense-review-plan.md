# Kế Hoạch Ôn Tập Bảo Vệ - SOC AI Search

File này là **trang index** để bạn ôn tập nhanh trước buổi bảo vệ. Nội dung chi tiết đã được tách thành 3 file theo mức ưu tiên để tránh một file quá dài.

## Thứ Tự Ôn Khuyến Nghị

1. [P0 - Core Flow & AI Guardrails](./P0-core-flow.md)
   - Bài toán chính.
   - Luồng Natural Language Search.
   - SearchPlan contract.
   - AI guardrails.
   - Gemini/mock LLM.
   - Demo flow bắt buộc thuộc.

2. [P1 - Security, Audit & Product Features](./P1-security-audit-ui.md)
   - RBAC và Keycloak.
   - Audit, history, investigations.
   - CSV export an toàn.
   - Dashboard và static suggestions.
   - Editable SearchPlan.

3. [P2 - Deploy, Dataset, Testing & Q&A](./P2-deploy-testing-qa.md)
   - Elasticsearch mapping và synthetic dataset.
   - Deployment DigitalOcean + Caddy.
   - CI/CD và smoke test.
   - Testing/coverage.
   - Checklist trước bảo vệ.
   - Câu hỏi khó và câu trả lời mẫu.

## Nếu Chỉ Còn 1 Ngày

Ưu tiên theo thứ tự:

1. Đọc P0 mục Natural Language Search thật kỹ.
2. Học thuộc câu trả lời: “Vì sao không cho LLM sinh Elasticsearch DSL trực tiếp?”.
3. Chạy demo search + aggregation + Query Transparency.
4. Đọc RBAC và CSV export trong P1.
5. Đọc checklist và Q&A trong P2.

## Một Câu Tóm Tắt Để Học Thuộc

> SOC AI Search cho phép SOC analyst hỏi log bảo mật bằng ngôn ngữ tự nhiên. LLM chỉ sinh SearchPlan JSON, backend parse/validate/compile thành Elasticsearch DSL, enforce RBAC, execute query, trả kết quả minh bạch kèm SearchPlan/DSL và lưu audit vào PostgreSQL.
