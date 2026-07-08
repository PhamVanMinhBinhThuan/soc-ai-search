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
| `filters` | object | Điều kiện lọc event: thời gian, severity, event_type, user, host, IP, country. |
| `aggregation` | object hoặc `null` | Kế hoạch thống kê. Chỉ dùng khi `mode = "aggregation"`. |
| `message_query` | string hoặc `null` | Tìm kiếm full-text trong trường message. |
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

Field nào không liên quan đến câu hỏi thì có thể để `null` hoặc bỏ qua. Backend chỉ compile các filter có giá trị thật vào Elasticsearch DSL.

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

## LLM hiểu SearchPlan bằng cách nào?

LLM không tự biết cấu trúc `SearchPlan` từ database hay từ Elasticsearch. Backend chủ động đưa cấu trúc này vào prompt thông qua:

```text
backend/src/main/java/com/soc/ai/search/llm/prompt/SearchPlanPromptBuilder.java
```

Trong `SearchPlanPromptBuilder`, backend tạo system prompt có schema, rule, allowlist và ví dụ. Một số câu quan trọng trong prompt:

```text
You convert a natural language SOC event search question into one JSON SearchPlan.
```

Nghĩa là backend giao nhiệm vụ rất rõ: chuyển câu hỏi tự nhiên thành đúng một JSON `SearchPlan`.

```text
Return exactly one raw JSON object.
Do not return markdown, code fences, prose, explanations, or comments.
Do not return Elasticsearch DSL.
Do not add fields outside the SearchPlan schema.
```

Các câu này ép LLM không trả lời văn bản dài, không trả markdown, không sinh Elasticsearch DSL và không thêm field ngoài schema.

Prompt cũng đưa thẳng schema mẫu:

```json
{
  "mode": "search",
  "filters": {
    "timestamp": { "from": "now-24h", "to": "now" },
    "source": ["windows-auth"],
    "severity": ["high", "critical"],
    "event_type": ["failed_login"],
    "user": ["admin", "vpn.user"],
    "host": ["host-001"],
    "ip": ["203.0.113.10"],
    "country_code": ["CN"]
  },
  "message_query": "malware detected",
  "page": 0,
  "size": 20
}
```

Với aggregation, prompt cũng có schema riêng:

```json
{
  "mode": "aggregation",
  "filters": {
    "timestamp": { "from": "now-7d", "to": "now" },
    "event_type": ["failed_login"]
  },
  "aggregation": {
    "type": "group_by",
    "field": "user",
    "top_n": 10,
    "interval": "hour"
  },
  "page": 0,
  "size": 20
}
```

Prompt còn liệt kê rule nghiệp vụ:

```text
Supported modes are "search" and "aggregation".
type must be one of count, group_by, top_n, date_histogram.
interval must be one of minute, hour, day.
date_histogram must include interval and always uses timestamp internally.
Do not add .keyword to any field.
```

Để giảm hallucination, prompt cũng đưa allowlist:

```text
Allowed fields:
- timestamp.from
- timestamp.to
- source
- severity
- event_type
- user
- host
- ip
- country_code
- message_query
- aggregation.type
- aggregation.field
- aggregation.top_n
- aggregation.interval
- page
- size
```

Với aggregation field:

```text
Aggregation field allowlist:
- source
- severity
- event_type
- user
- host
- ip
- country_code
```

Prompt còn đưa giá trị demo có thật để LLM dễ sinh đúng dữ liệu mock:

- severity: `low`, `medium`, `high`, `critical`
- source: `windows-auth`, `vpn`, `firewall`, `edr`, `proxy`, `dns`
- event_type: `failed_login`, `account_lockout`, `malware_detected`, ...
- users: `admin`, `vpn.user`, `finance.user`, ...
- country_code: `VN`, `CN`, `US`, `RU`, `SG`, `DE`
- IP: `203.0.113.45`, `198.51.100.200`, ...

Ví dụ mapping trong prompt:

```text
"failed login", "login thất bại", "đăng nhập thất bại" -> event_type ["failed_login"]
"account lockout", "khóa tài khoản" -> event_type ["account_lockout"]
```

Vì vậy, LLM sinh được `SearchPlan` là nhờ backend đưa cho nó một hợp đồng đầu ra rất rõ: schema, rule, allowlist, giá trị hợp lệ và ví dụ mapping. Tuy nhiên, output của LLM vẫn được xem là dữ liệu chưa tin cậy. Sau đó backend vẫn phải parse, validate và compile lại trước khi query Elasticsearch.

## Nếu hội đồng hỏi: "Em làm như thế nào để AI tạo ra đúng cấu trúc SearchPlan?"

Có thể trả lời theo 4 ý chính:

### 1. Backend không để AI tự đoán format

Em không chỉ gửi câu hỏi người dùng thẳng cho AI rồi mong AI tự hiểu. Backend tạo một **system prompt có cấu trúc** trong:

```text
backend/src/main/java/com/soc/ai/search/llm/prompt/SearchPlanPromptBuilder.java
```

Prompt giao nhiệm vụ rất rõ:

```text
You convert a natural language SOC event search question into one JSON SearchPlan.
```

Nghĩa là AI chỉ có một nhiệm vụ: chuyển câu hỏi tự nhiên thành đúng một JSON `SearchPlan`.

### 2. Prompt định nghĩa rõ output được phép

Trong prompt, backend yêu cầu:

```text
Return exactly one raw JSON object.
Do not return markdown, code fences, prose, explanations, or comments.
Do not return Elasticsearch DSL.
Do not add fields outside the SearchPlan schema.
```

Ý nghĩa:

- AI không được trả lời văn bản giải thích.
- Không được bọc markdown.
- Không được sinh Elasticsearch DSL.
- Không được thêm field lạ ngoài schema.
- Output phải là JSON object thuần để backend parse được.

### 3. Prompt đưa schema, rule, allowlist và giá trị mock

Backend đưa trực tiếp schema mẫu vào prompt, ví dụ:

```json
{
  "mode": "search",
  "filters": {
    "timestamp": { "from": "now-24h", "to": "now" },
    "source": ["windows-auth"],
    "severity": ["high", "critical"],
    "event_type": ["failed_login"],
    "user": ["admin", "vpn.user"],
    "host": ["host-001"],
    "ip": ["203.0.113.10"],
    "country_code": ["CN"]
  },
  "message_query": "malware detected",
  "page": 0,
  "size": 20
}
```

Prompt cũng liệt kê:

- `mode` chỉ gồm `search` hoặc `aggregation`.
- `aggregation.type` chỉ gồm `count`, `group_by`, `top_n`, `date_histogram`.
- `aggregation.field` chỉ được nằm trong allowlist: `source`, `severity`, `event_type`, `user`, `host`, `ip`, `country_code`.
- `severity` chỉ gồm `low`, `medium`, `high`, `critical`.
- `event_type` chỉ gồm các giá trị mock như `failed_login`, `account_lockout`, `malware_detected`, ...
- `source`, `user`, `host`, `ip`, `country_code` cũng có danh sách demo cụ thể.

Nhờ vậy AI có “khung trả lời” và các giá trị hợp lệ để chọn, thay vì tự bịa field hoặc value.

### 4. Backend vẫn parse, validate và compile lại

Dù prompt đã rất chặt, backend vẫn không tin tuyệt đối vào AI. Sau khi LLM trả về SearchPlan:

```text
LLM output
  -> SearchPlanJsonParser parse JSON
  -> SearchPlanValidator kiểm tra rule nghiệp vụ
  -> SearchPlanCompiler sinh Elasticsearch DSL
```

Nếu AI trả markdown, prose, field lạ, time range sai, aggregation sai hoặc DSL trực tiếp thì backend sẽ reject.

Nói ngắn gọn:

> Em làm cho AI sinh đúng SearchPlan bằng cách đưa contract vào prompt: schema, output rules, allowlist, giá trị hợp lệ và ví dụ mapping. Nhưng AI chỉ là bước đề xuất. Backend vẫn parse, validate và compile lại để đảm bảo SearchPlan hợp lệ trước khi query Elasticsearch.

## Câu trả lời ngắn khi bảo vệ

`SearchPlan` là contract trung gian giữa ngôn ngữ tự nhiên và Elasticsearch DSL. LLM hiểu contract này nhờ prompt do backend tạo ra, trong đó có schema, rule, allowlist và ví dụ. Nhưng backend không tin tuyệt đối vào LLM: mọi SearchPlan đều phải qua parser, validator và compiler trước khi sinh Elasticsearch DSL cuối cùng.

## Event ID filter trong SearchPlan

Hệ thống hiện hỗ trợ thêm `event_id` trong `filters` để tra cứu chính xác một hoặc một vài event cụ thể. `event_id` là danh sách UUID và được giới hạn tối đa 20 giá trị trong một SearchPlan.

Ví dụ:

```json
{
  "mode": "search",
  "filters": {
    "event_id": ["6f1d4c8e-1d93-4a27-9e87-9b7a9e9d8a12"],
    "timestamp": { "from": "now-7d", "to": "now" }
  },
  "aggregation": null,
  "message_query": null,
  "sort": [{ "field": "timestamp", "order": "desc" }],
  "page": 0,
  "size": 10
}
```

Lý do giới hạn 20 giá trị: `event_id` là định danh chính xác, thường dùng để trace một số event cụ thể chứ không phải để gửi hàng nghìn ID trong một request. Giới hạn này giúp request nhỏ, dễ kiểm soát và tránh lạm dụng query.
