# Prompt Correct or Refine Query

Tài liệu này giải thích chức năng **Correct or Refine Query**: người dùng viết một comment ngắn để yêu cầu AI sửa hoặc tinh chỉnh câu hỏi hiện tại, sau đó hệ thống chạy lại pipeline search an toàn để sinh `SearchPlan` và DSL mới.

## 1. Chức năng này dùng để làm gì?

Correct or Refine Query có 2 mục đích chính:

| Trường hợp | Ý nghĩa |
|---|---|
| AI hiểu sai câu hỏi ban đầu | Người dùng comment để sửa lỗi, ví dụ: “không phải 30 ngày, phải là 12 ngày”. |
| Người dùng muốn điều tra tiếp | SearchPlan hiện tại đúng, nhưng analyst muốn thu hẹp hoặc mở rộng truy vấn, ví dụ: “thêm vpn.user và chuyển sang 7 ngày”. |

Điểm quan trọng: AI **không sửa SearchPlan trực tiếp** và **không sinh Elasticsearch DSL**. AI chỉ viết lại câu hỏi tự nhiên rõ hơn. Sau đó backend vẫn chạy lại pipeline:

```text
Refinement comment
→ AI viết lại câu hỏi tự nhiên
→ /api/v1/search chạy lại
→ LLM sinh SearchPlan mới
→ Backend parse, validate, compile DSL
→ Elasticsearch query
→ Lưu history/audit
```

Thiết kế này giúp tận dụng AI để sửa ý định truy vấn, nhưng vẫn giữ guardrail của hệ thống.

## 2. Code liên quan

| File | Vai trò |
|---|---|
| `backend/src/main/java/com/soc/ai/search/search/refine/QueryRefinementController.java` | Cung cấp endpoint `POST /api/v1/search/refine`. |
| `backend/src/main/java/com/soc/ai/search/search/refine/QueryRefinementRequest.java` | Định nghĩa request gồm câu hỏi gốc, câu hỏi hiện tại, SearchPlan hiện tại và feedback của user. |
| `backend/src/main/java/com/soc/ai/search/search/refine/QueryRefinementPromptBuilder.java` | Tạo system prompt và user prompt cho LLM. |
| `backend/src/main/java/com/soc/ai/search/search/refine/QueryRefinementService.java` | Gọi LLM và validate output sau khi AI trả về. |
| `backend/src/main/java/com/soc/ai/search/search/refine/QueryRefinementResponse.java` | Response gồm câu hỏi đã rewrite, source model và latency. |
| `frontend/src/services/query-refinement-api.ts` | Gọi API refine từ frontend. |
| `frontend/src/components/soc/query-transparency.tsx` | UI `Correct or Refine Query` trong tab Query Transparency. |
| `frontend/src/lib/audit-question-format.ts` | Format question khi lưu history/audit với nhãn `[AI Corrected]`. |

## 3. Request refine gồm những gì?

Backend nhận request theo contract trong `QueryRefinementRequest.java`:

```java
public record QueryRefinementRequest(
        @NotBlank @Size(max = 500) String originalQuestion,
        @NotBlank @Size(max = 500) String currentQuestion,
        @NotNull @Valid SearchPlan currentSearchPlan,
        @NotBlank @Size(max = 500) String refinement) {
}
```

Ý nghĩa:

| Trường | Ý nghĩa |
|---|---|
| `original_question` | Câu hỏi gốc của người dùng. |
| `current_question` | Câu hỏi hiện tại đang được hệ thống dùng. |
| `current_search_plan` | SearchPlan hiện tại để AI biết hệ thống đang hiểu câu hỏi như thế nào. |
| `refinement` | Comment của người dùng: muốn sửa gì hoặc tinh chỉnh gì. |

Ví dụ request:

```json
{
  "original_question": "Show top 3 source IPs with the most alerts in the last 12 days",
  "current_question": "Show top 3 source IPs with the most alerts in the last 12 days",
  "current_search_plan": {
    "mode": "aggregation",
    "filters": {
      "timestamp": { "from": "now-30d", "to": "now" }
    },
    "aggregation": {
      "type": "top_n",
      "field": "ip",
      "top_n": 3
    },
    "page": 0,
    "size": 10
  },
  "refinement": "It should be 12 days, not 30 days"
}
```

## 4. Prompt được tạo như thế nào?

Prompt nằm trong:

```text
backend/src/main/java/com/soc/ai/search/search/refine/QueryRefinementPromptBuilder.java
```

Hàm chính:

```java
public LlmQuestionRefinementRequest build(QueryRefinementRequest request) {
    return new LlmQuestionRefinementRequest(systemPrompt(), userContent(request));
}
```

Backend tách prompt thành 2 phần:

| Phần | Vai trò |
|---|---|
| `systemPrompt()` | Luật tổng quát: AI được làm gì, không được làm gì, output phải như thế nào. |
| `userContent(request)` | Dữ liệu cụ thể của lần refine: câu hỏi gốc, câu hỏi hiện tại, SearchPlan hiện tại và feedback. |

## 5. Các rule quan trọng trong system prompt

Một số câu quan trọng trong prompt:

```text
You correct or refine SOC investigation questions.
Return one corrected and explicit natural-language question only.
Do not return JSON.
Do not return Elasticsearch DSL.
Do not use markdown.
Do not explain.
```

Ý nghĩa:

- AI chỉ được trả về **một câu hỏi tự nhiên đã chỉnh sửa**.
- Không được trả JSON.
- Không được trả Elasticsearch DSL.
- Không được giải thích dài dòng.

Prompt cũng nói rõ 2 tình huống refine:

```text
The user feedback may mean either:
1. The current SearchPlan misunderstood the original question and must be corrected.
2. The current SearchPlan is valid, but the analyst wants to refine, narrow, or broaden the investigation.
```

Ý nghĩa:

- Nếu SearchPlan hiện tại sai, AI sửa lại câu hỏi để SearchPlan mới sinh đúng hơn.
- Nếu SearchPlan hiện tại đúng, AI tinh chỉnh câu hỏi theo hướng điều tra mới.

Prompt còn ép AI giữ ý định gốc:

```text
Preserve the original investigation intent unless the feedback explicitly changes it.
Apply the smallest necessary change requested by the feedback.
If the feedback contradicts the current SearchPlan, follow the feedback.
```

Ý nghĩa:

- Không được tự đổi chủ đề điều tra.
- Chỉ sửa phần user yêu cầu.
- Nếu feedback nói SearchPlan sai, ưu tiên feedback.

## 6. Prompt truyền context cụ thể ra sao?

`userContent()` đưa các dữ liệu sau vào prompt:

```java
private String userContent(QueryRefinementRequest request) {
    return """
            Original question:
            %s

            Current question:
            %s

            Current SearchPlan:
            %s

            User refinement:
            %s

            Correct or refine the current question into one complete natural-language SOC search question.
            """.formatted(
            request.originalQuestion().trim(),
            request.currentQuestion().trim(),
            searchPlanJson(request),
            request.refinement().trim());
}
```

Vì có `Current SearchPlan`, AI có thể biết hệ thống đang hiểu sai ở đâu. Ví dụ câu hỏi nói 12 ngày nhưng SearchPlan hiện tại là `now-30d`, user comment “It should be 12 days” thì AI có đủ context để viết lại đúng.

## 7. Known values trong prompt để làm gì?

Prompt có danh sách giá trị demo:

```text
Known values:
- severity: critical, high, medium, low
- event_type: failed_login, account_lockout, firewall_block, malware_detected, privilege_escalation,
  suspicious_outbound, large_transfer, successful_login, dns_query, process_start, file_access
- source: windows-auth, vpn, firewall, edr, proxy, dns
- users: admin, vpn.user, finance.user, jdoe, svc.backup
- hosts: vpn-gw-01, dc-01, endpoint-014, endpoint-023, finance-ws-07
- country codes: CN, VN, US, DE, SG
- IP examples: 203.0.113.45, 203.0.113.77, 198.51.100.200, 10.10.1.15
```

Ý nghĩa:

- Giúp AI dùng đúng các giá trị có trong synthetic dataset.
- Giảm trường hợp AI tự bịa user, host, IP hoặc event type không tồn tại.
- Khi hỏi tiếng Việt, các thuật ngữ kỹ thuật như `failed_login`, `account_lockout`, `vpn.user` vẫn nên giữ đúng dạng dữ liệu để backend parse tốt hơn.

## 8. Response refine trả về gì?

`QueryRefinementResponse.java`:

```java
public record QueryRefinementResponse(
        String rewrittenQuestion,
        String source,
        long latencyMs) {
}
```

Ví dụ response:

```json
{
  "rewritten_question": "Show failed login events from China for admin or vpn.user in the last 7 days",
  "source": "gemini",
  "latency_ms": 834
}
```

Response này chưa phải kết quả search. Nó chỉ là câu hỏi mới. Frontend sau đó dùng câu hỏi này để gọi lại search pipeline bình thường.

## 9. Backend kiểm tra output AI như thế nào?

Sau khi LLM trả về text, `QueryRefinementService` gọi:

```java
var rewrittenQuestion = validateAndNormalize(llmResponse.content());
```

Các rule chính:

| Rule | Mục đích |
|---|---|
| Không được blank | Tránh response rỗng. |
| Tối đa 500 ký tự | Tránh output quá dài, lan man. |
| Không chứa markdown hoặc nhiều dòng | AI chỉ được trả một câu hỏi. |
| Không bắt đầu bằng `{` hoặc `[` | Chặn JSON/SearchPlan/DSL. |
| Không chứa `"query"`, `"aggs"`, `elasticsearch dsl` | Chặn AI trả DSL. |
| Không chứa `query_string`, `script`, `drop index`, `delete`, `update` | Chặn output nguy hiểm hoặc không phải câu hỏi điều tra. |

Code tiêu biểu:

```java
if (trimmed.startsWith("{") || trimmed.startsWith("[")
        || lower.contains("\"query\"")
        || lower.contains("\"aggs\"")
        || lower.contains("elasticsearch dsl")
        || lower.contains("query_string")
        || lower.contains("script")
        || lower.contains("drop index")
        || lower.contains("delete ")
        || lower.contains("update ")) {
    throw invalidOutput("LLM refined question contained unsafe or non-question output");
}
```

Nếu output không hợp lệ, backend trả lỗi:

```text
Unable to refine query right now. Please edit the question manually.
```

## 10. Vì sao không cho AI sửa SearchPlan trực tiếp?

Nếu cho AI sửa SearchPlan trực tiếp, hệ thống phải xử lý nhiều rủi ro hơn:

- AI có thể sinh field lạ hoặc giá trị không hợp lệ.
- AI có thể sửa cấu trúc JSON sai schema.
- AI có thể làm mất guardrail đang có ở pipeline search.
- Người dùng khó hiểu vì SearchPlan là kỹ thuật hơn câu hỏi tự nhiên.

Thiết kế hiện tại an toàn hơn:

```text
AI sửa câu hỏi tự nhiên
→ SearchPlan mới vẫn phải đi qua parser
→ Validator kiểm tra rule nghiệp vụ
→ Compiler backend sinh DSL
```

Nói ngắn gọn: AI chỉ giúp viết lại ý định; backend vẫn giữ quyền quyết định truy vấn cuối cùng.

## 11. Audit/history lưu như thế nào?

Khi frontend nhận được `rewritten_question`, nó gọi lại search và truyền audit question theo format:

```text
[AI Corrected] Original question: <original> | Feedback: <feedback> | Rewritten question: <rewritten>
```

Code tạo format nằm trong:

```text
frontend/src/lib/audit-question-format.ts
```

Ví dụ:

```text
[AI Corrected] Original question: Số event theo giờ trong 24h qua | Feedback: đổi sang 7 ngày | Rewritten question: Số event theo giờ trong 7 ngày qua
```

Khi hiển thị ở danh sách Investigation/Audit, UI có thể rút gọn để dễ đọc. Khi mở detail, hệ thống vẫn có đủ original, feedback và rewritten question.

## 12. Ví dụ demo khi vấn đáp

### Ví dụ 1: Sửa AI gen sai time range

Original question:

```text
Show top 3 source IPs with the most alerts in the last 12 days
```

Current SearchPlan bị sai:

```json
{
  "filters": {
    "timestamp": { "from": "now-30d", "to": "now" }
  },
  "aggregation": {
    "type": "top_n",
    "field": "ip",
    "top_n": 3
  }
}
```

Feedback:

```text
It should be 12 days, not 30 days
```

AI output:

```text
Show the top 3 source IPs with the most alerts in the last 12 days
```

### Ví dụ 2: Tinh chỉnh điều tra theo user

Original question:

```text
Show failed login events from China in the last 24h
```

Feedback:

```text
add admin or vpn.user and make it 7 days
```

AI output:

```text
Show failed login events from China for admin or vpn.user in the last 7 days
```

### Ví dụ 3: Tinh chỉnh aggregation

Original question:

```text
Show events by hour in the last 24h
```

Feedback:

```text
only critical and high severity
```

AI output:

```text
Show critical or high severity events by hour in the last 24 hours
```

## 13. Nếu hội đồng hỏi: “AI refine query em làm sao?”

Có thể trả lời:

> Em không cho AI sửa trực tiếp SearchPlan hoặc Elasticsearch DSL. Khi người dùng nhập comment ở `Correct or Refine Query`, backend gửi cho LLM câu hỏi gốc, câu hỏi hiện tại, SearchPlan hiện tại và feedback của người dùng. Prompt yêu cầu LLM chỉ trả về một câu hỏi tự nhiên đã được chỉnh sửa, không JSON, không DSL, không markdown. Sau đó backend validate output này. Frontend dùng câu hỏi đã rewrite để chạy lại pipeline search bình thường, nghĩa là SearchPlan mới vẫn phải qua parser, validator và compiler ở backend. Cách này giúp AI hỗ trợ sửa intent truy vấn, nhưng truy vấn cuối cùng vẫn nằm trong guardrail của hệ thống.

