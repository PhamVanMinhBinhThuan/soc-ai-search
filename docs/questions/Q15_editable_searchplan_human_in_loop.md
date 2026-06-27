# Q15 - Editable SearchPlan / Human-in-the-loop Hoạt Động Như Thế Nào?

## 1. Câu trả lời ngắn

Editable SearchPlan là cơ chế **human-in-the-loop**. Nếu AI sinh SearchPlan gần đúng nhưng chưa hoàn hảo, Analyst/Admin có thể sửa SearchPlan rồi chạy lại. Viewer không được edit. DSL vẫn read-only và luôn được backend compiler sinh lại.

Câu cần nhớ khi bảo vệ:

> Analyst có thể chỉnh SearchPlan vì nó gần ngôn ngữ nghiệp vụ hơn DSL. Nhưng quyền kiểm soát vẫn nằm ở backend: SearchPlan sửa tay vẫn đi qua validator và compiler, còn DSL không cho edit trực tiếp.

---

## 2. Vì sao cần Editable SearchPlan?

LLM có thể sinh gần đúng nhưng chưa đúng hoàn toàn.

Ví dụ user hỏi:

```text
Show top 3 source IPs in the last 12 days
```

LLM có thể sinh sai time range:

```json
{
  "filters": {
    "timestamp": {
      "from": "now-30d",
      "to": "now"
    }
  }
}
```

Analyst có thể sửa thành:

```json
{
  "filters": {
    "timestamp": {
      "from": "now-12d",
      "to": "now"
    }
  }
}
```

Ý nghĩa:

> Thay vì bắt analyst viết Elasticsearch DSL phức tạp, hệ thống cho họ sửa SearchPlan ở dạng JSON dễ hiểu hơn.

---

## 3. Cấu trúc SearchPlan có phải do mình tự định nghĩa không?

Đúng. `SearchPlan` là **contract trung gian do project tự định nghĩa**, không phải format mặc định của Elasticsearch hay Gemini.

Flow:

```text
Natural language
    ↓
LLM sinh SearchPlan
    ↓
Backend validate SearchPlan
    ↓
Backend compile thành Elasticsearch DSL
    ↓
Elasticsearch execute
```

Ví dụ SearchPlan:

```json
{
  "mode": "search",
  "filters": {
    "timestamp": {
      "from": "now-24h",
      "to": "now"
    },
    "severity": ["high"],
    "event_type": ["failed_login"],
    "user": "admin"
  },
  "message_query": null,
  "page": 0,
  "size": 10
}
```

Elasticsearch không hiểu trực tiếp object này. Backend phải compile nó thành DSL trong:

```text
backend/src/main/java/com/soc/ai/search/search/compiler/SearchPlanCompiler.java
```

Lý do tự định nghĩa SearchPlan:

- dễ cho LLM sinh hơn Elasticsearch DSL;
- dễ cho analyst đọc/sửa hơn DSL;
- backend kiểm soát được field allowlist;
- dễ validate rule nghiệp vụ;
- không cho LLM/client gửi DSL trực tiếp;
- hỗ trợ cả `search` và `aggregation`.

Câu nói khi bảo vệ:

> SearchPlan là contract trung gian do em thiết kế. LLM không sinh Elasticsearch DSL trực tiếp. Nó chỉ sinh SearchPlan theo schema em định nghĩa, sau đó backend validate và compile thành DSL an toàn.

---

## 4. UI edit nằm ở đâu?

Code liên quan:

```text
frontend/src/components/soc/query-transparency.tsx
```

Component chính:

```tsx
export function QueryTransparency({
  searchPlan,
  generatedDsl,
  canEditPlan = false,
  onRunEditedPlan,
}: ...)
```

Nó có 2 tab:

```text
Validated SearchPlan
Compiled DSL
```

Nếu có quyền edit:

```tsx
{canEditPlan && !isEditing && (
  <Button onClick={() => setIsEditing(true)}>
    Edit SearchPlan
  </Button>
)}
```

Nếu không có quyền:

```tsx
SearchPlan editing requires SOC_ANALYST or SOC_ADMIN.
```

Ý nghĩa:

- Analyst/Admin thấy nút `Edit SearchPlan`.
- Viewer chỉ xem được SearchPlan, không được sửa.
- DSL tab vẫn chỉ để xem/copy.

---

## 5. SearchPlan editor dùng gì?

Code liên quan:

```text
frontend/src/components/soc/query-transparency.tsx
```

Editor dùng:

```tsx
CodeMirror
```

với JSON extension:

```tsx
extensions={[json()]}
```

Khi user gõ:

```tsx
onChange={(value) => {
  setCode(value)
  try {
    JSON.parse(value)
    setError(null)
  } catch {
    setError('Invalid JSON format')
  }
}}
```

Ý nghĩa:

- Có syntax highlighting JSON.
- Bắt lỗi JSON format ngay trên frontend.
- Nếu JSON sai cú pháp, nút `Run Edited Plan` bị disable.

Nút reset:

```tsx
Reset to AI Plan
```

Ý nghĩa:

> Reset đưa editor về đúng SearchPlan ban đầu do AI/backend trả về cho query hiện tại.

---

## 6. Viewer có edit được không?

Không.

Code liên quan:

```text
frontend/src/auth/permissions.ts
frontend/src/components/soc/query-transparency.tsx
```

Trong `permissions.ts`:

```ts
export function canEditSearchPlan(context: PermissionContext) {
  return hasAtLeastRole(context, 'SOC_ANALYST')
}
```

Role hierarchy frontend:

```ts
SOC_VIEWER = 1
SOC_ANALYST = 2
SOC_ADMIN = 3
```

Ý nghĩa:

- Viewer không đủ rank.
- Analyst được edit.
- Admin cũng được edit.

Câu nói khi bảo vệ:

> Viewer chỉ được search/xem kết quả. Edit SearchPlan là hành động điều tra sâu hơn nên yêu cầu Analyst hoặc Admin.

---

## 7. Khi bấm Run Edited Plan thì frontend gọi gì?

Code liên quan:

```text
frontend/src/components/soc/query-transparency.tsx
frontend/src/services/search-api.ts
```

Trong editor:

```tsx
const parsed = JSON.parse(code) as SearchPlanDto
await onRun(parsed)
```

Trong `search-api.ts`:

```ts
export async function executeSearchPlan(plan: SearchPlanDto, signal?: AbortSignal) {
  const payload = await requestJson('/api/v1/search/plan', {
    method: 'POST',
    body: JSON.stringify(plan),
  })
  return payload as SearchPlanResponseDto
}
```

Ý nghĩa:

- Edited SearchPlan không đi qua LLM nữa.
- Frontend gọi endpoint kỹ thuật:

```http
POST /api/v1/search/plan
```

- Backend xử lý như một SearchPlan bình thường.

---

## 8. Edited plan có được lưu audit/history không?

Hiện tại: **chưa lưu audit/history thật cho edited plan**.

Flow hiện tại:

```text
Initial query qua POST /api/v1/search
    -> có audit/history

Edited SearchPlan qua POST /api/v1/search/plan
    -> execute kỹ thuật
    -> không gọi SearchAuditService
    -> chưa lưu audit/history thật
```

Code frontend liên quan:

```text
frontend/src/services/search-plan-api.ts
frontend/src/components/soc/query-transparency.tsx
```

Frontend gọi:

```ts
requestJson('/api/v1/search/plan', ...)
```

Sau đó normalize response và tự tạo `query_id` tạm:

```ts
query_id: `edited-${Date.now()}`
original_question: 'Edited SearchPlan'
summary: 'Executed custom SearchPlan.'
```

Code backend liên quan:

```text
backend/src/main/java/com/soc/ai/search/search/execution/SearchController.java
backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchService.java
```

Endpoint `/api/v1/search/plan` hiện chỉ execute:

```java
@PostMapping("/plan")
public Object searchByPlan(@Valid @RequestBody SearchPlan searchPlan) {
    return searchPlanExecutor.execute(searchPlan);
}
```

Nó **không gọi**:

```java
searchAuditService.saveSuccess(...)
searchAuditService.saveFailure(...)
```

Audit hiện được lưu trong luồng natural language search:

```text
NaturalLanguageSearchService.java
```

Câu nói khi bảo vệ:

> Query ban đầu qua natural language search được lưu audit đầy đủ. Edited SearchPlan hiện chạy qua endpoint kỹ thuật `/api/v1/search/plan`, vẫn đi qua validator/compiler nên an toàn runtime, nhưng chưa persist audit record riêng. Nếu mở rộng production, em sẽ thêm audit cho edited SearchPlan với metadata như `original_question = Edited SearchPlan` hoặc `parent_query_id` để truy vết chuỗi chỉnh sửa.

---

## 9. Backend có tin SearchPlan sửa tay không?

Không tin tuyệt đối.

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/search/validation/SearchPlanValidator.java
backend/src/main/java/com/soc/ai/search/search/compiler/SearchPlanCompiler.java
```

Compiler luôn validate lại:

```java
public CompiledSearchQuery compile(SearchPlan plan) {
    var validatedPlan = validator.validate(plan);
    if (validatedPlan.mode() == SearchMode.AGGREGATION) {
        return compileAggregation(validatedPlan);
    }
    return compileSearch(validatedPlan);
}
```

Ý nghĩa:

> Dù SearchPlan đến từ LLM hay user sửa tay, backend vẫn validate lại trước khi compile DSL.

---

## 10. Validator chặn những gì?

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/search/validation/SearchPlanValidator.java
```

Một số guardrail:

- `mode=search` thì không được có `aggregation`.
- `mode=aggregation` thì bắt buộc có `aggregation`.
- Aggregation field phải nằm trong allowlist:

```text
source, severity, event_type, user, host, ip, country_code
```

- `COUNT` không được có `field`, `top_n`, `interval`.
- `TOP_N` bắt buộc có `top_n` từ 1 đến 100.
- `DATE_HISTOGRAM` bắt buộc có `interval`, không được có `field`.
- Time range chỉ hỗ trợ ISO-8601, `now`, `now-<number>h`, `now-<number>d`.
- Relative time bị giới hạn tối đa `720h` hoặc `90d`.
- Chặn wildcard/script syntax trong filter/message.

Ví dụ:

```java
if (!AGGREGATION_FIELD_ALLOWLIST.contains(field)) {
    errors.add("aggregation.field: must be one of ...");
}
```

Và:

```java
if (value.contains("*") || value.contains("?")) {
    errors.add(field + ": wildcard query syntax is not allowed");
}
```

---

## 11. Vì sao DSL vẫn read-only?

Code liên quan:

```text
frontend/src/components/soc/query-transparency.tsx
backend/src/main/java/com/soc/ai/search/search/compiler/SearchPlanCompiler.java
```

Ở DSL tab:

```tsx
Read-only · Generated by backend compiler
```

Ý nghĩa:

- Frontend/user không được sửa DSL.
- LLM cũng không được sinh DSL để chạy trực tiếp.
- DSL chỉ được tạo bởi backend compiler.

Câu nói khi bảo vệ:

> DSL là lớp nguy hiểm hơn vì nó gần trực tiếp với Elasticsearch. Vì vậy hệ thống chỉ cho sửa SearchPlan, còn DSL luôn read-only và được backend sinh lại.

---

## 12. Nếu user cố tình sửa SearchPlan độc hại thì sao?

Ví dụ user cố sửa:

```json
{
  "mode": "aggregation",
  "aggregation": {
    "type": "top_n",
    "field": "password",
    "top_n": 10
  }
}
```

Backend reject vì `password` không nằm trong allowlist.

Ví dụ user cố dùng wildcard/script:

```json
{
  "message_query": "script painless *"
}
```

Backend reject vì validator chặn wildcard/script syntax.

Câu nói khi bảo vệ:

> SearchPlan sửa tay không bypass guardrail. Nó vẫn đi qua cùng validator/compiler như SearchPlan do AI sinh ra. Nếu sai hoặc độc hại thì backend trả lỗi có kiểm soát và không sinh DSL.

---

## 13. Editable SearchPlan khác sửa DSL trực tiếp thế nào?

| Cách | Có cho phép không? | Lý do |
| --- | --- | --- |
| Sửa SearchPlan | Có, với Analyst/Admin | Gần nghiệp vụ, vẫn validate được |
| Sửa DSL | Không | Dễ bypass guardrail, gần Elasticsearch trực tiếp |

Ví dụ SearchPlan dễ hiểu:

```json
{
  "mode": "search",
  "filters": {
    "severity": ["high"],
    "user": "admin"
  }
}
```

DSL phức tạp hơn:

```json
{
  "query": {
    "bool": {
      "filter": [...]
    }
  }
}
```

Ý nghĩa:

> SearchPlan là hợp đồng trung gian an toàn giữa analyst/AI và Elasticsearch.

---

## 14. Câu trả lời mẫu khi hội đồng hỏi

### Cấu trúc SearchPlan là do mình tự định nghĩa phải không?

> Đúng. SearchPlan là contract trung gian do project tự định nghĩa. Elasticsearch không hiểu trực tiếp SearchPlan. Backend validate SearchPlan rồi compile thành Elasticsearch DSL. Mục đích là không cho LLM hoặc client gửi DSL trực tiếp.

### Nếu AI sinh gần đúng nhưng sai một phần thì sao?

> Analyst có thể sửa SearchPlan trong Query Transparency rồi chạy lại. Đây là human-in-the-loop: AI hỗ trợ tạo plan ban đầu, con người chỉnh lại nếu cần.

### Vì sao Viewer không được edit SearchPlan?

> Viewer chỉ có quyền xem/search cơ bản. Edit SearchPlan là hành động điều tra sâu và có thể thay đổi truy vấn backend, nên yêu cầu Analyst hoặc Admin.

### Nếu analyst sửa SearchPlan sai thì sao?

> Frontend bắt lỗi JSON format trước. Khi gửi xuống backend, SearchPlan vẫn đi qua validator/compiler. Nếu sai rule nghiệp vụ hoặc field không hợp lệ, backend reject và không execute Elasticsearch.

### Vì sao không cho edit DSL?

> DSL có thể chứa query nguy hiểm hoặc bypass allowlist. Hệ thống chỉ cho edit SearchPlan, sau đó backend validate và compile DSL lại. DSL luôn read-only.

### SearchPlan sửa tay có được audit không?

> Hiện tại query ban đầu qua `/api/v1/search` có audit đầy đủ. Edited SearchPlan chạy qua endpoint kỹ thuật `/api/v1/search/plan`, vẫn được validate/compile nhưng chưa persist audit record riêng. Đây là enhancement tốt cho production: lưu thêm audit cho edited plan và liên kết với `parent_query_id`.

---

## 15. Một câu cực ngắn để nhớ

> Editable SearchPlan cho analyst sửa ý định truy vấn, nhưng backend vẫn validate/compile lại; DSL luôn read-only để tránh bypass guardrail.
