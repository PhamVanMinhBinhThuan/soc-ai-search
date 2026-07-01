# Prompt: Support Multi-value Entity Filters In SearchPlan

## Role

Bạn là Senior Full-stack Engineer chuyên Spring Boot, React, TypeScript, Elasticsearch DSL và hệ thống SOC/SIEM.

## Bối Cảnh

Hiện tại `SearchPlan` đã hỗ trợ nhiều giá trị cho một số field:

- `severity`
- `event_type`
- `country_code`

Nhưng các entity field sau hiện vẫn là single string:

- `user`
- `host`
- `ip`
- `source`

Ví dụ hiện tại:

```json
{
  "filters": {
    "user": "admin",
    "host": "vpn-gw-01",
    "ip": "203.0.113.45",
    "source": "vpn"
  }
}
```

Điều này làm các câu hỏi dạng OR trong cùng một field chưa diễn đạt tốt:

```text
Find failed login events for admin or vpn.user in the last 24 hours
Show events from host vpn-gw-01 or web-01
Find activity from IP 203.0.113.45 or 198.51.100.200
Show windows-auth or vpn events in the last 24 hours
```

Tôi muốn mở rộng SearchPlan để hỗ trợ multi-value entity filters, nhưng phải **backward compatible** với audit/history cũ.

## Mục Tiêu

Cho phép `user`, `host`, `ip`, `source` nhận một hoặc nhiều giá trị.

SearchPlan mới:

```json
{
  "filters": {
    "user": ["admin", "vpn.user"],
    "host": ["vpn-gw-01", "web-01"],
    "ip": ["203.0.113.45", "198.51.100.200"],
    "source": ["vpn", "windows-auth"]
  }
}
```

SearchPlan cũ vẫn phải đọc được:

```json
{
  "filters": {
    "user": "admin",
    "host": "vpn-gw-01",
    "ip": "203.0.113.45",
    "source": "vpn"
  }
}
```

## Backward Compatible Nghĩa Là Gì?

Audit/history trong PostgreSQL đang lưu SearchPlan JSON cũ. Sau khi đổi schema, hệ thống vẫn phải:

- mở được detail query cũ;
- rerun được query cũ;
- export CSV từ query cũ;
- render được Query Breakdown cho query cũ;
- không làm hỏng các record đã lưu trong audit/history.

Vì vậy backend/frontend phải chấp nhận cả:

```json
"user": "admin"
```

và:

```json
"user": ["admin", "vpn.user"]
```

## Nguyên Tắc Quan Trọng

1. Backward compatible là bắt buộc.
2. Không làm hỏng audit/history cũ.
3. Không làm hỏng CSV export replay query cũ.
4. Không đổi `message_query` thành array trong task này.
5. Không mở rộng sang nested boolean query phức tạp.
6. Multi-value chỉ mang nghĩa OR trong cùng một field.
7. Các field khác nhau vẫn là AND.

Ví dụ:

```json
{
  "user": ["admin", "vpn.user"],
  "event_type": ["failed_login"]
}
```

có nghĩa là:

```text
(user = admin OR user = vpn.user)
AND event_type = failed_login
```

## Vì Sao Không Đổi `message_query` Thành Array?

`message_query` là full-text search, phức tạp hơn keyword fields.

Task này chỉ mở rộng các field structured/keyword:

- `user`
- `host`
- `ip`
- `source`

Không hỗ trợ:

```json
"message_query": ["brute force", "account lockout"]
```

Lý do:

- OR nhiều message keyword cần thiết kế DSL riêng (`match`, `match_phrase`, `bool should`, `minimum_should_match`...).
- Dễ làm LLM sinh query mơ hồ.
- Dễ ảnh hưởng kết quả search nhiều hơn các field keyword.

Giữ `message_query` là single string trong task này:

```json
"message_query": "brute force"
```

## Files Cần Đọc Trước

Backend:

- `backend/src/main/java/com/soc/ai/search/search/plan/SearchFilters.java`
- `backend/src/main/java/com/soc/ai/search/search/plan/SearchPlan.java`
- `backend/src/main/java/com/soc/ai/search/search/validation/SearchPlanValidator.java`
- `backend/src/main/java/com/soc/ai/search/search/compiler/SearchPlanCompiler.java`
- `backend/src/main/java/com/soc/ai/search/llm/prompt/SearchPlanPromptBuilder.java`
- `backend/src/main/java/com/soc/ai/search/llm/mock/MockLlmClient.java`
- `backend/src/test/java/com/soc/ai/search/search/validation/SearchPlanValidatorTest.java`
- `backend/src/test/java/com/soc/ai/search/search/compiler/SearchPlanCompilerTest.java`

Frontend:

- `frontend/src/types/soc.ts`
- `frontend/src/components/soc/result-tabs.tsx`
- `frontend/src/components/soc/query-breakdown.tsx`
- `frontend/src/components/soc/query-breakdown.test.tsx`
- `frontend/src/services/search-plan-api.ts`
- `frontend/src/components/soc/query-transparency.tsx`

Docs:

- `docs/questions/Q20_result_filter_sort.md`
- `docs/questions/Q21_filter_search_sort_export.md`

## Backend Yêu Cầu

### 1. SearchFilters Type

Mở rộng các field sau để hỗ trợ cả single string và list string:

- `user`
- `host`
- `ip`
- `source`

Thiết kế khuyến nghị:

- Internal representation nên normalize thành list để validator/compiler xử lý dễ.
- Có thể dùng custom deserializer để nhận cả JSON string và JSON array.

Ví dụ:

```json
"user": "admin"
```

normalize thành:

```java
List.of("admin")
```

Ví dụ:

```json
"user": ["admin", "vpn.user"]
```

normalize thành:

```java
List.of("admin", "vpn.user")
```

Yêu cầu:

- JSON string cũ vẫn parse được.
- JSON array mới parse được.
- Nested object/array lồng nhau bị reject.
- Không đổi type của `message_query`.

### 2. Validation

Update `SearchPlanValidator`.

Rule:

- List không được rỗng nếu field có mặt.
- Mỗi item phải là non-blank string.
- Giới hạn tối đa 10 values mỗi field.
- `ip` mỗi item vẫn phải là IPv4 hợp lệ.
- `source`, `user`, `host` không được chứa wildcard/script/query_string/expression lạ.
- Reject nested array/object.
- Không làm mất các validation cũ.

### 3. Compiler

Update `SearchPlanCompiler`.

Rule:

- Nếu field có 1 value, có thể sinh `term`.
- Nếu field có nhiều value, sinh `terms`.
- Nếu muốn đơn giản và nhất quán, có thể luôn sinh `terms` cho list đã normalize.

Ví dụ:

```json
"user": ["admin", "vpn.user"]
```

sinh:

```json
{ "terms": { "user": ["admin", "vpn.user"] } }
```

Field mapping phải đúng với Elasticsearch mapping hiện tại. Không tự thêm `.keyword` nếu mapping đã là keyword.

### 4. Prompt Cho Gemini

Update `SearchPlanPromptBuilder`.

Prompt phải nói rõ:

- `user`, `host`, `ip`, `source` may be a string or array of strings.
- If the user asks for multiple users/hosts/IPs/sources, use an array.
- Multi-value means OR within the same field.
- Different fields still mean AND.
- Do not invent unknown fields.
- `message_query` remains a single string.

Thêm ví dụ:

```text
Find failed login events for admin or vpn.user in the last 24 hours
```

Expected SearchPlan:

```json
{
  "filters": {
    "event_type": ["failed_login"],
    "user": ["admin", "vpn.user"],
    "timestamp": { "from": "now-24h", "to": "now" }
  }
}
```

### 5. Mock LLM

Update `MockLlmClient` nếu có keyword scenario phù hợp.

Thêm ít nhất một mock case:

```text
Find failed login events for admin or vpn.user in the last 24 hours
```

Expected:

- `event_type = ["failed_login"]`
- `user = ["admin", "vpn.user"]`
- `timestamp = now-24h..now`

## Frontend Yêu Cầu

### 1. Types

Update `frontend/src/types/soc.ts`.

Các field sau có thể là:

```ts
string | string[] | null
```

hoặc nếu frontend normalize:

```ts
string[] | null
```

Nhưng phải đảm bảo dữ liệu cũ từ audit vẫn render được.

Các field cần mở rộng:

- `user`
- `host`
- `ip`
- `source`

Không đổi:

- `message_query: string | null`

### 2. Filter & Sort Results UI

Trong `result-tabs.tsx`, cân nhắc mở rộng các input:

- User
- Host
- Source IP
- Source

Phương án UI đơn giản, ít rủi ro:

- Cho phép nhập nhiều giá trị bằng dấu phẩy.

Ví dụ:

```text
admin, vpn.user
```

Frontend normalize thành:

```ts
["admin", "vpn.user"]
```

Nếu chỉ nhập một giá trị, chọn một convention nhất quán:

```ts
["admin"]
```

Khuyến nghị: frontend gửi array cho các field đã nâng cấp, backend vẫn nhận string cũ để backward compatible.

### 3. Query Breakdown

Hiện tại đã có:

- `frontend/src/components/soc/query-breakdown.tsx`

Update component này để render đúng cả string và array.

Yêu cầu:

- Nếu field là string: hiển thị `admin`.
- Nếu field là array: hiển thị `admin, vpn.user`.
- Không render `null`.
- Không render empty array.
- Không render table row rỗng.
- Country formatting hiện có vẫn phải hoạt động với array `country_code`.

Ví dụ:

```json
"user": ["admin", "vpn.user"]
```

Query Breakdown:

```text
User: admin, vpn.user
```

Ví dụ:

```json
"source": ["vpn", "windows-auth"]
```

Query Breakdown:

```text
Source: vpn, windows-auth
```

### 4. Audit / History Detail

Vì Investigation/Audit detail dùng SearchPlan đã lưu trong PostgreSQL:

- Query Breakdown phải render được SearchPlan cũ dạng string.
- Query Breakdown phải render được SearchPlan mới dạng array.
- Rerun/export query cũ không được lỗi.

## Tests Bắt Buộc

Backend:

1. Validator pass:
   - `user = ["admin", "vpn.user"]`
   - `host = ["vpn-gw-01", "web-01"]`
   - `ip = ["203.0.113.45", "198.51.100.200"]`
   - `source = ["vpn", "windows-auth"]`
   - single string cũ vẫn pass.

2. Validator reject:
   - empty list;
   - blank item;
   - more than 10 values;
   - invalid IP;
   - wildcard/script/query_string expression;
   - nested object/array.

3. Compiler:
   - multi-value user sinh `terms`.
   - multi-value source sinh `terms`.
   - single string cũ vẫn compile đúng.

4. Parser/backward compatibility:
   - JSON cũ `"user": "admin"` parse được.
   - JSON mới `"user": ["admin", "vpn.user"]` parse được.

Frontend:

1. Query Breakdown render string value đúng.
2. Query Breakdown render array values đúng.
3. Query Breakdown không render null/empty array.
4. Filter input comma-separated values tạo SearchPlan đúng.
5. Existing single-value SearchPlan từ audit/history vẫn render đúng.

## Verification

Chạy backend:

```bash
cd backend
.\mvnw.cmd test
```

Chạy frontend:

```bash
cd frontend
npm run lint
npm run test
npm run build
```

Nếu CI/CD có smoke test liên quan, kiểm tra không làm fail deploy.

## Không Làm Trong Task Này

Không cần:

- Multi-turn query.
- Nested boolean logic `(A OR B) AND (C OR D)` ngoài rule `terms` đơn giản.
- UI advanced token editor.
- Support regex/wildcard.
- Đổi `message_query` thành array.
- Thêm backend endpoint mới.
- Thay đổi audit schema trong PostgreSQL nếu không cần.

## Câu Trả Lời Bảo Vệ Sau Khi Làm

> Ban đầu SearchPlan chỉ hỗ trợ một user/host/IP/source để giữ contract đơn giản. Sau đó em mở rộng backward-compatible để hỗ trợ nhiều entity values. Các giá trị trong cùng một field được hiểu là OR và backend compiler sinh `terms` query. SearchPlan cũ trong audit vẫn chạy được vì backend chấp nhận cả string và array.
