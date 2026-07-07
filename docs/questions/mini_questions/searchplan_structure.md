# SearchPlan Structure

## SearchPlan là gì?

`SearchPlan` là JSON object do backend tự định nghĩa để mô tả ý định truy vấn của người dùng ở mức nghiệp vụ. LLM chỉ sinh `SearchPlan`, không được sinh Elasticsearch DSL chạy trực tiếp.

Backend sẽ parse, validate, rồi compile `SearchPlan` thành Elasticsearch DSL an toàn.

## Cấu trúc tổng quát

```json
{
  "mode": "search",
  "filters": {},
  "aggregation": null,
  "message_query": null,
  "sort": null,
  "page": 0,
  "size": 10
}
```

## Các trường chính

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `mode` | `"search"` hoặc `"aggregation"` | Chọn chế độ lấy event logs hay thống kê dữ liệu. |
| `filters` | object | Điều kiện lọc event, ví dụ thời gian, severity, event_type, user, host, IP, country. |
| `aggregation` | object hoặc `null` | Kế hoạch thống kê. Chỉ dùng khi `mode = "aggregation"`. |
| `message_query` | string hoặc `null` | Tìm kiếm text trong trường message. |
| `sort` | array hoặc `null` | Sắp xếp kết quả search, ví dụ theo `timestamp` hoặc `severity`. |
| `page` | number | Trang kết quả. Backend/API có thể override khi chạy query. |
| `size` | number | Số dòng mỗi trang, giới hạn tối đa 100. Backend/API có thể override. |

## Filters

```json
{
  "timestamp": { "from": "now-24h", "to": "now" },
  "source": ["windows-auth"],
  "severity": ["high", "critical"],
  "event_type": ["failed_login"],
  "user": ["admin", "vpn.user"],
  "host": ["vpn-gw-01"],
  "ip": ["203.0.113.45"],
  "country_code": ["CN"]
}
```

| Filter | Kiểu | Ghi chú |
|---|---|---|
| `timestamp` | object | Hỗ trợ `now`, `now-<number>h`, `now-<number>d`, hoặc ISO-8601. |
| `source` | array string | Nguồn log, ví dụ `windows-auth`, `vpn`, `firewall`. |
| `severity` | array string | `low`, `medium`, `high`, `critical`. |
| `event_type` | array string | Ví dụ `failed_login`, `account_lockout`, `malware_detected`. |
| `user` | array string | Một hoặc nhiều user. |
| `host` | array string | Một hoặc nhiều host. |
| `ip` | array string | Một hoặc nhiều IPv4. |
| `country_code` | array string | Mã quốc gia ISO-3166 alpha-2, ví dụ `CN`, `VN`, `US`. |

Các field không dùng có thể để `null` hoặc bỏ qua tùy context.

## Aggregation

```json
{
  "type": "top_n",
  "field": "ip",
  "top_n": 5,
  "interval": null,
  "order_by": "value",
  "order": "desc"
}
```

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `type` | `count`, `group_by`, `top_n`, `date_histogram` | Loại thống kê. |
| `field` | string hoặc `null` | Field dùng để group/top, ví dụ `ip`, `user`, `severity`. |
| `top_n` | number hoặc `null` | Số bucket cần lấy, ví dụ top 5 IP. |
| `interval` | `minute`, `hour`, `day` hoặc `null` | Dùng cho `date_histogram`. |
| `order_by` | `value`, `key` hoặc `null` | Sắp xếp bucket theo count/value hoặc theo key. |
| `order` | `asc`, `desc` hoặc `null` | Chiều sắp xếp. |

Aggregation field phải nằm trong allowlist backend: `source`, `severity`, `event_type`, `user`, `host`, `ip`, `country_code`.

## Sort

```json
[
  { "field": "timestamp", "order": "desc" }
]
```

`sort` thường dùng trong `search` mode:

- `timestamp desc`: mới nhất trước.
- `timestamp asc`: cũ nhất trước.
- `severity desc`: ưu tiên mức nghiêm trọng cao trước.
- `severity asc`: ưu tiên mức nghiêm trọng thấp trước.

## Ví dụ 1 - Search event logs

Câu hỏi:

```text
Show failed login attempts from China in the last 24h
```

SearchPlan:

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

Ý nghĩa: lấy danh sách event `failed_login` từ Trung Quốc trong 24 giờ gần nhất, sắp xếp mới nhất trước.

## Ví dụ 2 - Multi-filter search

Câu hỏi:

```text
Show account lockout events for admin or vpn.user in the last 2 days
```

SearchPlan:

```json
{
  "mode": "search",
  "filters": {
    "timestamp": { "from": "now-2d", "to": "now" },
    "event_type": ["account_lockout"],
    "user": ["admin", "vpn.user"]
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

Ý nghĩa: lọc event khóa tài khoản của hai user `admin` hoặc `vpn.user`.

## Ví dụ 3 - Top N aggregation

Câu hỏi:

```text
Top 5 IP có nhiều event nhất trong 30 ngày qua
```

SearchPlan:

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

Ý nghĩa: thống kê top 5 IP có số lượng event cao nhất.

## Ví dụ 4 - Time-series line chart

Câu hỏi:

```text
Số event theo giờ trong 24h qua
```

SearchPlan:

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

Ý nghĩa: tạo line chart theo từng giờ. Backend compile thành `date_histogram` trên field `timestamp`.

## Ví dụ 5 - Count aggregation

Câu hỏi:

```text
Count critical events from Vietnam in the last 7 days
```

SearchPlan:

```json
{
  "mode": "aggregation",
  "filters": {
    "timestamp": { "from": "now-7d", "to": "now" },
    "severity": ["critical"],
    "country_code": ["VN"]
  },
  "aggregation": {
    "type": "count",
    "field": null,
    "top_n": null,
    "interval": null,
    "order_by": null,
    "order": null
  },
  "message_query": null,
  "sort": null,
  "page": 0,
  "size": 10
}
```

Ý nghĩa: đếm tổng số event critical từ Việt Nam trong 7 ngày gần nhất.

## Câu trả lời ngắn khi bảo vệ

`SearchPlan` là contract trung gian giữa ngôn ngữ tự nhiên và Elasticsearch DSL. LLM chỉ sinh SearchPlan theo schema giới hạn. Backend parse, validate, kiểm tra allowlist, rồi compiler mới sinh DSL cuối cùng. Nhờ vậy frontend và LLM không thể gửi DSL tự do để bypass rule bảo mật.
