# Elasticsearch Event Index

## Index `soc-events-v1`

`soc-events-v1` là Elasticsearch index, không phải PostgreSQL table. Mỗi SOC event được lưu dưới dạng một Elasticsearch document.

Các field trong [soc-events-v1-index.json](./soc-events-v1-index.json) được mapping rõ ràng để phục vụ:

- Full-text search: `message`.
- Filter và aggregation: `timestamp`, `source`, `severity`, `event_type`, `user`, `host`, `ip`, `country_code`.
- Xem chi tiết event: `raw`.

## Khởi tạo index

Khi Elasticsearch đã chạy, có thể tạo index bằng Create Index API:

```bash
curl -X PUT "$ELASTICSEARCH_URL/soc-events-v1" \
  -H "Content-Type: application/json" \
  --data-binary "@soc-events-v1-index.json"
```

Chạy lệnh từ thư mục `infra/elasticsearch/`. Nếu Elasticsearch bật security, bổ sung cơ chế xác thực phù hợp nhưng không hardcode credential vào repository.

## Lựa chọn `dynamic: false`

MVP dùng `"dynamic": false` để tránh field explosion khi event nguồn chứa thêm metadata ngoài schema đã chốt. Field chưa được mapping vẫn được giữ trong `_source` để xem lại, nhưng chưa thể search, filter hoặc aggregate. Khi cần truy vấn một field mới, phải bổ sung mapping rõ ràng.

`raw` dùng `"type": "text"` và `"index": false`: raw log vẫn nằm trong `_source` để hiển thị event detail nhưng không tạo inverted index. Cách này giảm kích thước index vì MVP chưa cần search trực tiếp trên raw log. Trade-off là không thể tìm kiếm nội dung `raw`.

Nếu sau này cần lưu raw log dạng JSON object, hãy đánh giá chuyển sang object có `"enabled": false` hoặc tách các field cần truy vấn thành mapping riêng. MVP hiện tại giữ `raw` dưới dạng chuỗi.

## Kiểm tra bằng Kibana

Kibana `9.4.2` là công cụ tùy chọn để debug Elasticsearch trong môi trường local. Khi Docker Compose profile `tools` đã được bổ sung, có thể bật Kibana và tạo Data View:

```text
soc-events-v1
```

Chọn `timestamp` làm time field để xem document trong Discover. Có thể dùng Dev Tools Console để kiểm tra mapping và thử Query DSL.

Kibana phải pin cùng version `9.4.2` với Elasticsearch. Kibana không thay thế frontend React của đồ án và không nên expose cổng `5601` public trên VPS.
