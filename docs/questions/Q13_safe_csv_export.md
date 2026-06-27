# Q13 - CSV Export An Toàn Hoạt Động Như Thế Nào?

## 1. Câu trả lời ngắn

CSV export của hệ thống **không nhận Elasticsearch DSL từ client**. Frontend chỉ gửi `query_id`. Backend lấy SearchPlan đã lưu trong PostgreSQL, validate lại, compile lại DSL, query Elasticsearch rồi stream CSV về cho user.

Câu cần nhớ khi bảo vệ:

> Export bằng `query_id` giúp backend kiểm soát lại toàn bộ pipeline. Client không được gửi DSL tùy ý nên không thể bypass validator.

---

## 2. Flow export tổng thể

Flow:

```text
User bấm Export CSV
    ↓
Frontend gửi query_id
    ↓
Backend lấy SearchPlan đã lưu trong PostgreSQL
    ↓
Backend kiểm tra query SUCCESS và SearchPlan hợp lệ
    ↓
Backend validate SearchPlan
    ↓
Backend compile lại Elasticsearch DSL
    ↓
Backend query Elasticsearch hiện tại
    ↓
Backend stream CSV về browser
```

Điểm quan trọng:

> Backend không dùng DSL từ frontend và cũng không cần tin DSL đã lưu. Nguồn sự thật để export là SearchPlan đã lưu.

---

## 3. Frontend gọi export như thế nào?

Code liên quan:

```text
frontend/src/services/csv-export-api.ts
```

Frontend gọi:

```ts
fetch(apiUrl(`/api/v1/search/${encodeURIComponent(queryId)}/export.csv`), {
  headers: {
    Accept: 'text/csv, application/json',
    ...authHeaders(),
  },
})
```

Ý nghĩa:

- Frontend chỉ gửi `queryId`.
- Token vẫn được gắn qua `authHeaders()`.
- Không gửi SearchPlan.
- Không gửi DSL.

Nếu export thành công, frontend lấy:

```ts
blob: await response.blob()
filename: filenameFromDisposition(...)
truncated: response.headers.get('x-export-truncated') === 'true'
```

---

## 4. Backend endpoint export ở đâu?

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/csv/CsvExportController.java
```

Endpoint:

```java
@GetMapping(value = "/{queryId}/export.csv", produces = "text/csv")
@PreAuthorize("@rbacPermissionService.authDisabled() or hasRole('SOC_ANALYST')")
public ResponseEntity<StreamingResponseBody> export(@PathVariable UUID queryId)
```

Ý nghĩa:

- URL export là:

```http
GET /api/v1/search/{queryId}/export.csv
```

- `queryId` phải là UUID.
- Yêu cầu role tối thiểu là `SOC_ANALYST`.
- Viewer không được export.
- Response là streaming CSV, không load toàn bộ file vào memory một lần.

Header trả về:

```java
Content-Disposition: attachment; filename="soc-search-{queryId}.csv"
X-Export-Truncated: true/false
```

`X-Export-Truncated=true` nghĩa là kết quả thật nhiều hơn giới hạn export.

---

## 5. Backend lấy SearchPlan từ PostgreSQL như thế nào?

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/audit/SearchQueryLogLookupService.java
backend/src/main/java/com/soc/ai/search/audit/StoredSearchQuery.java
backend/src/main/java/com/soc/ai/search/csv/CsvExportService.java
```

Trong `SearchQueryLogLookupService`:

```java
return repository.findByIdAndUserIdentity(queryId, currentUserService.currentIdentity())
        .map(log -> new StoredSearchQuery(
                log.getId(),
                log.getUserIdentity(),
                log.getStatus(),
                log.getMode(),
                log.getSearchPlan()));
```

Ý nghĩa:

- Backend tìm query theo `queryId`.
- Đồng thời scope theo user hiện tại bằng `currentIdentity()`.
- User không export được query không thuộc về mình.
- Dữ liệu lấy ra gồm status, mode và SearchPlan.

---

## 6. Vì sao export chỉ cho query SUCCESS?

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/csv/CsvExportService.java
```

Trong `validatedPlan(...)`:

```java
if (storedQuery.status() != AuditStatus.SUCCESS) {
    throw new CsvExportConflictException("Only successful search queries can be exported");
}
```

Ý nghĩa:

> Query fail có thể không có SearchPlan hợp lệ hoặc không có kết quả đáng export, nên backend chỉ export query đã chạy thành công.

Nếu SearchPlan bị thiếu:

```java
if (storedQuery.searchPlan() == null || storedQuery.searchPlan().isNull()) {
    throw new CsvExportConflictException("Stored SearchPlan is missing");
}
```

Nếu SearchPlan không hợp lệ:

```java
validator.validate(plan);
```

Nếu mode trong audit và mode trong SearchPlan lệch nhau:

```java
if (storedQuery.mode() != plan.mode()) {
    throw new CsvExportConflictException("Stored search mode does not match SearchPlan mode");
}
```

---

## 7. Vì sao không cho frontend gửi DSL để export?

Nếu frontend được gửi DSL tùy ý, user có thể cố tình gửi query vượt guardrail, ví dụ:

- query field ngoài allowlist;
- script query;
- wildcard/query_string;
- query rất nặng;
- DSL không đi qua SearchPlanValidator.

Thiết kế hiện tại tránh rủi ro này:

```text
Client chỉ gửi query_id
    ↓
Backend lấy SearchPlan đã lưu
    ↓
Backend validate lại
    ↓
Backend compile DSL an toàn
```

Câu trả lời mẫu:

> Không cho client gửi DSL vì DSL tùy ý có thể bypass validator. Export bằng `query_id` giúp backend replay SearchPlan đã lưu và kiểm soát lại toàn bộ.

---

## 8. Export query Elasticsearch như thế nào?

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/csv/ExportSearchExecutor.java
backend/src/main/java/com/soc/ai/search/search/compiler/SearchPlanCompiler.java
```

Trong export executor:

```java
var compiled = compiler.compile(plan);
```

Sau đó query Elasticsearch:

```java
var request = new Request("POST", "/" + elasticsearchProperties.indexEvents() + "/_search");
```

Ý nghĩa:

- Vẫn dùng compiler backend.
- Vẫn chỉ gọi endpoint `_search` của Elasticsearch.
- Không dùng API update/delete.

Export cũng thêm:

```java
requestBody.put("timeout", exportProperties.esTimeoutMs() + "ms");
requestBody.put("track_total_hits", trackTotalHits);
```

Ý nghĩa:

- Có timeout riêng cho export.
- Có `track_total_hits` để biết tổng số kết quả.

---

## 9. Vì sao giới hạn export tối đa 10,000 rows?

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/csv/ExportSearchExecutor.java
backend/src/main/java/com/soc/ai/search/csv/CsvExportService.java
```

Trong code:

```java
static final int MAX_EXPORT_ROWS = 10_000;
static final int BATCH_SIZE = 1_000;
```

Ý nghĩa:

- Export tối đa 10,000 dòng.
- Mỗi batch lấy 1,000 dòng.
- Tránh file quá lớn.
- Tránh query Elasticsearch quá nặng.
- Phù hợp với giới hạn mặc định `index.max_result_window` của Elasticsearch.

Nếu tổng kết quả lớn hơn 10,000:

```java
var truncated = prepared.total() > ExportSearchExecutor.MAX_EXPORT_ROWS;
```

Backend trả header:

```http
X-Export-Truncated: true
```

Câu nói khi bảo vệ:

> Giới hạn 10,000 rows là guardrail để export đủ dùng cho MVP nhưng không làm quá tải Elasticsearch, backend hoặc trình duyệt.

---

## 10. Source filtering là gì?

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/csv/ExportSearchExecutor.java
```

Export chỉ lấy các field cần thiết:

```java
private static final List<String> SOURCE_FIELDS = List.of(
        "timestamp",
        "source",
        "severity",
        "event_type",
        "user",
        "host",
        "ip",
        "country_code",
        "message");
```

Khi query Elasticsearch:

```java
requestBody.put("_source", Map.of("includes", SOURCE_FIELDS));
```

Ý nghĩa:

> Export không lấy toàn bộ raw document. Nó chỉ lấy field cần thiết để giảm dữ liệu truyền về và tránh lộ field không cần thiết.

---

## 11. CSV formula injection là gì và hệ thống chống như thế nào?

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/csv/CsvRowWriter.java
```

CSV formula injection xảy ra khi cell bắt đầu bằng:

```text
=
+
-
@
```

Nếu mở bằng Excel, các giá trị này có thể bị hiểu là công thức.

Trong `CsvRowWriter`:

```java
private boolean isFormulaPrefix(int codePoint) {
    return codePoint == '=' || codePoint == '+' || codePoint == '-' || codePoint == '@';
}
```

Nếu phát hiện prefix nguy hiểm:

```java
return isFormulaPrefix(codePoint) ? "'" + value : value;
```

Ý nghĩa:

> Backend thêm dấu `'` phía trước để Excel hiểu đây là text, không phải công thức.

Ví dụ:

```text
=cmd|...
```

được ghi thành:

```text
'=cmd|...
```

---

## 12. Vì sao giới hạn message 4KB?

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/csv/CsvRowWriter.java
```

Trong code:

```java
private static final int MESSAGE_MAX_BYTES = 4 * 1024;
```

Nếu message quá dài:

```java
return builder.append(suffix).toString();
```

Ý nghĩa:

> Một event message bất thường có thể rất dài. Giới hạn 4KB giúp CSV không phình quá lớn và vẫn đủ thông tin để demo/điều tra cơ bản.

---

## 13. Search export và aggregation export khác nhau thế nào?

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/csv/CsvExportService.java
backend/src/main/java/com/soc/ai/search/csv/CsvRowWriter.java
```

Nếu `mode = search`:

CSV header:

```text
event_id,timestamp,source,severity,event_type,user,host,ip,country_code,message
```

Nếu `mode = aggregation`:

CSV header:

```text
key,value
```

Với `COUNT`, backend ghi:

```java
writer.writeAggregationResult(new AggregationResultItem("total", prepared.total()));
```

Với `GROUP_BY`, `TOP_N`, `DATE_HISTOGRAM`, backend ghi các bucket:

```text
key,value
```

---

## 14. Các lỗi export được xử lý thế nào?

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/csv/CsvExportController.java
```

Một số lỗi:

| Lỗi | HTTP |
| --- | --- |
| `query_id` không phải UUID | `400 Bad Request` |
| Không tìm thấy query | `404 Not Found` |
| Query không export được | `409 Conflict` |
| Elasticsearch/PostgreSQL lỗi | `503 Service Unavailable` |

Ví dụ:

```java
@ExceptionHandler(CsvExportConflictException.class)
ResponseEntity<SearchErrorResponse> handleConflict(...)
```

Ý nghĩa:

> Export lỗi vẫn trả response có kiểm soát, không lộ stack trace.

---

## 15. Câu trả lời mẫu khi hội đồng hỏi

### Hiện tại có 2 export: export sau khi search/aggregation và export trong Investigations. Q13 đang nói về cái nào?

> Q13 đang nói về **backend CSV Export API dùng `query_id`**, nên áp dụng cho cả hai chỗ bấm Export trên UI. Nếu export ngay sau khi search/aggregation thì frontend lấy `query_id` từ response hiện tại. Nếu export trong Investigations thì frontend lấy `query_id` từ history item/detail. Cả hai đều gọi chung endpoint `GET /api/v1/search/{queryId}/export.csv`.

Tóm tắt:

| Nơi bấm Export | Lấy `query_id` từ đâu | Backend flow |
| --- | --- | --- |
| Sau khi search/aggregation | Response search hiện tại | Dùng `query_id` để replay SearchPlan |
| Trong Investigations | History item/detail | Dùng `query_id` để replay SearchPlan |

Backend flow vẫn giống nhau:

```text
query_id
    ↓
lấy SearchPlan đã lưu
    ↓
validate lại
    ↓
compile lại DSL
    ↓
query Elasticsearch
    ↓
stream CSV
```

### File CSV chứa kết quả truy vấn hay chứa question/SearchPlan/generated DSL?

> CSV hiện tại là **export data result**, không phải export audit metadata. Nếu query là `mode = search`, CSV chứa danh sách event/log match query. Nếu query là `mode = aggregation`, CSV chứa bucket thống kê dạng `key,value`. Các thông tin như `question`, `search_plan`, `generated_dsl`, `summary`, `latency` nằm trong History/Investigation detail/Audit logs, không nằm trong CSV.

Với `mode = search`, CSV có header:

```csv
event_id,timestamp,source,severity,event_type,user,host,ip,country_code,message
```

Với `mode = aggregation`, CSV có header:

```csv
key,value
```

Ví dụ `COUNT`:

```csv
key,value
total,275
```

Câu nói khi bảo vệ:

> CSV export phục vụ analyst lấy dữ liệu kết quả để phân tích. Metadata như câu hỏi, SearchPlan và DSL được lưu trong PostgreSQL để audit/debug và hiển thị trong Investigations, nên không đưa vào CSV để file gọn và đúng mục tiêu.

### Tại sao không cho frontend gửi DSL để export?

> Vì DSL tùy ý có thể bypass validator hoặc tạo query nặng/nguy hiểm. Hệ thống chỉ cho frontend gửi `query_id`; backend lấy SearchPlan đã lưu, validate lại, compile lại DSL an toàn rồi mới query Elasticsearch.

### Export có dùng DSL đã lưu không?

> Không. DSL đã lưu chủ yếu để debug/minh bạch. Export dùng SearchPlan đã lưu làm nguồn sự thật, sau đó compile lại DSL mới.

### Nếu query có hơn 10,000 kết quả thì sao?

> Backend chỉ export tối đa 10,000 rows và trả header `X-Export-Truncated: true` để frontend biết file đã bị giới hạn.

### Stream CSV là gì?

> Stream CSV nghĩa là backend ghi dữ liệu CSV trực tiếp ra HTTP response từng phần, thay vì tạo toàn bộ file lớn trong RAM rồi mới trả về. Trong project, backend dùng `StreamingResponseBody`.

Flow dễ hiểu:

```text
Elasticsearch trả batch events
    ↓
Backend ghi từng dòng CSV vào output stream
    ↓
Browser tải file dần
```

Lợi ích:

- ít tốn RAM hơn;
- không cần lưu file tạm trên server;
- phù hợp khi export nhiều dòng;
- user có thể nhận file qua response tải xuống bình thường.

### `X-Export-Truncated=true` nghĩa là gì?

> Nghĩa là kết quả thật nhiều hơn giới hạn export. Ví dụ query match 25,000 events nhưng hệ thống chỉ export tối đa 10,000 rows, backend sẽ trả header `X-Export-Truncated=true` để báo file CSV đã bị cắt bớt.

Ví dụ:

```text
Elasticsearch total = 25,000
CSV rows exported = 10,000
X-Export-Truncated = true
```

Nếu query chỉ có 3,000 events:

```text
Elasticsearch total = 3,000
CSV rows exported = 3,000
X-Export-Truncated = false
```

### “Scope theo user hiện tại bằng `currentIdentity()`” là gì?

> Khi export, backend không chỉ tìm bằng `query_id`, mà còn kiểm tra query đó có thuộc user đang đăng nhập không.

Trong code:

```java
repository.findByIdAndUserIdentity(queryId, currentUserService.currentIdentity())
```

Nghĩa là:

```text
id = query_id
AND
user_identity = user hiện tại
```

Ví dụ:

- Analyst A có query `abc`.
- Analyst B cố export query `abc`.
- Backend tìm `id = abc AND user_identity = analyst-b`.
- Không thấy record nên không cho export.

Câu nói khi bảo vệ:

> `currentIdentity()` giúp đảm bảo user chỉ export được query/history của chính mình, tránh việc đoán `query_id` của người khác để tải dữ liệu.

### Project dùng framework/tool gì để tạo file CSV?

> Project không dùng thư viện CSV lớn. Backend tự ghi CSV bằng Java chuẩn trong `CsvRowWriter`, dùng `OutputStreamWriter` để ghi từng dòng vào stream.

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/csv/CsvRowWriter.java
```

`CsvRowWriter` tự xử lý:

- ghi UTF-8 BOM để Excel đọc Unicode tốt hơn;
- quote cell nếu có dấu phẩy, xuống dòng hoặc dấu `"`;
- escape dấu `"`;
- chống CSV formula injection;
- giới hạn `message` tối đa 4KB.

### Tại sao chỉ export tối đa 10,000 dòng?

> Vì đây là MVP nên export cần có guardrail để tránh làm quá tải Elasticsearch, backend, browser và file tải xuống. Mốc 10,000 cũng phù hợp với giới hạn mặc định `index.max_result_window` của Elasticsearch.

Lý do:

- file CSV không quá lớn;
- request không chạy quá lâu;
- tránh backend stream hàng triệu dòng qua một HTTP request;
- tránh Elasticsearch query quá nặng;
- tránh trình duyệt tải file khổng lồ.

### Nếu thực tế dữ liệu vài triệu dòng thì làm sao?

> Với production, không nên export vài triệu dòng bằng một HTTP request đồng bộ. Cách đúng hơn là làm **async export job**.

Thiết kế production có thể là:

```text
User bấm Export
    ↓
Backend tạo export job
    ↓
Worker dùng search_after/PIT hoặc scroll để đọc dữ liệu theo batch
    ↓
Ghi CSV vào object storage như S3/MinIO
    ↓
User nhận link tải khi job hoàn tất
```

Câu nói khi bảo vệ:

> MVP giới hạn 10,000 rows để an toàn. Nếu triển khai thực tế với vài triệu dòng, em sẽ chuyển sang export bất đồng bộ, dùng `search_after` hoặc PIT/scroll, ghi file vào object storage rồi trả link tải thay vì stream trực tiếp qua một request.

### “Export lỗi vẫn trả response có kiểm soát, không lộ stack trace” nghĩa là gì?

> Nghĩa là backend bắt các exception cụ thể và map thành HTTP response rõ ràng, thay vì để lỗi Java/stack trace thô trả về client.

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/csv/CsvExportController.java
```

Ví dụ query không tồn tại:

```java
@ExceptionHandler(CsvExportNotFoundException.class)
ResponseEntity<SearchErrorResponse> handleNotFound(...)
```

Elasticsearch lỗi:

```java
@ExceptionHandler(CsvExportDependencyException.class)
ResponseEntity<SearchErrorResponse> handleElasticsearchFailure()
```

Response trả về dạng có kiểm soát:

```json
{
  "message": "CSV export dependency is unavailable",
  "errors": ["Elasticsearch export failed"]
}
```

Nó kiểm soát được vì:

- controller có `@ExceptionHandler` cho từng loại lỗi;
- response chỉ chứa message chung đã định nghĩa;
- không trả `exception.toString()` ra client;
- không trả stack trace ra UI;
- stack trace nếu cần chỉ nằm trong log server.

### CSV có chống Excel formula injection không?

> Có. Nếu cell bắt đầu bằng `=`, `+`, `-`, hoặc `@`, backend thêm dấu `'` phía trước để Excel hiểu đó là text, không phải công thức.

### Viewer có export được không?

> Không. Endpoint export yêu cầu tối thiểu role `SOC_ANALYST`. UI có thể ẩn nút Export, nhưng backend vẫn enforce bằng Spring Security.

---

## 16. Một câu cực ngắn để nhớ

> CSV export chỉ nhận `query_id`, replay SearchPlan đã lưu, validate/compile lại, giới hạn 10,000 rows và chống CSV formula injection.
