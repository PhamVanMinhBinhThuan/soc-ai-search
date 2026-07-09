# Swagger API Testing Guide

Tài liệu này dùng để test nhanh toàn bộ API chính của SOC AI Search bằng Swagger UI.

## 1. Mở Swagger UI

Local:

```text
http://localhost:8080/swagger-ui.html
```

Production:

```text
https://api.soc-ai-search.app/swagger-ui.html
```

Trong Swagger, chọn server:

```text
https://api.soc-ai-search.app - Production API over HTTPS
```

hoặc:

```text
http://localhost:8080 - Local backend
```

## 2. Authorize bằng JWT

Nếu backend bật Keycloak auth, cần bấm **Authorize** và nhập access token.

Cách lấy token nhanh:

1. Đăng nhập frontend.
2. Mở DevTools bằng `F12`.
3. Vào tab **Network**.
4. Thực hiện một request bất kỳ, ví dụ search.
5. Chọn request gửi đến API.
6. Copy giá trị token trong header:

```http
Authorization: Bearer eyJ...
```

Trong popup Swagger `Authorize`, chỉ dán phần token bắt đầu bằng `eyJ...`.

Đúng:

```text
eyJhbGciOiJSUzI1NiIsInR5cCI...
```

Không dán:

```text
Bearer eyJhbGciOiJSUzI1NiIsInR5cCI...
```

Lý do: Swagger UI tự thêm prefix `Bearer ` khi gửi request.

Nếu token sai hoặc hết hạn, API sẽ trả `401 Unauthorized`. Nếu token hợp lệ nhưng thiếu role, API sẽ trả `403 Forbidden`.

## 3. Thứ tự API nên demo

| Thứ tự | Nhóm API | Endpoint chính | Input chính | Output chính | Ý nghĩa |
|---:|---|---|---|---|---|
| 1 | Natural Language Search | `POST /api/v1/search` | Câu hỏi tự nhiên, page, size | `query_id`, SearchPlan, DSL, events/aggregation, summary | Flow quan trọng nhất: NL question -> LLM -> SearchPlan -> DSL -> Elasticsearch. |
| 2 | SearchPlan Execution | `POST /api/v1/search/plan` | SearchPlan JSON, query params | Search/aggregation response | Chạy SearchPlan đã có, dùng cho edit/filter/sort/rerun/dashboard. |
| 3 | Query Refinement | `POST /api/v1/search/refine` | Original question, current question, SearchPlan, feedback | Rewritten question | AI sửa hoặc refine câu hỏi, chưa chạy search. |
| 4 | Follow-up Suggestions | `POST /api/v1/suggestions/follow-up` | Question, SearchPlan, result context | 3 suggested questions | AI đề xuất bước điều tra tiếp theo. |
| 5 | CSV Export | `GET /api/v1/search/{queryId}/export.csv` | `queryId` | File CSV | Export kết quả bằng query_id, không nhận DSL từ client. |
| 6 | Search History and Audit | `GET /api/v1/search/history`, `GET /api/v1/audit-logs` | Filter, pagination | Paged history/audit logs | Xem investigation history và system audit logs. |
| 7 | Auth | `GET /api/v1/auth/me` | JWT | User identity + roles | Kiểm tra user hiện tại và role. |
| 8 | Events | `POST /api/v1/events`, `GET /api/v1/events/{event_id}` | Event payload hoặc event_id | Ingest/detail response | API ingest và xem chi tiết event. |
| 9 | Health | `GET /api/v1/health/live` | Không cần token | `{ "status": "UP" }` | Smoke test backend còn sống. |

## 4. Natural Language Search

### Endpoint

```http
POST /api/v1/search
```

### Quyền

- `SOC_VIEWER`
- `SOC_ANALYST`
- `SOC_ADMIN`

### Request body

| Field | Required | Ví dụ | Ý nghĩa |
|---|---|---|---|
| `question` | Có | `"Show failed login attempts from China in the last 24h"` | Câu hỏi tự nhiên để LLM chuyển thành SearchPlan. |
| `audit_question` | Không | `"[AI Corrected] Original question: ..."` | Câu hiển thị/lưu audit nếu cần đánh dấu AI corrected, edited, filtered. |
| `page` | Có | `0` | Trang kết quả, bắt đầu từ 0. |
| `size` | Có | `10` | Số kết quả mỗi trang, tối đa 100. |

### Ví dụ search event logs

```json
{
  "question": "Show failed login attempts from China in the last 24h",
  "page": 0,
  "size": 10
}
```

### Ví dụ tiếng Việt

```json
{
  "question": "Số event theo giờ trong 24h qua",
  "page": 0,
  "size": 10
}
```

### Ví dụ top N

```json
{
  "question": "Top 5 IP có nhiều event nhất trong 30 ngày qua",
  "page": 0,
  "size": 10
}
```

### Output cần quan sát

- `query_id`: ID dùng để export/rerun/detail history.
- `search_plan`: SearchPlan đã validate.
- `generated_dsl`: Elasticsearch DSL backend compile ra.
- `total`: tổng số kết quả match.
- `events`: event logs nếu mode là `search`.
- `aggregation_results`: buckets nếu mode là `aggregation`.
- `summary`: AI summary nếu sinh thành công.
- `summary_source`: `llm` hoặc `deterministic`.

## 5. SearchPlan Execution

### Endpoint

```http
POST /api/v1/search/plan
```

### Quyền

- `SOC_VIEWER`
- `SOC_ANALYST`
- `SOC_ADMIN`

### Query params

| Param | Required | Default | Ý nghĩa |
|---|---|---|---|
| `include_summary` | Không | `false` | `true` thì backend sinh summary. |
| `audit` | Không | `true` | `true` thì lưu history/audit. |
| `summary_question` | Không | `"Edited SearchPlan"` | Câu hỏi/context dùng cho summary và audit. |

### Khi nào dùng endpoint này?

- Dashboard dùng SearchPlan có sẵn để lấy số liệu.
- Filter/sort/page chạy lại SearchPlan đã chỉnh ở frontend.
- Edit SearchPlan/rerun không cần gọi LLM sinh SearchPlan mới.

### Ví dụ search mode

Query params gợi ý:

```text
include_summary=true
audit=true
summary_question=Show failed login attempts from China in the last 24h
```

Body:

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

### Ví dụ filter/sort không gọi summary, không lưu audit

Query params:

```text
include_summary=false
audit=false
```

Body:

```json
{
  "mode": "search",
  "filters": {
    "timestamp": { "from": "now-7d", "to": "now" },
    "severity": ["critical", "high"],
    "user": ["admin", "vpn.user"]
  },
  "aggregation": null,
  "message_query": null,
  "sort": [
    { "field": "severity", "order": "desc" }
  ],
  "page": 0,
  "size": 10
}
```

### Ví dụ Event ID advanced filter

```json
{
  "mode": "search",
  "filters": {
    "timestamp": { "from": "now-30d", "to": "now" },
    "event_id": [
      "550e8400-e29b-41d4-a716-446655440000"
    ]
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

Lưu ý: `event_id` hỗ trợ tối đa 20 giá trị.

### Ví dụ top N aggregation

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

### Ví dụ time-series aggregation

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

## 6. Query Refinement

### Endpoint

```http
POST /api/v1/search/refine
```

### Quyền

- `SOC_VIEWER`
- `SOC_ANALYST`
- `SOC_ADMIN`

### Request body

| Field | Required | Ý nghĩa |
|---|---|---|
| `original_question` | Có | Câu hỏi gốc ban đầu của user. |
| `current_question` | Có | Câu hỏi hiện tại sau các lần refine/edit trước đó. |
| `current_search_plan` | Có | SearchPlan hiện tại để AI hiểu context đang chạy. |
| `refinement` | Có | Feedback của user, ví dụ đổi thời gian, thêm user, sửa intent. |

### Ví dụ

```json
{
  "original_question": "Show failed login events from China in the last 24h",
  "current_question": "Show failed login events from China in the last 24h",
  "current_search_plan": {
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
  "refinement": "add admin and make it 7 days"
}
```

### Output

API trả câu hỏi đã rewrite/refine. Endpoint này chỉ rewrite question, không chạy search và không ghi audit. Frontend dùng câu hỏi mới đó để gọi lại `POST /api/v1/search`.

## 7. Follow-up Suggestions

### Endpoint

```http
POST /api/v1/suggestions/follow-up
```

### Quyền

- `SOC_VIEWER`
- `SOC_ANALYST`
- `SOC_ADMIN`

### Request body

| Field | Required | Ý nghĩa |
|---|---|---|
| `question` | Có | Câu hỏi hiện tại. |
| `search_plan` | Có | SearchPlan đã chạy. |
| `result_count` | Có | Tổng số kết quả hiện tại. |
| `mode` | Có | `search` hoặc `aggregation`. |
| `sample_events` | Không | Tối đa 5 event mẫu gần nhất. |
| `aggregation_buckets` | Không | Tối đa 5 bucket mẫu. |

### Ví dụ search result

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

### Ví dụ aggregation result

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

### Output

API trả danh sách suggestion, mỗi item gồm:

- `title`
- `question`

Khi user click suggestion trên UI, hệ thống chỉ điền vào ô search, không tự chạy search.

## 8. CSV Export

### Endpoint

```http
GET /api/v1/search/{queryId}/export.csv
```

### Quyền

- `SOC_ANALYST`
- `SOC_ADMIN`

### Path params

| Param | Required | Ý nghĩa |
|---|---|---|
| `queryId` | Có | UUID của query đã lưu trong PostgreSQL. |

### Cách test

1. Gọi `POST /api/v1/search` hoặc `GET /api/v1/search/history`.
2. Copy `query_id`.
3. Gọi:

```http
GET /api/v1/search/{queryId}/export.csv
```

### Output

- File `soc-ai-search.csv`.
- Header `X-Export-Truncated: true/false`.
- Tối đa 10.000 dòng trong MVP.

### Ý nghĩa bảo mật

Frontend chỉ gửi `query_id`. Backend lấy SearchPlan đã lưu, validate/compile lại rồi query Elasticsearch. Client không được gửi DSL tự do để export.

## 9. Search History and Audit

### 9.1. Get current user's investigation history

```http
GET /api/v1/search/history
```

Quyền:

- `SOC_ANALYST`
- `SOC_ADMIN`

Query params:

| Param | Required | Ví dụ | Ý nghĩa |
|---|---|---|---|
| `page` | Không | `0` | Trang hiện tại. |
| `size` | Không | `10` | Số record mỗi trang. |
| `pinned` | Không | `true` | Chỉ lấy query được pin. |
| `status` | Không | `SUCCESS` | Lọc trạng thái. |
| `mode` | Không | `search` | Lọc mode search/aggregation. |
| `question` hoặc `q` | Không | `failed login` | Search theo question. |
| `from` | Không | `2026-07-01T00:00:00Z` | Lọc từ thời điểm. |
| `to` | Không | `2026-07-09T00:00:00Z` | Lọc đến thời điểm. |
| `sort` | Không | `created_at,desc` | Sắp xếp. |

Ví dụ:

```text
page=0&size=10&question=failed login&mode=search&status=SUCCESS&sort=created_at,desc
```

### 9.2. Get history detail

```http
GET /api/v1/search/history/{queryId}
```

Path params:

| Param | Required | Ý nghĩa |
|---|---|---|
| `queryId` | Có | UUID của query history. |

### 9.3. Pin/unpin query

```http
PATCH /api/v1/search/history/{queryId}/pin
```

Body:

```json
{
  "pinned": true
}
```

### 9.4. Get system audit logs

```http
GET /api/v1/audit-logs
```

Quyền:

- `SOC_ADMIN`

Query params:

| Param | Required | Ví dụ | Ý nghĩa |
|---|---|---|---|
| `page` | Không | `0` | Trang hiện tại. |
| `size` | Không | `10` | Số record mỗi trang. |
| `status` | Không | `SUCCESS` | Lọc trạng thái. |
| `mode` | Không | `aggregation` | Lọc search/aggregation. |
| `question` hoặc `q` | Không | `account lockout` | Search theo question. |
| `identity` | Không | `admin` | Search theo user identity. |
| `from` | Không | `2026-07-01T00:00:00Z` | Lọc từ thời điểm. |
| `to` | Không | `2026-07-09T00:00:00Z` | Lọc đến thời điểm. |
| `sort` | Không | `created_at,desc` | Sắp xếp. |

Ví dụ:

```text
page=0&size=10&question=account lockout&identity=admin&mode=search&status=SUCCESS
```

### 9.5. Export audit CSV

```http
GET /api/v1/audit-logs/export
```

Quyền:

- `SOC_ADMIN`

Params giống `GET /api/v1/audit-logs`. Nếu có filter thì export đúng kết quả filter. Nếu không có filter thì export toàn bộ audit logs trong giới hạn 10.000 dòng.

## 10. Auth

### Endpoint

```http
GET /api/v1/auth/me
```

### Quyền

- Cần JWT hợp lệ.

### Input

Không cần body. Token lấy từ Swagger `Authorize`.

### Output

Thông tin user hiện tại và role.

API này hữu ích để kiểm tra token đang là `SOC_VIEWER`, `SOC_ANALYST` hay `SOC_ADMIN`.

## 11. Events

Events API chủ yếu dùng cho ingest/mock/test data. Khi demo core AI Search, không cần mở đầu bằng nhóm này.

### 11.1. Ingest one event

```http
POST /api/v1/events
```

Quyền:

- `SOC_ADMIN`

Body:

```json
{
  "timestamp": "2026-07-09T01:00:00Z",
  "source": "vpn",
  "severity": "high",
  "event_type": "failed_login",
  "user": "admin",
  "host": "vpn-gw-01",
  "ip": "203.0.113.45",
  "country_code": "CN",
  "message": "Failed login attempt for admin from suspicious IP",
  "raw": "ts=2026-07-09T01:00:00Z source=vpn event_type=failed_login severity=high user=admin host=vpn-gw-01 ip=203.0.113.45 country_code=CN message=\"Failed login attempt for admin from suspicious IP\""
}
```

### 11.2. Bulk ingest events

```http
POST /api/v1/events/bulk
```

Quyền:

- `SOC_ADMIN`

Body:

```json
{
  "events": [
    {
      "timestamp": "2026-07-09T01:00:00Z",
      "source": "vpn",
      "severity": "high",
      "event_type": "failed_login",
      "user": "admin",
      "host": "vpn-gw-01",
      "ip": "203.0.113.45",
      "country_code": "CN",
      "message": "Failed login attempt for admin from suspicious IP",
      "raw": "ts=2026-07-09T01:00:00Z source=vpn event_type=failed_login severity=high user=admin host=vpn-gw-01 ip=203.0.113.45 country_code=CN message=\"Failed login attempt for admin from suspicious IP\""
    }
  ]
}
```

Tối đa 1000 events/request.

### 11.3. Get event detail

```http
GET /api/v1/events/{event_id}
```

Quyền:

- `SOC_VIEWER` xem metadata.
- `SOC_ANALYST`/`SOC_ADMIN` xem được raw log.

Path params:

| Param | Required | Ý nghĩa |
|---|---|---|
| `event_id` | Có | Event ID/Elasticsearch document ID. |

## 12. Health

### Endpoint

```http
GET /api/v1/health/live
```

### Quyền

- Public, không cần token.

### Output

```json
{
  "status": "UP"
}
```

API này dùng trong smoke test sau deploy để kiểm tra backend còn hoạt động.

## 13. Câu trả lời ngắn khi bảo vệ

Swagger giúp em test backend độc lập với UI. Thứ tự API được sắp theo flow demo: natural-language search trước, sau đó SearchPlan execution, AI refinement, follow-up suggestions, export CSV, history/audit, auth, event ingest và health check.

API quan trọng nhất là `POST /api/v1/search`, vì nó thể hiện pipeline từ câu hỏi tự nhiên sang SearchPlan, validate, compile DSL và query Elasticsearch. API `POST /api/v1/search/plan` dùng khi hệ thống đã có SearchPlan, ví dụ filter/sort/dashboard/rerun. Export CSV không nhận DSL từ client mà chỉ nhận `query_id`, sau đó backend replay SearchPlan đã lưu để đảm bảo an toàn.
