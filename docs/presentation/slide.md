# Slide Outline Bảo Vệ - SOC AI Search (v2)

Mục tiêu: **12 slide, 8 phút slide + 6-7 phút demo**, theo flow Problem → Solution → Result.

---

## Slide 1 - Title

**Thông điệp chính:** Đây là hệ thống SOC AI Search chạy thật, có domain public.

**Nội dung:**
- SOC AI Search — Natural Language Search for Security Events
- Họ tên sinh viên, GVHD / mentor
- Đơn vị: Viettel Cyber Security (VSC)

**Nên chèn hình:**
- 1 screenshot đẹp nhất của Event Search page sau khi có kết quả

**Bố cục:** Bên trái title, bên phải hoặc full-bg screenshot UI.

---

## Slide 2 - Hiện Trạng Và Bài Toán

**Thông điệp chính:** SOC analyst đang gặp 4 vấn đề lớn trong quá trình điều tra sự kiện.

**Nội dung (4 card):**
- Log bảo mật rất lớn, khó lọc thủ công
- Elasticsearch DSL phức tạp, dễ viết sai
- Điều tra chậm, mất nhiều thời gian lặp đi lặp lại
- Khó truy vết, không có audit chứng minh ai đã query gì

**Nên chèn hình:**
- Ảnh minh hoạ log dài đoạn DSL dài và khó hiểu

**Bố cục:** 4 card problem + 1 hình minh hoạ DSL bên cạnh.

---

## Slide 3 - Mục Tiêu (High-Level)

**Thông điệp chính:** Analyst hỏi bằng tiếng tự nhiên, hệ thống tự tạo query an toàn, có kiểm soát.

**Nội dung:**
- Analyst nhập câu hỏi → hệ thống tự tạo query
- Backend luôn kiểm soát, không cho AI tự ý truy vấn
- Có RBAC, audit, truy vết đầy đủ

**Nên chèn diagram ngang:**
```
Analyst ─→ Câu hỏi tự nhiên ─→ [Hệ thống] ─→ Kết quả + Audit
```

**Lưu ý:** Slide này ở mức high-level. Chi tiết kỹ thuật giải thích ở slide 5-6.

---

## Slide 4 - Kiến Trúc Tổng Thể

**Thông điệp chính:** Hệ thống có đầy đủ các thành phần: frontend, backend, LLM, search engine, database, auth, deploy.

**Nội dung:**
- React + TypeScript (Frontend)
- Spring Boot (Backend — trung tâm xử lý, guardrail)
- Gemini LLM
- Elasticsearch (search & aggregation)
- PostgreSQL (audit & history)
- Keycloak (auth, RBAC)
- Docker Compose + Caddy (deploy)

**Nên chèn diagram:**
```
User ─→ React UI ─→ Spring Boot ─┬─→ Gemini LLM
                                  ├─→ Elasticsearch
                                  ├─→ PostgreSQL
                                  └─→ Keycloak
```

**Câu nhấn mạnh:** "Frontend không bao giờ gọi trực tiếp Elasticsearch hay LLM. Backend là lớp guardrail trung tâm."

---

## Slide 5 - Thiết Kế Dữ Liệu

**Thông điệp chính:** Dữ liệu được tách theo mục đích để tối ưu từng phần.

**Nên chèn bảng (3 cột):**

| Lưu trữ | Dữ liệu chính | Mục đích |
|---|---|---|
| Elasticsearch | timestamp, severity, event_type, user, host, ip, country_code, message, raw | Search & Aggregation |
| PostgreSQL | question, user_id, search_plan, generated_dsl, result_count, summary, error | Audit, History, Replay |
| Keycloak | User, Role, Token | Auth & RBAC |

**Bố cục:** Bảng là trung tâm, không cần ERD chi tiết.

**Seed data:** Hệ thống có synthetic dataset ~1M events đủ các loại event type, severity, country để demo ổn định.

---

## Slide 6 - Core Flow + Guardrail AI

**Thông điệp chính:** AI chỉ sinh SearchPlan JSON, backend kiểm soát toàn bộ — LLM không bao giờ truy vấn trực tiếp.

**Nên chèn diagram chính:**
```
Analyst nhập câu hỏi
       ↓
  Backend tạo prompt
       ↓
  LLM sinh SearchPlan (JSON có cấu trúc)
       ↓
  Parser + Validator (reject nếu sai)
       ↓
  Compiler → Elasticsearch DSL
       ↓
  Elasticsearch → Kết quả
       ↓
  Lưu audit (PostgreSQL)
```

**Guardrail highlights (bullet ngắn):**
- Reject markdown, prose, field lạ, giá trị ngoài whitelist
- Backend override page/size, user không thể bypass
- DSL chỉ được tạo bởi backend, dù user sửa SearchPlan

**Nên chèn thêm:**
- 1 screenshot nhỏ Query Transparency (SearchPlan + DSL tab)

---

## Slide 7 - Các Chức Năng Hệ Thống + Phân Quyền

**Thông điệp chính:** Hệ thống có đầy đủ chức năng SOC cần và mỗi chức năng có RBAC rõ ràng.

**Nên chèn bảng (4 cột):**

| Chức năng | Mô tả ngắn | Viewer | Analyst | Admin |
|---|---|---|---|---|
| Event Search | Hỏi tự nhiên → Bảng kết quả | ✓ | ✓ | ✓ |
| Filter trên kết quả | Lọc severity, user, host, IP… | ✓ | ✓ | ✓ |
| Aggregation (Line/Bar/Count) | Thống kê theo nhóm, xu hướng, count | ✓ | ✓ | ✓ |
| Query Transparency | Xem Query Breakdown, SearchPlan, DSL | ✓ | ✓ | ✓ |
| AI Summary | Tóm tắt kết quả | ✓ | ✓ | ✓ |
| Next Investigation Steps | Gợi ý bước điều tra tiếp theo (AI) | ✓ | ✓ | ✓ |
| Correct or Refine Query | Sửa / Cập nhật SearchPlan | ✓ | ✓ | ✓ |
| Pin Query / Query Library | Lưu query hay, tra lại | — | ✓ | ✓ |
| Export CSV (trên kết quả filter) | Export lịch sử người dùng | — | ✓ | ✓ |
| Investigations | Gom nhóm vụ điều tra | — | ✓ | ✓ |
| Audit Logs & Export CSV | Xem toàn bộ lịch sử query, ai query gì | — | — | ✓ |

**Bố cục:** Bảng là trung tâm, chữ nhỏ, hội đồng nhìn là hiểu ngay.

---

## Slide 8 - Search Và Aggregation Flow

**Thông điệp chính:** Search trả ra bảng kết quả có thể filter và export. Aggregation biểu diễn 3 dạng trực quan.

**Nên chèn diagram trung tâm:**
```text
Câu hỏi bằng ngôn ngữ tự nhiên
        ↓
   ┌───────────────┬───────────────┐
   ↓               ↓
 Search        Aggregation
```

**Nhánh Search:**
```text
Bảng kết quả (event logs)
       ↓
Filter trên bảng (severity, user, host, IP, time...)
       ↓
Export CSV
```

**Nhánh Aggregation:**
```text
Top N (Bar Chart)   → "Top 10 IP có nhiều failed login nhất"
Trend (Line Chart)  → "Số lượng event theo giờ trong 7 ngày"
Count               → "Tổng số failed login hôm nay: 1,234"
```
```

**Nên chèn thêm:**
- 1 screenshot bar chart hoặc line chart nhỏ
- 1 screenshot bảng kết quả event search

---

## Slide 9 - Screenshots Thực Tế

**Thông điệp chính:** Hệ thống chạy thật, giao diện hoàn chỉnh, đầy đủ các màn hình.

**Nên chèn 4 screenshot (grid 2x2):**
1. Event Search — bảng kết quả sau khi query
2. Aggregation — bar/line chart
3. Query Transparency — SearchPlan + DSL tabs
4. Investigations hoặc Audit Logs

**Mỗi screenshot có caption 1 dòng ngắn.**

---

## Slide 10 - Kết Quả Đạt Được

**Thông điệp chính:** Hệ thống đã chạy thật và có thể vận hành.

**Nội dung (chia 2 cột):**

**Hệ thống:**
- Deploy public (DigitalOcean, HTTPS, Caddy)
- Các chức năng được thực hiện, RBAC 3 role
- Synthetic dataset ~10.000 events chứa các case để demo ổn định
- CI/CD với GitHub Actions: test → build → deploy → smoke test

**Kiểm thử & đánh giá:**
- Backend unit test + JaCoCo coverage report
- Frontend unit test (Vitest + React Testing Library)
- Smoke test tự động trên domain public sau mỗi deploy
- Swagger UI doc đầy đủ backend API

**Bố cục:** 2 cột hoặc 2 nhóm bullet, không dùng "ưu điểm / nhược điểm".

---

## Slide 11 - Demo Flow

**Thông điệp chính:** Chuyển sang demo luồng chính.

**Demo flow (timeline ngang):**

1. Login với role Analyst
2. Search "Show failed login from China last 24h"
3. Xem kết quả bảng → mở Query Breakdown (SearchPlan + DSL)
4. Xem AI Summary + Next Investigation Steps
5. Filter trên bảng kết quả → Export CSV
6. Chạy aggregation "Top 10 source IP" → Bar chart
7. Correct or Refine Query (sửa SearchPlan)
8. Mở Investigations → Audit Logs (Admin role)

**Nhịp demo gợi ý:** ~6-7 phút

---

## Slide 12 - Hướng Phát Triển

**Thông điệp chính:** Hệ thống có nền tảng vững, sẵn sàng mở rộng.

**Nội dung:**
- Self-hosted LLM cho  để tăng bảo mật
- Multi-turn investigation (Hội thoại đa lượt)
- Sinh báo cáo PDF/Markdown từ một investigation
- Aggregation nâng cao (pivot table, so sánh theo thời gian)
- Real-time streaming alerts
- Auto complete khi gõ câu hỏi 

**Câu kết:**
"Hệ thống tập trung giải quyết bài toán SOC analyst truy vấn log bằng ngôn ngữ tự nhiên, nhưng backend luôn giữ quyền kiểm soát an toàn thông qua SearchPlan, validator, compiler, RBAC và audit."

---

## Danh Sách Hình Cần Chuẩn Bị

1. Landing page hoặc Event Search hero screenshot
2. Event Search — bảng kết quả có data
3. Filter panel đang mở trên bảng kết quả
4. Bar chart hoặc Line chart aggregation
5. Count result (số to nổi bật)
6. Query Transparency — SearchPlan tab
7. Query Transparency — DSL tab
8. AI Summary hiện thị trên màn hình kết quả
9. Next Investigation Steps (suggestion cards)
10. Investigations page
11. Audit Logs page
12. GitHub Actions CI/CD pass screenshot
13. JaCoCo coverage report screenshot
14. Swagger UI screenshot

## Tổng Thời Gian

| Slide | Nội dung | Thời gian |
|---|---|---|
| 1 | Title | 20s |
| 2 | Bài toán | 60s |
| 3 | Mục tiêu | 30s |
| 4 | Kiến trúc | 60s |
| 5 | CSDL | 45s |
| 6 | Core Flow + Guardrail | 90s |
| 7 | Chức năng + Phân quyền | 60s |
| 8 | Search & Aggregation detail | 60s |
| 9 | Screenshots | 30s |
| 10 | Kết quả + Testing | 45s |
| 11 | Demo Flow | 20s |
| 12 | Hướng phát triển | 30s |
| **Demo** | **Chạy thật** | **6-7 phút** |
| **Q&A** | **Dự phòng** | **2-3 phút** |
