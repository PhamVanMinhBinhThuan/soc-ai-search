# Prompt: Fix Search Header Caret, Actions Layout, Recent Queries Button, And DSL Read-only Badge

Role: Bạn là Senior Frontend Engineer chuyên React, TypeScript, Tailwind CSS và UI/UX cho SOC/SIEM dashboard dark theme.

Task: Sửa một số lỗi nhỏ và polish UI ở trang Event Search.

File chính cần kiểm tra/chỉnh:

- `frontend/src/components/soc/search-section.tsx`
- `frontend/src/components/soc/search-section.test.tsx`
- `frontend/src/components/soc/query-transparency.tsx`
- `frontend/src/components/soc/query-transparency.test.tsx`

Không sửa backend trong task này.

## Vấn Đề Cần Sửa

### 1. Lỗi caret trong ô search

Hiện tại khi người dùng gõ trong ô search, có lỗi:

- Gõ 1 chữ thì cursor/caret bị nhảy về cuối câu.
- Điều này làm người dùng không thể edit giữa câu một cách tự nhiên.

Khả năng cao nguyên nhân nằm ở `SearchSection`:

```tsx
useEffect(() => {
  if (focusSignal > 0) {
    textareaRef.current?.focus()
    textareaRef.current?.setSelectionRange(question.length, question.length)
  }
}, [focusSignal, question.length])
```

Vì dependency có `question.length`, mỗi lần người dùng gõ, effect chạy lại và ép selection về cuối câu.

Yêu cầu:

- Chỉ focus và đưa caret về cuối khi `focusSignal` thay đổi.
- Không chạy lại khi `question` thay đổi do người dùng gõ.
- Có thể dùng `useRef` để lưu latest question length hoặc dependency chỉ là `[focusSignal]`.
- Đảm bảo khi chọn recent query/query library/suggestion cần focus input thì vẫn focus đúng.
- Không làm mất behavior focus hiện tại.

Gợi ý:

```tsx
const latestQuestionRef = useRef(question)

useEffect(() => {
  latestQuestionRef.current = question
}, [question])

useEffect(() => {
  if (focusSignal > 0) {
    const input = textareaRef.current
    input?.focus()
    const end = latestQuestionRef.current.length
    input?.setSelectionRange(end, end)
  }
}, [focusSignal])
```

Hoặc cách tương đương miễn là không ép caret về cuối khi user đang gõ.

### 2. Search card chỉ nên bao gồm icon search và ô search

Hiện tại card/form trong `SearchSection` đang bọc:

- icon search
- textarea
- icon pin
- nút Search

Yêu cầu UI mới:

- Card search bên trong chỉ bao gồm:
  - icon search bên trái.
  - ô search/textarea.
- Icon pin và nút Search không nằm trong card input nữa.
- Pin và Search button nằm bên phải card input, cùng hàng với card input ở desktop.
- Trên màn hình nhỏ, có thể stack hợp lý nhưng không làm layout vỡ.

Layout mong muốn:

```text
Outer Search Console Card

[ Search input card: icon + textarea ]   [Pin] [Search]

Suggested: [chip] [chip] [View queries] [Recent Queries]
```

Yêu cầu giữ nguyên behavior:

- Submit form vẫn hoạt động.
- Ctrl/Cmd + Enter vẫn submit.
- Pin/unpin vẫn hoạt động.
- Button disabled khi không thể submit.
- Suggested chips vẫn chỉ điền câu hỏi, không tự search nếu logic hiện tại là như vậy.

### 3. Nút Search đang quá nổi bật

Hiện tại button Search dùng gradient quá mạnh:

```tsx
bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400
```

Yêu cầu:

- Giảm độ “chói” của nút Search.
- Vẫn là primary CTA, nhưng vừa đủ điểm nhấn.
- Nên dùng cyan/navy style đồng bộ hệ thống:
  - `bg-cyan-400 text-slate-950`
  - hoặc `bg-cyan-500/90 text-slate-950`
  - shadow nhẹ `shadow-[0_0_22px_-12px_#22d3ee]`
  - hover sáng hơn nhẹ.
- Không dùng gradient fuchsia quá gắt.

### 4. `Read-only` trong Compiled DSL đang xuất hiện 2 chỗ

Hiện tại khi mở tab `Compiled DSL`, chữ `Read-only` xuất hiện:

- Góc phải khu vực tab/header.
- Bên trong header của code panel `compiled_dsl.json`.

Yêu cầu:

- Chỉ giữ `Read-only` ở góc phải khu vực tab/header.
- Xóa `Read-only` bên trong code panel.
- Không xóa file label `compiled_dsl.json`.
- Không phá copy button.

Gợi ý:

- Trong `JsonViewer`, bỏ prop hoặc logic render `readOnly`.
- Hoặc khi render DSL, không truyền `readOnly`.
- Nhưng vẫn giữ badge `Read-only` bên ngoài trong `QueryTransparency` khi `activeTab === 'dsl'`.

### 5. Nút `Recent Queries` cần nổi bật như `View queries`

Hiện tại `Recent Queries` đang chìm hơn `View queries`.

Yêu cầu:

- Làm `Recent Queries` nổi bật tương tự `View queries`.
- Có border cyan rõ hơn.
- Background cyan/navy nhẹ.
- Text sáng hơn.
- Shadow/glow nhẹ.
- Vẫn khác biệt một chút để không bị lẫn:
  - `View queries`: cyan/book.
  - `Recent Queries`: cyan/slate/history.
- Không đổi behavior click mở modal recent queries.

## Files Cần Chú Ý

### `frontend/src/components/soc/search-section.tsx`

Các điểm cần chỉnh:

- Fix `useEffect` focus/caret.
- Refactor form layout:
  - input card chỉ chứa search icon + textarea.
  - pin/search actions nằm ngoài input card.
- Giảm màu Search button.
- Polish `Recent Queries` button.

### `frontend/src/components/soc/query-transparency.tsx`

Các điểm cần chỉnh:

- Xóa `Read-only` trong code panel.
- Chỉ giữ `Read-only` badge ở góc phải tab/header.
- Đảm bảo `Compiled DSL` vẫn copy được.

## Test Cần Cập Nhật

Cập nhật/thêm test nếu cần:

- `frontend/src/components/soc/search-section.test.tsx`
- `frontend/src/components/soc/query-transparency.test.tsx`

Test tối thiểu nên có:

1. `SearchSection` vẫn render `View queries` và `Recent Queries`.
2. `Recent Queries` vẫn gọi handler khi click.
3. Gõ trong textarea vẫn gọi `onQuestionChange`.
4. Nếu có thể test được, khi `question` thay đổi mà `focusSignal` không đổi thì component không ép caret về cuối.
5. `Compiled DSL` chỉ có một `Read-only` badge.

Nếu test caret khó hoặc jsdom không ổn định, ít nhất đảm bảo implementation không phụ thuộc `question.length` trong focus effect.

## Verification

Chạy:

```bash
cd frontend
npm run lint
npm run test -- search-section query-transparency
npm run build
```

Nếu test target không match, chạy trực tiếp:

```bash
npm run test -- search-section.test.tsx query-transparency.test.tsx
```

## Kỳ Vọng Cuối Cùng

- Người dùng có thể click giữa câu search và gõ bình thường, caret không bị nhảy về cuối.
- Search input card gọn hơn, chỉ chứa icon search + textarea.
- Pin và Search nằm ngoài input card, bố cục sạch hơn.
- Nút Search bớt chói, vẫn là CTA chính.
- `Read-only` ở `Compiled DSL` chỉ xuất hiện một lần ở góc phải.
- `Recent Queries` nổi bật tương đương `View queries`.
