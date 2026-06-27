# Q12 - Audit, History Và Investigations Hoạt Động Như Thế Nào?

## 1. Câu trả lời ngắn

Mỗi lần user search, hệ thống lưu một record vào PostgreSQL để truy vết. Record này chứa:

- user nào search;
- câu hỏi tự nhiên là gì;
- mode là `search` hay `aggregation`;
- SearchPlan đã validate;
- Elasticsearch DSL đã compile;
- số kết quả;
- latency;
- summary hoặc error.

Câu cần nhớ khi bảo vệ:

> Audit/history giúp chứng minh hệ thống có khả năng truy vết: user hỏi gì, backend sinh SearchPlan nào, DSL nào đã chạy, kết quả bao nhiêu, latency ra sao và có lỗi gì không.

---

## 2. Dữ liệu audit được lưu ở đâu?

Code liên quan:

```text
backend/src/main/resources/db/migration/V1__create_search_query_logs.sql
backend/src/main/java/com/soc/ai/search/audit/SearchQueryLog.java
```

Bảng PostgreSQL:

```sql
CREATE TABLE search_query_logs (
    id UUID PRIMARY KEY,
    user_identity VARCHAR(255) NOT NULL,
    question TEXT NOT NULL,
    search_plan JSONB,
    generated_dsl JSONB,
    mode VARCHAR(32),
    result_count BIGINT,
    latency_ms BIGINT,
    status VARCHAR(32) NOT NULL,
    error_message TEXT,
    summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Entity tương ứng là `SearchQueryLog`.

Các field quan trọng:

| Field | Ý nghĩa |
| --- | --- |
| `id` | `query_id`, dùng để xem detail/rerun/export |
| `user_identity` | user thực hiện query |
| `question` | câu hỏi tự nhiên |
| `search_plan` | SearchPlan đã validate |
| `generated_dsl` | DSL backend compile ra |
| `mode` | `search` hoặc `aggregation` |
| `result_count` | số kết quả phù hợp |
| `latency_ms` | tổng thời gian xử lý |
| `status` | `SUCCESS` hoặc `FAILED` |
| `error_message` | lỗi đã sanitize nếu thất bại |
| `summary` | AI/fallback summary nếu có |
| `pinned`, `pinned_at` | đánh dấu query quan trọng |

Điểm hay:

> `search_plan` và `generated_dsl` lưu dạng `JSONB`, nên sau này có thể xem lại, debug hoặc export dựa trên query cũ.

---

## 3. `query_id` là gì và được tạo như thế nào?

Trong database, khóa chính của audit record là:

```sql
id UUID PRIMARY KEY
```

Trong API/UI, field này thường được gọi là:

```text
query_id
```

Ví dụ `query_id`:

```text
3f3b7c6e-9a8b-4c21-b0d8-7e7d2f1a1234
```

Ý nghĩa:

- Mỗi lần search tạo một `query_id` riêng.
- `query_id` dùng để xem detail.
- `query_id` dùng để pin/unpin.
- `query_id` dùng để rerun/export CSV.

Câu nói khi bảo vệ:

> `query_id` là UUID do backend tạo cho mỗi lần search. Nó là mã định danh duy nhất của một lần điều tra, giúp frontend mở lại detail, pin query, rerun hoặc export.

---

## 4. History và audit logs có cùng field không?

Không hoàn toàn giống nhau.

### History list

History list là danh sách rút gọn cho user hiện tại.

Nó thường có:

```text
query_id
question
mode
result_count
latency_ms
status
created_at
pinned
pinned_at
```

History list thường **không cần hiển thị `user_identity`**, vì endpoint history đã scope theo user hiện tại.

### History detail

History detail đầy đủ hơn, có thể có:

```text
user_identity
error_message
summary
search_plan
generated_dsl
```

Dùng khi user click vào một investigation để xem chi tiết.

### Audit logs

Audit logs dành cho admin nên có thêm:

```text
user_identity
error_message
```

Ý nghĩa:

- `user_identity`: biết ai đã chạy query.
- `error_message`: biết query fail vì lý do gì.

Câu nói khi bảo vệ:

> History list là bản tóm tắt cho analyst, nên không cần hiện quá nhiều field. History detail và audit logs mới chứa thông tin đầy đủ hơn như `user_identity`, `error_message`, SearchPlan và DSL. Audit logs dành cho admin để truy vết toàn hệ thống.

---

## 5. Khi search thành công thì lưu audit như thế nào?

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/audit/SearchAuditService.java
backend/src/main/java/com/soc/ai/search/audit/AuditPersistenceService.java
```

Trong `SearchAuditService.saveSuccess(...)`:

```java
persistenceService.save(new SearchQueryLog(
        queryId,
        currentUserService.currentIdentity(),
        question,
        toJsonNode(searchPlan),
        toLimitedDslNode(queryId, generatedDsl),
        searchPlan.mode(),
        resultCount,
        latencyMs,
        AuditStatus.SUCCESS,
        null,
        summary,
        Instant.now()));
```

Ý nghĩa:

- Lấy identity user hiện tại bằng `CurrentUserService`.
- Convert SearchPlan và DSL thành JSON để lưu.
- Lưu trạng thái `SUCCESS`.
- Lưu `summary` nếu có.
- Lưu `latency_ms` cuối cùng.

Trong `AuditPersistenceService`:

```java
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void save(SearchQueryLog queryLog) {
    repository.saveAndFlush(queryLog);
}
```

Ý nghĩa:

> Audit persistence dùng transaction riêng ngắn. Điều này giúp log audit được lưu độc lập, rõ ràng hơn với luồng search chính.

---

## 6. Khi search thất bại thì lưu gì?

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/audit/SearchAuditService.java
backend/src/main/java/com/soc/ai/search/audit/AuditErrorSanitizer.java
```

Trong `saveFailure(...)`:

```java
persistenceService.save(new SearchQueryLog(
        queryId,
        currentUserService.currentIdentity(),
        question,
        toJsonNode(searchPlan),
        toLimitedDslNode(queryId, generatedDsl),
        searchPlan == null ? null : searchPlan.mode(),
        null,
        latencyMs,
        AuditStatus.FAILED,
        errorSanitizer.sanitize(exception),
        null,
        Instant.now()));
```

Ý nghĩa:

- Vẫn lưu `question` và `user_identity`.
- Nếu đã có SearchPlan/DSL thì lưu lại để debug.
- `result_count = null` vì query fail.
- `status = FAILED`.
- `error_message` được sanitize, không lưu stack trace.

Câu trả lời khi bị hỏi:

> Nếu LLM/validator/Elasticsearch lỗi, hệ thống vẫn cố lưu audit failed record để biết user hỏi gì và lỗi xảy ra ở đâu, nhưng không lộ stack trace ra UI.

---

## 7. Vì sao giới hạn generated DSL 100 KB?

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/audit/SearchAuditService.java
```

Trong code:

```java
private static final int MAX_GENERATED_DSL_BYTES = 100 * 1024;
```

Nếu DSL quá lớn:

```java
return null;
```

Ý nghĩa:

> Audit vẫn lưu record, nhưng bỏ qua DSL quá lớn để tránh làm phình PostgreSQL hoặc gây lỗi lưu JSONB.

### Nếu rerun mà không có DSL thì sao?

Không sao, vì hệ thống **không rerun bằng DSL đã lưu**.

Flow đúng là:

```text
query_id
    ↓
lấy SearchPlan đã lưu trong PostgreSQL
    ↓
validate lại SearchPlan
    ↓
compile lại DSL mới
    ↓
execute Elasticsearch
```

Ý nghĩa:

- `generated_dsl` trong audit chủ yếu để minh bạch/debug.
- `search_plan` mới là dữ liệu quan trọng để rerun/export.
- Nếu `generated_dsl` bị bỏ qua vì vượt 100KB, rerun vẫn chạy được nếu `search_plan` còn hợp lệ.
- Backend không nhận DSL từ client và cũng không tin DSL đã lưu để chạy lại.

Câu nói khi bảo vệ:

> DSL trong audit chỉ phục vụ minh bạch và debug. Khi rerun hoặc export, backend lấy SearchPlan đã lưu, validate lại, compile lại DSL rồi mới chạy Elasticsearch. Vì vậy nếu `generated_dsl` bị omit do vượt 100KB thì rerun vẫn hoạt động, miễn là `search_plan` còn hợp lệ.

---

## 8. Recent Queries là gì?

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/audit/AuditQueryController.java
backend/src/main/java/com/soc/ai/search/audit/AuditQueryService.java
frontend/src/services/history-api.ts
frontend/src/components/soc/history-sheet.tsx
```

Endpoint:

```java
@GetMapping("/api/v1/search/history")
@PreAuthorize("@rbacPermissionService.authDisabled() or hasRole('SOC_ANALYST')")
public PagedResponse<SearchHistoryItem> history(...)
```

Frontend gọi:

```ts
getSearchHistory(page, size, filters, signal)
```

Ý nghĩa:

> Recent Queries là danh sách nhanh các query gần đây để analyst mở lại hoặc rerun nhanh, không phải màn hình audit đầy đủ.

Response item thường có:

- `query_id`;
- `question`;
- `mode`;
- `status`;
- `result_count`;
- `latency_ms`;
- `created_at`;
- `pinned`.

---

## 9. All Investigations là gì?

Code liên quan:

```text
frontend/src/components/soc/investigations/investigations-page.tsx
frontend/src/services/history-api.ts
backend/src/main/java/com/soc/ai/search/audit/AuditQueryController.java
backend/src/main/java/com/soc/ai/search/audit/AuditQueryService.java
```

All Investigations là workspace đầy đủ hơn Recent Queries.

Nó dùng các API:

```http
GET /api/v1/search/history?page=0&size=...
GET /api/v1/search/history/{queryId}
PATCH /api/v1/search/history/{queryId}/pin
```

Dùng để:

- xem toàn bộ history;
- filter theo `pinned`, `status`, `mode`;
- xem detail của một query;
- xem SearchPlan và generated DSL;
- pin/unpin query quan trọng;
- rerun;
- export CSV theo `query_id`.

Câu nói ngắn:

> Recent Queries là quick access. All Investigations là workspace điều tra đầy đủ.

---

## 10. Pin/unpin hoạt động như thế nào?

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/audit/SearchQueryLog.java
backend/src/main/java/com/soc/ai/search/audit/AuditQueryService.java
backend/src/main/java/com/soc/ai/search/audit/AuditQueryController.java
frontend/src/services/history-api.ts
```

Trong entity:

```java
@Column(name = "pinned", nullable = false)
private boolean pinned = false;

@Column(name = "pinned_at")
private Instant pinnedAt;
```

Setter:

```java
public void setPinned(boolean pinned) {
    this.pinned = pinned;
    if (pinned) {
        this.pinnedAt = Instant.now();
    } else {
        this.pinnedAt = null;
    }
}
```

Endpoint:

```java
@PatchMapping("/api/v1/search/history/{queryId}/pin")
@PreAuthorize("@rbacPermissionService.authDisabled() or hasAnyRole('SOC_ANALYST', 'SOC_ADMIN')")
public ResponseEntity<SearchHistoryItem> pinQuery(...)
```

Ý nghĩa:

> Pin giúp analyst đánh dấu những query quan trọng để demo, điều tra tiếp hoặc tái sử dụng.

---

## 11. Admin audit logs khác history như thế nào?

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/audit/AuditQueryController.java
backend/src/main/java/com/soc/ai/search/audit/AuditQueryService.java
```

Endpoint admin:

```java
@GetMapping("/api/v1/audit-logs")
@PreAuthorize("@rbacPermissionService.authDisabled() or hasRole('SOC_ADMIN')")
public PagedResponse<AuditLogItem> auditLogs(...)
```

Trong service:

```java
result = repository.findAll(PageRequest.of(page, size, AUDIT_SORT));
```

Ý nghĩa:

- History phục vụ analyst xem query của mình.
- Audit logs phục vụ admin truy vết toàn hệ thống.
- Audit logs có thêm `user_identity` và `error_message`.

Câu trả lời khi bị hỏi:

> Analyst dùng history để làm việc hằng ngày. Admin dùng audit logs để kiểm tra ai đã hỏi gì, query nào fail, hệ thống phản hồi ra sao.

---

## 12. Vì sao audit/history quan trọng với SOC?

Trong hệ thống SOC, truy vết rất quan trọng vì:

- cần biết analyst đã điều tra gì;
- cần biết AI sinh SearchPlan nào;
- cần biết backend compile DSL nào;
- cần biết query có thành công hay không;
- cần debug khi LLM/Elasticsearch lỗi;
- cần chứng minh hệ thống không để AI chạy query tùy ý.

Câu nói khi bảo vệ:

> Audit trail biến mỗi lần search thành một dấu vết có thể kiểm tra lại. Đây là điểm quan trọng với hệ thống an toàn thông tin, vì kết quả điều tra không chỉ để xem ngay lúc đó mà còn cần truy vết sau này.

---

## 13. Câu trả lời mẫu khi hội đồng hỏi

### Hệ thống lưu gì sau mỗi lần search?

> Hệ thống lưu `query_id`, user identity, câu hỏi tự nhiên, mode, SearchPlan, generated DSL, result count, latency, summary hoặc error message vào PostgreSQL.

### `query_id` là gì?

> `query_id` là UUID do backend tạo cho mỗi lần search. Nó chính là khóa chính của record trong bảng `search_query_logs`, dùng để xem detail, pin/unpin, rerun hoặc export CSV.

### History có `user_identity` và `error_message` giống audit logs không?

> History list thường là bản rút gọn cho user hiện tại nên không cần hiển thị `user_identity` và `error_message`. History detail có thể có các field này. Audit logs dành cho admin nên có `user_identity` và `error_message` để truy vết ai chạy query nào và lỗi gì xảy ra.

### Tại sao phải lưu cả SearchPlan và DSL?

> SearchPlan giúp hiểu ý định của user/LLM ở mức nghiệp vụ. DSL giúp debug chính xác câu query Elasticsearch đã chạy. Hai phần này chứng minh pipeline NL -> SearchPlan -> DSL có thể truy vết.

### Tại sao DSL chỉ được lưu tối đa 100KB?

> Vì DSL chỉ phục vụ debug/truy vết, không phải nguồn sự thật để rerun. Giới hạn 100KB giúp tránh làm phình PostgreSQL nếu có bug hoặc query bất thường. Khi rerun/export, backend dùng SearchPlan đã lưu để validate và compile lại DSL mới.

### Nếu record không có `generated_dsl` thì rerun có lỗi không?

> Không, miễn là `search_plan` còn hợp lệ. Rerun không dùng DSL đã lưu. Backend lấy SearchPlan, validate lại, compile lại DSL rồi execute. Nếu SearchPlan cũng không có, ví dụ query fail quá sớm ở bước parser/LLM, thì query đó không nên rerun và backend sẽ trả lỗi có kiểm soát.

### Recent Queries và All Investigations khác nhau thế nào?

> Recent Queries là panel xem nhanh các query gần đây để rerun nhanh. All Investigations là trang đầy đủ hơn để filter, xem detail, pin/unpin, xem SearchPlan/DSL và export.

### Admin dùng audit logs để làm gì?

> Admin dùng audit logs để xem toàn bộ hoạt động của hệ thống: ai search, search gì, thành công hay fail, lỗi gì, latency bao nhiêu.

### Nếu search fail thì có lưu audit không?

> Có. Hệ thống lưu failed record với question, user identity, status failed, latency và error message đã sanitize. Không lưu stack trace thô ra UI hoặc audit.

---

## 14. Một câu cực ngắn để nhớ

> Audit/history trả lời được 5 câu: ai hỏi, hỏi gì, SearchPlan nào, DSL nào, kết quả hoặc lỗi ra sao.
