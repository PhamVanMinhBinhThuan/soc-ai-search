# Swagger API Testing Guide

Tài liệu này dùng để test nhanh các API quan trọng của SOC AI Search bằng Swagger UI.

## 1. Mở Swagger UI

Local:

```text
http://localhost:8080/swagger-ui.html
```

Public domain:

```text
https://api.soc-ai-search.app/swagger-ui.html
```

Nếu backend bật Keycloak auth, cần bấm **Authorize** trong Swagger và nhập access token.

## 2. Lấy access token để test API protected

Cách đơn giản:

1. Đăng nhập web frontend.
2. Mở DevTools bằng `F12`.
3. Vào tab **Network**.
4. Thực hiện một request bất kỳ, ví dụ search.
5. Chọn request gửi đến API.
6. Copy header:

```text
Authorization: Bearer <access_token>
```

Trong Swagger, bấm **Authorize** rồi dán token. Nếu Swagger yêu cầu đầy đủ scheme thì dán cả:

```text
Bearer <access_token>
```

## 3. Natural Language Search

Endpoint đúng hiện tại:

```http
POST /api/v1/search
```

Không có endpoint `POST /api/v1/search/query`.

Mục đích:

- Nhận câu hỏi tự nhiên.
- Gọi LLM sinh `SearchPlan`.
- Backend parse, validate, compile DSL.
- Query Elasticsearch.
- Lưu history/audit.

Payload mẫu:

```json
{
  "question": "Show failed login attempts from China in the last 24h",
  "page": 0,
  "size": 10
}
```

Payload tiếng Việt:

```json
{
  "question": "Số event theo giờ trong 24h qua",
  "page": 0,
  "size": 10
}
```

Payload top N:

```json
{
  "question": "Top 5 IP có nhiều event nhất trong 30 ngày qua",
  "page": 0,
  "size": 10
}
```

Payload có audit question tùy chọn:

```json
{
  "question": "Show account lockout events for admin or vpn.user in the last 2 days",
  "audit_question": "[AI Corrected] Original question: account lockout | Feedback: include admin and vpn.user",
  "page": 0,
  "size": 10
}
```

Kết quả cần quan sát:

- `query_id`
- `validated_search_plan`
- `generated_dsl`
- `total`
- `events` hoặc `aggregation`
- `summary`
- `summary_source`

## 4. Execute SearchPlan

Endpoint:

```http
POST /api/v1/search/plan
```

Query params quan trọng:

| Param | Ý nghĩa |
|---|---|
| `include_summary` | `true` thì backend sinh AI summary; `false` thì không gọi summary. |
| `audit` | `true` thì lưu history/audit; `false` thì không lưu. |
| `summary_question` | Câu hỏi dùng làm context cho summary và audit. |

Ví dụ chạy SearchPlan search:

```json
{
  "mode": "search",
  "filters": {
    "timestamp": { "from": "now-24h", "to": "now" },
    "event_type": ["failed_login"],
    "country_code": ["CN"]
  },
  "aggregation": null,
  "message_query": null,
  "sort": [
    { "field": "timestamp", "order": "desc" }
  ],
  "page": 0,
  "size": 10
}
```

Gợi ý query params khi test:

```text
include_summary=true
audit=true
summary_question=[Edited SearchPlan] Original question: Show failed login attempts from China in the last 24h
```

Ví dụ filter/sort không gọi summary và không cần lưu audit:

```text
include_summary=false
audit=false
```

Ví dụ aggregation top N:

```json
{
  "mode": "aggregation",
  "filters": {
    "timestamp": { "from": "now-30d", "to": "now" }
  },
  "aggregation": {
    "type": "top_n",
    "field": "ip",
    "top_n": 5,
    "interval": null,
    "order_by": "value",
    "order": "desc"
  },
  "message_query": null,
  "sort": null,
  "page": 0,
  "size": 10
}
```

Ví dụ aggregation time-series:

```json
{
  "mode": "aggregation",
  "filters": {
    "timestamp": { "from": "now-24h", "to": "now" }
  },
  "aggregation": {
    "type": "date_histogram",
    "field": null,
    "top_n": null,
    "interval": "hour",
    "order_by": null,
    "order": null
  },
  "message_query": null,
  "sort": null,
  "page": 0,
  "size": 10
}
```

## 5. Search History / Investigations

Endpoint:

```http
GET /api/v1/search/history
```

Quyền:

- `SOC_ANALYST`
- `SOC_ADMIN`

Params mẫu:

```text
page=0
size=10
question=failed login
mode=search
status=SUCCESS
pinned=true
sort=created_at,desc
```

Ý nghĩa:

- Lấy history của user hiện tại.
- Hỗ trợ search theo question.
- Có thể lọc theo pinned, mode, status, thời gian.

Lấy chi tiết một query:

```http
GET /api/v1/search/history/{queryId}
```

Pin/unpin query:

```http
PATCH /api/v1/search/history/{queryId}/pin
```

Body:

```json
{
  "pinned": true
}
```

## 6. System Audit Logs

Endpoint:

```http
GET /api/v1/audit-logs
```

Quyền:

- `SOC_ADMIN`

Params mẫu:

```text
page=0
size=10
question=account lockout
identity=admin
mode=aggregation
status=SUCCESS
sort=created_at,desc
```

Ý nghĩa:

- Admin xem audit toàn hệ thống.
- Search question và user identity tách riêng.
- Hỗ trợ filter mode/status/time range.

Export audit CSV:

```http
GET /api/v1/audit-logs/export
```

Params export dùng giống filter audit. Nếu không truyền filter thì export toàn bộ audit logs trong giới hạn backend.

## 7. CSV Export kết quả query

Endpoint:

```http
GET /api/v1/search/{queryId}/export.csv
```

Quyền:

- `SOC_ANALYST`
- `SOC_ADMIN`

Cách test:

1. Gọi `GET /api/v1/search/history`.
2. Copy `query_id` của một record.
3. Gọi `GET /api/v1/search/{queryId}/export.csv`.

Ý nghĩa bảo mật:

- Frontend chỉ gửi `query_id`.
- Backend lấy SearchPlan đã lưu trong PostgreSQL.
- Backend validate/compile lại rồi query Elasticsearch.
- Client không được gửi DSL tự do để export.

## 8. Correct or Refine Query

Endpoint:

```http
POST /api/v1/search/refine
```

Mục đích:

- AI viết lại câu hỏi dựa trên feedback của user.
- Endpoint này không chạy search và không ghi audit.

Payload mẫu:

```json
{
  "original_question": "Show failed login events",
  "current_question": "Show failed login events",
  "current_search_plan": {
    "mode": "search",
    "filters": {
      "timestamp": { "from": "now-24h", "to": "now" },
      "event_type": ["failed_login"]
    },
    "aggregation": null,
    "message_query": null,
    "sort": [
      { "field": "timestamp", "order": "desc" }
    ],
    "page": 0,
    "size": 10
  },
  "refinement": "Limit to China and last 7 days"
}
```

Kết quả mong đợi:

- API trả về câu hỏi tự nhiên đã được refine.
- Frontend dùng câu hỏi mới để chạy lại `/api/v1/search`.

## 9. AI Follow-up Suggestions

Endpoint:

```http
POST /api/v1/suggestions/follow-up
```

Mục đích:

- Sinh gợi ý câu hỏi điều tra tiếp theo.
- Không chạy search.
- Không ghi audit.

Payload mẫu cho search result:

```json
{
  "question": "Show failed login attempts from China in the last 24h",
  "search_plan": {
    "mode": "search",
    "filters": {
      "timestamp": { "from": "now-24h", "to": "now" },
      "event_type": ["failed_login"],
      "country_code": ["CN"]
    },
    "aggregation": null,
    "message_query": null,
    "sort": [
      { "field": "timestamp", "order": "desc" }
    ],
    "page": 0,
    "size": 10
  },
  "result_count": 180,
  "mode": "search",
  "sample_events": [
    {
      "event_type": "failed_login",
      "severity": "high",
      "user": "admin",
      "host": "vpn-gw-01",
      "ip": "203.0.113.45",
      "country_code": "CN"
    }
  ],
  "aggregation_buckets": []
}
```

Payload mẫu cho aggregation:

```json
{
  "question": "Top 5 IP có nhiều event nhất trong 30 ngày qua",
  "search_plan": {
    "mode": "aggregation",
    "filters": {
      "timestamp": { "from": "now-30d", "to": "now" }
    },
    "aggregation": {
      "type": "top_n",
      "field": "ip",
      "top_n": 5,
      "interval": null,
      "order_by": "value",
      "order": "desc"
    },
    "message_query": null,
    "sort": null,
    "page": 0,
    "size": 10
  },
  "result_count": 5,
  "mode": "aggregation",
  "sample_events": [],
  "aggregation_buckets": [
    { "key": "203.0.113.45", "value": 1599 },
    { "key": "10.10.1.15", "value": 1589 }
  ]
}
```

## 10. Health Check

Endpoint:

```http
GET /api/v1/health/live
```

Mục đích:

- Kiểm tra backend còn sống.
- Dùng trong smoke test sau deploy.

## Câu trả lời ngắn khi bảo vệ

Swagger giúp em test backend độc lập với UI. API chính là `POST /api/v1/search` cho câu hỏi tự nhiên và `POST /api/v1/search/plan` cho SearchPlan đã có. Các API protected dùng JWT từ Keycloak. Export CSV không nhận DSL từ client mà chỉ nhận `query_id`, sau đó backend replay SearchPlan đã lưu để đảm bảo an toàn.
