# Prompt: Refactor AI Follow-up Suggestions Placement

## Role

Bạn là Senior Frontend Engineer chuyên React, TypeScript, Tailwind CSS và UI/UX cho dashboard SOC/SIEM dark theme.

## Bối cảnh

Project SOC AI Search hiện có 2 loại gợi ý sau khi search:

1. **AI Follow-up Suggestions**
   - Component: `frontend/src/components/soc/follow-up-suggestions.tsx`
   - Đang được render dưới `AI Summary`.
   - Header hiện tại: `AI Follow-up Suggestions`.
   - Có badge `AI` ở góc phải.

2. **Suggested next steps** playbook cũ
   - Đang nằm cuối phần kết quả trong `frontend/src/components/soc/result-tabs.tsx`.
   - Header hiện tại: `Suggested next steps`.
   - Đây là static playbook cũ, hiện không cần nữa vì đã có AI follow-up suggestions.

Mục tiêu của task này:

- Đổi `AI Follow-up Suggestions` thành `Next Investigation Steps`.
- Đưa AI suggestions xuống vị trí cuối trang, nơi hiện đang là `Suggested next steps`.
- Ẩn/xóa phần `Suggested next steps` playbook cũ.
- Xóa badge `AI` ở góc phải của AI suggestions.
- Không đổi backend, không đổi API sinh suggestions.

## File cần đọc trước

Hãy đọc kỹ các file sau trước khi sửa:

- `frontend/src/App.tsx`
- `frontend/src/components/soc/follow-up-suggestions.tsx`
- `frontend/src/components/soc/follow-up-suggestions.test.tsx`
- `frontend/src/components/soc/result-tabs.tsx`
- `frontend/src/components/soc/result-tabs.test.tsx`
- `frontend/src/lib/investigation-suggestions.ts`
- `frontend/src/services/follow-up-suggestions-api.ts`
- `frontend/src/types/soc.ts`

Nếu cần hiểu flow:

- `docs/questions/Q23_ai_follow_up_suggestions.md`

## Scope bắt buộc

Chỉ refactor frontend UI/placement.

Không thay đổi:

- Backend.
- Endpoint `/api/v1/suggestions/follow-up`.
- DTO request/response.
- `getFollowUpSuggestions`.
- Prompt Gemini.
- Điều kiện gọi AI suggestions hiện tại.
- Hành vi click suggestion: chỉ điền câu hỏi và focus search input, không auto-run.
- Search / filter / pagination / export CSV.

## Yêu cầu chi tiết

### 1. Đổi header AI suggestions

Trong `frontend/src/components/soc/follow-up-suggestions.tsx`, đổi toàn bộ text:

```text
AI Follow-up Suggestions
```

thành:

```text
Next Investigation Steps
```

Áp dụng cho cả:

- Loading skeleton state.
- Loaded suggestions state.
- Tests.

### 2. Xóa badge `AI`

Trong component `FollowUpSuggestions`, xóa badge góc phải:

```text
AI
```

Yêu cầu:

- Không còn text/badge `AI` ở góc phải.
- Header chỉ còn icon + title `Next Investigation Steps`.
- Không để layout bị lệch sau khi xóa badge.

Có thể giữ icon `Sparkles` bên trái title.

### 3. Di chuyển AI suggestions xuống cuối vị trí `Suggested next steps`

Hiện tại `FollowUpSuggestions` đang được render trong `App.tsx` ngay dưới `AI Summary`.

Hãy di chuyển/đổi placement để AI suggestions xuất hiện ở cuối phần kết quả, đúng vị trí hiện tại của `Suggested next steps` playbook cũ.

Mong muốn layout sau cùng:

```text
Search input
KPI cards
AI Summary
Query Transparency
Query Result
Next Investigation Steps
```

Không còn block `Suggested next steps` cũ.

Gợi ý kỹ thuật:

- Có thể truyền `FollowUpSuggestions` như một prop/slot xuống `ResultTabs`, ví dụ:

```tsx
<ResultTabs
  ...
  followUpSuggestionsSlot={
    <FollowUpSuggestions ... />
  }
/>
```

hoặc refactor tương đương miễn sao code sạch.

- Nếu giữ `FollowUpSuggestions` trong `App.tsx`, hãy đặt nó sau `ResultTabs`, tại đúng vị trí cuối trang.
- Nhưng nếu `ResultTabs` đang tự render block playbook cũ ở cuối, cần xóa block đó để không bị trùng.

Chọn cách ít phá code nhất.

### 4. Ẩn/xóa phần `Suggested next steps` playbook cũ

Trong `frontend/src/components/soc/result-tabs.tsx`, hiện có đoạn render:

```tsx
{suggestions.length > 0 && (
  <div className="space-y-3 pt-2">
    <h3>Suggested next steps</h3>
    ...
  </div>
)}
```

Hãy xóa hoặc vô hiệu hóa block này.

Yêu cầu:

- UI không còn hiển thị title `Suggested next steps`.
- UI không còn hiển thị các static playbook cards ở cuối result.
- Nếu prop `suggestions` và `onSuggestionClick` chỉ còn phục vụ block này, cân nhắc xóa khỏi `ResultTabs` props để code sạch.
- Nếu xóa prop làm lan rộng thay đổi quá nhiều, có thể giữ prop nhưng không render, tuy nhiên nên ưu tiên dọn sạch nếu an toàn.

Không xóa `frontend/src/lib/investigation-suggestions.ts` nếu còn được dùng ở nơi khác hoặc nếu xóa làm task phình to. Chỉ cần đảm bảo UI cũ không còn hiện.

### 5. UI của `Next Investigation Steps`

Giữ style dark SOC hiện tại, nhưng polish nhẹ nếu cần:

- Card: `rounded-2xl border border-border bg-card p-4`.
- Header:
  - Icon `Sparkles` hoặc `Route`/`ListChecks` từ `lucide-react`.
  - Title `Next Investigation Steps`.
  - Font: `text-sm font-semibold text-foreground`.
- Cards:
  - 3 cards trên desktop.
  - 1 card trên mobile.
  - Hover border cyan.
  - Title và question dễ đọc.

Không thêm subtitle dài.
Không thêm badge `AI`.

### 6. Loading state

Khi đang tải AI suggestions:

- Header cũng phải là `Next Investigation Steps`.
- Không có badge `AI`.
- Skeleton cards giữ nguyên hoặc polish nhẹ.

Nếu Gemini/mock không trả suggestions hoặc có lỗi:

- Component vẫn ẩn như hiện tại.
- Không hiện static fallback.
- Không hiện playbook cũ.

### 7. Tests bắt buộc

Cập nhật tests liên quan:

#### `frontend/src/components/soc/follow-up-suggestions.test.tsx`

Test tối thiểu:

1. Loading state hiển thị `Next Investigation Steps`.
2. Loaded state hiển thị `Next Investigation Steps`.
3. Không hiển thị badge/text `AI`.
4. Click suggestion vẫn gọi `onSelectSuggestion(question)`.
5. Khi API trả source khác `llm` hoặc suggestions rỗng, component không render.

#### `frontend/src/components/soc/result-tabs.test.tsx`

Nếu test cũ còn kỳ vọng `Suggested next steps`, hãy cập nhật:

1. Không còn render `Suggested next steps`.
2. Không còn render static playbook cards từ `suggestions`.
3. Result table/chart vẫn render bình thường.

#### Nếu thêm slot/prop mới

Thêm test hoặc cập nhật test để đảm bảo slot `Next Investigation Steps` có thể xuất hiện sau `Query Result`, nếu cách triển khai cần.

### 8. Verification bắt buộc

Sau khi sửa, chạy:

```bash
cd frontend
npm run lint
npm run test -- follow-up-suggestions.test.tsx result-tabs.test.tsx
npm run build
```

Nếu test khác bị ảnh hưởng, chạy thêm:

```bash
npm run test
```

## Kỳ vọng cuối cùng

Sau khi refactor:

- Không còn `AI Follow-up Suggestions`.
- Header mới là `Next Investigation Steps`.
- Không còn badge `AI`.
- `Next Investigation Steps` nằm ở cuối khu vực kết quả, thay thế vị trí `Suggested next steps`.
- Static playbook `Suggested next steps` cũ không còn xuất hiện.
- Click suggestion vẫn chỉ fill + focus ô search, không auto-search.
- Không đổi backend.
- Không làm hỏng search/result/export/pagination.

## Lưu ý cho AI thực hiện

- Đây là task UI placement/refactor, không phải task sinh suggestion mới.
- Không thêm static fallback.
- Không gọi AI lại khi chỉ đổi vị trí render.
- Không auto-run khi click suggestion.
- Không đổi nội dung câu suggestion do backend trả về.
- Không đổi `Q23` nếu không cần; nếu có update docs thì chỉ ghi ngắn rằng header UI mới là `Next Investigation Steps`.
