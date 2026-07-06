# Prompt: Refactor Search Header Console

Role: Bạn là Senior Frontend Engineer chuyên React, TypeScript, Tailwind CSS và UI/UX cho SOC/SIEM dashboard dark theme.

Task: Refactor phần đầu trang Event Search để gọn, đẹp và giống một SOC command console hơn.

File cần kiểm tra/chỉnh sửa trước:

- `frontend/src/App.tsx`
- `frontend/src/components/soc/search-section.tsx`
- `frontend/src/components/soc/search-status.tsx`
- `frontend/src/components/soc/query-suggestions.tsx` hoặc file đang render 5 suggested queries nếu khác tên
- Các test liên quan đến search UI nếu có

Không sửa backend trong task này.

## Bối cảnh

Hiện tại phần đầu trang Search đang có search box dạng hero khá cao, Suggested Queries nằm ở một card riêng phía dưới. UI nhìn đẹp nhưng chiếm nhiều chiều cao và chưa giống một search console chuyên nghiệp.

Mong muốn là refactor phần đầu theo hướng compact hơn:

- Có title rõ ràng.
- Search input, nút Search, pin button và suggested queries nằm trong cùng một console card.
- Giao diện giống enterprise SOC/SIEM dark theme.
- Không làm mất các chức năng hiện tại.

## Yêu cầu UI

### 1. Thêm title trang

Ở đầu trang Event Search, thêm title:

```text
SOC Event Search Console
```

Style gợi ý:

- Font size tương đương title các trang lớn như `SOC Overview`, `Investigations`, `Query Library`.
- Font weight: `font-semibold` hoặc `font-bold`.
- Text màu `text-slate-50`.
- Có thể đặt icon nhỏ bên trái nếu hệ thống đã có icon phù hợp, ví dụ `Search`, `Sparkles`, hoặc icon đang dùng cho Event Search.
- Không cần subtitle.

### 2. Gộp search input và suggested queries vào một card

Hiện tại search input và suggested queries đang tách nhau. Hãy đưa vào cùng một card dạng command console.

Bố cục phải có 2 lớp rõ ràng:

1. **Outer Search Console Card**
   - Card lớn bọc toàn bộ vùng search đầu trang.
   - Bên trong chứa inner command bar và suggested queries.
   - Đây là container chính tạo cảm giác một SOC command console.

2. **Inner Command Bar**
   - Card/khung nhỏ hơn nằm bên trong outer card.
   - Bọc chung các thành phần:
     - icon bên trái input.
     - ô nhập câu hỏi tự nhiên.
     - pin button hiện tại.
     - nút `Search`.
   - Không để input, pin và Search button trôi rời rạc.

Bố cục mong muốn:

```text
SOC Event Search Console

┌──────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ [icon] natural language input              [pin] [Search]│ │
│ └──────────────────────────────────────────────────────────┘ │
│ Suggested: [Failed login from China] [Critical events] ... [View queries] [Recent Queries] │
└──────────────────────────────────────────────────────────────┘
```

Yêu cầu:

- Card nền glass/cyber nhẹ, ví dụ:
  - `bg-[#0B1220]/80`
  - border `border-cyan-400/25`
  - shadow cyan/purple nhẹ
  - rounded `rounded-2xl`
- Search input không quá cao.
- Nên giảm chiều cao so với hero card hiện tại.
- Search button vẫn nổi bật bằng gradient như hiện tại.
- Pin button giữ nguyên chức năng và đặt trong inner command bar, cạnh nút Search.
- Suggested query chips nằm ngay dưới input trong cùng card.
- Không dùng card riêng cho suggested queries nữa.
- Không tạo thêm khoảng cách quá lớn giữa input và suggested chips.
- Inner command bar nên có nền sáng hơn outer card một chút, ví dụ `bg-slate-800/45` hoặc `bg-cyan-950/20`, border cyan rất nhẹ và focus glow khi input focus.

### 3. Suggested Queries

Giữ hành vi hiện tại:

- 5 suggested queries khi click chỉ điền câu hỏi vào ô search, không tự chạy.
- `View queries` route sang Query Library.
- `Recent Queries` mở recent queries.

Chỉ thay đổi layout/style:

- Chips nhỏ gọn hơn.
- Cùng chiều cao và font với các chip trong hệ thống.
- Active/hover state cyan nhẹ.
- `View queries` và `Recent Queries` có thể giữ border nổi hơn một chút vì là action chip.

### 4. Search input

Giữ behavior hiện tại:

- Người dùng nhập câu hỏi tự nhiên.
- Nút Search chạy query.
- Enter nếu hiện tại đang hỗ trợ thì vẫn giữ.
- Pin button nếu hiện tại có thì giữ nguyên logic.

Style gợi ý:

- Input nằm trong một row compact.
- Placeholder/text rõ ràng.
- Border cyan nhẹ khi focus.
- Icon bên trái input giữ hoặc dùng icon hiện tại.
- Không làm input quá thấp đến mức khó click.

### 5. Không ảnh hưởng các block bên dưới

Không thay đổi logic hoặc vị trí chức năng của:

- Query Transparency.
- Correct or Refine Query.
- AI Summary.
- Query Result.
- Next Investigation Steps.
- Export CSV.
- Filter/sort result.

Chỉ cần đảm bảo sau khi phần đầu thấp hơn, các block bên dưới có nhiều không gian hơn và không bị đè/ẩn.

### 6. Responsive

Trên màn hình rộng:

- Input, pin button và Search button nằm cùng hàng.
- Suggested queries nằm dòng dưới.

Trên màn hình nhỏ:

- Search button có thể xuống dòng nếu cần.
- Suggested chips wrap tự nhiên.
- Không overflow ngang.

### 7. Test/Verification

Cập nhật test nếu có snapshot/query text bị ảnh hưởng.

Chạy:

```bash
cd frontend
npm run lint
npm run test
npm run build
```

Nếu test toàn bộ quá lâu, tối thiểu chạy test liên quan đến Search UI rồi chạy build.

## Kỳ vọng cuối cùng

- Trang Event Search có title `SOC Event Search Console`.
- Search input và suggested queries nằm trong một card duy nhất.
- Phần đầu trang gọn hơn, không còn cảm giác hero quá cao.
- UI vẫn giữ cyber/SOC dark theme hiện tại.
- Không phá hành vi search, suggested queries, recent queries hoặc query library.
