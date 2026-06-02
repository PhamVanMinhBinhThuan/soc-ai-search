# Lựa chọn search engine cho SOC AI Search

## Kết luận

Chọn **Elasticsearch self-managed** với gói **Basic miễn phí** làm search engine duy nhất cho MVP và dùng **Elasticsearch Query DSL** làm query thực thi.

Ở thời điểm đánh giá ngày **31/05/2026**, nên pin image Docker ở phiên bản `docker.elastic.co/elasticsearch/elasticsearch:9.4.2` thay vì dùng tag `latest`. Elasticsearch `9.4.2` được phát hành ngày `28/05/2026` theo [danh sách release chính thức](https://www.elastic.co/downloads/past-releases?product=elasticsearch) và bao gồm các bản vá bảo mật quan trọng so với `9.4.1`. Nếu dùng Kibana trong môi trường phát triển, nên pin cùng phiên bản `9.4.2`, chỉ bật tùy chọn qua Docker Compose profile `tools`, không dùng để thay thế frontend React và không expose public trên VPS.

Không nên triển khai đồng thời Elasticsearch, OpenSearch và ClickHouse trong MVP. Một engine đã đáp ứng đủ phạm vi bắt buộc trong [requirement.md](./requirement.md); thêm engine thứ hai làm tăng khối lượng ingest, đồng bộ dữ liệu, test và xử lý lỗi nhưng chưa tạo thêm giá trị rõ ràng cho bản demo.

## Vì sao chọn Elasticsearch

Đề tài cần giải quyết đồng thời:

- Tìm event theo full-text và các filter có cấu trúc.
- Thống kê `COUNT`, `GROUP BY`, `TOP N`, time bucket.
- Trả kết quả qua REST API, pagination và export CSV.
- Có đường mở rộng sang semantic search, kNN và hybrid search nếu còn thời gian.
- Đóng gói bằng Docker Compose và dễ demo với dataset từ 10.000 event.

Elasticsearch phù hợp vì đây là search và analytics engine phổ biến, có nhiều tài liệu, ví dụ và client library. Điều này thuận lợi cho sinh viên khi cần tự học, xử lý lỗi và hoàn thành MVP trong thời gian giới hạn.

Các khả năng cần cho MVP đều có trong gói Basic miễn phí:

- [`match`](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query) dùng cho full-text trên `message`.
- [`bool.filter`](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-bool-query) dùng cho filter chính xác như thời gian, severity, event type, user, host và IP.
- [`terms`](https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-terms-aggregation) và [`date_histogram`](https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-datehistogram-aggregation) đáp ứng `GROUP BY`, `TOP N` và time bucket.
- [Aggregations](https://www.elastic.co/docs/explore-analyze/query-filter/aggregations) hỗ trợ thêm `avg`, `sum`, `min`, `max`, `cardinality`, `percentiles` và nested aggregation cho phần khuyến khích.
- [`dense_vector`](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/dense-vector) và [kNN search](https://www.elastic.co/docs/solutions/search/vector/knn) cho phép bổ sung semantic search mà không cần thay kho event.
- Tài liệu chính thức có sẵn hướng dẫn [chạy Elasticsearch bằng Docker Compose](https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-docker-compose).

Elasticsearch self-managed có gói Basic miễn phí, không hết hạn theo [tài liệu quản lý license](https://www.elastic.co/docs/deploy-manage/license/manage-your-license-in-self-managed-cluster). Khi cần dùng tính năng nâng cao thuộc gói trả phí, có thể đăng ký subscription phù hợp hoặc dùng trial để đánh giá trước. Nên kiểm tra lại [subscription matrix](https://www.elastic.co/subscriptions) tại thời điểm triển khai vì ranh giới tính năng có thể thay đổi theo phiên bản và chính sách của Elastic.

## Phạm vi gói Basic cho đề tài

### MVP bắt buộc

Toàn bộ MVP có thể hoàn thành với Elasticsearch Basic miễn phí:

| Yêu cầu | Cách thực hiện với Basic |
| --- | --- |
| Index và ingest event | REST API hoặc Bulk API |
| Full-text search | Query DSL: `match`, `bool`, `term`, `range` |
| Thống kê cơ bản | Aggregation: `terms`, `date_histogram`, metrics |
| Pagination và event detail | Search API và `_source` |
| Chart và export CSV | Frontend và backend của ứng dụng |
| NL -> Query | Backend gọi OpenAI, Claude, Gemini hoặc model local |
| Tóm tắt kết quả bằng LLM | Backend gọi LLM sau khi rút gọn kết quả |
| Lịch sử truy vấn | Lưu vào database hoặc index riêng |
| Audit log truy vấn | Backend tự ghi user, thời điểm, câu hỏi, Query DSL, số kết quả và latency |
| Docker Compose | Elasticsearch self-managed single-node cho demo |

Cần phân biệt hai loại audit log:

- **Audit log của ứng dụng** là yêu cầu MVP. Backend tự ghi mọi truy vấn của người dùng và dùng được với Basic.
- **Native Elasticsearch audit logging** ghi sâu các sự kiện authentication, authorization và request ở cấp cluster. Tính năng này thuộc gói trả phí theo [subscription matrix](https://www.elastic.co/subscriptions) và [audit logging docs](https://www.elastic.co/docs/deploy-manage/security/logging-configuration/security-event-audit-logging). MVP không cần phụ thuộc vào tính năng này.

### Chức năng khuyến khích

| Chức năng | Dùng Basic được không? | Ghi chú |
| --- | --- | --- |
| Multi-turn và lưu hội thoại | Có | Backend tự lưu context theo session |
| Query suggestion | Có | Dùng suggest API, template hoặc LLM |
| Saved query và dashboard | Có | Có thể tự lưu hoặc dùng Kibana Basic |
| Aggregation nâng cao | Có | `percentiles`, `cardinality`, `avg`, `sum`, multi-level aggregation |
| Embedding bằng model hoặc API bên ngoài | Có | Ví dụ BGE, E5 hoặc embedding API |
| Lưu vector và tìm event tương tự | Có | Dùng `dense_vector` và kNN |
| Hybrid search BM25 + vector | Có điều kiện | Chạy hai truy vấn và tự trộn kết quả trong backend |
| Native RRF hybrid search của Elasticsearch | Không | `RRF` tích hợp sẵn thuộc gói Enterprise theo [subscription matrix](https://www.elastic.co/subscriptions) |
| Phát hiện bất thường tự viết | Có | Dùng rule, z-score, clustering hoặc thư viện ngoài |
| Native Elastic ML anomaly detection | Không | Thuộc gói Platinum hoặc Enterprise |
| Multi-tenant bằng index riêng + RBAC | Có | Mỗi tenant dùng index riêng; RBAC (role-based access control) đã miễn phí trong Basic từ 2021, có thể gán role giới hạn theo index |
| Multi-tenant trong cùng index bằng document-level security | Không | Field-level và document-level security thuộc gói Platinum hoặc Enterprise |

Như vậy, Elasticsearch Basic không giới hạn việc hoàn thành MVP. Các tính năng trả phí chỉ trở thành vấn đề khi chọn dùng trực tiếp khả năng nâng cao tích hợp sẵn của Elastic thay vì tự triển khai ở backend.

## So sánh ngắn

| Phương án | Điểm mạnh | Điểm cần cân nhắc | Kết luận cho MVP |
| --- | --- | --- | --- |
| **Elasticsearch Basic** | Phổ biến, nhiều tài liệu, search-first, full-text và aggregation tốt, REST API, vector search miễn phí | Bản phân phối mặc định theo Elastic License; một số tính năng nâng cao cần subscription | **Chọn** |
| **OpenSearch** | Search-first, full-text và aggregation tốt, Apache License 2.0, **native RRF hybrid search miễn phí** (không cần trả phí như Elasticsearch), vector search có sẵn | Hệ sinh thái và tài liệu phù hợp nhưng không tạo lợi thế đủ lớn so với Elastic trong bối cảnh đồ án này | Phương án thay thế tốt |
| **ClickHouse** | SQL dễ đọc, aggregation rất mạnh, phù hợp log cực lớn và workload analytics nặng | Search là hướng phát triển mới hơn; cần chấp nhận thêm rủi ro tích hợp và kiểm thử relevance cho MVP search-first | Benchmark sau MVP nếu có nhu cầu |

Elasticsearch và OpenSearch đều đủ năng lực kỹ thuật cho phần bắt buộc. Quyết định chọn Elasticsearch ưu tiên tính phổ biến, tài liệu và khả năng tìm hỗ trợ khi phát triển. [FAQ license của Elastic](https://www.elastic.co/pricing/faq/licensing/) cần được đọc lại nếu hệ thống chuyển từ đồ án sang sản phẩm thực tế hoặc cung cấp như một dịch vụ.

ClickHouse cũng không còn là phương án chỉ dành cho thống kê. [ClickHouse full-text search](https://clickhouse.com/blog/full-text-search-ga-release) đã GA và dùng inverted index; [vector similarity search](https://clickhouse.com/blog/clickhouse-2025-roundup) đã GA từ phiên bản `25.8`. Dù vậy, ưu tiên hiện tại là hoàn thành MVP ổn định, chưa phải tối ưu cho hàng tỷ event.

## Cách dùng trong MVP

### Kiến trúc tối giản

```text
Frontend
   |
Backend REST API
   |-- LLM: câu hỏi tự nhiên -> SearchPlan
   |-- Validator + compiler: SearchPlan -> Elasticsearch Query DSL
   |-- Audit log + query history
   |
Elasticsearch 9.4.2 Basic
```

Chỉ dùng Elasticsearch làm kho event. Backend tự phân loại:

- `search`: trả danh sách event và pagination.
- `aggregate`: trả buckets để frontend chọn bar chart, pie chart hoặc line chart.

Không để LLM gửi Query DSL tùy ý thẳng vào Elasticsearch. Nên cho LLM sinh một `SearchPlan` JSON giới hạn field và operation, sau đó backend validate và compile thành Query DSL. Giao diện vẫn hiển thị câu hỏi gốc và Query DSL cuối cùng để đáp ứng yêu cầu transparency.

Ví dụ `SearchPlan`:

```json
{
  "mode": "aggregate",
  "filters": {
    "event_type": "login_failed",
    "timestamp": { "gte": "now-7d" }
  },
  "group_by": [{ "field": "user", "size": 10 }],
  "metrics": [{ "type": "count" }]
}
```

Query DSL được compile:

```json
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        { "term": { "event_type": "login_failed" } },
        { "range": { "timestamp": { "gte": "now-7d" } } }
      ]
    }
  },
  "aggs": {
    "by_user": {
      "terms": { "field": "user", "size": 10 }
    }
  }
}
```

### Mapping khởi đầu

| Field | Kiểu Elasticsearch | Ghi chú |
| --- | --- | --- |
| `timestamp` | `date` | Filter thời gian và `date_histogram` |
| `source` | `keyword` | Filter và aggregation |
| `severity` | `keyword` | Filter và aggregation |
| `event_type` | `keyword` | Filter và aggregation |
| `user` | `keyword` | Filter và `TOP N` |
| `host` | `keyword` | Filter và `TOP N` |
| `ip` | `ip` | Filter chính xác |
| `message` | `text` | Full-text search |
| `raw` | `text` với `"index": false` | Giữ trong `_source` để xem chi tiết, tránh phình index khi MVP chưa search raw log |

Có thể bổ sung `country_code` kiểu `keyword` nếu muốn demo câu hỏi như "failed login attempts from China".

### Guardrail bắt buộc cho query do AI sinh

- Chỉ cho phép field và operation nằm trong allowlist.
- Luôn giới hạn `size`, khoảng thời gian tối đa và timeout.
- Chặn script, wildcard đắt đỏ và query không có giới hạn nếu chưa có nhu cầu thật.
- Tách endpoint ingest khỏi endpoint search; dùng Elasticsearch Bulk API ở phía backend khi nạp dataset demo.
- Ghi audit log ứng dụng gồm user, thời điểm, câu hỏi gốc, Query DSL đã compile, số kết quả và latency.

## Trade-off đã chấp nhận

### 1. Một số tính năng nâng cao cần subscription

Elasticsearch Basic đáp ứng đầy đủ MVP nhưng native RRF hybrid search, native ML anomaly detection, native audit logging và document-level security cần gói trả phí. Cách tiếp cận phù hợp là hoàn thành MVP bằng Basic, chỉ nâng cấp subscription khi một tính năng trả phí thực sự mang lại giá trị cho bản demo hoặc giai đoạn production.

### 2. Elasticsearch tốn RAM hơn ClickHouse

Elasticsearch chạy trên JVM và search index có overhead. Với MVP 10.000 event, đổi lại ta có luồng full-text, filter và aggregation dễ hoàn thiện hơn. Chạy single-node trong Docker Compose là đủ cho demo.

### 3. Query DSL khó sinh hơn SQL

JSON DSL dài và lồng nhau. Dùng `SearchPlan` trung gian cùng compiler giúp giảm hallucination, dễ unit test và kiểm soát bảo mật hơn cách cho LLM sinh DSL tự do.

### 4. Analytics cực lớn có thể không kinh tế bằng ClickHouse

Nếu dữ liệu thực tế tăng lên hàng trăm triệu hoặc hàng tỷ event và phần lớn workload là dashboard aggregation, cần benchmark lại ClickHouse. Khi đó có thể cân nhắc ClickHouse cho analytics hoặc làm cold store, nhưng không nên thêm kiến trúc hai engine trước khi có số đo.

### 5. Semantic search không miễn phí về tài nguyên

`dense_vector`, embedding model và hybrid search làm tăng storage, RAM và độ phức tạp vận hành. Đây là phần khuyến khích, chỉ nên thêm sau khi search và aggregation cơ bản đã ổn định.

### 6. `terms` aggregation có sai số khi scale nhiều shard

Với single-node, một shard và dataset demo, vấn đề này nhỏ. Khi scale cluster, cần theo dõi `doc_count_error_upper_bound`, điều chỉnh `shard_size` hoặc dùng `composite` aggregation nếu cần phân trang qua toàn bộ bucket.

## Thứ tự triển khai khuyến nghị

1. Hoàn thành toàn bộ MVP bằng Elasticsearch Basic với lexical search và aggregation.
2. Thêm bộ test chất lượng query từ 50 cặp câu hỏi - `SearchPlan`; phần này giúp bảo vệ đồ án thuyết phục hơn.
3. Thêm graceful fallback, health check, rate limit và saved query.
4. Thêm multi-turn ở mức giữ context theo session.
5. Thêm embedding, `dense_vector` và kNN để tìm event tương tự.
6. Thêm hybrid search bằng cách trộn BM25 và vector score ở backend; cân nhắc Enterprise nếu muốn dùng native RRF.
7. Thêm anomaly detection đơn giản bằng rule hoặc thuật toán tự viết; cân nhắc Platinum hoặc Enterprise nếu muốn dùng Elastic ML.
8. Benchmark ClickHouse nếu có dataset đủ lớn để chứng minh nhu cầu.

## Khi nào nên xem lại quyết định

Xem lại kiến trúc hoặc subscription nếu xảy ra một trong các điều kiện sau:

- Viettel đã có Elastic cluster, license hoặc quy định phiên bản riêng cần tích hợp.
- Bản demo cần native RRF hybrid search, Elastic ML anomaly detection, native Elasticsearch audit logging hoặc document-level security.
- Workload production thiên mạnh về aggregation trên dữ liệu rất lớn và Elasticsearch không đạt latency hoặc chi phí mong muốn sau benchmark.
- Hệ thống cần lưu trữ dài hạn với dung lượng lớn hơn nhiều so với hot search index.

Với phạm vi hiện tại, Elasticsearch Basic là lựa chọn hợp lý giữa khả năng hoàn thành MVP, tài nguyên học tập và đường mở rộng.
