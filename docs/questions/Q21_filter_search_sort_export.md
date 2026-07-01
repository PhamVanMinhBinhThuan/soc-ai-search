# Q21 - Filter, Search, Sort Và Export CSV

## 1. Tổng quan ngắn gọn

Trong hệ thống hiện tại có 3 nơi liên quan đến filter/search/sort:

| Trang | Dữ liệu lấy từ đâu? | Mục đích |
| --- | --- | --- |
| Result Raw Events / Query Result | Elasticsearch | Lọc/sort kết quả log sau khi chạy SearchPlan |
| All Investigations | PostgreSQL | Xem lịch sử truy vấn của user hiện tại |
| System Audit Logs | PostgreSQL | Admin xem toàn bộ audit log của hệ thống |

Điểm quan trọng khi bảo vệ:

- Result Raw Events filter bằng cách rerun một `SearchPlan` đã validate, không lọc client-side đơn giản.
- Investigations và Audit filter/search server-side bằng PostgreSQL.
- Export CSV ở Result/Investigation là export kết quả truy vấn events.
- Export CSV ở Audit là export metadata audit logs.

---

## 2. Result Raw Events / Query Result

### Filter đang hỗ trợ

Khi `SearchPlan.mode = search`, UI hỗ trợ:

| Nhóm | Giá trị |
| --- | --- |
| Severity | `critical`, `high`, `medium`, `low` |
| Event type | `failed_login`, `account_lockout`, `firewall_block`, `malware_detected`, `privilege_escalation`, `suspicious_outbound`, `large_transfer`, `successful_login`, `dns_query`, `process_start`, `file_access` |
| Text input | `user`, `host`, `ip`, `country_code`, `message_query` |

Khi bấm `Apply Filters`, frontend gửi SearchPlan mới xuống backend qua API execute plan. Backend vẫn validate, compile DSL rồi query Elasticsearch lại.

### Sort đang hỗ trợ

Trong search mode:

| UI | Ý nghĩa |
| --- | --- |
| Newest first | Sort `timestamp desc` |
| Oldest first | Sort `timestamp asc` |
| Highest severity first | Sort theo thứ tự mức độ nghiêm trọng cao trước |
| Lowest severity first | Sort theo thứ tự mức độ nghiêm trọng thấp trước |

### Aggregation mode

Nếu aggregation là `group_by` hoặc `top_n`, UI chỉ cần sort bucket:

| UI | Ý nghĩa |
| --- | --- |
| Bucket: Highest first | Bucket có `doc_count/value` cao trước |
| Bucket: Lowest first | Bucket có `doc_count/value` thấp trước |

Nếu aggregation là `date_histogram`, filter/sort panel bị ẩn vì time-series phải giữ thứ tự thời gian để không làm sai line chart.

### Export CSV ở Result

Export CSV ở Result/Investigation là export dữ liệu events của câu truy vấn, không phải export câu hỏi/SearchPlan/DSL.

Cơ chế an toàn:

1. Frontend gửi `query_id`.
2. Backend lấy SearchPlan đã lưu trong PostgreSQL.
3. Backend validate/compile lại.
4. Backend query Elasticsearch.
5. Backend stream CSV về browser.

Frontend không được gửi DSL tự do để export.

---

## 3. All Investigations

### Dữ liệu lấy từ đâu?

All Investigations lấy dữ liệu từ bảng audit/history trong PostgreSQL, không lấy từ Elasticsearch.

Mỗi record là một lần user chạy query, edit SearchPlan, hoặc filter result có lưu audit.

### Filter đang hỗ trợ trên UI

| Filter | Ý nghĩa |
| --- | --- |
| All | Tất cả query của user hiện tại |
| Pinned | Query đã pin |
| Success | Query chạy thành công |
| Failed | Query lỗi |
| Search | Query có `mode = search` |
| Aggregation | Query có `mode = aggregation` |

### Search box đang search gì?

Search box gửi tham số `q` xuống backend. Backend search server-side trong PostgreSQL.

Hiện tại `q` có thể match:

- `question`;
- `user_identity`;
- `error_message`;
- `query_id` nếu nhập đúng UUID.

Riêng All Investigations luôn bị scope theo user hiện tại, nên user chỉ thấy lịch sử của chính mình.

### Sort / pagination

All Investigations hiện dùng server-side pagination, mỗi trang 5 query.

Sort mặc định:

- Query mới nhất trước.
- Nếu đang lọc `Pinned`, query pin mới nhất đứng trước.

### Export CSV ở Investigation

Trong All Investigations, export CSV là export kết quả events của một query cụ thể thông qua `query_id`.

Nói cách khác:

- Không export danh sách lịch sử query.
- Không export audit metadata.
- Export lại kết quả từ SearchPlan đã lưu.

---

## 4. System Audit Logs

### Dữ liệu lấy từ đâu?

System Audit Logs lấy từ PostgreSQL và chỉ dành cho admin.

Khác All Investigations:

- All Investigations: user xem lịch sử của chính mình.
- Audit Logs: admin xem được audit log của toàn hệ thống.

### Filter đang hỗ trợ trên UI

| Filter | Ý nghĩa |
| --- | --- |
| All | Tất cả audit logs |
| Success | Query thành công |
| Failed | Query lỗi |
| Search | Query `mode = search` |
| Aggregation | Query `mode = aggregation` |

### Search box đang search gì?

Search box gửi `q` xuống backend và search server-side trong PostgreSQL.

`q` có thể match:

- `question`;
- `user_identity`;
- `error_message`;
- `query_id` nếu nhập đúng UUID.

Backend cũng có hỗ trợ filter theo `identity`, `from`, `to`, `sort`, nhưng UI hiện tại chủ yếu dùng search box và các filter chip.

### Sort / pagination

Audit Logs dùng server-side pagination, mỗi trang 5 records.

Sort mặc định là audit log mới nhất trước.

### Export CSV ở Audit

Audit page có export riêng: `Export Audit CSV`.

Ý nghĩa:

- Export metadata audit logs, không export events từ Elasticsearch.
- Nếu không filter/search, export toàn bộ audit logs trong giới hạn hệ thống.
- Nếu đang filter/search, export đúng tập kết quả đã filter/search.
- Export không bị giới hạn bởi page hiện tại. Pagination chỉ để UI xem danh sách.

Ví dụ:

- UI đang ở page 2 nhưng filter là `Failed`.
- Khi export, backend export toàn bộ audit logs `Failed`, không chỉ 5 dòng đang hiển thị ở page 2.

---

## 5. Phân biệt các loại CSV

| Nút export | Trang | Dữ liệu trong CSV |
| --- | --- | --- |
| Export CSV | Query Result | Raw events / aggregation result của query |
| Export CSV | Investigation detail | Raw events / aggregation result của query đã lưu |
| Export Audit CSV | System Audit Logs | Metadata audit: user, question, mode, status, result count, error, created time... |

Câu trả lời ngắn khi bị hỏi:

> Export kết quả truy vấn và export audit log là hai luồng khác nhau. Export kết quả truy vấn dùng `query_id` để replay SearchPlan và lấy dữ liệu từ Elasticsearch. Export audit log dùng filter hiện tại để lấy metadata từ PostgreSQL.

---

## 6. Code cần đọc

Frontend:

- `frontend/src/components/soc/result-tabs.tsx`
- `frontend/src/services/search-plan-api.ts`
- `frontend/src/services/csv-export-api.ts`
- `frontend/src/components/soc/investigations/investigations-page.tsx`
- `frontend/src/components/soc/investigations/investigations-master-list.tsx`
- `frontend/src/components/soc/investigations/investigation-detail-panel.tsx`
- `frontend/src/components/soc/admin/audit-logs-page.tsx`
- `frontend/src/services/history-api.ts`

Backend:

- `backend/src/main/java/com/soc/ai/search/search/execution/SearchController.java`
- `backend/src/main/java/com/soc/ai/search/search/execution/SearchPlanExecutionResponse.java`
- `backend/src/main/java/com/soc/ai/search/csv/CsvExportController.java`
- `backend/src/main/java/com/soc/ai/search/csv/CsvExportService.java`
- `backend/src/main/java/com/soc/ai/search/audit/AuditQueryController.java`
- `backend/src/main/java/com/soc/ai/search/audit/AuditQueryService.java`
- `backend/src/main/java/com/soc/ai/search/audit/SearchQueryLogRepository.java`
- `backend/src/main/java/com/soc/ai/search/audit/AuditCsvWriter.java`

---

## 7. Câu hỏi hội đồng dễ hỏi

### Result filter có lọc client-side không?

Không. Khi user apply filter/sort, frontend gửi SearchPlan mới xuống backend. Backend validate, compile DSL và query Elasticsearch lại.

### Investigations và Audit search bằng database nào?

Bằng PostgreSQL, vì đây là lịch sử/audit của các truy vấn đã chạy, không phải log security events.

### Vì sao Audit export không export theo page hiện tại?

Vì page chỉ phục vụ UI xem 5 dòng/lần. Export phải lấy toàn bộ dữ liệu theo filter hiện tại để admin có file đầy đủ.

### Vì sao không cho frontend gửi DSL để export?

Vì DSL tùy ý có thể bypass validator. Backend chỉ nhận `query_id`, lấy SearchPlan đã lưu, validate/compile lại rồi mới export.

### All Investigations khác System Audit Logs ở đâu?

All Investigations chỉ xem query của user hiện tại. System Audit Logs dành cho admin và xem được toàn bộ user.
