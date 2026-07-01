# Q23 - AI Follow-up Suggestions

## Chức năng này là gì?

`AI Follow-up Suggestions` là phần gợi ý 3 câu hỏi điều tra tiếp theo sau khi một search hoặc aggregation chạy thành công.

Điểm quan trọng:

- Gợi ý do Gemini sinh ra, không dùng static fallback.
- Mỗi gợi ý chỉ gồm `title` và `question`.
- Click vào gợi ý chỉ điền câu hỏi vào ô search và focus ô đó.
- Hệ thống không tự chạy search khi click gợi ý.
- Không tạo audit/history khi chỉ sinh suggestion.
- Audit chỉ được tạo khi user bấm nút `Search` thủ công.

## Vì sao làm như vậy?

Mục tiêu là để AI hỗ trợ analyst nghĩ bước điều tra tiếp theo, nhưng user vẫn giữ quyền quyết định.

Nếu click suggestion mà tự search luôn thì sẽ có chi phí API/search ẩn và dễ tạo audit không mong muốn. Vì vậy UI chỉ điền câu hỏi vào ô search, để analyst đọc lại, chỉnh nếu cần, rồi mới bấm `Search`.

## Luồng hoạt động

1. User chạy search thành công.
2. Frontend lấy context từ response:
   - câu hỏi gốc;
   - `SearchPlan`;
   - mode search/aggregation;
   - total result;
   - sample events hoặc aggregation buckets.
3. Frontend gọi:

```http
POST /api/v1/suggestions/follow-up
```

4. Backend build prompt cho LLM.
5. Gemini trả JSON array gồm đúng 3 suggestion.
6. Backend validate output.
7. Nếu hợp lệ, frontend render `AI Follow-up Suggestions`.
8. Nếu Gemini lỗi, mock mode, output sai hoặc unsafe, frontend ẩn section.

## Request / Response

Request rút gọn:

```json
{
  "question": "Show failed login attempts from China in the last 24h",
  "search_plan": {},
  "result_count": 188,
  "mode": "search",
  "sample_events": [],
  "aggregation_buckets": []
}
```

Response hợp lệ:

```json
{
  "source": "llm",
  "suggestions": [
    {
      "title": "Top source IPs",
      "question": "Show the top 5 source IPs for failed_login events in the last 24 hours"
    }
  ]
}
```

Response khi không có gợi ý:

```json
{
  "source": "none",
  "suggestions": []
}
```

Frontend sẽ ẩn toàn bộ section nếu `suggestions` rỗng.

## Guardrail backend

Backend chỉ chấp nhận output LLM nếu:

- Parse được JSON array.
- Có đúng 3 item.
- Mỗi item chỉ có `title` và `question`.
- `title` không rỗng và tối đa 60 ký tự.
- `question` không rỗng và tối đa 240 ký tự.
- Không có markdown.
- Không có Elasticsearch DSL.
- Không có SearchPlan JSON.
- Không có từ nguy hiểm như `delete`, `update`, `drop index`, `script`, `query_string`, `password dump`.
- Không trùng lặp suggestion.

Nếu fail bất kỳ rule nào, backend trả `source=none`.

## Quy tắc ngôn ngữ

Prompt yêu cầu Gemini dùng cùng ngôn ngữ với câu hỏi ban đầu:

- Câu hỏi tiếng Anh -> suggestions tiếng Anh.
- Câu hỏi tiếng Việt có nhiều hơn một từ tiếng Việt -> suggestions tiếng Việt.

Nhưng các giá trị schema/dataset vẫn giữ tiếng Anh/canonical để tăng khả năng search đúng:

- `failed_login`
- `account_lockout`
- `critical`
- `high`
- `windows-auth`
- `vpn`
- `admin`
- `vpn.user`
- `CN`, `VN`, `US`

Ví dụ tốt:

```text
Group failed_login theo user trong 24h qua
```

## Khi nào không gọi suggestions?

Không gọi suggestions cho:

- Dashboard auto-refresh.
- Pagination-only changes.
- Result filter/sort reruns.
- Search thất bại.
- Empty result không đủ context.
- Mock mode hoặc Gemini lỗi.

## Code backend cần đọc

- `backend/src/main/java/com/soc/ai/search/suggestions/FollowUpSuggestionController.java`
- `backend/src/main/java/com/soc/ai/search/suggestions/FollowUpSuggestionService.java`
- `backend/src/main/java/com/soc/ai/search/suggestions/FollowUpSuggestionPromptBuilder.java`
- `backend/src/main/java/com/soc/ai/search/suggestions/FollowUpSuggestionParser.java`
- `backend/src/main/java/com/soc/ai/search/suggestions/FollowUpSuggestionRequest.java`
- `backend/src/main/java/com/soc/ai/search/suggestions/FollowUpSuggestionResponse.java`
- `backend/src/main/java/com/soc/ai/search/suggestions/FollowUpSuggestion.java`
- `backend/src/main/java/com/soc/ai/search/llm/LlmClient.java`
- `backend/src/main/java/com/soc/ai/search/llm/LlmFollowUpSuggestionsRequest.java`
- `backend/src/main/java/com/soc/ai/search/llm/gemini/GeminiLlmClient.java`
- `backend/src/main/java/com/soc/ai/search/llm/mock/MockLlmClient.java`

## Code frontend cần đọc

- `frontend/src/components/soc/follow-up-suggestions.tsx`
- `frontend/src/services/follow-up-suggestions-api.ts`
- `frontend/src/components/soc/search-section.tsx`
- `frontend/src/components/ui/textarea.tsx`
- `frontend/src/App.tsx`
- `frontend/src/types/soc.ts`

## Câu hỏi hội đồng có thể hỏi

### Suggestions có tự chạy query không?

Không. Click suggestion chỉ điền câu hỏi vào ô search và focus input. User vẫn phải bấm `Search`.

### Suggestions có tạo audit/history không?

Không. Audit chỉ được tạo khi user thật sự chạy search qua pipeline hiện có.

### Nếu Gemini lỗi thì sao?

Backend trả `source=none`, `suggestions=[]`. Frontend ẩn section, không hiện lỗi ồn ào.

### Vì sao không dùng static fallback?

Static Query Library/Playbooks đã là chức năng riêng. Follow-up Suggestions là tính năng AI-only để tránh hội đồng nhầm giữa gợi ý cố định và gợi ý do LLM sinh dựa trên context hiện tại.

### Nếu LLM sinh câu nguy hiểm thì sao?

Backend parser/validator reject suggestion đó bằng rule unsafe. Nếu output không đạt chuẩn, toàn bộ response trả rỗng.

## Câu trả lời ngắn khi bảo vệ

> Sau khi search thành công, hệ thống gửi context đã giới hạn cho Gemini để sinh 3 câu hỏi điều tra tiếp theo. Backend validate rất chặt, chỉ nhận JSON array gồm `title` và `question`. Nếu Gemini lỗi hoặc output không an toàn thì ẩn section. Click suggestion không tự search, chỉ điền vào ô search để analyst kiểm soát bước tiếp theo.
