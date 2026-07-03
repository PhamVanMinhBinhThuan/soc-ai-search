# Prompt: Refine Search Suggestions And Result Controls Behavior

## Role

Bạn là Senior Frontend Engineer chuyên React, TypeScript, Tailwind CSS và UX cho SOC/SIEM dashboard.

Hãy chỉnh lại behavior ở trang Event Search liên quan đến:

1. `Filter & Sort Results` trong Query Result.
2. `Next Investigation Steps` / AI follow-up suggestions.
3. 5 suggested queries mặc định dưới ô search.

## File cần đọc kỹ

Frontend:

- `frontend/src/App.tsx`
- `frontend/src/components/soc/search-section.tsx`
- `frontend/src/components/soc/result-tabs.tsx`
- `frontend/src/components/soc/follow-up-suggestions.tsx`
- `frontend/src/components/soc/aggregation-chart.tsx`
- `frontend/src/services/search-api.ts`
- `frontend/src/services/search-plan-api.ts`
- `frontend/src/services/follow-up-suggestions-api.ts`
- `frontend/src/lib/mock-data.ts`
- `frontend/src/types/soc.ts`

Tests:

- `frontend/src/App.test.tsx`
- `frontend/src/components/soc/search-section.test.tsx`
- `frontend/src/components/soc/result-tabs.test.tsx`
- `frontend/src/components/soc/follow-up-suggestions.test.tsx`

Không cần thay backend nếu không bắt buộc.

---

## Bối cảnh hiện tại

### 1. Filter & Sort Results

Hiện tại trong trang Search, khi query trả về aggregation dạng bar chart, UI vẫn có tab/panel:

```text
Filter & Sort Results
```

Nhưng với bar chart aggregation, người dùng không cần filter/sort tại khu vực này nữa.

Yêu cầu mới:

- Khi kết quả là **bar chart aggregation**, không hiển thị `Filter & Sort Results`.
- Tức là với aggregation dạng:
  - `group_by`
  - `top_n`
  - chart metadata là `BAR`

thì ẩn toàn bộ panel `Filter & Sort Results`.

Lưu ý:

- Trước đó date histogram / line chart có thể đã ẩn panel này rồi. Hãy giữ behavior đó.
- Kết quả cuối cùng: aggregation chart thì không cần panel filter/sort nữa.
- Search mode vẫn giữ `Filter & Sort Results`.

### 2. Next Investigation Steps bị mất khi filter/sort hoặc đổi page

Hiện tại `Next Investigation Steps` được tạo sau khi search/edit thành công, nhưng khi:

- user filter/sort result;
- user đổi page raw events;

thì suggestions bị ẩn vì `followUpEligibleQueryId` bị set về `null`.

Yêu cầu mới:

- Khi user filter/sort kết quả, **vẫn giữ lại Next Investigation Steps của câu hỏi hiện tại**.
- Khi user đổi page raw events, **vẫn giữ lại Next Investigation Steps của câu hỏi hiện tại**.
- Suggestions nên gắn với câu hỏi gốc/current original question, không cần tạo lại theo mỗi page/filter.
- Không gọi lại LLM suggestions chỉ vì đổi page.
- Không gọi lại LLM suggestions chỉ vì filter/sort.

Gợi ý logic:

- Không gọi `setFollowUpEligibleQueryId(null)` trong `changePage`.
- Không gọi `setFollowUpEligibleQueryId(null)` trong `runRefinedSearchPlan` nếu filter/sort chỉ là refinement của result hiện tại.
- Nếu response mới do filter/sort có `query_id` khác, cần cân nhắc cách giữ suggestions:
  - Cách đơn giản: giữ `followUpEligibleQueryId` theo `currentOriginalQuestion` thay vì strict theo `response.query_id`.
  - Cách ít đụng hơn: thêm state `followUpBaseQuestion` hoặc `followUpVisibleForQuestion`, rồi enable suggestions nếu question hiện tại vẫn là câu hỏi gốc.

Hiện tại `FollowUpSuggestions` đang được enable kiểu:

```tsx
enabled={
  followUpEligibleQueryId === response.query_id &&
  (requestStatus === "success" || requestStatus === "empty")
}
```

Điều này làm suggestions mất khi filter/sort tạo response/query id mới.

Hãy đổi điều kiện enable để:

- suggestions vẫn hiện cho cùng câu hỏi hiện tại sau filter/sort/page change;
- search câu hỏi mới thì reset và gọi suggestions mới;
- search lỗi hoặc response null thì ẩn.

Không được làm:

- Không để suggestions của câu hỏi cũ hiện nhầm sau khi user search câu hỏi mới.
- Không gọi suggestions API liên tục khi user đổi page.
- Không tạo loop render/fetch.

### 3. 5 suggested queries mặc định không được auto-submit

Hiện tại 5 câu hỏi suggested dưới ô search có thể đang gọi trực tiếp `submitQuestion` khi click.

Yêu cầu mới:

- Khi người dùng click vào 1 trong 5 suggested queries mặc định:
  - chỉ điền câu hỏi vào ô search;
  - focus vào ô search nếu có thể;
  - không tự động gọi API search;
  - người dùng sẽ tự bấm Search hoặc chỉnh sửa câu hỏi rồi mới search.

Yêu cầu này giống behavior của `Next Investigation Steps`:

- click suggestion chỉ populate input;
- không execute ngay.

File cần chú ý:

- `frontend/src/components/soc/search-section.tsx`
- `frontend/src/App.tsx`

Hiện tại `SearchSection` có props:

```tsx
onSelectSuggestion={submitQuestion}
```

Nên cần đổi thành handler mới, ví dụ:

```tsx
const selectSuggestedQuestion = (nextQuestion: string) => {
  setQuestion(nextQuestion)
  setSearchFocusSignal((value) => value + 1)
}
```

Rồi truyền:

```tsx
onSelectSuggestion={selectSuggestedQuestion}
```

Không dùng `submitQuestion` cho click suggested query nữa.

---

## Yêu cầu chi tiết

### A. Ẩn Filter & Sort Results cho bar chart aggregation

Trong `ResultTabs`:

- Nếu `mode === "aggregation"` và chart là bar chart hoặc aggregation type là `group_by/top_n`, không render panel `Filter & Sort Results`.
- Nếu `mode === "aggregation"` và chart là line/date histogram, cũng không render panel.
- Nói cách khác: `Filter & Sort Results` chỉ cần hiển thị cho `mode === "search"` trong giai đoạn hiện tại.

Acceptance:

```text
Search result table => có Filter & Sort Results
Aggregation bar chart => không có Filter & Sort Results
Aggregation line chart => không có Filter & Sort Results
Count/number aggregation => không có Filter & Sort Results
```

### B. Giữ Next Investigation Steps khi filter/sort và đổi page

Trong `App.tsx`, kiểm tra các chỗ:

```ts
setFollowUpEligibleQueryId(null)
```

Đặc biệt:

- `changePage`
- `runRefinedSearchPlan`
- các handler filter/sort

Sửa để:

- Search câu mới: reset suggestions cũ, sau khi response mới thành công thì suggestions mới được tạo.
- Filter/sort result hiện tại: giữ suggestions của câu hỏi hiện tại.
- Change page: giữ suggestions của câu hỏi hiện tại.
- Edit SearchPlan: có thể tạo suggestions mới vì đây là một execution mới có summary/searchplan mới.

Nếu cần, thay state từ query-id based sang question-based:

```ts
const [followUpEligibleQuestion, setFollowUpEligibleQuestion] = useState<string | null>(...)
```

Enable:

```tsx
enabled={
  followUpEligibleQuestion === currentOriginalQuestion() &&
  (requestStatus === "success" || requestStatus === "empty")
}
```

Nhưng phải tránh gọi API lại sau mỗi pagination/filter nếu `FollowUpSuggestions` nhận `response` mới làm `requestKey` đổi.

Nếu `FollowUpSuggestions` đang dùng:

```ts
const requestKey = `${response.query_id}:${question}`;
```

thì với filter/sort response query id mới, component sẽ refetch. Để tránh refetch:

- truyền thêm `stableKey` từ App dựa trên original question;
- hoặc đổi `requestKey` để dùng `question` + original search execution id;
- hoặc giữ `query_id` ban đầu trong response khi filter/sort nếu phù hợp.

Yêu cầu quan trọng:

- Filter/sort/page change không gọi lại `/api/v1/suggestions/follow-up`.
- Suggestions hiện tại vẫn còn.

### C. Suggested queries mặc định chỉ fill input

Trong `App.tsx`:

- Tạo handler riêng cho suggested query mặc định:

```ts
const selectSuggestedQuestion = (nextQuestion: string) => {
  setQuestion(nextQuestion)
  setSearchFocusSignal((value) => value + 1)
}
```

- Truyền vào `SearchSection`:

```tsx
onSelectSuggestion={selectSuggestedQuestion}
```

Không truyền `submitQuestion`.

Trong `SearchSection`, nếu hiện tại button suggestion submit form hoặc gọi trực tiếp submit, sửa lại để chỉ gọi `onSelectSuggestion(scenario.question)`.

UX:

- Sau khi click suggested query, input chứa câu hỏi.
- Người dùng phải bấm Search mới query.
- Không đổi response hiện tại cho đến khi user bấm Search.

---

## Tests bắt buộc

### `result-tabs.test.tsx`

Thêm/cập nhật:

1. Search mode hiển thị `Filter & Sort Results`.
2. Aggregation bar chart/top_n/group_by không hiển thị `Filter & Sort Results`.
3. Aggregation line/date_histogram không hiển thị `Filter & Sort Results`.
4. Count/number aggregation không hiển thị `Filter & Sort Results`.

### `App.test.tsx` hoặc `search-section.test.tsx`

Thêm/cập nhật:

1. Click default suggested query chỉ điền input, không gọi search API.
2. Sau khi click suggestion, input được focus hoặc `focusSignal` được kích hoạt nếu test được.
3. User bấm Search sau đó mới gọi API.

### `follow-up-suggestions.test.tsx` / `App.test.tsx`

Thêm/cập nhật:

1. Follow-up suggestions vẫn hiển thị sau pagination.
2. Follow-up suggestions vẫn hiển thị sau filter/sort.
3. Pagination/filter không gọi lại suggestions API.
4. Search câu hỏi mới reset suggestions cũ và cho phép tạo suggestions mới.

Nếu test full App quá khó, test bằng component-level state/props cũng được, nhưng phải cover behavior chính.

---

## Verification cần chạy

```bash
cd frontend
npm run lint
npm run test -- result-tabs.test.tsx
npm run test -- search-section.test.tsx
npm run test -- follow-up-suggestions.test.tsx
npm run test -- App.test.tsx
npm run build
```

Nếu sửa rộng:

```bash
npm run test
```

---

## Acceptance Criteria

- Bar chart aggregation không còn panel `Filter & Sort Results`.
- Line chart/date histogram/count aggregation cũng không có panel này.
- Search mode vẫn có filter/sort.
- Filter/sort result không làm mất `Next Investigation Steps`.
- Đổi page raw events không làm mất `Next Investigation Steps`.
- Filter/sort/page change không gọi lại LLM suggestions.
- Click 5 suggested queries mặc định chỉ điền câu hỏi vào ô search, không auto-search.
- User bấm Search thì mới gọi API.
- Lint/test/build pass.

