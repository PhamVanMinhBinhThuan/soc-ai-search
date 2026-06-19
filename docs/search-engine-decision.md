# Quyết Định Search Engine - SOC AI Search MVP

## 1. Kết luận

MVP chọn **Elasticsearch `9.4.2` Basic self-managed** làm search engine duy nhất và dùng **Elasticsearch Query DSL** làm query runtime sau khi backend compile từ `SearchPlan`.

Không triển khai đồng thời Elasticsearch, OpenSearch và ClickHouse trong MVP. Một search engine đã đủ cho yêu cầu tìm kiếm, filter, aggregation, event detail và CSV replay; thêm engine thứ hai sẽ tăng độ phức tạp ingest/test/deploy nhưng chưa tạo thêm giá trị rõ ràng cho bản demo.

## 2. Lý do chọn Elasticsearch

Elasticsearch phù hợp với bài toán SOC event search vì hỗ trợ tốt:

- Full-text search trên `message`.
- Exact filter trên keyword/IP fields.
- Time range query trên `timestamp`.
- Aggregation `terms` cho `group_by`/`top_n`.
- Aggregation `date_histogram` cho time-series.
- Search API, pagination, sorting và `_source` để xem event detail.
- Docker image chính thức và tài liệu phong phú.

Elasticsearch Basic self-managed đủ cho toàn bộ MVP. Các tính năng paid/native nâng cao như Elastic ML anomaly detection, native audit logging cấp cluster, document-level security hoặc native RRF không phải yêu cầu bắt buộc trong đồ án hiện tại.

## 3. Mapping MVP

Index: `soc-events-v1`.

| Field | Elasticsearch type | Dùng cho |
| --- | --- | --- |
| `timestamp` | `date` | Range filter, sort, date histogram |
| `source` | `keyword` | Filter, group/top |
| `severity` | `keyword` | Filter, group/top |
| `event_type` | `keyword` | Filter, group/top |
| `user` | `keyword` | Filter, group/top |
| `host` | `keyword` | Filter, group/top |
| `ip` | `ip` | Exact filter, top IP |
| `country_code` | `keyword` | Filter, group/top |
| `message` | `text` | Full-text `match` |
| `raw` | `text`, `index: false` | Event detail raw log |

Compiler không thêm `.keyword` vì các field aggregation đã là `keyword`/`ip` trực tiếp trong mapping.

## 4. SearchPlan thay vì LLM sinh DSL

MVP không cho LLM sinh Elasticsearch DSL trực tiếp. Luồng đúng là:

```mermaid
flowchart LR
    Q["Natural language question"]
    LLM["LLM"]
    Plan["SearchPlan JSON"]
    Guard["Validator / Guardrail"]
    Compiler["SearchPlanCompiler"]
    DSL["Elasticsearch DSL"]
    ES["Elasticsearch"]

    Q --> LLM --> Plan --> Guard --> Compiler --> DSL --> ES
```

Lý do:

- Dễ reject field/operation ngoài MVP.
- Dễ test DSL shape bằng unit test.
- Tránh LLM sinh `script`, wildcard đắt đỏ, query string tự do hoặc DSL nguy hiểm.
- UI vẫn hiển thị `generated_dsl` để đảm bảo transparency.

## 5. DSL shape trong MVP

Search mode:

- `bool.filter` cho filter chính xác.
- `term` cho `user`, `host`, `ip`.
- `terms` cho list fields như `severity`, `event_type`, `country_code`.
- `range` cho `timestamp`.
- `match` trên `message` khi có `message_query`.
- `sort` mặc định `timestamp desc`.

Aggregation mode:

- `count`: `size = 0`, không sinh `aggs` rỗng; lấy `hits.total`.
- `group_by`: `terms` aggregation, default bucket limit 20 nếu thiếu `top_n`.
- `top_n`: `terms` aggregation, `top_n` bắt buộc 1-100.
- `date_histogram`: field `timestamp`, `fixed_interval` `1m`, `1h`, `1d`.

## 6. So sánh lựa chọn

| Engine | Điểm mạnh | Trade-off | Quyết định MVP |
| --- | --- | --- | --- |
| Elasticsearch Basic | Search-first, full-text tốt, aggregation đủ, nhiều tài liệu, Docker official | JVM cần RAM, một số tính năng advanced cần subscription | Chọn |
| OpenSearch | Tương tự Elasticsearch, Apache 2.0, phù hợp nếu cần ecosystem OpenSearch | Không tạo lợi thế đủ lớn để đổi engine trong MVP | Dự phòng sau MVP |
| ClickHouse | Aggregation/log analytics rất mạnh, SQL dễ đọc | Search relevance và event detail workflow cần thêm đánh giá; không cần cho MVP search-first | Benchmark sau MVP nếu workload analytics rất lớn |

## 7. Vận hành

Local dataset mặc định 10.000 event để nhẹ máy. Trước demo có thể seed lớn hơn bằng script theo batch.

Trên Linux, Elasticsearch cần:

```bash
sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" > /etc/sysctl.d/99-elasticsearch.conf
sysctl --system
```

Elasticsearch không được public trực tiếp trên VPS. Production traffic đi qua backend API và Caddy; Elasticsearch chỉ nằm trong Docker network hoặc bind local khi debug.

## 8. Khi nào xem lại quyết định

Xem lại nếu:

- Dataset tăng lên hàng trăm triệu event và aggregation workload trở thành trọng tâm.
- Cần native vector/hybrid search hoặc advanced ML beyond MVP.
- Tổ chức có sẵn Elastic/OpenSearch/ClickHouse cluster chuẩn nội bộ.
- Yêu cầu multi-tenant/document-level security trở thành bắt buộc ở production.

Với phạm vi đồ án hiện tại, Elasticsearch Basic là lựa chọn cân bằng tốt giữa tốc độ triển khai, khả năng demo, tài liệu và đường mở rộng.