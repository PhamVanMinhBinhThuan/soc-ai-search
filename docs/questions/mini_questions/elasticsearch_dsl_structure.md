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

## 11. Câu trả lời ngắn khi bảo vệ

DSL là JSON query thực thi thật trên Elasticsearch. Tuy nhiên hệ thống không cho frontend hoặc LLM gửi DSL tự do. Backend chỉ nhận `SearchPlan` đã validate, sau đó `SearchPlanCompiler` tự sinh DSL bằng các thành phần an toàn như `bool.filter`, `range`, `terms`, `match`, `terms aggregation` và `date_histogram`.

Trong aggregation, các key như `top_values`, `count_by_field`, `events_over_time` là tên do backend đặt. Còn `terms` và `date_histogram` là loại aggregation chuẩn của Elasticsearch DSL. Cách này giúp backend đọc response ổn định và kiểm soát toàn bộ truy vấn cuối cùng.
