# Q22 - Correct or Refine Query bằng AI

## Câu hỏi chính

**Correct or Refine Query là gì? Nó khác gì với Editable SearchPlan?**

## Trả lời ngắn

`Correct or Refine Query` là chức năng cho phép analyst nhập một ghi chú ngắn để:

1. sửa trường hợp AI/SearchPlan hiểu sai ý định ban đầu;
2. hoặc refine tiếp phạm vi điều tra khi kết quả hiện tại đã đúng nhưng analyst muốn đổi thời gian, user, severity, aggregation...

AI không sửa trực tiếp `SearchPlan` và không sinh Elasticsearch DSL. AI chỉ viết lại câu hỏi tự nhiên rõ ràng hơn. Sau đó frontend tự chạy lại câu hỏi đã được viết lại qua pipeline an toàn:

```text
Correct/refine note
  -> AI rewrite natural-language question
  -> /api/v1/search
  -> LLM sinh SearchPlan
  -> Parser
  -> Validator
  -> Compiler sinh DSL
  -> Elasticsearch
  -> Audit/history
```

## Ví dụ

Câu hỏi ban đầu:

```text
Show the top 3 source IPs with the most alerts in the last 12 days
```

SearchPlan hiện tại bị hiểu sai:

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

User nhập feedback:

```text
It should be 12 days, not 30 days
```

AI rewrite nội bộ thành:

```text
Show the top 3 source IPs with the most alerts in the last 12 days
```

Frontend dùng câu rewritten này để chạy lại search. Người dùng không cần tự viết lại toàn bộ câu hỏi.

## Vì sao không cho AI sửa SearchPlan trực tiếp?

Vì `SearchPlan` là contract kỹ thuật giữa LLM và backend. Nếu cho AI patch trực tiếp JSON SearchPlan thì cần xử lý nhiều rủi ro hơn:

- AI có thể đổi sai mode hoặc aggregation.
- AI có thể thêm field không hợp lệ.
- AI có thể tạo JSON sai schema.
- UI phải có diff/preview phức tạp hơn.

Thiết kế hiện tại an toàn hơn:

- AI chỉ sửa câu hỏi tự nhiên.
- SearchPlan vẫn được sinh lại bởi pipeline chính.
- Backend vẫn parse, validate và compile DSL như mọi query khác.
- Nếu AI rewrite sai, SearchPlan/DSL vẫn bị validator/compiler kiểm soát.

## Flow hoạt động

```text
User search thành công
  ↓
User mở Query Breakdown
  ↓
User nhập Correction / refinement note
  ↓
Frontend gọi POST /api/v1/search/refine
  ↓
Backend build prompt correction/refinement
  ↓
Gemini/mock trả rewritten_question
  ↓
Backend reject nếu output là JSON/DSL/markdown/prose lạ
  ↓
Frontend tự gọi lại /api/v1/search bằng rewritten_question
  ↓
Backend sinh SearchPlan mới, validate, compile DSL, execute
  ↓
Audit lưu bản ghi [AI Corrected]
```

## Audit format

Không sửa database schema. Hệ thống lưu metadata vào field `question` theo format:

```text
[AI Corrected] Original question: <original> | Feedback: <feedback> | Rewritten question: <rewritten>
```

Ở list history/audit, UI hiển thị gọn:

```text
[AI Corrected] Original question: <original> | Feedback: <feedback>
```

Ở trang detail, UI hiển thị đủ:

```text
Original question
<original>

Feedback
<feedback>

Rewritten question
<rewritten>
```

Khi bấm `Run Again`, frontend dùng `rewritten question`, không gửi nguyên chuỗi audit metadata vào LLM.

## Code backend cần đọc

### LLM abstraction

```text
backend/src/main/java/com/soc/ai/search/llm/LlmClient.java
backend/src/main/java/com/soc/ai/search/llm/LlmQuestionRefinementRequest.java
backend/src/main/java/com/soc/ai/search/llm/gemini/GeminiLlmClient.java
backend/src/main/java/com/soc/ai/search/llm/mock/MockLlmClient.java
```

Ý nghĩa:

- `LlmClient.generateRefinedQuestion(...)` là method gọi LLM để viết lại câu hỏi.
- `GeminiLlmClient` gọi Gemini ở dạng text output, không ép JSON.
- `MockLlmClient` trả câu rewrite deterministic để test/demo local không cần API key.

### Query refinement API

```text
backend/src/main/java/com/soc/ai/search/search/refine/QueryRefinementController.java
backend/src/main/java/com/soc/ai/search/search/refine/QueryRefinementService.java
backend/src/main/java/com/soc/ai/search/search/refine/QueryRefinementPromptBuilder.java
backend/src/main/java/com/soc/ai/search/search/refine/QueryRefinementRequest.java
backend/src/main/java/com/soc/ai/search/search/refine/QueryRefinementResponse.java
```

Endpoint:

```http
POST /api/v1/search/refine
```

Request gồm:

- `original_question`
- `current_question`
- `current_search_plan`
- `refinement`

Response gồm:

- `rewritten_question`
- `source`
- `latency_ms`

### Natural language search audit override

```text
backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchRequest.java
backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchService.java
```

`NaturalLanguageSearchRequest` có thêm optional `audit_question`.

- `question`: câu rewritten thật sự dùng để gọi LLM SearchPlan, summary và execute.
- `audit_question`: chuỗi hiển thị/lưu audit nếu cần metadata như `[AI Corrected]`.

Backend chỉ dùng `audit_question` cho response `original_question` và audit/history. Nó không dùng `audit_question` để sinh SearchPlan.

## Code frontend cần đọc

### API refine

```text
frontend/src/services/query-refinement-api.ts
```

Hàm chính:

```ts
refineQuery(request)
```

Nếu `VITE_USE_MOCK=true`, service trả rewritten question mock.

### UI Query Transparency

```text
frontend/src/components/soc/query-transparency.tsx
```

UI nằm trong tab `Query Breakdown`:

```text
Correct or Refine Query
[Correction / refinement note]
[Apply AI Update]
```

Khi bấm `Apply AI Update`, UI không chỉ preview nữa. Nó gọi refine API, lấy `rewritten_question`, rồi yêu cầu `App` chạy lại search.

### App orchestration

```text
frontend/src/App.tsx
```

`App` nhận `rewrittenQuestion`, `feedback`, `originalQuestion`, rồi gọi lại search:

```text
question = rewrittenQuestion
audit_question = [AI Corrected] Original question: ... | Feedback: ... | Rewritten question: ...
```

### Format audit question

```text
frontend/src/lib/audit-question-format.ts
frontend/src/components/soc/history-sheet.tsx
frontend/src/components/soc/investigations/investigations-master-list.tsx
frontend/src/components/soc/investigations/investigation-detail-panel.tsx
frontend/src/components/soc/admin/audit-logs-page.tsx
```

Các file này giúp:

- build chuỗi audit `[AI Corrected]`;
- parse chuỗi audit;
- hiển thị gọn ở list;
- hiển thị đầy đủ ở detail;
- khi `Run Again`, dùng lại rewritten question.

## Guardrail

`QueryRefinementService` reject output nếu LLM trả:

- output rỗng;
- quá dài;
- markdown code fence;
- JSON object/array;
- Elasticsearch DSL;
- `query_string`;
- `script`;
- `drop index`;
- `delete`;
- `update`.

Mục tiêu: refine API chỉ được trả một câu hỏi tự nhiên, không được trả DSL hay lệnh nguy hiểm.

## Câu hỏi hội đồng có thể hỏi

### Nếu AI rewrite sai thì sao?

SearchPlan mới vẫn đi qua parser, validator và compiler. Nếu câu rewritten dẫn tới SearchPlan sai schema hoặc nguy hiểm, backend reject. Analyst cũng có thể sửa tiếp bằng feedback khác hoặc dùng Editable SearchPlan.

### Vì sao không để user tự viết lại câu hỏi?

User vẫn có thể tự viết lại. Nhưng feature này hữu ích khi query gần đúng và analyst chỉ muốn sửa nhanh một phần nhỏ như thời gian, user, severity hoặc aggregation. Analyst chỉ cần comment ngắn, AI merge comment đó với context hiện tại.

### Feature này dùng để sửa lỗi hay refine điều tra?

Cả hai. Nó hỗ trợ human-in-the-loop:

- sửa khi AI/SearchPlan hiểu sai;
- refine tiếp khi analyst muốn đổi phạm vi điều tra.

### Có audit không?

Có. Chỉ khi user bấm `Apply AI Update` và hệ thống chạy search thật thì audit mới được tạo. Audit lưu cả original question, feedback và rewritten question trong field `question` theo format `[AI Corrected]`.

## Câu nói ngắn khi bảo vệ

> Correct or Refine Query là cơ chế human-in-the-loop. Khi AI hiểu sai hoặc analyst muốn điều tra tiếp, user nhập feedback tự nhiên. AI chỉ viết lại câu hỏi rõ hơn, còn SearchPlan và DSL vẫn được backend sinh lại, validate và compile. Vì vậy AI hỗ trợ sửa intent, nhưng backend vẫn giữ quyền kiểm soát truy vấn.
