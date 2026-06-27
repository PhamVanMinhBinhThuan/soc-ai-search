# Q8 - SearchPlanCompiler Sinh Elasticsearch DSL Như Thế Nào?

File liên quan:

```text
backend/src/main/java/com/soc/ai/search/search/compiler/SearchPlanCompiler.java
backend/src/main/java/com/soc/ai/search/search/compiler/CompiledSearchQuery.java
backend/src/main/java/com/soc/ai/search/search/plan/SearchPlan.java
backend/src/main/java/com/soc/ai/search/search/plan/SearchFilters.java
backend/src/main/java/com/soc/ai/search/search/plan/AggregationPlan.java
backend/src/main/java/com/soc/ai/search/search/validation/SearchPlanValidator.java
```

`SearchPlanCompiler` là lớp chuyển `SearchPlan` đã validate thành Elasticsearch DSL.

Nói ngắn gọn:

> LLM không được sinh Elasticsearch DSL. Backend compiler là nơi duy nhất sinh DSL từ SearchPlan đã được validate.

---

## 1. Compiler nhận input là gì?

Sau parser và validator, backend có object Java:

```java
SearchPlan plan
```

Ví dụ SearchPlan:

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
  },
  "page": 0,
  "size": 10
}
```

Compiler sẽ biến SearchPlan này thành Elasticsearch DSL dạng `Map<String, Object>`.

---

## 2. Hàm quan trọng nhất: `compile`

Code:

```java
public CompiledSearchQuery compile(SearchPlan plan) {
    var validatedPlan = validator.validate(plan);
    if (validatedPlan.mode() == SearchMode.AGGREGATION) {
        return compileAggregation(validatedPlan);
    }

    return compileSearch(validatedPlan);
}
```

Ý nghĩa:

1. Compiler validate lại SearchPlan.
2. Nếu `mode = aggregation` thì gọi `compileAggregation`.
3. Nếu không thì gọi `compileSearch`.

Điểm quan trọng:

> Compiler validate lại để đảm bảo dù SearchPlan đến từ LLM, manual endpoint hay edited SearchPlan, trước khi sinh DSL vẫn phải pass validator.

---

## 3. Vì sao compiler validate lại?

Trước compiler, parser đã gọi validator rồi. Nhưng compiler vẫn gọi:

```java
var validatedPlan = validator.validate(plan);
```

Lý do:

- Tăng an toàn.
- Đảm bảo mọi luồng đều phải qua validator.
- Nếu sau này có endpoint gọi compiler trực tiếp thì vẫn không bypass được.

Câu nói khi bảo vệ:

> Compiler validate lại SearchPlan trước khi sinh DSL. Đây là defense-in-depth, tránh việc một SearchPlan chưa validate đi thẳng vào Elasticsearch.

---

## 4. Compile search mode

Code:

```java
private CompiledSearchQuery compileSearch(SearchPlan validatedPlan) {
    var searchSpec = new LinkedHashMap<String, Object>();
    var boolQuery = new LinkedHashMap<String, Object>();
    var filters = new ArrayList<Map<String, Object>>();

    addFilters(validatedPlan.filters(), filters);
    boolQuery.put("filter", filters);

    if (hasText(validatedPlan.messageQuery())) {
        boolQuery.put("must", List.of(match("message", validatedPlan.messageQuery())));
    }

    searchSpec.put("query", Map.of("bool", boolQuery));
    searchSpec.put("from", validatedPlan.page() * validatedPlan.size());
    searchSpec.put("size", validatedPlan.size());
    searchSpec.put("sort", List.of(Map.of("timestamp", Map.of("order", "desc"))));

    return new CompiledSearchQuery(searchSpec);
}
```

Ý nghĩa:

Với `mode = search`, compiler sinh DSL để trả raw events.

Nó tạo:

- `query.bool.filter`
- optional `query.bool.must` nếu có `message_query`
- `from`
- `size`
- `sort timestamp desc`

---

## 5. Ví dụ compile search

Input SearchPlan:

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
  },
  "page": 0,
  "size": 10
}
```

Output DSL:

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
        },
        {
          "terms": {
            "country_code": ["CN"]
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

---

## 6. `from` được tính như thế nào?

Code:

```java
searchSpec.put("from", validatedPlan.page() * validatedPlan.size());
searchSpec.put("size", validatedPlan.size());
```

Ví dụ:

| page | size | from |
| --- | --- | --- |
| 0 | 10 | 0 |
| 1 | 10 | 10 |
| 2 | 10 | 20 |

Nếu UI hiển thị Page 1 thì backend page thường là `0`.

---

## 7. Filter được compile như thế nào?

Code:

```java
private void addFilters(SearchFilters searchFilters, List<Map<String, Object>> filters) {
    if (searchFilters == null) {
        return;
    }

    addTimestampRange(searchFilters.timestamp(), filters);
    addTermsFilter("source", searchFilters.source(), filters);
    addTermsFilter("severity", searchFilters.severity(), filters);
    addTermsFilter("event_type", searchFilters.eventType(), filters);
    addTermFilter("user", searchFilters.user(), filters);
    addTermFilter("host", searchFilters.host(), filters);
    addTermFilter("ip", searchFilters.ip(), filters);
    addTermsFilter("country_code", searchFilters.countryCode(), filters);
}
```

Mapping chính:

| SearchPlan filter | Elasticsearch DSL |
| --- | --- |
| `timestamp` | `range` |
| `source` | `terms` |
| `severity` | `terms` |
| `event_type` | `terms` |
| `user` | `term` |
| `host` | `term` |
| `ip` | `term` |
| `country_code` | `terms` |

---

## 8. `timestamp` thành `range`

Code:

```java
private void addTimestampRange(TimeRange timeRange, List<Map<String, Object>> filters) {
    if (timeRange == null) {
        return;
    }

    var range = new LinkedHashMap<String, Object>();
    if (hasText(timeRange.from())) {
        range.put("gte", timeRange.from());
    }
    if (hasText(timeRange.to())) {
        range.put("lte", timeRange.to());
    }

    if (!range.isEmpty()) {
        filters.add(Map.of("range", Map.of("timestamp", range)));
    }
}
```

Input:

```json
{
  "timestamp": {
    "from": "now-24h",
    "to": "now"
  }
}
```

Output DSL:

```json
{
  "range": {
    "timestamp": {
      "gte": "now-24h",
      "lte": "now"
    }
  }
}
```

---

## 9. List filter thành `terms`

Code:

```java
private void addTermsFilter(String field, List<String> values, List<Map<String, Object>> filters) {
    if (values == null || values.isEmpty()) {
        return;
    }

    filters.add(Map.of("terms", Map.of(field, List.copyOf(values))));
}
```

Input:

```json
{
  "event_type": ["failed_login"],
  "country_code": ["CN"]
}
```

Output:

```json
{
  "terms": {
    "event_type": ["failed_login"]
  }
}
```

```json
{
  "terms": {
    "country_code": ["CN"]
  }
}
```

Vì các field dạng list có thể có nhiều giá trị:

```json
{
  "severity": ["high", "critical"]
}
```

---

## 10. Single value filter thành `term`

Code:

```java
private void addTermFilter(String field, String value, List<Map<String, Object>> filters) {
    if (!hasText(value)) {
        return;
    }

    filters.add(Map.of("term", Map.of(field, value)));
}
```

Input:

```json
{
  "user": "admin",
  "host": "vpn-gw-01",
  "ip": "203.0.113.45"
}
```

Output:

```json
{
  "term": {
    "user": "admin"
  }
}
```

```json
{
  "term": {
    "host": "vpn-gw-01"
  }
}
```

```json
{
  "term": {
    "ip": "203.0.113.45"
  }
}
```

---

## 11. `message_query` thành `match`

Code:

```java
if (hasText(validatedPlan.messageQuery())) {
    boolQuery.put("must", List.of(match("message", validatedPlan.messageQuery())));
}
```

Hàm:

```java
private Map<String, Object> match(String field, String value) {
    return Map.of("match", Map.of(field, value));
}
```

Input:

```json
{
  "message_query": "possible brute force"
}
```

Output:

```json
{
  "match": {
    "message": "possible brute force"
  }
}
```

Lưu ý:

> `message_query` chỉ dùng cho free-text search trên message. Các field có cấu trúc như `event_type`, `user`, `country_code` nên dùng filter thay vì message_query.

---

## 12. Compile aggregation mode

Code:

```java
private CompiledSearchQuery compileAggregation(SearchPlan validatedPlan) {
    var searchSpec = new LinkedHashMap<String, Object>();
    var boolQuery = new LinkedHashMap<String, Object>();
    var filters = new ArrayList<Map<String, Object>>();

    addFilters(validatedPlan.filters(), filters);
    boolQuery.put("filter", filters);

    searchSpec.put("query", Map.of("bool", boolQuery));
    searchSpec.put("size", 0);

    var aggregations = aggregations(validatedPlan.aggregation());
    if (!aggregations.isEmpty()) {
        searchSpec.put("aggs", aggregations);
    }

    return new CompiledSearchQuery(searchSpec);
}
```

Ý nghĩa:

Với aggregation:

- vẫn áp dụng filter trước;
- `size = 0` vì không cần raw events;
- nếu aggregation type cần `aggs` thì thêm `aggs`;
- nếu `COUNT` thì không sinh `aggs`.

---

## 13. Vì sao aggregation có `size = 0`?

Aggregation không cần trả danh sách event raw. Nó chỉ cần:

- `hits.total` cho count/total;
- buckets cho group/top/histogram.

Do đó:

```json
"size": 0
```

giúp Elasticsearch không trả `_source` của event, tiết kiệm tài nguyên.

---

## 14. `COUNT` compile thế nào?

Code:

```java
private Map<String, Object> aggregations(AggregationPlan aggregation) {
    return switch (aggregation.type()) {
        case COUNT -> Map.of();
        ...
    };
}
```

Với `COUNT`, compiler trả:

```java
Map.of()
```

Tức là không sinh `aggs`.

Ví dụ SearchPlan:

```json
{
  "mode": "aggregation",
  "filters": {
    "event_type": ["failed_login"]
  },
  "aggregation": {
    "type": "count"
  }
}
```

Output DSL:

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
      ]
    }
  },
  "size": 0
}
```

Backend lấy số lượng từ:

```text
hits.total
```

---

## 15. `GROUP_BY` compile thế nào?

Code:

```java
case GROUP_BY -> termsAggregation("count_by_field", aggregation.field(), bucketLimit(aggregation));
```

Nếu `top_n` không có, dùng default:

```java
private static final int DEFAULT_AGGREGATION_BUCKET_LIMIT = 20;
```

```java
private int bucketLimit(AggregationPlan aggregation) {
    if (aggregation.topN() == null) {
        return DEFAULT_AGGREGATION_BUCKET_LIMIT;
    }

    return aggregation.topN();
}
```

Ví dụ SearchPlan:

```json
{
  "mode": "aggregation",
  "aggregation": {
    "type": "group_by",
    "field": "user"
  }
}
```

Output aggs:

```json
{
  "aggs": {
    "count_by_field": {
      "terms": {
        "field": "user",
        "size": 20
      }
    }
  },
  "size": 0
}
```

Nếu có `top_n = 10` thì:

```json
"size": 10
```

---

## 16. `TOP_N` compile thế nào?

Code:

```java
case TOP_N -> termsAggregation("top_values", aggregation.field(), aggregation.topN());
```

Ví dụ SearchPlan:

```json
{
  "mode": "aggregation",
  "aggregation": {
    "type": "top_n",
    "field": "ip",
    "top_n": 10
  }
}
```

Output aggs:

```json
{
  "aggs": {
    "top_values": {
      "terms": {
        "field": "ip",
        "size": 10
      }
    }
  },
  "size": 0
}
```

Lưu ý:

> `TOP_N` bắt buộc có `top_n`; validator đã kiểm tra trước khi compiler chạy.

---

## 17. `termsAggregation(...)`

Code:

```java
private Map<String, Object> termsAggregation(String aggregationName, String field, int size) {
    return Map.of(
            aggregationName,
            Map.of(
                    "terms",
                    Map.of(
                            "field", field,
                            "size", size)));
}
```

Hàm này sinh DSL terms aggregation.

Ví dụ:

```java
termsAggregation("top_values", "ip", 10)
```

Sinh:

```json
{
  "top_values": {
    "terms": {
      "field": "ip",
      "size": 10
    }
  }
}
```

---

## 18. `DATE_HISTOGRAM` compile thế nào?

Code:

```java
case DATE_HISTOGRAM -> dateHistogramAggregation(aggregation);
```

Hàm:

```java
private Map<String, Object> dateHistogramAggregation(AggregationPlan aggregation) {
    return Map.of(
            "events_over_time",
            Map.of(
                    "date_histogram",
                    Map.of(
                            "field", "timestamp",
                            "fixed_interval", fixedInterval(aggregation),
                            "order", Map.of("_key", "asc"))));
}
```

Ví dụ SearchPlan:

```json
{
  "mode": "aggregation",
  "aggregation": {
    "type": "date_histogram",
    "interval": "hour"
  }
}
```

Output aggs:

```json
{
  "aggs": {
    "events_over_time": {
      "date_histogram": {
        "field": "timestamp",
        "fixed_interval": "1h",
        "order": {
          "_key": "asc"
        }
      }
    }
  },
  "size": 0
}
```

Ý nghĩa:

- luôn dùng field `timestamp`;
- dùng `fixed_interval`;
- sort bucket theo thời gian tăng dần.

---

## 19. Interval mapping

Code:

```java
private String fixedInterval(AggregationPlan aggregation) {
    return switch (aggregation.interval()) {
        case MINUTE -> "1m";
        case HOUR -> "1h";
        case DAY -> "1d";
    };
}
```

Mapping:

| SearchPlan interval | Elasticsearch fixed_interval |
| --- | --- |
| `minute` | `1m` |
| `hour` | `1h` |
| `day` | `1d` |

---

## 20. Compiler trả về gì?

Compiler trả về:

```java
new CompiledSearchQuery(searchSpec)
```

`searchSpec` là Java object/map, không phải JSON string.

Ý nghĩa:

- Backend serialize object này thành JSON khi gọi Elasticsearch.
- Response cũng có thể trả `generated_dsl` dạng object cho frontend.
- Tránh lỗi escaped JSON string kiểu:

```json
{
  "generated_dsl": "{\"query\":...}"
}
```

---

## 21. Compiler không làm gì?

Compiler **không**:

- gọi LLM;
- parse JSON từ LLM;
- gọi Elasticsearch;
- map Elasticsearch response;
- lưu audit;
- quyết định RBAC.

Compiler chỉ:

1. validate lại SearchPlan;
2. chuyển SearchPlan thành DSL object/map.

---

## 22. Câu trả lời mẫu khi hội đồng hỏi

### Compiler có phải nơi gọi Elasticsearch không?

> Không. Compiler chỉ sinh Elasticsearch DSL dạng object/map. `SearchPlanExecutor` mới là nơi gọi Elasticsearch.

### Vì sao phải có compiler riêng?

> Vì LLM và frontend không được sinh DSL. Compiler là lớp backend kiểm soát việc biến SearchPlan đã validate thành DSL an toàn.

### Vì sao aggregation count không có aggs?

> Count chỉ cần tổng số document match filter, Elasticsearch đã trả trong `hits.total`, nên compiler set `size=0` và không sinh `aggs`.

### Vì sao date_histogram không nhận field từ LLM?

> Vì date histogram luôn thống kê theo thời gian, backend cố định field là `timestamp`. LLM chỉ truyền `interval`.

### Compiler có dùng `.keyword` không?

> Không. Mapping MVP đã định nghĩa các field aggregation phù hợp trực tiếp, nên compiler dùng field như `user`, `ip`, `source`, không tự thêm `.keyword`.

### Vì sao DSL là object/map, không phải string?

> Dùng object/map giúp backend serialize JSON an toàn, frontend hiển thị `generated_dsl` như JSON object thật, không bị escaped string.
