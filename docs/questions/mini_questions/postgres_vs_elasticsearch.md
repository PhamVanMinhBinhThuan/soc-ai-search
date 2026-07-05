# PostgreSQL Và Elasticsearch Trong Đồ Án

## 1. Vì Sao Hệ Thống Dùng Hai Database?

Trong đồ án, hệ thống tách dữ liệu thành hai nhóm chính:

- **Elasticsearch**: lưu security event logs.
- **PostgreSQL**: lưu query history/audit logs.

Lý do không phải vì database nào "tốt hơn", mà vì mỗi loại dữ liệu có mục đích sử dụng khác nhau.

> Elasticsearch phù hợp cho dữ liệu log lớn cần search và aggregation nhanh. PostgreSQL phù hợp cho dữ liệu nghiệp vụ/audit có cấu trúc ổn định, cần phân quyền, update và phân trang chính xác.

---

## 2. Elasticsearch Lưu Gì?

Elasticsearch lưu các event bảo mật trong index:

```text
soc-events-v1
```

Ví dụ event có các trường:

- `timestamp`
- `source`
- `severity`
- `event_type`
- `user`
- `host`
- `ip`
- `country_code`
- `message`
- `raw`

Các event này là dữ liệu log. Số lượng có thể rất lớn và cần truy vấn nhanh theo nhiều chiều khác nhau.

Ví dụ:

- Tìm failed login trong 24 giờ gần nhất.
- Thống kê top source IP.
- Vẽ biểu đồ event theo giờ.
- Group by severity hoặc event_type.

---

## 3. PostgreSQL Lưu Gì?

PostgreSQL lưu query history/audit trong bảng:

```text
search_query_logs
```

Các trường chính:

- `id`
- `user_identity`
- `question`
- `search_plan`
- `generated_dsl`
- `mode`
- `result_count`
- `latency_ms`
- `status`
- `error_message`
- `summary`
- `created_at`
- `pinned`
- `pinned_at`

Bảng này phục vụ:

- All Investigations.
- Recent Queries.
- System Audit Logs.
- Pin/unpin query.
- Export audit/history.
- Truy vết user đã hỏi gì, hệ thống sinh SearchPlan nào, DSL nào được chạy và kết quả ra sao.

---

## 4. Vì Sao Không Lưu Audit/History Vào Elasticsearch?

Elasticsearch có thể lưu audit/history, nhưng không phải lựa chọn phù hợp nhất cho đồ án này.

Audit/history là dữ liệu nghiệp vụ có cấu trúc khá ổn định:

- user nào chạy query;
- câu hỏi là gì;
- SearchPlan nào được validate;
- DSL nào được compile;
- query thành công hay thất bại;
- latency bao nhiêu;
- có được pin hay không.

Những dữ liệu này cần tính nhất quán, filter rõ ràng, pagination server-side và update nhỏ như pin/unpin. PostgreSQL làm các việc này tự nhiên hơn.

Ví dụ pin một query trong PostgreSQL:

```sql
UPDATE search_query_logs
SET pinned = true, pinned_at = now()
WHERE id = :query_id;
```

Trong Elasticsearch vẫn có `_update`, nhưng bản chất update thường là reindex document ngầm bên trong. Elasticsearch tối ưu cho search/index document lớn hơn là update nghiệp vụ nhỏ.

---

## 5. Elasticsearch Có Pagination Không?

Có.

Elasticsearch hỗ trợ:

- `from` + `size`: giống offset pagination, dùng tốt cho trang nhỏ.
- `search_after`: tốt hơn cho phân trang sâu, nhưng phức tạp hơn.
- `scroll`: phù hợp export/batch, không phù hợp UI realtime thông thường.

Tuy nhiên với audit/history dạng bảng, PostgreSQL dễ dùng hơn:

```sql
SELECT *
FROM search_query_logs
WHERE user_identity = :user
ORDER BY created_at DESC
LIMIT 5 OFFSET 10;
```

Vì vậy All Investigations và System Audit Logs dùng PostgreSQL để filter/pagination server-side.

---

## 6. Elasticsearch Có Update Không?

Có, nhưng không phải thế mạnh chính.

Elasticsearch hỗ trợ update document bằng `_update`. Tuy nhiên, Elasticsearch được thiết kế tối ưu cho:

- indexing log;
- search nhanh;
- filter nhanh;
- aggregation nhanh;
- time-series analytics.

PostgreSQL phù hợp hơn cho:

- update field nhỏ;
- transaction;
- dữ liệu nghiệp vụ;
- phân quyền theo user;
- bảng audit/history có schema rõ.

---

## 7. PostgreSQL Có Thêm Field Được Không?

Có.

PostgreSQL vẫn thêm field bằng migration:

```sql
ALTER TABLE search_query_logs
ADD COLUMN new_field TEXT;
```

Vì vậy không nên nói "PostgreSQL không thể thêm field".

Cách nói đúng hơn:

> Audit/history có schema nghiệp vụ ổn định, nên PostgreSQL phù hợp. Event log có thể tăng rất lớn, cần search và aggregation nhanh, nên Elasticsearch phù hợp.

Ngoài ra PostgreSQL trong đồ án vẫn lưu được dữ liệu JSON linh hoạt bằng `JSONB`, ví dụ:

- `search_plan`
- `generated_dsl`

---

## 8. Event Log Có Thêm Field Được Không?

Có, nhưng trong đồ án hiện tại Elasticsearch mapping đang kiểm soát schema chặt bằng:

```json
"dynamic": false
```

Điều này nghĩa là Elasticsearch không tự động index field lạ ngoài mapping.

Lý do:

- tránh dữ liệu bẩn;
- tránh field explosion;
- tránh LLM hoặc client tạo field không kiểm soát;
- giữ DSL compiler theo allowlist.

Nếu sau này muốn thêm field event mới, cách đúng là cập nhật mapping hoặc tạo index version mới, ví dụ:

```text
soc-events-v2
```

---

## 9. Ba Ưu Điểm Chính Của PostgreSQL Cho Audit/History

### 1. Dễ update dữ liệu nghiệp vụ

Các thao tác như pin/unpin query rất tự nhiên với SQL.

### 2. Dễ filter và pagination server-side

PostgreSQL phù hợp cho bảng audit/history cần lọc theo:

- user;
- question;
- status;
- mode;
- thời gian;
- pinned.

### 3. Tính nhất quán tốt hơn cho audit trail

Audit/history là dữ liệu truy vết. PostgreSQL phù hợp để lưu record có cấu trúc, cần đọc chính xác và cập nhật rõ ràng.

---

## 10. Ba Nhược Điểm Của PostgreSQL Cho Audit/History

### 1. Full-text search không mạnh bằng Elasticsearch

Nếu muốn search rất nâng cao trên `question`, `summary`, `error_message`, Elasticsearch sẽ mạnh hơn.

### 2. Aggregation trên dữ liệu cực lớn cần tối ưu thêm

Nếu audit log lên hàng chục triệu bản ghi, PostgreSQL cần index, partition hoặc retention policy.

### 3. Phải vận hành thêm một database

Hệ thống cần quản lý cả PostgreSQL và Elasticsearch.

---

## 11. Ba Ưu Điểm Chính Của Elasticsearch Cho Event Logs

### 1. Search/filter log rất nhanh

Elasticsearch phù hợp cho truy vấn trên dữ liệu lớn như security events.

### 2. Aggregation tốt

Các biểu đồ như top IP, severity distribution, events over time dùng aggregation của Elasticsearch rất phù hợp.

### 3. Phù hợp time-series/log analytics

Log bảo mật thường tăng liên tục theo thời gian. Elasticsearch phù hợp với bài toán SOC/SIEM.

---

## 12. Ba Nhược Điểm Nếu Lưu Audit/History Bằng Elasticsearch

### 1. Update nghiệp vụ nhỏ không thuận tự nhiên bằng PostgreSQL

Pin/unpin query có thể làm được, nhưng không phải thế mạnh chính.

### 2. Pagination dạng bảng quản trị phức tạp hơn

`from/size` dùng được cho trang nhỏ, nhưng phân trang sâu nên dùng `search_after`, phức tạp hơn SQL.

### 3. Audit trail phụ thuộc vào search engine

Nếu Elasticsearch lỗi, reindex hoặc thay đổi mapping, audit/history cũng bị ảnh hưởng. Tách PostgreSQL giúp audit ổn định hơn.

---

## 13. Câu Trả Lời Ngắn Khi Bảo Vệ

> Em tách hai loại dữ liệu theo mục đích sử dụng. Security event logs được lưu trong Elasticsearch vì dữ liệu lớn, cần search và aggregation nhanh để phục vụ dashboard, chart và điều tra SOC. Query history/audit được lưu trong PostgreSQL vì đây là dữ liệu nghiệp vụ có schema ổn định, cần consistency, phân quyền theo user, filter/pagination server-side và update pin/unpin rõ ràng. Elasticsearch vẫn có update và pagination, nhưng không thuận tự nhiên bằng PostgreSQL cho audit/history dạng bảng.

