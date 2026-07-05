# Elasticsearch Trong Đồ Án SOC AI Search

Tài liệu này tổng hợp các kiến thức Elasticsearch được sử dụng trực tiếp trong đồ án SOC AI Search. Mục tiêu là giúp giải thích vì sao Elasticsearch phù hợp với dữ liệu log bảo mật, hệ thống đang mapping dữ liệu như thế nào, Query DSL/Aggregation DSL hoạt động ra sao và backend kiểm soát truy vấn để tránh rủi ro bảo mật.

## 1. Vai Trò Của Elasticsearch Trong Hệ Thống SOC

Trong hệ thống SOC/SIEM, dữ liệu log bảo mật thường có đặc điểm:

- số lượng lớn;
- có timestamp;
- có nhiều field có cấu trúc như `severity`, `event_type`, `user`, `host`, `ip`;
- có nội dung mô tả tự do như `message`;
- cần vừa tìm kiếm nhanh, vừa thống kê theo thời gian hoặc theo nhóm.

Elasticsearch phù hợp với bài toán này vì hỗ trợ:

- tìm kiếm theo field có cấu trúc;
- full-text search trên nội dung message;
- lọc theo khoảng thời gian;
- aggregation để vẽ dashboard, bar chart, line chart;
- truy vấn tốc độ cao trên dữ liệu log.

Trong đồ án, Elasticsearch dùng để lưu synthetic SOC events trong index:

```text
soc-events-v1
```

Backend là thành phần duy nhất gọi Elasticsearch. Frontend và LLM không gọi Elasticsearch trực tiếp.

## 2. Mapping Của Index `soc-events-v1`

File mapping:

```text
infra/elasticsearch/soc-events-v1-index.json
```

Mapping hiện tại:

```json
{
  "mappings": {
    "dynamic": false,
    "properties": {
      "timestamp": {
        "type": "date"
      },
      "source": {
        "type": "keyword"
      },
      "severity": {
        "type": "keyword"
      },
      "event_type": {
        "type": "keyword"
      },
      "user": {
        "type": "keyword"
      },
      "host": {
        "type": "keyword"
      },
      "ip": {
        "type": "ip"
      },
      "country_code": {
        "type": "keyword"
      },
      "message": {
        "type": "text"
      },
      "raw": {
        "type": "text",
        "index": false
      }
    }
  }
}
```

Ý nghĩa từng field:

| Field | Type | Mục đích |
| --- | --- | --- |
| `timestamp` | `date` | Lọc theo thời gian, tạo line chart bằng `date_histogram`. |
| `source` | `keyword` | Lọc/nhóm theo nguồn log như `windows-auth`, `vpn`, `firewall`, `edr`. |
| `severity` | `keyword` | Lọc/nhóm theo mức độ `critical`, `high`, `medium`, `low`. |
| `event_type` | `keyword` | Lọc/nhóm theo loại event như `failed_login`, `account_lockout`. |
| `user` | `keyword` | Lọc/nhóm theo user. |
| `host` | `keyword` | Lọc/nhóm theo host. |
| `ip` | `ip` | Lọc/nhóm theo địa chỉ IP. |
| `country_code` | `keyword` | Lọc/nhóm theo mã quốc gia như `CN`, `VN`, `US`. |
| `message` | `text` | Full-text search trên mô tả event. |
| `raw` | `text`, `index:false` | Lưu raw log để hiển thị, không cho search trực tiếp. |

## 3. `keyword` Khác Gì `text`?

### 3.1. `keyword`

`keyword` dùng cho dữ liệu cần so khớp chính xác.

Ví dụ:

```json
{
  "event_type": "failed_login",
  "severity": "high",
  "country_code": "CN"
}
```

Khi query:

```json
{
  "terms": {
    "event_type": ["failed_login"]
  }
}
```

Elasticsearch sẽ tìm document có `event_type` đúng bằng `failed_login`.

Phù hợp cho:

- filter chính xác;
- sort;
- aggregation/group by;
- dữ liệu enum/code/id.

Ưu điểm:

- ổn định cho filter;
- tốt cho aggregation;
- không bị tách từ;
- phù hợp với log field có cấu trúc.

Nhược điểm:

- không phù hợp tìm kiếm ngôn ngữ tự nhiên;
- phải match đúng giá trị.

Trong đồ án, các field như `severity`, `event_type`, `source`, `user`, `host`, `country_code` dùng `keyword`.

### 3.2. `text`

`text` dùng cho dữ liệu dạng câu hoặc đoạn mô tả cần full-text search.

Ví dụ:

```json
{
  "message": "Possible brute force: failed login from CN targeting admin"
}
```

Elasticsearch sẽ phân tích nội dung thành token như:

```text
possible, brute, force, failed, login, cn, targeting, admin
```

Khi query:

```json
{
  "match": {
    "message": "brute force login"
  }
}
```

Elasticsearch có thể tìm các event có nội dung liên quan.

Phù hợp cho:

- message log;
- nội dung mô tả dài;
- tìm kiếm keyword tự do;
- full-text search.

Nhược điểm:

- không phù hợp để group by trực tiếp;
- không ổn định bằng exact match;
- có thể phụ thuộc analyzer và scoring.

Trong đồ án, field `message` dùng `text`.

## 4. `dynamic: false` Là Gì?

Trong mapping:

```json
"dynamic": false
```

Điều này có nghĩa là Elasticsearch không tự động thêm field lạ vào mapping.

Ví dụ nếu insert document:

```json
{
  "event_type": "failed_login",
  "severity": "high",
  "unknown_field": "abc"
}
```

Với `dynamic:false`:

- `unknown_field` không được thêm vào mapping;
- không thể search/aggregation trên field lạ đó;
- schema index giữ ổn định.

Ưu điểm:

- tránh mapping bị phình do field rác;
- tránh mapping explosion;
- tăng tính kiểm soát schema;
- phù hợp với backend guardrail và field allowlist.

Nhược điểm:

- nếu muốn search field mới, phải cập nhật mapping/index.

Câu nói khi bảo vệ:

> Em đặt `dynamic:false` để Elasticsearch không tự học field mới. Hệ thống chỉ cho truy vấn trên các field đã định nghĩa và đã được backend allowlist.

## 5. Vì Sao `raw` Có `index:false`?

Mapping:

```json
"raw": {
  "type": "text",
  "index": false
}
```

Ý nghĩa:

- `raw` vẫn được lưu trong `_source`;
- có thể hiển thị trong Event Detail;
- nhưng không được đánh index;
- không thể search/filter trực tiếp bằng `raw`.

Lý do:

- raw log thường dài và khó kiểm soát;
- index raw có thể làm tốn dung lượng;
- tránh người dùng query tự do trên raw log và bypass các field đã kiểm soát.

## 6. Elasticsearch Query DSL Là Gì?

Elasticsearch DSL là ngôn ngữ truy vấn dạng JSON.

Trong đồ án, backend sinh DSL từ `SearchPlan`, không cho LLM hoặc frontend gửi DSL tùy ý.

Ví dụ DSL search:

```json
{
  "query": {
    "bool": {
      "filter": [
        {
          "range": {
            "timestamp": {
              "gte": "now-24h",
              "lte": "now"
            }
          }
        },
        {
          "terms": {
            "event_type": ["failed_login"]
          }
        }
      ]
    }
  },
  "from": 0,
  "size": 10,
  "sort": [
    {
      "timestamp": {
        "order": "desc"
      }
    }
  ]
}
```

Các DSL query chính trong đồ án:

| DSL | Dùng cho | Ví dụ |
| --- | --- | --- |
| `range` | Lọc theo thời gian | `timestamp` từ `now-24h` đến `now`. |
| `terms` | Exact match nhiều giá trị | `event_type` nằm trong `["failed_login"]`. |
| `match` | Full-text search | `message` chứa `brute force`. |
| `bool.filter` | Kết hợp nhiều filter dạng AND | timestamp + severity + event_type. |
| `sort` | Sắp xếp kết quả search | mới nhất trước, severity cao trước. |

## 7. `bool.filter` Khác Gì `must`?

Trong đồ án:

- các filter chính xác như `timestamp`, `severity`, `event_type`, `user`, `host`, `ip`, `country_code` được đưa vào `bool.filter`;
- `message_query` được đưa vào `bool.must` với `match`.

Lý do:

- `filter` phù hợp với điều kiện đúng/sai, không cần tính score;
- `filter` thường cache tốt hơn;
- `must` phù hợp hơn với full-text search có tính relevance/scoring.

Ví dụ:

```json
{
  "query": {
    "bool": {
      "filter": [
        {
          "terms": {
            "event_type": ["failed_login"]
          }
        }
      ],
      "must": [
        {
          "match": {
            "message": "brute force"
          }
        }
      ]
    }
  }
}
```

## 8. Aggregation DSL Trong Đồ Án

Aggregation dùng để thống kê dữ liệu.

Các loại aggregation hệ thống hỗ trợ:

| SearchPlan aggregation | Elasticsearch DSL | UI |
| --- | --- | --- |
| `count` | Không cần `aggs`, lấy `hits.total` | Number/KPI |
| `group_by` | `terms` aggregation | Bar chart |
| `top_n` | `terms` aggregation với `size = top_n` | Bar chart |
| `date_histogram` | `date_histogram` trên `timestamp` | Line chart |

### 8.1. Terms Aggregation

Ví dụ top IP:

```json
{
  "size": 0,
  "aggs": {
    "top_values": {
      "terms": {
        "field": "ip",
        "size": 5,
        "order": {
          "_count": "desc"
        }
      }
    }
  }
}
```

Ý nghĩa:

- nhóm document theo `ip`;
- đếm số event mỗi IP;
- lấy top 5 IP có nhiều event nhất.

### 8.2. Date Histogram

Ví dụ line chart theo giờ:

```json
{
  "size": 0,
  "aggs": {
    "events_over_time": {
      "date_histogram": {
        "field": "timestamp",
        "fixed_interval": "1h",
        "order": {
          "_key": "asc"
        },
        "min_doc_count": 0,
        "extended_bounds": {
          "min": "now-24h",
          "max": "now"
        }
      }
    }
  }
}
```

Ý nghĩa:

- chia dữ liệu thành từng bucket 1 giờ;
- mỗi bucket có `doc_count`;
- `min_doc_count = 0` giúp hiện cả bucket không có log;
- `extended_bounds` giữ trục thời gian ổn định cho dashboard/line chart.

## 9. Backend Gọi Elasticsearch Như Thế Nào?

Code chính:

```text
backend/src/main/java/com/soc/ai/search/search/execution/SearchPlanExecutor.java
```

Luồng:

```text
SearchPlan
  -> SearchPlanCompiler
  -> CompiledSearchQuery
  -> SearchPlanExecutor
  -> POST /soc-events-v1/_search
  -> Elasticsearch response
  -> Response mapper
  -> API response
```

Trong `SearchPlanExecutor`, backend gọi:

```java
var request = new Request("POST", "/" + elasticsearchProperties.indexEvents() + "/_search");
request.setJsonEntity(objectMapper.writeValueAsString(requestBody));
var response = restClient.performRequest(request);
```

Backend luôn bổ sung:

```java
requestBody.put("timeout", "3s");
requestBody.put("track_total_hits", true);
```

Ý nghĩa:

- `timeout = 3s`: tránh query treo quá lâu.
- `track_total_hits = true`: lấy tổng số kết quả chính xác để pagination/summary/export.

## 10. Mapper Đọc Response Elasticsearch

### 10.1. Search Response Mapper

Code:

```text
ElasticsearchSearchResponseMapper.java
```

Mapper đọc:

- `hits.total`;
- `hits.hits[]`;
- `_id`;
- `_source.timestamp`;
- `_source.source`;
- `_source.severity`;
- `_source.event_type`;
- `_source.user`;
- `_source.host`;
- `_source.ip`;
- `_source.country_code`;
- `_source.message`.

Sau đó map thành `SearchEvent` để frontend hiển thị bảng event logs.

### 10.2. Aggregation Response Mapper

Code:

```text
ElasticsearchAggregationResponseMapper.java
```

Mapper đọc:

- `hits.total`;
- `aggregations.count_by_field.buckets`;
- `aggregations.top_values.buckets`;
- `aggregations.events_over_time.buckets`.

Với `date_histogram`, mapper ưu tiên `key_as_string` để frontend format thời gian cho line chart.

## 11. Vì Sao Không Expose Elasticsearch Ra Internet?

Elasticsearch chứa log bảo mật, nên không được public port `9200`.

Nếu expose Elasticsearch, người ngoài có thể:

- đọc dữ liệu log;
- chạy query nặng gây quá tải;
- dò mapping/index;
- nếu cấu hình sai có thể xóa hoặc sửa dữ liệu;
- bypass backend RBAC, validator, compiler và audit.

Trong kiến trúc đồ án:

```text
Frontend -> Backend -> Elasticsearch
```

Không cho:

```text
Frontend/User/LLM -> Elasticsearch
```

Câu trả lời khi bảo vệ:

> Elasticsearch chỉ nằm sau backend. Người dùng và LLM không gọi Elasticsearch trực tiếp. Backend enforce RBAC, validate SearchPlan, compile DSL an toàn, thêm timeout và ghi audit trước khi query.

## 12. Vì Sao Không Cho LLM Sinh DSL Trực Tiếp?

Elasticsearch DSL rất rộng và có nhiều dạng query khó kiểm soát.

Nếu cho LLM sinh DSL trực tiếp, có thể gặp rủi ro:

- sinh field ngoài allowlist;
- sinh `script`;
- sinh `query_string`;
- sinh wildcard nặng;
- tăng `size` quá lớn;
- tạo query tốn tài nguyên;
- bypass audit/validator.

Vì vậy hệ thống dùng:

```text
Natural Language
  -> LLM sinh SearchPlan
  -> Parser
  -> Validator
  -> SearchPlanCompiler
  -> Elasticsearch DSL
  -> Executor
```

Backend mới là nơi sinh DSL cuối cùng.

## 13. Những Điểm Cần Nhớ Khi Vấn Đáp

### Elasticsearch dùng để làm gì trong đồ án?

> Elasticsearch lưu và truy vấn synthetic SOC event logs. Nó hỗ trợ filter theo field, full-text search trên message và aggregation để tạo dashboard/chart.

### Vì sao dùng `keyword` cho `event_type`, `severity`, `user`?

> Vì đây là field có cấu trúc, cần exact match và aggregation ổn định. `keyword` phù hợp cho filter, sort và group by.

### Vì sao `message` dùng `text`?

> Vì `message` là câu mô tả tự do, cần full-text search bằng `match`.

### Vì sao `dynamic:false`?

> Để Elasticsearch không tự thêm field lạ vào mapping. Hệ thống chỉ query trên field đã định nghĩa và backend allowlist.

### Vì sao `raw` không index?

> Raw log chỉ để hiển thị chi tiết, không dùng search. Không index giúp giảm dung lượng và tránh query tự do trên raw log.

### Vì sao aggregation đặt `size = 0`?

> Vì aggregation chỉ cần thống kê bucket, không cần trả raw events.

### Vì sao date histogram có `min_doc_count = 0`?

> Để line chart vẫn hiển thị các khoảng thời gian không có log, giúp trục thời gian ổn định.

### Vì sao không dùng `.keyword` trong DSL?

> Vì mapping của đồ án đã định nghĩa các field cần aggregation là `keyword` trực tiếp, ví dụ `event_type`, `severity`, `user`, `host`. Do đó compiler dùng field trực tiếp, không tự thêm `.keyword`.
