# Q4 - Cách Tạo Prompt Cho LLM Sinh SearchPlan

## 1. Mục tiêu của prompt là gì?

Trong hệ thống SOC AI Search, LLM không được trả lời tự do như chatbot thông thường. Nhiệm vụ của LLM là:

> Chuyển câu hỏi ngôn ngữ tự nhiên của user thành một JSON `SearchPlan`.

Ví dụ user hỏi:

```text
Show me failed login attempts from China in the last 24h
```

LLM nên sinh:

```json
{
  "mode": "search",
  "filters": {
    "timestamp": {
      "from": "now-24h",
      "to": "now"
    },
    "event_type": ["failed_login"],
    "country_code": ["CN"]
  }
}
```

Điểm quan trọng:

- LLM chỉ sinh `SearchPlan`.
- LLM không sinh Elasticsearch DSL.
- LLM không gọi Elasticsearch.
- Backend mới parse, validate, compile DSL và execute query.

Nói khi bảo vệ:

> Prompt của em biến LLM thành một bộ dịch từ natural language sang SearchPlan JSON. LLM không được query dữ liệu trực tiếp. Toàn bộ phần parse, validate và compile DSL nằm ở backend.

---

## 2. Hàm quan trọng nhất trong `SearchPlanPromptBuilder`

File liên quan:

```text
backend/src/main/java/com/soc/ai/search/llm/prompt/SearchPlanPromptBuilder.java
```

Hàm quan trọng nhất:

```java
public String buildSystemPrompt()
```

Lý do:

- Hàm này tạo **system prompt**.
- System prompt là “luật chơi” gửi cho LLM.
- Nó định nghĩa LLM được trả field nào, không được trả field nào.
- Nó dạy LLM schema `SearchPlan`.
- Nó dạy LLM mapping tiếng Anh/tiếng Việt sang `event_type`.
- Nó nhắc LLM không được sinh Elasticsearch DSL.

Các hàm khác:

```java
buildSearchPlanRequest(String userQuestion)
```

Hàm này chỉ đóng gói:

- `systemPrompt`
- `userQuestion`

thành `LlmSearchPlanRequest`.

```java
buildRepairSearchPlanRequest(...)
```

Hàm này dùng khi output LLM sai. Backend gửi lại lỗi parser/validator để LLM sửa SearchPlan một lần.

---

## 3. Prompt gồm những phần nào?

### 3.1. Nhiệm vụ chính

Prompt bắt đầu bằng:

```text
You convert a natural language SOC event search question into one JSON SearchPlan.
```

Dịch:

> Bạn chuyển một câu hỏi tìm kiếm SOC event bằng ngôn ngữ tự nhiên thành một JSON SearchPlan.

Ý nghĩa:

- LLM không trả lời kiểu hội thoại.
- LLM không phân tích dài dòng.
- LLM chỉ tạo JSON SearchPlan.

---

### 3.2. Output rules

Phần này khóa format output:

```text
Return exactly one raw JSON object.
Do not return markdown, code fences, prose, explanations, or comments.
Do not return Elasticsearch DSL.
Do not return Elasticsearch DSL fields such as query, aggs, dsl, script, wildcard, or query_string.
Do not add fields outside the SearchPlan schema.
```

Dịch ý chính:

- Chỉ trả về đúng một JSON object thuần.
- Không markdown.
- Không code fence.
- Không giải thích.
- Không comment.
- Không Elasticsearch DSL.
- Không field lạ ngoài schema.

Ví dụ sai:

```text
Sure, here is the JSON:
{
  "mode": "search"
}
```

Ví dụ sai:

````text
```json
{
  "mode": "search"
}
```
````

Ví dụ sai:

```json
{
  "query": {
    "bool": {
      "filter": []
    }
  }
}
```

Ví dụ đúng:

```json
{
  "mode": "search",
  "filters": {
    "event_type": ["failed_login"]
  }
}
```

Nói khi bảo vệ:

> Prompt cấm markdown, prose và DSL để output có thể parse an toàn bằng backend parser. Sau đó backend vẫn dùng Jackson strict mode để reject nếu LLM vi phạm.

---

### 3.3. Mode của SearchPlan

Prompt quy định:

```text
Supported modes are "search" and "aggregation".
```

Ý nghĩa:

SearchPlan chỉ có hai mode:

| Mode | Ý nghĩa |
| --- | --- |
| `search` | Trả danh sách raw events |
| `aggregation` | Trả thống kê/chart |

Ví dụ `search`:

```json
{
  "mode": "search",
  "filters": {
    "severity": ["critical"]
  }
}
```

Ví dụ `aggregation`:

```json
{
  "mode": "aggregation",
  "filters": {
    "timestamp": {
      "from": "now-7d",
      "to": "now"
    }
  },
  "aggregation": {
    "type": "top_n",
    "field": "ip",
    "top_n": 10
  }
}
```

---

## 4. Vì sao LLM không được sinh Elasticsearch DSL?

Prompt ghi:

```text
Do not return Elasticsearch DSL.
```

Lý do:

Nếu cho LLM sinh DSL trực tiếp, LLM có thể sinh:

- field không nằm trong allowlist;
- query quá nặng;
- `wildcard`;
- `script`;
- `query_string`;
- aggregation sai mapping;
- DSL bypass validator.

Do đó hệ thống dùng kiến trúc:

```text
Natural language
  -> LLM
  -> SearchPlan
  -> Backend Validator
  -> Backend Compiler
  -> Elasticsearch DSL
  -> Elasticsearch
```

Câu trả lời bảo vệ:

> Em không cho LLM sinh DSL trực tiếp vì DSL là tầng query thực thi. Nếu LLM sinh DSL thì có thể bypass allowlist và validator. Thay vào đó, LLM chỉ sinh SearchPlan, backend validate rồi compiler mới sinh DSL.

---

## 5. Structured filters và `message_query`

Prompt ghi:

```text
Prefer structured filters over message_query when the intent matches a supported source, event_type, severity, user, host, ip, or country_code.
Use message_query only for free-text phrases that cannot be represented by structured fields.
```

Dịch:

> Nếu ý định của user khớp với field có cấu trúc thì ưu tiên structured filter. Chỉ dùng `message_query` cho text tự do không biểu diễn được bằng field.

Ví dụ nên dùng structured filter:

```text
Show privilege escalation by admin
```

SearchPlan tốt:

```json
{
  "mode": "search",
  "filters": {
    "event_type": ["privilege_escalation"],
    "user": "admin"
  }
}
```

SearchPlan kém hơn:

```json
{
  "mode": "search",
  "filters": {
    "user": "admin"
  },
  "message_query": "privilege escalation"
}
```

Vì `privilege_escalation` đã là `event_type`, nên dùng field có cấu trúc chính xác hơn.

Ví dụ phù hợp với `message_query`:

```text
Show events containing possible brute force
```

SearchPlan:

```json
{
  "mode": "search",
  "message_query": "possible brute force"
}
```

---

## 6. `source` trong prompt

Prompt có hai rule riêng cho `source`:

```text
Use filters.source for source/vendor/log-origin filters such as windows-auth, vpn, firewall, edr, proxy, or dns.
Use aggregation.field = "source" only when the user asks to group/top/count by source.
```

Ý nghĩa:

### Trường hợp 1 - Filter theo source

User hỏi:

```text
Show EDR events in the last 7 days
```

SearchPlan:

```json
{
  "mode": "search",
  "filters": {
    "source": ["edr"],
    "timestamp": {
      "from": "now-7d",
      "to": "now"
    }
  }
}
```

Ở đây `source` nằm trong `filters`.

### Trường hợp 2 - Aggregation theo source

User hỏi:

```text
Show top log sources in the last 7 days
```

SearchPlan:

```json
{
  "mode": "aggregation",
  "filters": {
    "timestamp": {
      "from": "now-7d",
      "to": "now"
    }
  },
  "aggregation": {
    "type": "top_n",
    "field": "source",
    "top_n": 10
  }
}
```

Ở đây `source` là field dùng để group/top.

---

## 7. Relative time trong prompt

Prompt dạy LLM:

```text
For relative time, preserve the user's requested amount:
last 12 hours -> "now-12h";
last 10 days -> "now-10d";
last 11 days -> "now-11d";
last 12 days -> "now-12d".
```

Ý nghĩa:

LLM phải giữ đúng thời gian user yêu cầu.

Ví dụ:

```text
Show the top 3 source IPs with the most alerts in the last 12 days
```

SearchPlan đúng:

```json
{
  "mode": "aggregation",
  "filters": {
    "timestamp": {
      "from": "now-12d",
      "to": "now"
    }
  },
  "aggregation": {
    "type": "top_n",
    "field": "ip",
    "top_n": 3
  }
}
```

SearchPlan sai:

```json
{
  "filters": {
    "timestamp": {
      "from": "now-30d",
      "to": "now"
    }
  }
}
```

Vì user nói 12 ngày, không phải 30 ngày.

Backend validator hiện hỗ trợ:

- `now`
- `now-<number>h`
- `now-<number>d`
- ISO-8601 absolute timestamp

Guardrail:

- giờ tối đa 720h;
- ngày tối đa 90d;
- reject `now+7d`, `now-0d`, `now-1y`, expression lạ.

---

## 8. Vì sao `count` không có `field`?

Prompt ghi:

```text
count must not include field, top_n, or interval.
```

Dịch:

> Nếu aggregation type là `count`, thì không được có `field`, `top_n`, hoặc `interval`.

Lý do:

`count` nghĩa là:

> Đếm tổng số event khớp với filter.

Ví dụ user hỏi:

```text
How many failed login events happened in the last 24 hours?
```

SearchPlan đúng:

```json
{
  "mode": "aggregation",
  "filters": {
    "timestamp": {
      "from": "now-24h",
      "to": "now"
    },
    "event_type": ["failed_login"]
  },
  "aggregation": {
    "type": "count"
  }
}
```

Luồng xử lý:

1. Filter lọc event `failed_login` trong 24h.
2. Elasticsearch trả `hits.total`.
3. Backend lấy `hits.total` làm count.

Không cần `field` vì không gom theo field nào.

Ví dụ sai:

```json
{
  "aggregation": {
    "type": "count",
    "field": "ip"
  }
}
```

Nếu muốn đếm theo IP, phải dùng `group_by` hoặc `top_n`:

```json
{
  "aggregation": {
    "type": "group_by",
    "field": "ip",
    "top_n": 10
  }
}
```

Câu nói ngắn:

> `count` chỉ đếm tổng số event match filter, nên không cần field. Có field thì không còn là count tổng nữa mà là group/top aggregation.

---

## 9. Vì sao `date_histogram` không có `field` nhưng phải có `interval`?

Prompt ghi:

```text
date_histogram must include interval and always uses timestamp internally.
```

Dịch:

> `date_histogram` bắt buộc có `interval` và backend luôn dùng `timestamp` bên trong.

`date_histogram` dùng cho biểu đồ đường theo thời gian.

Ví dụ user hỏi:

```text
Show failed login trend by hour in the last 24 hours
```

SearchPlan đúng:

```json
{
  "mode": "aggregation",
  "filters": {
    "timestamp": {
      "from": "now-24h",
      "to": "now"
    },
    "event_type": ["failed_login"]
  },
  "aggregation": {
    "type": "date_histogram",
    "interval": "hour"
  }
}
```

Luồng xử lý:

1. Filter lọc event `failed_login` trong 24h.
2. Backend gom các event đó theo thời gian.
3. Field dùng để gom luôn là `timestamp`.
4. `interval` quyết định bucket là phút/giờ/ngày.

Không cần `field` vì backend đã quy ước:

> Histogram thời gian luôn dùng `timestamp`.

Bắt buộc cần `interval` vì backend phải biết gom theo:

- `minute`
- `hour`
- `day`

Ví dụ sai vì thiếu interval:

```json
{
  "aggregation": {
    "type": "date_histogram"
  }
}
```

Ví dụ sai vì truyền field:

```json
{
  "aggregation": {
    "type": "date_histogram",
    "field": "user",
    "interval": "hour"
  }
}
```

Câu nói ngắn:

> `date_histogram` là thống kê theo thời gian, nên backend luôn dùng field `timestamp`. LLM chỉ cần nói gom theo phút, giờ hay ngày bằng `interval`.

---

## 10. Page/size trong câu hỏi tự nhiên có được tin không?

Prompt ghi:

```text
page and size may be omitted. Backend owns pagination and will override them from the API request.
```

Ý nghĩa:

Nếu user hỏi:

```text
Show failed login events, page = 2, size = 15
```

LLM có thể sinh:

```json
{
  "page": 2,
  "size": 15
}
```

Nhưng backend không tin page/size do LLM sinh từ câu hỏi. Backend lấy `page` và `size` từ API request thật.

Ví dụ frontend gửi:

```json
{
  "question": "Show failed login events, page = 2, size = 15",
  "page": 0,
  "size": 10
}
```

Backend override SearchPlan thành:

```json
{
  "page": 0,
  "size": 10
}
```

UI render:

- page backend = `0`, UI thường hiển thị là Page 1.
- size = `10`.
- bảng tối đa 10 events.

Nếu frontend thật sự gửi:

```json
{
  "question": "Show failed login events, page = 2, size = 15",
  "page": 2,
  "size": 15
}
```

Backend giữ:

- `page = 2`
- `size = 15`

UI render:

- page backend = `2`, UI thường hiển thị là Page 3.
- tối đa 15 events.

Câu nói ngắn:

> Page/size nằm trong câu hỏi tự nhiên không có quyền quyết định. Backend override bằng page/size từ API request để LLM không tự tăng size gây tốn tài nguyên.

---

## 11. Event type mapping trong prompt

Prompt có danh sách mapping:

```text
"failed login", "login thất bại", "đăng nhập thất bại" -> event_type ["failed_login"]
"account lockout", "khóa tài khoản" -> event_type ["account_lockout"]
"firewall block", "blocked by firewall", "tường lửa chặn" -> event_type ["firewall_block"]
"malware", "malware detected", "mã độc" -> event_type ["malware_detected"]
"privilege escalation", "leo thang đặc quyền" -> event_type ["privilege_escalation"]
"suspicious outbound", "outbound đáng ngờ" -> event_type ["suspicious_outbound"]
"data exfiltration", "rò rỉ dữ liệu" -> event_type ["data_exfiltration"]
```

Ý nghĩa:

LLM được dạy rằng một cụm tiếng Anh/tiếng Việt nên map về `event_type` chuẩn nào.

Ví dụ:

```text
Show privilege escalation by admin
```

Nên ra:

```json
{
  "filters": {
    "event_type": ["privilege_escalation"],
    "user": "admin"
  }
}
```

Không nên ra:

```json
{
  "filters": {
    "user": "admin"
  },
  "message_query": "privilege escalation"
}
```

Vì `privilege_escalation` đã là structured `event_type`.

---

## 12. Known demo values để giảm hallucination

Prompt liệt kê các giá trị demo:

Users:

```text
admin, vpn.user, finance.user, svc.backup, alice, bob, analyst1, guest01, jdoe, unknown
```

Sources:

```text
windows-auth, vpn, firewall, edr, proxy, dns
```

Hosts:

```text
dc-01, vpn-gw-01, finance-ws-07, endpoint-014, endpoint-023, proxy-01, dns-01, srv-app-02, firewall-edge-01
```

Countries:

```text
VN, CN, US, RU, SG, DE
```

IPs:

```text
203.0.113.45, 203.0.113.77, 198.51.100.200, 192.0.2.88, 10.10.1.15, 10.10.2.24, 10.20.5.33, 172.16.10.42, 192.168.20.55
```

Ý nghĩa:

- Giúp LLM biết dataset demo có những giá trị nào.
- Giảm việc LLM bịa user/host/source.
- Tăng khả năng demo ra kết quả đúng.

---

## 13. Prompt không phải lớp bảo mật duy nhất

Điểm rất quan trọng khi bảo vệ:

> Prompt chỉ là lớp hướng dẫn. Backend mới là lớp kiểm soát bắt buộc.

Sau khi LLM trả output, backend vẫn kiểm tra bằng:

1. `SearchPlanJsonParser`
2. Jackson strict mode
3. Bean Validation
4. `SearchPlanValidator`
5. `SearchPlanCompiler`
6. RBAC
7. Audit log

Nếu LLM làm sai:

- trả markdown;
- trả prose;
- thêm field lạ;
- sinh DSL;
- dùng field không được allowlist;
- sinh `top_n > 100`;
- sinh `now-9999d`;
- sinh `script`;

thì backend reject.

---

## 14. Câu hỏi hội đồng có thể hỏi

### Vì sao cần system prompt dài như vậy?

> Vì LLM cần biết rõ schema SearchPlan, field allowlist, aggregation rule và dữ liệu demo. Prompt càng rõ thì khả năng LLM sinh đúng JSON càng cao. Tuy nhiên backend vẫn validate lại nên hệ thống không phụ thuộc hoàn toàn vào prompt.

### Nếu LLM vẫn sinh sai thì sao?

> Backend parser/validator sẽ reject. Service có repair tối đa một lần. Nếu vẫn sai thì trả lỗi có kiểm soát và không query Elasticsearch.

### Vì sao không dùng luôn text search thay vì SearchPlan?

> Text search tự do khó kiểm soát field, aggregation, pagination và security. SearchPlan giúp backend kiểm soát cấu trúc query và sinh DSL an toàn.

### Vì sao `count` không cần field?

> Vì `count` chỉ đếm tổng số event match filter. Nếu cần đếm theo field thì dùng `group_by` hoặc `top_n`.

### Vì sao `date_histogram` không cần field?

> Vì histogram thời gian luôn dùng `timestamp`. LLM chỉ cần truyền `interval` để biết gom theo phút/giờ/ngày.

### Nếu user ghi page/size trong câu hỏi thì sao?

> Backend không tin page/size do LLM sinh ra. Backend override bằng page/size từ API request để kiểm soát tài nguyên.

---

## 15. Câu trả lời ngắn nên học thuộc

> `buildSystemPrompt()` là nơi backend định nghĩa luật cho LLM. Prompt yêu cầu LLM chỉ sinh một JSON SearchPlan thuần, không markdown, không prose, không Elasticsearch DSL. Nó mô tả schema search/aggregation, field allowlist, event_type/source/severity hợp lệ, rule thời gian, rule aggregation và mapping tiếng Việt/tiếng Anh sang event_type. Tuy nhiên prompt chỉ là hướng dẫn; backend vẫn parse, validate và compile lại nên không tin LLM tuyệt đối.
