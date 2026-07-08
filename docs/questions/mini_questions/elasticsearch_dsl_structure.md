# Elasticsearch DSL Structure

## 1. DSL là gì?

Elasticsearch DSL là JSON query mà backend gửi đến Elasticsearch để tìm kiếm hoặc thống kê dữ liệu.

Trong đồ án, frontend và LLM **không được gửi Elasticsearch DSL trực tiếp**. Luồng đúng là:

```text
Natural-language question
  -> LLM sinh SearchPlan
  -> Backend parse/validate SearchPlan
  -> SearchPlanCompiler sinh Elasticsearch DSL
  -> Executor gửi DSL đến Elasticsearch
```

Vì vậy DSL cuối cùng luôn do backend tạo ra và kiểm soát.

## 2. Các field quan trọng trong DSL

| Field | Ý nghĩa |
|---|---|
| `query` | Điều kiện tìm kiếm chính. |
| `bool.filter` | Danh sách filter bắt buộc thỏa mãn. Phù hợp với log/SOC vì không cần scoring. |
| `range` | Lọc theo khoảng, thường dùng cho `timestamp`. |
| `terms` | Lọc nhiều giá trị chính xác, ví dụ nhiều `severity`, `user`, `ip`. |
| `match` | Tìm kiếm full-text trong `message`. |
| `sort` | Sắp xếp kết quả search. |
| `from` | Offset phân trang. Ví dụ page 2, size 10 thì `from = 20`. |
| `size` | Số bản ghi trả về. Với aggregation thường là `0` vì không cần raw events. |
| `aggs` | Phần aggregation/thống kê. |
| `track_total_hits` | Bắt Elasticsearch đếm chính xác tổng số hit. |
| `timeout` | Giới hạn thời gian query ở cấp request. |

Lưu ý: `track_total_hits` và `timeout` có thể không xuất hiện trong `generated_dsl` trả về UI, nhưng executor sẽ thêm trước khi gửi request thật sang Elasticsearch.

Code liên quan:

- `SearchPlanCompiler.java`: sinh `query`, `sort`, `aggs`, `from`, `size`.
- `SearchPlanExecutor.java`: thêm `timeout = "3s"` và `track_total_hits = true`.
- `ExportSearchExecutor.java`: thêm timeout/export tracking riêng cho CSV export.

## 3. Tên aggregation và loại aggregation khác nhau thế nào?

Trong Elasticsearch DSL, phần aggregation có dạng:

```json
"aggs": {
  "<ten_aggregation_do_backend_dat>": {
    "<loai_aggregation_cua_elasticsearch>": {
      "...": "..."
    }
  }
}
```

Ví dụ:

```json
"aggs": {
  "top_values": {
    "terms": {
      "field": "ip",
      "size": 5
    }
  }
}
```

Giải thích:

| Thành phần | Ai định nghĩa? | Ý nghĩa |
|---|---|---|
| `top_values` | Backend tự đặt | Tên aggregation để backend đọc response. Có thể đổi tên nếu mapper đọc đúng. |
| `terms` | Elasticsearch DSL | Loại aggregation thật sự. Dùng để group by/top N theo một field. |
| `field`, `size`, `order` | Elasticsearch DSL | Tham số của `terms aggregation`. |

Trong code hiện tại:

| SearchPlan aggregation type | Tên aggregation backend đặt | Loại aggregation Elasticsearch |
|---|---|---|
| `top_n` | `top_values` | `terms` |
| `group_by` | `count_by_field` | `terms` |
| `date_histogram` | `events_over_time` | `date_histogram` |
| `count` | Không tạo `aggs` riêng | Dùng `hits.total.value` |

## 4. Terms aggregation là gì?

`terms aggregation` là cách Elasticsearch **gom nhóm dữ liệu theo giá trị của một field**.

Ví dụ dữ liệu có field `ip`:

```text
203.0.113.45
203.0.113.45
10.10.1.15
198.51.100.200
203.0.113.45
10.10.1.15
```

`terms aggregation` theo `ip` sẽ tạo bucket:

```text
203.0.113.45      3 events
10.10.1.15        2 events
198.51.100.200    1 event
```

Vì vậy `top_n` trên `ip` được backend chuyển thành `terms aggregation`, rồi Elasticsearch đếm `doc_count` của từng IP và lấy Top N.

## 5. Các loại aggregation Elasticsearch hệ thống đang dùng

### `terms`

Dùng cho `top_n` và `group_by`.

Ví dụ:

```json
"terms": {
  "field": "ip",
  "size": 5,
  "order": {
    "_count": "desc"
  }
}
```

Ý nghĩa:

- `field = ip`: nhóm theo IP.
- `size = 5`: lấy 5 bucket đầu.
- `_count desc`: bucket nào có nhiều event hơn đứng trước.

### `date_histogram`

Dùng cho time-series/line chart.

Ví dụ:

```json
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
```

Ý nghĩa:

- `field = timestamp`: nhóm theo thời gian.
- `fixed_interval = 1h`: mỗi bucket là 1 giờ.
- `_key asc`: sắp xếp theo thời gian tăng dần.
- `min_doc_count = 0`: trả cả bucket không có event.
- `extended_bounds`: giữ đủ trục thời gian từ `from` đến `to`.

### Count

Với `aggregation.type = count`, code hiện tại không tạo `value_count`.

Backend gửi query với:

```json
"size": 0
```

Sau đó lấy tổng số event từ:

```json
hits.total.value
```

## 6. Ví dụ 1 - Search event logs

### SearchPlan

```json
{
  "mode": "search",
  "filters": {
    "timestamp": { "from": "now-24h", "to": "now" },
    "event_type": ["failed_login"],
    "country_code": ["CN"]
  },
  "sort": [
    { "field": "timestamp", "order": "desc" }
  ],
  "page": 0,
  "size": 10
}
```

### Elasticsearch DSL

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

Executor sẽ thêm trước khi gửi Elasticsearch:

```json
{
  "timeout": "3s",
  "track_total_hits": true
}
```

## 7. Ví dụ 2 - Multi-filter search và sort severity

### SearchPlan

```json
{
  "mode": "search",
  "filters": {
    "timestamp": { "from": "now-2d", "to": "now" },
    "severity": ["medium", "high"],
    "event_type": ["account_lockout"],
    "user": ["admin", "vpn.user"]
  },
  "sort": [
    { "field": "severity", "order": "desc" }
  ],
  "page": 0,
  "size": 10
}
```

### Elasticsearch DSL

```json
{
  "query": {
    "bool": {
      "filter": [
        {
          "range": {
            "timestamp": {
              "gte": "now-2d",
              "lte": "now"
            }
          }
        },
        {
          "terms": {
            "severity": ["medium", "high"]
          }
        },
        {
          "terms": {
            "event_type": ["account_lockout"]
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
  "from": 0,
  "size": 10,
  "sort": [
    {
      "_script": {
        "type": "number",
        "order": "desc",
        "script": {
          "lang": "painless",
          "source": "critical=4, high=3, medium=2, low=1"
        }
      }
    }
  ]
}
```

Ghi chú: `severity_rank` **không phải field thật trong mapping hiện tại**. Khi sort theo severity, backend đang dùng `_script` sort trong `SearchPlanCompiler` để xếp hạng:

```text
critical = 4
high     = 3
medium   = 2
low      = 1
```

Vì vậy:

- `desc`: `critical -> high -> medium -> low`
- `asc`: `low -> medium -> high -> critical`

## 8. Ví dụ 3 - Top N aggregation

### SearchPlan

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
    "order_by": "value",
    "order": "desc"
  },
  "page": 0,
  "size": 10
}
```

### Elasticsearch DSL

```json
{
  "query": {
    "bool": {
      "filter": [
        {
          "range": {
            "timestamp": {
              "gte": "now-30d",
              "lte": "now"
            }
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

- `top_values`: tên aggregation do backend đặt.
- `terms`: loại aggregation của Elasticsearch.
- `field = ip`: group by theo IP.
- `size = 5`: lấy Top 5 bucket.
- `_count desc`: IP nào có nhiều event nhất đứng trước.

## 9. Ví dụ 4 - Group by severity

### SearchPlan

```json
{
  "mode": "aggregation",
  "filters": {
    "timestamp": { "from": "now-24h", "to": "now" }
  },
  "aggregation": {
    "type": "group_by",
    "field": "severity",
    "top_n": 10
  }
}
```

### Elasticsearch DSL

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
          "_count": "desc"
        }
      }
    }
  }
}
```

`group_by` và `top_n` đều dùng `terms aggregation`. Điểm khác nhau chủ yếu là ý nghĩa nghiệp vụ:

- `group_by`: xem phân bố theo một field, ví dụ severity distribution.
- `top_n`: lấy các giá trị đứng đầu, ví dụ Top 5 IP.

## 10. Ví dụ 5 - Date histogram / line chart

### SearchPlan

```json
{
  "mode": "aggregation",
  "filters": {
    "timestamp": { "from": "now-24h", "to": "now" }
  },
  "aggregation": {
    "type": "date_histogram",
    "interval": "hour"
  }
}
```

### Elasticsearch DSL

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

## 11. Request/response Elasticsearch thực tế trông như thế nào?

Elasticsearch không truy vấn bằng SQL như PostgreSQL. Backend gửi request HTTP đến Elasticsearch, body là JSON DSL.

Ví dụ nếu PostgreSQL viết:

```sql
SELECT *
FROM events
WHERE event_type = 'failed_login'
ORDER BY timestamp DESC
LIMIT 10;
```

Thì Elasticsearch sẽ nhận request dạng:

```http
POST /soc-events-v1/_search
Content-Type: application/json
```

Body:

```json
{
  "query": {
    "bool": {
      "filter": [
        {
          "term": {
            "event_type": "failed_login"
          }
        }
      ]
    }
  },
  "sort": [
    {
      "timestamp": {
        "order": "desc"
      }
    }
  ],
  "from": 0,
  "size": 10
}
```

### Cấu trúc request DSL thường gặp

```json
{
  "query": {},
  "from": 0,
  "size": 10,
  "sort": [],
  "aggs": {}
}
```

| Field | Ý nghĩa |
|---|---|
| `query` | Điều kiện tìm kiếm/lọc dữ liệu. |
| `from` | Offset phân trang. |
| `size` | Số document cần lấy. Với aggregation thường là `0`. |
| `sort` | Quy tắc sắp xếp kết quả. |
| `aggs` | Phần thống kê/aggregation. |

### Response search event logs

Response gốc của Elasticsearch khá nhiều metadata:

```json
{
  "took": 7,
  "timed_out": false,
  "hits": {
    "total": {
      "value": 180,
      "relation": "eq"
    },
    "hits": [
      {
        "_index": "soc-events-v1",
        "_id": "seed-20260604-3129",
        "_score": null,
        "_source": {
          "event_id": "seed-20260604-3129",
          "timestamp": "2026-07-07T01:16:07Z",
          "source": "vpn",
          "severity": "medium",
          "event_type": "failed_login",
          "user": "admin",
          "host": "vpn-gw-01",
          "ip": "203.0.113.45",
          "country_code": "CN",
          "message": "Failed login from CN targeting admin"
        }
      }
    ]
  }
}
```

| Field | Ý nghĩa |
|---|---|
| `took` | Elasticsearch xử lý query mất bao nhiêu ms. |
| `timed_out` | Query có bị timeout không. |
| `hits.total.value` | Tổng số document phù hợp. |
| `hits.hits` | Danh sách document trả về ở page hiện tại. |
| `_index` | Index chứa document. |
| `_id` | ID nội bộ/document ID. |
| `_source` | Dữ liệu event thật mà hệ thống cần lấy ra. |

Backend sẽ lấy `_source` và map thành DTO đơn giản hơn cho frontend:

```json
{
  "total": 180,
  "page": 0,
  "size": 10,
  "events": [
    {
      "event_id": "seed-20260604-3129",
      "timestamp": "2026-07-07T01:16:07Z",
      "source": "vpn",
      "severity": "medium",
      "event_type": "failed_login",
      "user": "admin",
      "host": "vpn-gw-01",
      "ip": "203.0.113.45",
      "country_code": "CN",
      "message": "Failed login from CN targeting admin"
    }
  ]
}
```

### Response aggregation

Ví dụ Top 5 IP:

```json
{
  "took": 5,
  "timed_out": false,
  "hits": {
    "total": {
      "value": 910,
      "relation": "eq"
    },
    "hits": []
  },
  "aggregations": {
    "top_values": {
      "buckets": [
        {
          "key": "203.0.113.45",
          "doc_count": 188
        },
        {
          "key": "198.51.100.200",
          "doc_count": 149
        }
      ]
    }
  }
}
```

Ý nghĩa:

| Field | Ý nghĩa |
|---|---|
| `aggregations.top_values` | Kết quả aggregation có tên `top_values` do backend đặt trong DSL. |
| `buckets` | Danh sách nhóm kết quả. |
| `key` | Giá trị của bucket, ví dụ một IP. |
| `doc_count` | Số event thuộc bucket đó. |

Backend map response aggregation thành dạng đơn giản hơn:

```json
{
  "aggregation_results": [
    {
      "key": "203.0.113.45",
      "value": 188
    },
    {
      "key": "198.51.100.200",
      "value": 149
    }
  ]
}
```

### Elasticsearch khác PostgreSQL ở đâu?

| PostgreSQL | Elasticsearch |
|---|---|
| Truy vấn bằng SQL. | Truy vấn bằng JSON DSL qua HTTP. |
| Response thường là rows/columns. | Response là JSON gồm metadata, `hits`, `_source`, `aggregations`. |
| Mạnh về transaction, dữ liệu quan hệ, audit/history. | Mạnh về search log, full-text search, filter và aggregation time-series. |

Trong đồ án, frontend không gọi Elasticsearch trực tiếp. Backend che phần response phức tạp này đi:

```text
Frontend gửi SearchPlan
  -> Backend validate SearchPlan
  -> SearchPlanCompiler sinh Elasticsearch DSL
  -> Executor gọi Elasticsearch
  -> Mapper chuẩn hóa response thành events/aggregation_results/total/chart_metadata
  -> Frontend render table/chart
```

Vì vậy frontend không cần hiểu `_index`, `_score`, `hits.hits` hay `aggregations.*.buckets`; frontend chỉ dùng response đã được backend chuẩn hóa.

## 12. Câu trả lời ngắn khi bảo vệ

DSL là JSON query thực thi thật trên Elasticsearch. Tuy nhiên hệ thống không cho frontend hoặc LLM gửi DSL tự do. Backend chỉ nhận `SearchPlan` đã validate, sau đó `SearchPlanCompiler` tự sinh DSL bằng các thành phần an toàn như `bool.filter`, `range`, `terms`, `match`, `terms aggregation` và `date_histogram`.

Trong aggregation, các key như `top_values`, `count_by_field`, `events_over_time` là tên do backend đặt. Còn `terms` và `date_histogram` là loại aggregation chuẩn của Elasticsearch DSL. Cách này giúp backend đọc response ổn định và kiểm soát toàn bộ truy vấn cuối cùng.

## Event ID trong Elasticsearch DSL

Trong Elasticsearch, `_id` là document id kỹ thuật. Hệ thống cũng lưu cùng UUID đó vào `_source.event_id` với mapping `keyword` để có thể filter bằng DSL như các field keyword khác.

SearchPlan:

```json
{
  "filters": {
    "event_id": ["6f1d4c8e-1d93-4a27-9e87-9b7a9e9d8a12"]
  }
}
```

DSL backend sinh ra:

```json
{
  "terms": {
    "event_id": ["6f1d4c8e-1d93-4a27-9e87-9b7a9e9d8a12"]
  }
}
```

Vì `event_id` là `keyword`, Elasticsearch so khớp chính xác UUID, không tokenize như field `text`. Backend vẫn backward-compatible: nếu document cũ chưa có `_source.event_id`, search response có thể fallback về `_id`.
