# Demo Script 5 Phút - SOC AI Search MVP

Mục tiêu: demo ngắn, rõ luồng AI Search -> SearchPlan -> DSL -> Result -> RBAC/Audit/CI-CD. Credential demo được gửi riêng, không lưu trong repository.

## 0:00 - 0:30 | Mở đầu

1. Mở `https://soc-ai-search.app`.
2. Nói ngắn gọn:
   - Đây là SOC investigation console.
   - Người dùng nhập câu hỏi tự nhiên tiếng Việt/Anh.
   - LLM chỉ sinh `SearchPlan`; backend validate và compile thành Elasticsearch DSL.
   - Elasticsearch lưu event; PostgreSQL lưu audit/history.

## 0:30 - 1:30 | Login analyst và chạy search

1. Login bằng tài khoản có role `SOC_ANALYST`.
2. Chạy câu hỏi:

```text
Show me failed login attempts from China in the last 24h
```

3. Chỉ các điểm trên UI:
   - `mode = search`.
   - Total events.
   - Summary block.
   - Raw Events table.
   - Latency fields nếu UI đang hiển thị.

Thông điệp cần nói:

> Analyst không cần biết Elasticsearch DSL. Hệ thống sinh kế hoạch truy vấn có kiểm soát và vẫn cho xem DSL cuối cùng để minh bạch.

## 1:30 - 2:10 | SearchPlan và Generated DSL transparency

1. Mở panel SearchPlan.
2. Mở panel Generated DSL.
3. Chỉ rõ:
   - `search_plan` là JSON object.
   - `generated_dsl` là JSON object, không phải string escaped.
   - Có filter `event_type`, `country_code`, `timestamp`.
   - Sort timestamp desc.

Thông điệp cần nói:

> Đây là guardrail chính: LLM không được gửi DSL tự do vào Elasticsearch.

## 2:10 - 2:50 | Event detail và raw log

1. Click một row event hoặc nút View.
2. Mở Event Detail Drawer.
3. Chỉ:
   - Formatted fields.
   - Raw Log.
   - `event_id` lấy từ Elasticsearch `_id`.

Thông điệp cần nói:

> Search list giữ response gọn, còn detail endpoint trả raw log để điều tra sâu.

## 2:50 - 3:30 | Aggregation và chart

1. Chạy câu aggregation:

```text
Top 10 IP có nhiều alert nhất tháng này
```

Hoặc:

```text
Đếm số lần login thất bại theo từng user trong 7 ngày qua
```

2. Chỉ:
   - `mode = aggregation`.
   - Analytics View tự bật.
   - Chart Recharts.
   - Summary Table.
   - `aggregation_results` và `chart_metadata`.

Thông điệp cần nói:

> Backend chuẩn hóa aggregation response để frontend không phụ thuộc trực tiếp vào Elasticsearch response shape.

## 3:30 - 4:00 | CSV export và history

1. Với analyst, bấm Export CSV.
2. Mở Recent Investigations.
3. Chỉ `Run Again`.

Thông điệp cần nói:

> Export không nhận DSL từ client. Backend replay query theo `query_id`, validate/compile lại và giới hạn 10.000 dòng.

## 4:00 - 4:35 | Viewer restriction và Admin audit

Nếu có thời gian login nhanh:

1. Logout analyst.
2. Login viewer, chỉ nút Export/Audit bị khóa hoặc bị backend 403.
3. Login admin, mở Audit Logs.

Nếu không đủ thời gian:

- Mô tả role matrix:
  - `SOC_VIEWER`: xem/search read-only.
  - `SOC_ANALYST`: export CSV.
  - `SOC_ADMIN`: audit log.

Thông điệp cần nói:

> Frontend chỉ là UX gating; backend Spring Security + Keycloak RBAC mới là lớp bảo vệ thật.

## 4:35 - 5:00 | Deploy, CI/CD và fallback

1. Chỉ nhanh domain HTTPS:
   - `https://soc-ai-search.app`
   - `https://api.soc-ai-search.app`
   - `https://auth.soc-ai-search.app`
2. Nói:
   - Deploy bằng DigitalOcean + Name.com + Caddy.
   - GitHub Actions CI chạy backend verify, frontend test/lint/build, compose config.
   - CD deploy qua SSH lên VPS sau CI pass.
   - Nếu Gemini lỗi, search vẫn có fallback summary hoặc local/dev dùng `LLM_PROVIDER=mock`.

Kết câu:

> MVP đã có đủ luồng điều tra: natural language search, DSL transparency, aggregation, raw event detail, summary, audit/history, CSV export, RBAC và public HTTPS deployment.

## Câu hỏi demo dự phòng

Search:

```text
Tìm alert critical trong 7 ngày qua
```

Aggregation group_by:

```text
Đếm số lần login thất bại theo từng user trong 7 ngày qua
```

Aggregation date_histogram:

```text
Số event theo giờ trong 24h qua
```

Nếu Gemini không ổn định, dùng mock local/dev:

```env
LLM_PROVIDER=mock
```

Summary fallback là hành vi có chủ đích: lỗi LLM không làm hỏng search result.