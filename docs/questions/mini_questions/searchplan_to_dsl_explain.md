# Giải Thích Quy Trình Chuyển Đổi: SearchPlan -> Elasticsearch DSL

Tài liệu này giải thích cách hệ thống biên dịch `SearchPlan` thành `Elasticsearch DSL`. Đây là lõi kỹ thuật quan trọng của SOC AI Search: LLM chỉ được sinh ra kế hoạch truy vấn có cấu trúc, còn backend mới là nơi validate, compile và execute query.

## 1. Vì sao cần SearchPlan trung gian?

Thay vì yêu cầu LLM sinh thẳng Elasticsearch DSL, hệ thống yêu cầu LLM trích xuất ý định người dùng thành một JSON đơn giản gọi là `SearchPlan`.

Lý do:

- **Dễ kiểm soát:** `SearchPlan` có schema cố định, ít field, dễ validate.
- **An toàn hơn:** LLM không được sinh trực tiếp các DSL nguy hiểm như `script`, `query_string`, wildcard nặng hoặc query ngoài allowlist.
- **Dễ debug:** Analyst có thể đọc `SearchPlan` dễ hơn đọc DSL dài.
- **Dễ mở rộng:** Nếu sau này đổi Elasticsearch sang hệ khác, có thể giữ `SearchPlan` và viết compiler mới.

Câu nói ngắn khi bảo vệ:

> LLM không được chạy query trực tiếp. LLM chỉ sinh `SearchPlan`; backend validate rồi compile thành Elasticsearch DSL. Nhờ vậy quyền kiểm soát truy vấn nằm ở backend.

## 2. SearchPlan Có Những Trường Gì?

`SearchPlan` là contract trung gian giữa natural language và Elasticsearch DSL.

Ví dụ cấu trúc đầy đủ:

```json
{
  "mode": "search",
  "filters": {
    "timestamp": {
      "from": "now-24h",
      "to": "now"
    },
    "source": ["windows-auth"],
    "severity": ["high", "critical"],
    "event_type": ["failed_login"],
    "user": ["admin", "vpn.user"],
    "host": ["vpn-gw-01"],
    "ip": ["203.0.113.45"],
    "country_code": ["CN"]
  },
  "aggregation": null,
  "message_query": "brute force",
  "sort": [
    {
      "field": "severity",
      "order": "desc"
    }
  ],
  "page": 0,
  "size": 10
}
```

Các trường chính:

| Trường | Ý nghĩa |
| --- | --- |
| `mode` | Chọn kiểu truy vấn: `search` hoặc `aggregation`. |
| `filters.timestamp` | Khoảng thời gian, ví dụ `now-24h`, `now-7d`, hoặc ISO-8601. |
| `filters.source` | Nguồn log, ví dụ `windows-auth`, `vpn`, `firewall`, `edr`. |
| `filters.severity` | Mức độ nghiêm trọng: `critical`, `high`, `medium`, `low`. |
| `filters.event_type` | Loại event: `failed_login`, `account_lockout`, `malware_detected`, ... |
| `filters.user` | User liên quan, có thể một hoặc nhiều giá trị. |
| `filters.host` | Host liên quan, có thể một hoặc nhiều giá trị. |
| `filters.ip` | Source IP liên quan, có thể một hoặc nhiều giá trị. |
| `filters.country_code` | Mã quốc gia ISO alpha-2, ví dụ `CN`, `VN`, `US`. |
| `message_query` | Tìm kiếm full-text trên field `message`. |
| `aggregation` | Cấu hình thống kê nếu `mode = aggregation`. |
| `sort` | Cách sắp xếp kết quả search. |
| `page`, `size` | Phân trang. Backend override theo request để LLM không tự tăng size. |

## 3. Aggregation Trong SearchPlan

Nếu `mode = aggregation`, trường `aggregation` sẽ quyết định cách thống kê.

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

Các loại aggregation:

| `aggregation.type` | Ý nghĩa | DSL sinh ra |
| --- | --- | --- |
| `count` | Đếm tổng số event match filter | Không cần `aggs`, dùng `hits.total`. |
| `group_by` | Nhóm theo field, ví dụ severity/user/country | `terms` aggregation. |
| `top_n` | Lấy top N giá trị xuất hiện nhiều nhất | `terms` aggregation với `size = top_n`. |
| `date_histogram` | Thống kê theo thời gian | `date_histogram` trên field `timestamp`. |

Field aggregation được allowlist:

```text
source, severity, event_type, user, host, ip, country_code
```

## 4. Elasticsearch DSL Có Những Trường Gì?

Sau khi compile, backend tạo Elasticsearch DSL dạng object/map. DSL thường có các phần sau:

| DSL field | Ý nghĩa |
| --- | --- |
| `query.bool.filter` | Danh sách filter chính xác, không tính score. |
| `query.bool.must` | Full-text search trên `message` nếu có `message_query`. |
| `from` | Offset phân trang, bằng `page * size`. |
| `size` | Số record trả về. Với aggregation thường là `0`. |
| `sort` | Sắp xếp kết quả search. |
| `aggs` | Aggregation nếu `mode = aggregation`. |

Mapping phổ biến:

| SearchPlan | Elasticsearch DSL |
| --- | --- |
| `timestamp.from/to` | `range` trên `timestamp` với `gte/lte`. |
| `source`, `severity`, `event_type`, `user`, `host`, `ip`, `country_code` | `terms` filter. |
| `message_query` | `match` query trên field `message`. |
| `sort.field = timestamp` | Sort trực tiếp theo `timestamp`. |
| `sort.field = severity` | Sort bằng `_script` để map `critical > high > medium > low`. |
| `aggregation.type = group_by/top_n` | `terms` aggregation. |
| `aggregation.type = date_histogram` | `date_histogram` aggregation. |

## 5. Backend Đã Convert SearchPlan -> DSL Như Thế Nào?

Code chính:

```text
backend/src/main/java/com/soc/ai/search/search/compiler/SearchPlanCompiler.java
backend/src/main/java/com/soc/ai/search/search/compiler/CompiledSearchQuery.java
```

Hàm quan trọng nhất:

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

1. Compiler **validate lại** SearchPlan trước khi sinh DSL.
2. Nếu `mode = aggregation`, gọi `compileAggregation`.
3. Nếu `mode = search`, gọi `compileSearch`.

Việc validate lại là defense-in-depth:

> Dù SearchPlan đến từ LLM, editable SearchPlan, filter/sort UI hay export replay, trước khi sinh DSL vẫn phải đi qua validator.

### 5.1. Compile Search

Với `mode = search`, backend:

1. Tạo `bool.filter`.
2. Add các filter từ `SearchPlan.filters`.
3. Nếu có `message_query`, add `bool.must.match`.
4. Thêm `from`, `size`.
5. Thêm `sort`.

Code tương ứng:

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
    searchSpec.put("sort", sort(validatedPlan));

    return new CompiledSearchQuery(searchSpec);
}
```

### 5.2. Compile Aggregation

Với `mode = aggregation`, backend:

1. Vẫn tạo `bool.filter` để lọc dataset trước.
2. Set `size = 0` vì không cần raw events.
3. Sinh `aggs` tùy theo `aggregation.type`.

Code tương ứng:

```java
private CompiledSearchQuery compileAggregation(SearchPlan validatedPlan) {
    var searchSpec = new LinkedHashMap<String, Object>();
    var boolQuery = new LinkedHashMap<String, Object>();
    var filters = new ArrayList<Map<String, Object>>();

    addFilters(validatedPlan.filters(), filters);
    boolQuery.put("filter", filters);

    searchSpec.put("query", Map.of("bool", boolQuery));
    searchSpec.put("size", 0);

    var aggregations = aggregations(validatedPlan);
    if (!aggregations.isEmpty()) {
        searchSpec.put("aggs", aggregations);
    }

    return new CompiledSearchQuery(searchSpec);
}
```

### 5.3. Add Filter

Backend convert filter bằng hàm `addFilters`:

```java
private void addFilters(SearchFilters searchFilters, List<Map<String, Object>> filters) {
    if (searchFilters == null) {
        return;
    }

    addTimestampRange(searchFilters.timestamp(), filters);
    addTermsFilter("source", searchFilters.source(), filters);
    addTermsFilter("severity", searchFilters.severity(), filters);
    addTermsFilter("event_type", searchFilters.eventType(), filters);
    addTermsFilter("user", searchFilters.user(), filters);
    addTermsFilter("host", searchFilters.host(), filters);
    addTermsFilter("ip", searchFilters.ip(), filters);
    addTermsFilter("country_code", searchFilters.countryCode(), filters);
}
```

Điểm quan trọng:

- `timestamp` -> `range`.
- Các field còn lại -> `terms`.
- Field nào `null` hoặc empty thì bỏ qua, không sinh DSL rỗng.

## 6. Ví Dụ 1 - Search Nhiều Filter + Full-text + Sort Severity

Câu hỏi:

> Show high or critical failed login events from China for admin or vpn.user in the last 24h containing brute force, sorted by highest severity.

SearchPlan:

```json
{
  "mode": "search",
  "filters": {
    "timestamp": {
      "from": "now-24h",
      "to": "now"
    },
    "severity": ["high", "critical"],
    "event_type": ["failed_login"],
    "user": ["admin", "vpn.user"],
    "country_code": ["CN"]
  },
  "message_query": "brute force",
  "sort": [
    {
      "field": "severity",
      "order": "desc"
    }
  ],
  "page": 0,
  "size": 10
}
```

DSL được sinh:

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
            "severity": ["high", "critical"]
          }
        },
        {
          "terms": {
            "event_type": ["failed_login"]
          }
        },
        {
          "terms": {
            "user": ["admin", "vpn.user"]
          }
        },
        {
          "terms": {
            "country_code": ["CN"]
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
  },
  "from": 0,
  "size": 10,
  "sort": [
    {
      "_script": {
        "type": "number",
        "order": "desc",
        "script": {
          "lang": "painless",
          "source": "if (doc['severity'].size() == 0) return 0; def value = doc['severity'].value; if (value == 'critical') return 4; if (value == 'high') return 3; if (value == 'medium') return 2; if (value == 'low') return 1; return 0;"
        }
      }
    }
  ]
}
```

Giải thích:

- `severity`, `event_type`, `user`, `country_code` đều là exact filter nên dùng `terms`.
- `message_query` là full-text nên dùng `match`.
- Sort severity không sort alphabet, mà backend dùng `_script` để tạo thứ tự nghiệp vụ:

```text
critical = 4
high = 3
medium = 2
low = 1
```

## 7. Ví Dụ 2 - Top N Aggregation Theo IP Sau Khi Lọc Event Type Và User

Câu hỏi:

> Show top 5 source IPs for failed_login events targeting admin or vpn.user in the last 7 days.

SearchPlan:

```json
{
  "mode": "aggregation",
  "filters": {
    "timestamp": {
      "from": "now-7d",
      "to": "now"
    },
    "event_type": ["failed_login"],
    "user": ["admin", "vpn.user"]
  },
  "aggregation": {
    "type": "top_n",
    "field": "ip",
    "top_n": 5,
    "order_by": "value",
    "order": "desc"
  },
  "page": 0,
  "size": 10
}
```

DSL được sinh:

```json
{
  "query": {
    "bool": {
      "filter": [
        {
          "range": {
            "timestamp": {
              "gte": "now-7d",
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
            "user": ["admin", "vpn.user"]
          }
        }
      ]
    }
  },
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

Giải thích:

- Aggregation không cần raw events nên `size = 0`.
- Dữ liệu được lọc trước bằng `bool.filter`.
- Sau đó Elasticsearch thống kê top IP bằng `terms` aggregation.
- `order_by = value` được backend map thành `_count`, tức sắp xếp theo số event.

## 8. Ví Dụ 3 - Group By Severity Và Sắp Xếp Bucket Thấp Nhất Trước

Câu hỏi:

> Group events by severity in the last 24 hours and show lowest bucket first.

SearchPlan:

```json
{
  "mode": "aggregation",
  "filters": {
    "timestamp": {
      "from": "now-24h",
      "to": "now"
    }
  },
  "aggregation": {
    "type": "group_by",
    "field": "severity",
    "top_n": 10,
    "order_by": "value",
    "order": "asc"
  },
  "page": 0,
  "size": 10
}
```

DSL được sinh:

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
        }
      ]
    }
  },
  "size": 0,
  "aggs": {
    "count_by_field": {
      "terms": {
        "field": "severity",
        "size": 10,
        "order": {
          "_count": "asc"
        }
      }
    }
  }
}
```

Giải thích:

- `group_by` và `top_n` đều dùng `terms`.
- Khác nhau chủ yếu ở tên aggregation và cách chọn `size`.
- Nếu `group_by` không có `top_n`, backend dùng default bucket limit là `20`.

## 9. Ví Dụ 4 - Date Histogram Cho Line Chart Có Empty Buckets

Câu hỏi:

> Show failed_login trend by hour in the last 24 hours.

SearchPlan:

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
  },
  "page": 0,
  "size": 10
}
```

DSL được sinh:

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

Giải thích:

- `date_histogram` luôn chạy trên field `timestamp`.
- `interval = hour` được backend map thành `fixed_interval = 1h`.
- `order._key = asc` để line chart đi theo thứ tự thời gian.
- `min_doc_count = 0` và `extended_bounds` giúp line chart vẫn hiển thị các giờ không có dữ liệu.

Điểm này quan trọng với dashboard/SOC monitoring:

> Biểu đồ thời gian không bị co lại chỉ vì một số bucket không có log.

## 10. Ví Dụ 5 - Count Aggregation

Câu hỏi:

> Count account_lockout events in the last 7 days.

SearchPlan:

```json
{
  "mode": "aggregation",
  "filters": {
    "timestamp": {
      "from": "now-7d",
      "to": "now"
    },
    "event_type": ["account_lockout"]
  },
  "aggregation": {
    "type": "count"
  },
  "page": 0,
  "size": 10
}
```

DSL được sinh:

```json
{
  "query": {
    "bool": {
      "filter": [
        {
          "range": {
            "timestamp": {
              "gte": "now-7d",
              "lte": "now"
            }
          }
        },
        {
          "terms": {
            "event_type": ["account_lockout"]
          }
        }
      ]
    }
  },
  "size": 0
}
```

Vì sao `count` không có `aggs`?

Elasticsearch `_search` response luôn có:

```json
"hits": {
  "total": {
    "value": 123
  }
}
```

Nên với count, backend chỉ cần filter đúng document rồi lấy `hits.total`. Không cần tạo aggregation riêng.

## 11. Những Guardrail Khi Convert

Trước khi compile DSL, backend dùng validator để kiểm soát:

- `mode` chỉ là `search` hoặc `aggregation`.
- `mode = search` thì không được có `aggregation`.
- `mode = aggregation` thì bắt buộc có `aggregation`.
- `size` giới hạn từ 1 đến 100.
- `top_n` giới hạn từ 1 đến 100.
- Relative time giới hạn tối đa `720h` hoặc `90d`.
- Field aggregation phải nằm trong allowlist.
- Chặn field lạ, expression lạ, `script`, `query_string`, wildcard không kiểm soát.

Sau đó compiler chỉ sinh DSL theo các template cố định:

- `range`
- `terms`
- `match`
- `terms aggregation`
- `date_histogram`
- sort theo timestamp hoặc severity rank

Compiler không có code sinh:

- `_delete_by_query`
- `_update_by_query`
- `DELETE /index`
- bulk write
- DSL tùy ý từ client

## 12. Câu Trả Lời Mẫu Khi Hội Đồng Hỏi

**Câu hỏi:** Quá trình convert từ SearchPlan sang Elasticsearch DSL diễn ra như thế nào?

**Trả lời:**

> Dạ, quá trình này được thực hiện hoàn toàn ở backend trong `SearchPlanCompiler`. Sau khi LLM sinh `SearchPlan`, backend parse và validate trước. Compiler validate lại một lần nữa, sau đó tùy theo `mode` sẽ đi vào nhánh `compileSearch` hoặc `compileAggregation`. Với search, backend map `timestamp` thành `range`, các field như `severity`, `event_type`, `user`, `host`, `ip`, `country_code` thành `terms`, `message_query` thành `match`, rồi thêm phân trang và sort. Với aggregation, backend vẫn lọc dữ liệu trước, set `size = 0`, sau đó sinh `terms` aggregation cho `group_by/top_n`, hoặc `date_histogram` cho biểu đồ thời gian. DSL chỉ được sinh bởi backend, không phải do LLM hay frontend gửi tự do, nên hệ thống kiểm soát được field, size, aggregation và giảm rủi ro query nguy hiểm.

**Câu hỏi:** Vì sao không cho LLM sinh DSL trực tiếp?

**Trả lời:**

> Vì Elasticsearch DSL rất rộng và có nhiều dạng query khó kiểm soát. Nếu cho LLM sinh DSL trực tiếp, LLM có thể sinh field ngoài allowlist hoặc query gây tốn tài nguyên. `SearchPlan` là contract trung gian nhỏ hơn, dễ validate hơn. Backend chỉ compile các mẫu DSL an toàn đã định nghĩa sẵn.

**Câu hỏi:** Nếu user edit SearchPlan thì có bypass được không?

**Trả lời:**

> Không. SearchPlan do user edit vẫn đi qua cùng validator và compiler. DSL không cho edit trực tiếp. Nếu SearchPlan sai schema hoặc vượt guardrail, backend reject trước khi gọi Elasticsearch.
