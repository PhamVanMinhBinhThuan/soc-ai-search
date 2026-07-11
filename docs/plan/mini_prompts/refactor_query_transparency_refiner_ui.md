# Prompt: Refactor Query Transparency Refiner UI

## Role

Bạn là Senior Frontend Engineer chuyên React, TypeScript, Tailwind CSS, shadcn/ui và UI/UX cho dashboard SOC/SIEM dark theme.

## Bối cảnh

Trong trang Event Search của project SOC AI Search, panel `Query Transparency` hiện có 3 tab:

- `Query Breakdown`
- `Validated SearchPlan`
- `Compiled DSL`

Trong tab `Query Breakdown`, phía dưới bảng breakdown đang có block `Correct or Refine Query`. UI hiện tại còn hơi dài, có nhiều mô tả dư, và block này đang nằm phía dưới bảng nên chưa tận dụng được khoảng trống bên phải của `Query Breakdown`.

Ảnh UI hiện tại cho thấy:

- Bên trái là card `Query Breakdown` với bảng field/value.
- Bên phải phía trên của card còn khá trống.
- Block `Correct or Refine Query` nằm dưới cùng và chiếm nguyên chiều ngang.

Mục tiêu của task này là refactor UI cho gọn hơn, chuyên nghiệp hơn, nhưng **không thay đổi logic backend / API / flow AI refiner**.

## File cần đọc trước

Hãy đọc kỹ các file sau trước khi sửa:

- `frontend/src/components/soc/query-transparency.tsx`
- `frontend/src/components/soc/query-transparency.test.tsx`
- `frontend/src/components/soc/query-breakdown.tsx`
- `frontend/src/services/query-refinement-api.ts`
- `frontend/src/types/soc.ts`

Nếu cần hiểu layout trang chính:

- `frontend/src/App.tsx`

## Scope bắt buộc

Chỉ refactor UI trong `QueryTransparency` / `QueryRefiner`.

Không đổi:

- Backend.
- API endpoint.
- Request/response DTO.
- Cách gọi `refineQuery`.
- Cách `onApplyQueryUpdate` hoạt động.
- Logic parse/validate SearchPlan.
- Tabs `Validated SearchPlan` và `Compiled DSL`.
- `QueryBreakdown` logic hiển thị field/value.

## Yêu cầu chi tiết

### 1. Xóa các dòng mô tả dư trong `Correct or Refine Query`

Trong block `Correct or Refine Query`, hãy xóa hoàn toàn các text sau:

```text
Describe what should be corrected or refined. The system rewrites the question and reruns the safe SearchPlan pipeline.
```

```text
AI only updates the question. SearchPlan and DSL are regenerated and validated by the backend.
```

Đồng thời xóa badge:

```text
AI assisted
```

Sau khi refactor, header của block chỉ nên còn:

```text
Correct or Refine Query
```

Kèm icon nếu phù hợp.

### 2. Đưa `Correct or Refine Query` sang bên phải `Query Breakdown`

Hiện tại bên phải của `Query Breakdown` còn trống. Hãy đổi layout của tab `Query Breakdown` thành dạng responsive 2 cột:

Desktop / màn hình rộng:

```text
+---------------------------------------------------------------+
| Query Breakdown tab                                           |
|                                                               |
| +-------------------------------+ +-------------------------+ |
| | Query Breakdown table         | | Correct or Refine Query | |
| | Field / Value                 | | textarea                | |
| | ...                           | | Reset / Refine          | |
| +-------------------------------+ +-------------------------+ |
+---------------------------------------------------------------+
```

Mobile / màn hình hẹp:

```text
Query Breakdown table
Correct or Refine Query
```

Gợi ý Tailwind:

- Wrapper trong `TabsContent value="breakdown"` có thể dùng:

```tsx
<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
```

Hoặc bố cục tương đương.

Yêu cầu:

- Cột `Query Breakdown` rộng hơn.
- Cột `Correct or Refine Query` nhỏ gọn hơn, giống một side card.
- Không làm bảng breakdown bị bó quá hẹp.
- Responsive tốt, không overflow ngang.

### 3. Đổi nút `Apply AI Update` thành `Refine`

Đổi label nút:

```text
Apply AI Update
```

thành:

```text
Refine
```

Giữ nguyên icon loading / icon Sparkles nếu đang dùng.

Giữ nguyên hành vi:

- Khi textarea trống: nút disabled.
- Khi đang gọi API: show loading.
- Khi thành công: gọi `onApplyQueryUpdate`.

### 4. Polish UI của side card `Correct or Refine Query`

Thiết kế side card theo dark SOC theme hiện tại:

- Nền: `bg-zinc-950/40` hoặc `bg-cyan-950/10`.
- Border: `border-cyan-400/15` hoặc `border-border`.
- Rounded: `rounded-2xl`.
- Padding: gọn, khoảng `p-4`.
- Header:
  - Icon `Sparkles` hoặc `SlidersHorizontal` từ `lucide-react`.
  - Title `Correct or Refine Query`.
  - Font phải đồng bộ với `Query Breakdown`, không quá lớn.
- Textarea:
  - Placeholder giữ được ý nghĩa hiện tại, ví dụ:

```text
Example: Change the time range to last 7 days and include vpn.user
```

  - Nên cao vừa phải, ví dụ `min-h-28`.
  - Border/focus cyan nhẹ.
- Footer:
  - `Reset` dạng outline/ghost.
  - `Refine` nổi bật cyan.
  - Buttons căn phải.

Không thêm các dòng giải thích dài trong UI.

### 5. Giữ nguyên UX lỗi

Nếu API refine lỗi, vẫn hiển thị error message như hiện tại.

Yêu cầu UI lỗi:

- Nằm trong side card.
- Style rose/red nhẹ.
- Không làm layout nhảy mạnh.

### 6. Không làm mất accessibility

Giữ hoặc cải thiện:

- `aria-label="Correction or refinement note"` cho textarea.
- Button có text rõ ràng `Refine`.
- Collapsible Query Transparency hiện tại vẫn hoạt động.

### 7. Tests bắt buộc

Cập nhật `frontend/src/components/soc/query-transparency.test.tsx`.

Test tối thiểu:

1. Vẫn hiển thị đủ 3 tab theo thứ tự:
   - `Query Breakdown`
   - `Validated SearchPlan`
   - `Compiled DSL`
2. Khi có `onApplyQueryUpdate`, UI hiển thị `Correct or Refine Query`.
3. Không còn hiển thị:
   - `AI assisted`
   - `Describe what should be corrected or refined`
   - `AI only updates the question`
   - `Apply AI Update`
4. Có nút `Refine`.
5. Nhập feedback và click `Refine` vẫn gọi `onApplyQueryUpdate` đúng payload như hiện tại.

Nếu test cũ đang tìm button `/apply ai update/i`, phải đổi sang `/refine/i`.

### 8. Verification bắt buộc

Sau khi sửa, chạy:

```bash
cd frontend
npm run lint
npm run test -- query-transparency.test.tsx
npm run build
```

Nếu có test khác liên quan bị ảnh hưởng, sửa test đúng theo behavior mới, không bỏ test.

## Kỳ vọng cuối cùng

UI sau khi refactor cần đạt:

- `Query Breakdown` và `Correct or Refine Query` nằm cạnh nhau trên desktop.
- Block refiner gọn hơn, ít chữ hơn.
- Không còn badge `AI assisted`.
- Không còn các dòng mô tả dài.
- Nút chính là `Refine`.
- Logic refine vẫn chạy đúng.
- Query Transparency nhìn chuyên nghiệp, cân bằng hơn, tận dụng khoảng trống bên phải.

## Lưu ý quan trọng cho AI thực hiện

- Không đổi tên chức năng thành `Rewrite Question`; giữ đúng `Correct or Refine Query`.
- Không biến flow này thành edit SearchPlan trực tiếp.
- Không auto-submit khi user nhập feedback.
- Không thay đổi `QueryBreakdown` data model.
- Không thay đổi backend.
- Không làm ảnh hưởng các tab SearchPlan / DSL.
- Không xóa khả năng collapse của `Query Transparency`.
