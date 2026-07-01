# Prompt: Support Multi-value Entity Filters In SearchPlan

## Role

Bạn là Senior Full-stack Engineer chuyên Spring Boot, React, TypeScript, Elasticsearch DSL và hệ thống SOC/SIEM.

## Bối cảnh

Hiện tại `SearchPlan` đã hỗ trợ nhiều giá trị cho một số field như:

- `severity`
- `event_type`
- `country_code`

Nhưng các entity field sau hiện đang là single string:

- `user`
- `host`
- `ip`
- `source`
- `message_query`

Điều này làm query kiểu sau chưa diễn đạt tốt:

```text
Find failed login events for admin or vpn.user in the last 24 hours
Show events from host vpn-gw-01 or web-01
Find activity from IP 203.0.113.45 or 198.51.100.200
```

Tôi muốn mở rộng SearchPlan để hỗ trợ multi-value entity filters, nhưng phải backward compatible với audit/history cũ.

## Mục tiêu

Cho phép `user`, `host`, `ip`, `source` nhận một hoặc nhiều giá trị.

Ví dụ mới:

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

Nhưng vẫn phải đọc được SearchPlan cũ:

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

## Nguyên tắc quan trọng

1. Backward compatible là bắt buộc.
2. Không làm hỏng audit/history cũ.
3. Không làm hỏng CSV export replay query cũ.
4. Không đổi `message_query` thành array ở task này.
5. Không mở rộng quá rộng sang nested boolean query phức tạp.
6. Multi-value chỉ mang nghĩa OR trong cùng một field.

Ví dụ:

```json
"user": ["admin", "vpn.user"]
```

có nghĩa là:

```text
user = admin OR user = vpn.user
```

Các field khác nhau vẫn là AND:

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

## Files cần đọc trước

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
- `frontend/src/components/soc/query-breakdown.tsx` nếu đã có
- `frontend/src/services/search-plan-api.ts`
- `frontend/src/components/soc/query-transparency.tsx`

Docs:

- `docs/questions/Q20_result_filter_sort.md`
- `docs/questions/Q21_filter_search_sort_export.md`

## Backend yêu cầu

### 1. SearchFilters type

Mở rộng các field sau để hỗ trợ cả single string và list string:

- `user`
- `host`
- `ip`
- `source`

Ưu tiên thiết kế sạch:

- Nếu dùng Java record hiện tại khó nhận union type, có thể tạo custom deserializer.
- Hoặc đổi internal representation sang `List<String>` và custom setter/deserializer để nhận cả string và array.

Yêu cầu:

- JSON string cũ vẫn parse được.
- JSON array mới parse được.
- Internal logic nên normalize thành list để validator/compiler xử lý dễ.

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

### 2. Validation

Update `SearchPlanValidator`.

Rule:

- List không được rỗng nếu field có mặt.
- Mỗi item phải là non-blank string.
- Giới hạn tối đa 10 values mỗi field.
- `ip` mỗi item vẫn phải là IPv4 hợp lệ.
- `source`, `user`, `host` không được chứa wildcard/script/query_string/expression lạ.
- Reject nested array/object.

Không làm mất các validation cũ.

### 3. Compiler

Update `SearchPlanCompiler`.

Rule:

- Nếu field có 1 value thì có thể sinh `term`.
- Nếu field có nhiều value thì sinh `terms`.
- Nếu muốn đơn giản, có thể luôn sinh `terms` cho list đã normalize.

Ví dụ:

```json
"user": ["admin", "vpn.user"]
```

sinh:

```json
{ "terms": { "user": ["admin", "vpn.user"] } }
```

Field mapping phải đúng với Elasticsearch mapping hiện tại. Không tự thêm `.keyword` bừa bãi nếu mapping đã là keyword.

### 4. Prompt cho Gemini

Update `SearchPlanPromptBuilder`.

Yêu cầu prompt nói rõ:

- `user`, `host`, `ip`, `source` may be a string or array of strings.
- If the user asks for multiple users/hosts/IPs/sources, use an array.
- Multi-value means OR within the same field.
- Do not invent unknown fields.

Thêm ví dụ:

```text
Find failed login events for admin or vpn.user in the last 24 hours
```

Expected SearchPlan:

```json
"user": ["admin", "vpn.user"]
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
- timestamp last 24h

## Frontend yêu cầu

### 1. Types

Update `frontend/src/types/soc.ts`.

Các field sau có thể là:

```ts
string | string[] | null
```

hoặc nếu đã normalize client-side:

```ts
string[] | null
```

Nhưng cần đảm bảo dữ liệu cũ từ audit vẫn render được.

### 2. Filter & Sort Results UI

Trong `result-tabs.tsx`, cân nhắc mở rộng các input:

- User
- Host
- Source IP
- Source

Không cần làm UI quá phức tạp nếu không đủ thời gian.

Phương án MVP cho UI:

- Cho phép nhập nhiều giá trị bằng dấu phẩy.

Ví dụ:

```text
admin, vpn.user
```

Frontend normalize thành:

```ts
["admin", "vpn.user"]
```

Nếu chỉ nhập một giá trị:

```ts
"admin" hoặc ["admin"]
```

Chọn cách nhất quán với backend.

### 3. Query Breakdown

Nếu đã có `QueryBreakdown`, update render:

- Nếu field là string: hiển thị `admin`
- Nếu field là array: hiển thị `admin, vpn.user`
- Không render `null` hoặc empty array.

## Tests bắt buộc

Backend:

1. Validator pass:
   - `user = ["admin", "vpn.user"]`
   - `host = ["vpn-gw-01", "web-01"]`
   - `ip = ["203.0.113.45", "198.51.100.200"]`
   - single string cũ vẫn pass.

2. Validator reject:
   - empty list;
   - blank item;
   - more than 10 values;
   - invalid IP;
   - wildcard/script/query_string expression.

3. Compiler:
   - multi-value user sinh `terms`.
   - single string cũ vẫn compile đúng.

4. Parser/backward compatibility:
   - JSON cũ `"user": "admin"` parse được.
   - JSON mới `"user": ["admin", "vpn.user"]` parse được.

Frontend:

1. Query Breakdown render array values correctly.
2. Filter input comma-separated values tạo SearchPlan đúng.
3. Existing single-value SearchPlan vẫn render đúng.

## Verification

Chạy:

```bash
cd backend
.\mvnw.cmd test
```

```bash
cd frontend
npm run lint
npm run test
npm run build
```

Nếu CI/CD có smoke test liên quan, kiểm tra không làm fail deploy.

## Không làm trong task này

Không cần:

- Multi-turn query.
- Nested boolean logic `(A OR B) AND (C OR D)` ngoài rule terms đơn giản.
- UI advanced token editor.
- Support regex/wildcard.
- Đổi `message_query` thành array.

## Câu trả lời bảo vệ sau khi làm

> Ban đầu SearchPlan chỉ hỗ trợ một user/host/IP để giữ contract đơn giản. Sau đó em mở rộng backward-compatible để hỗ trợ nhiều entity values. Các giá trị trong cùng một field được hiểu là OR và backend compiler sinh `terms` query. SearchPlan cũ trong audit vẫn chạy được vì backend chấp nhận cả string và array.
