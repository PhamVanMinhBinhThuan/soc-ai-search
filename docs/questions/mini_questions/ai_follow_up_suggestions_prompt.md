# Prompt AI Follow-up Suggestions

Tài liệu này giải thích cách hệ thống tạo **3 câu hỏi gợi ý điều tra tiếp theo** trong phần **Next Investigation Steps** sau khi người dùng search thành công.

## 1. Chức năng này dùng để làm gì?

Sau khi có kết quả search hoặc aggregation, hệ thống có thể gọi LLM để gợi ý 3 hướng điều tra tiếp theo. Ví dụ sau khi tìm nhiều `failed_login` từ China, hệ thống có thể gợi ý:

- Xem top source IP liên quan.
- Nhóm failed login theo user.
- Xem trend failed login theo giờ.

Điểm quan trọng:

- Gợi ý chỉ là **câu hỏi tự nhiên**.
- Không tự động chạy query.
- Khi người dùng click, UI chỉ điền câu hỏi vào ô search và focus input.
- Người dùng quyết định có nhấn Search hay chỉnh sửa thêm.

## 2. Code liên quan

| File | Vai trò |
|---|---|
| `backend/src/main/java/com/soc/ai/search/suggestions/FollowUpSuggestionController.java` | Endpoint `POST /api/v1/suggestions/follow-up`. |
| `backend/src/main/java/com/soc/ai/search/suggestions/FollowUpSuggestionRequest.java` | Contract request gửi context kết quả hiện tại cho backend. |
| `backend/src/main/java/com/soc/ai/search/suggestions/FollowUpSuggestionPromptBuilder.java` | Tạo prompt cho LLM sinh 3 câu hỏi tiếp theo. |
| `backend/src/main/java/com/soc/ai/search/suggestions/FollowUpSuggestionService.java` | Gọi LLM, parse response, lỗi thì trả empty. |
| `backend/src/main/java/com/soc/ai/search/suggestions/FollowUpSuggestionParser.java` | Parse và validate JSON array từ LLM. |
| `backend/src/main/java/com/soc/ai/search/suggestions/FollowUpSuggestionResponse.java` | Response `source = llm` hoặc `source = none`. |
| `frontend/src/components/soc/follow-up-suggestions.tsx` | UI `Next Investigation Steps`. |
| `frontend/src/services/follow-up-suggestions-api.ts` | Gọi API follow-up suggestions. |

## 3. Khi nào hệ thống gọi gợi ý tiếp theo?

Frontend chỉ gọi follow-up suggestions khi:

- Có response search hiện tại.
- `enabled = true`.
- `response.total > 0`.
- Có `suggestionKey` ổn định cho query hiện tại.

Trong `App.tsx`, sau khi search câu hỏi mới thành công:

```ts
setFollowUpSuggestionKey(
  `${nextResponse.query_id}:${stripAuditQuestionPrefix(nextResponse.original_question)}`,
);
```

Sau đó `FollowUpSuggestions` được render với:

```tsx
<FollowUpSuggestions
  response={response}
  question={currentOriginalQuestion()}
  enabled={
    followUpSuggestionKey !== null &&
    (requestStatus === "success" || requestStatus === "empty")
  }
  suggestionKey={followUpSuggestionKey}
  onSelectSuggestion={selectFollowUpSuggestion}
/>
```

Nếu filter/sort hoặc đổi page giữ cùng `suggestionKey`, UI có thể giữ lại gợi ý của câu hỏi hiện tại thay vì gọi lại liên tục.

## 4. Request gửi cho backend gồm những gì?

Request được định nghĩa trong `FollowUpSuggestionRequest.java`:

```java
public record FollowUpSuggestionRequest(
        @NotBlank @Size(max = 500) String question,
        @NotNull @Valid SearchPlan searchPlan,
        @NotNull @Min(0) Integer resultCount,
        @NotNull SearchMode mode,
        @Size(max = 5) List<@Valid SampleEvent> sampleEvents,
        @Size(max = 5) List<@Valid AggregationBucket> aggregationBuckets) {
}
```

Ý nghĩa:

| Trường | Ý nghĩa |
|---|---|
| `question` | Câu hỏi hiện tại của người dùng. |
| `search_plan` | SearchPlan đã validate của query hiện tại. |
| `result_count` | Tổng số kết quả phù hợp. Nếu `0` thì không sinh gợi ý. |
| `mode` | `search` hoặc `aggregation`. |
| `sample_events` | Tối đa 5 event mẫu gần nhất, dùng cho search mode. |
| `aggregation_buckets` | Tối đa 5 bucket mẫu, dùng cho aggregation mode. |

Frontend build request tại `follow-up-suggestions.tsx`:

```ts
function buildRequest(
  response: NaturalLanguageSearchResponseDto,
  question: string,
): FollowUpSuggestionRequestDto {
  return {
    question,
    search_plan: response.search_plan,
    result_count: response.total,
    mode: response.mode,
    sample_events: response.events.slice(0, 5).map((event) => ({
      event_type: event.event_type,
      severity: event.severity,
      user: event.user,
      host: event.host,
      ip: event.ip,
      country_code: event.country_code,
    })),
    aggregation_buckets: response.aggregation_results
      .slice(0, 5)
      .map((bucket) => ({
        key: bucket.key,
        value: bucket.value,
      })),
  };
}
```

## 5. Prompt được tạo như thế nào?

Prompt nằm trong:

```text
backend/src/main/java/com/soc/ai/search/suggestions/FollowUpSuggestionPromptBuilder.java
```

Hàm chính:

```java
public LlmFollowUpSuggestionsRequest build(FollowUpSuggestionRequest request) {
    return new LlmFollowUpSuggestionsRequest(buildSystemPrompt(request.question()), buildUserContent(request));
}
```

Backend tạo 2 phần:

| Phần | Vai trò |
|---|---|
| `buildSystemPrompt(question)` | Quy định output, ngôn ngữ, schema JSON, giá trị dataset được phép. |
| `buildUserContent(request)` | Đưa context search hiện tại vào prompt. |

## 6. System prompt quy định gì?

Các rule quan trọng trong `FollowUpSuggestionPromptBuilder.java`:

```text
You generate next-step SOC investigation questions.
Return JSON only.
The first character of the response must be [ and the last character must be ].
Return exactly 3 suggestions.
The JSON must be an array.
Each suggestion must contain only title and question.
Each question must be a natural-language search question.
Do not return Elasticsearch DSL.
Do not return SearchPlan JSON.
Do not execute anything.
Do not include explanations, markdown, confidence, category, result_type, or extra fields.
```

Ý nghĩa:

- LLM phải trả về JSON array.
- Phải có đúng 3 phần tử.
- Mỗi phần tử chỉ có `title` và `question`.
- Không được trả DSL, SearchPlan, markdown hoặc giải thích.
- Không được tự chạy gì cả.

Prompt cũng đưa output mẫu:

```json
[
  {
    "title": "Top source IPs",
    "question": "Show the top 5 source IPs for failed_login events in the last 24 hours"
  },
  {
    "title": "Affected users",
    "question": "Group failed_login events by user in the last 24 hours"
  },
  {
    "title": "Failed login trend",
    "question": "Show failed_login trend by hour in the last 24 hours"
  }
]
```

Prompt còn nhấn mạnh:

```text
Do not wrap the array inside source, suggestions, data, result, or any other object.
```

Tức là response đúng phải là:

```json
[
  { "title": "...", "question": "..." },
  { "title": "...", "question": "..." },
  { "title": "...", "question": "..." }
]
```

Không phải:

```json
{
  "suggestions": [
    { "title": "...", "question": "..." }
  ]
}
```

## 7. Quy định ngôn ngữ TA/TV

Backend tự detect ngôn ngữ từ câu hỏi hiện tại:

```java
private String buildSystemPrompt(String question) {
    var targetLanguage = usesVietnamese(question) ? "Vietnamese" : "English";
    ...
}
```

Prompt truyền rõ:

```text
Target language: %s.
If the target language is Vietnamese, keep canonical SOC terms and dataset values in English.
```

Ý nghĩa:

- Nếu câu hỏi có nhiều hơn 1 từ tiếng Việt, suggestions nên là tiếng Việt.
- Nếu câu hỏi là tiếng Anh, suggestions nên là tiếng Anh.
- Nếu viết tiếng Việt, các giá trị dữ liệu vẫn giữ tiếng Anh để query chính xác, ví dụ `failed_login`, `account_lockout`, `vpn.user`, `CN`.

Ví dụ:

```text
Số event theo giờ trong 24h qua
```

Suggestion có thể là:

```text
Nhóm failed_login theo user trong 24 giờ qua
```

Thay vì dịch `failed_login` thành một cụm không khớp dataset.

## 8. Known dataset values trong prompt

Prompt đưa các giá trị mock vào để LLM sinh câu hỏi có khả năng ra kết quả thật:

```text
Known dataset values:
severity: critical, high, medium, low
event_type: failed_login, account_lockout, firewall_block, malware_detected, privilege_escalation, suspicious_outbound, large_transfer, successful_login, dns_query, process_start, file_access
source: windows-auth, vpn, firewall, edr, proxy, dns
users: admin, vpn.user, finance.user, jdoe, svc.backup
hosts: vpn-gw-01, dc-01, endpoint-014, endpoint-023, finance-ws-07
countries: CN, VN, US, DE, SG
IP examples: 203.0.113.45, 203.0.113.77, 198.51.100.200, 10.10.1.15
```

Ý nghĩa:

- Giảm hallucination.
- Tránh gợi ý user/host/IP không tồn tại.
- Làm demo ổn định hơn vì câu gợi ý có khả năng truy vấn ra dữ liệu.

Prompt cũng có rule:

```text
Prefer suggestions likely to return results in this synthetic SOC dataset.
Avoid destructive, administrative, password dumping, script, query_string, delete, update, or index operations.
```

Tức là AI nên gợi ý truy vấn điều tra, không gợi ý thao tác phá hoại hoặc thao tác quản trị.

## 9. User content đưa context hiện tại vào prompt

`buildUserContent()` serialize toàn bộ request thành JSON:

```java
private String buildUserContent(FollowUpSuggestionRequest request) {
    try {
        return """
                Current successful search context:
                %s

                Generate exactly 3 follow-up natural-language questions.
                """.formatted(objectMapper.writeValueAsString(request));
    } catch (JsonProcessingException exception) {
        throw new IllegalStateException("Unable to build follow-up suggestion prompt", exception);
    }
}
```

Nhờ đó LLM biết:

- Query hiện tại là gì.
- SearchPlan hiện tại đang lọc field nào.
- Tổng kết quả bao nhiêu.
- Mode là search hay aggregation.
- Có sample event hoặc aggregation bucket nào nổi bật.

## 10. Parser kiểm tra response của LLM như thế nào?

Parser nằm trong:

```text
backend/src/main/java/com/soc/ai/search/suggestions/FollowUpSuggestionParser.java
```

Nó yêu cầu:

| Rule | Ý nghĩa |
|---|---|
| Response parse được thành `List<FollowUpSuggestion>` | Phải là JSON array. |
| Danh sách phải đúng 3 phần tử | Không được 1, 2, 4 hoặc nhiều hơn. |
| Mỗi item chỉ có field hợp lệ | `FAIL_ON_UNKNOWN_PROPERTIES = true`. |
| `title` không blank, tối đa 60 ký tự | UI gọn, không lan man. |
| `question` không blank, tối đa 240 ký tự | Câu hỏi vừa đủ. |
| Không markdown | Không render nội dung lạ. |
| Không JSON/DSL trong title/question | Gợi ý phải là natural language. |
| Không trùng nhau | Tránh 3 câu giống nhau. |
| Không chứa từ nguy hiểm | Chặn `delete`, `update`, `drop`, `script`, `query_string`, `_delete_by_query`, `_update_by_query`. |

Code chặn keyword nguy hiểm:

```java
private static final Pattern UNSAFE = Pattern.compile(
        "\\b(delete|update|drop\\s+index|drop|script|query_string|password\\s+dump|dump\\s+password|_delete_by_query|_update_by_query)\\b",
        Pattern.CASE_INSENSITIVE);
```

Nếu parse hoặc validate fail, parser trả `List.of()`.

## 11. Khi LLM lỗi thì hệ thống làm gì?

Trong `FollowUpSuggestionService.java`:

```java
public FollowUpSuggestionResponse suggest(FollowUpSuggestionRequest request) {
    if (request.resultCount() == null || request.resultCount() <= 0) {
        return FollowUpSuggestionResponse.empty();
    }

    try {
        var llmResponse = llmClient.generateFollowUpSuggestions(promptBuilder.build(request));
        var suggestions = parser.parse(llmResponse.content());
        return suggestions.isEmpty()
                ? FollowUpSuggestionResponse.empty()
                : FollowUpSuggestionResponse.llm(suggestions);
    } catch (RuntimeException exception) {
        LOGGER.warn("AI follow-up suggestions are unavailable: {}", exception.getMessage());
        return FollowUpSuggestionResponse.empty();
    }
}
```

Nghĩa là:

- Nếu `resultCount <= 0`: không gợi ý.
- Nếu LLM lỗi: trả `source = none`.
- Nếu parse fail: trả `source = none`.
- Không dùng static fallback.

Response empty:

```java
public static FollowUpSuggestionResponse empty() {
    return new FollowUpSuggestionResponse("none", List.of());
}
```

Response thành công:

```java
public static FollowUpSuggestionResponse llm(List<FollowUpSuggestion> suggestions) {
    return new FollowUpSuggestionResponse("llm", List.copyOf(suggestions));
}
```

## 12. Frontend hiển thị như thế nào?

Trong `follow-up-suggestions.tsx`, frontend chỉ giữ suggestions nếu backend trả `source = llm`:

```ts
setResult({
  key,
  suggestions: payload.source === "llm" ? payload.suggestions : [],
});
```

Nếu không có suggestion:

```ts
if (suggestions.length === 0) {
  return null;
}
```

Vì vậy nếu Gemini/Anthropic lỗi hoặc mock mode không hỗ trợ, UI sẽ **ẩn luôn Next Investigation Steps**, không hiển thị fallback gây nhiễu.

Khi click một suggestion:

```tsx
onClick={() => onSelectSuggestion(suggestion.question)}
```

Trong `App.tsx`:

```ts
const selectFollowUpSuggestion = (nextQuestion: string) => {
  setQuestion(nextQuestion);
  setSearchFocusSignal((value) => value + 1);
  navigate("/search");
};
```

Tức là click chỉ:

- điền câu hỏi vào ô search,
- focus input,
- không tự gọi search.

## 13. Vì sao không tự chạy suggestion?

Không tự chạy giúp:

- Người dùng có quyền đọc/chỉnh câu hỏi trước khi search.
- Tránh tốn token và query ngoài ý muốn.
- Giữ vai trò của suggestion là “gợi ý điều tra”, không phải hành động tự động.
- Dễ bảo vệ hơn về mặt an toàn AI.

## 14. Nếu hội đồng hỏi: “3 câu hỏi gợi ý tiếp theo em làm sao?”

Có thể trả lời:

> Sau khi search thành công và có kết quả, frontend gửi context hiện tại gồm câu hỏi, SearchPlan đã validate, tổng số kết quả, mode, tối đa 5 sample events hoặc 5 aggregation buckets lên endpoint `/api/v1/suggestions/follow-up`. Backend tạo prompt yêu cầu LLM trả đúng JSON array gồm 3 object, mỗi object chỉ có `title` và `question`. Prompt cấm trả DSL, SearchPlan, markdown hoặc extra field, đồng thời đưa các giá trị mock dataset để AI sinh câu hỏi có khả năng ra kết quả. Sau đó backend parse và validate response: phải đúng 3 câu, không trùng, không chứa JSON/DSL hoặc từ nguy hiểm như `script`, `query_string`, `delete`, `update`. Nếu LLM lỗi hoặc output không hợp lệ thì backend trả `source = none` và UI ẩn phần gợi ý. Khi người dùng click suggestion, hệ thống chỉ điền câu hỏi vào ô search, không tự chạy query.

