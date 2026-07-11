# Prompt: Refactor Investigation And Audit Rows UI

Role: Bạn là Senior Frontend Engineer chuyên React, TypeScript, Tailwind CSS và UI/UX cho SOC/SIEM dashboard dark theme.

Task: Refactor UI của trang `Investigations` và `System Audit Logs` để nhìn đẹp, cao cấp và đồng bộ hơn theo reference:

- `refactor_ui/investigation&refer-for-audit.png`

Mục tiêu không phải copy 100%, mà lấy tinh thần UI trong ảnh: dark glass, row dạng card, cyan glow nhẹ, typography rõ, filter bar gọn, status/mode pill đẹp. Trang Audit cần làm tương tự Investigation để hai trang có cùng ngôn ngữ thiết kế.

## File Cần Kiểm Tra

Ưu tiên đọc kỹ các file hiện tại trước khi sửa:

- `frontend/src/components/soc/investigations/investigations-page.tsx`
- `frontend/src/components/soc/investigations/investigations-master-list.tsx`
- `frontend/src/components/soc/investigations/investigation-detail-panel.tsx`
- `frontend/src/components/soc/audit/audit-log-page.tsx`
- `frontend/src/components/soc/audit/audit-log-detail-panel.tsx`
- `frontend/src/services/history-api.ts`
- `frontend/src/types/soc.ts`

Nếu tên file audit khác, hãy tìm bằng:

```bash
rg "System Audit Logs|Audit Logs|Export Audit CSV|Pinned only|All modes|All statuses" frontend/src -n
```

Không sửa backend trong task này, trừ khi phát hiện bug contract thật sự. Task này ưu tiên UI.

## Yêu Cầu Tổng Quan

### 1. Đồng bộ Investigation và Audit

Hai trang phải có cùng phong cách:

- Header rõ, không cần subtitle dài.
- Filter/search bar nằm trên cùng.
- Table/list row dạng card glass thay vì row phẳng.
- Pagination cố định ở cuối màn hình như hiện tại nếu đã có.
- Mode/status badges đồng nhất.
- Hover/selected row có cyan glow nhẹ.
- Không làm trang quá sặc sỡ.

Audit được phép khác Investigation ở dữ liệu:

- Investigation: chỉ search question của user hiện tại, có `Pinned only`.
- System Audit Logs: có search question + search user, không có pinned filter, có `Export Audit CSV`.

### 2. Layout theo reference

Phong cách mong muốn:

```text
Investigations

[ Search questions...                         ] [ All modes v ] [ All statuses v ] [ Pinned only ]
                                                         Tip: Click on any row to view full details

TIMESTAMP             QUESTION                         RESULTS        MODE           STATUS

╭────────────────────────────────────────────────────────────────────────────────────────────╮
│ ☆ Jul 6 03:57:08 PM   Top 5 IP có nhiều event nhất tháng này    9,856   AGGREGATION SUCCESS │
╰────────────────────────────────────────────────────────────────────────────────────────────╯
```

Row trong reference có:

- Background xanh/navy mờ.
- Border cyan/slate nhẹ.
- Rounded corners.
- Spacing thoáng nhưng không chiếm quá nhiều chiều cao.
- Selected row sáng hơn/hơi glow.
- Pinned star nổi bật hơn.

### 3. Header và filter bar

#### Investigation

Giữ các control hiện có:

- Search input: `Search questions...`
- Mode dropdown: `All modes`, `Search`, `Aggregation`
- Status dropdown: `All statuses`, `Success`, `Failed`
- Toggle/filter: `Pinned only`

Yêu cầu visual:

- Input/dropdown có border cyan nhẹ:
  - `border-cyan-300/20`
  - hover/focus: `border-cyan-300/45`
  - background: `bg-slate-950/55` hoặc `bg-[#0b1220]/70`
- `Pinned only` có icon star, khi active thì glow/amber nhẹ.
- Tip nằm phải, màu slate/amber nhẹ, không quá nổi.
- Padding giữa header/filter/table phải gọn.

#### Audit

Giữ các control hiện có:

- Search question input.
- Search user input.
- Mode dropdown.
- Status dropdown.
- Export Audit CSV button.

Yêu cầu visual:

- Search question và search user nằm cùng hàng nếu đủ rộng.
- Trên màn nhỏ có thể wrap xuống hàng.
- Export Audit CSV nằm góc phải header hoặc cùng hàng filter tùy layout hiện tại, nhưng phải cân đối.
- Không có `Pinned only` trong audit.

### 4. Row/Card UI cho danh sách

Refactor danh sách từ table phẳng sang row-card style giống reference nhưng vẫn giữ cấu trúc dễ đọc.

Mỗi row cần hiển thị:

#### Investigation row

- Star pin icon bên trái.
- Timestamp.
- Question.
- Results.
- Mode badge.
- Status badge.
- Optional chevron/detail affordance nếu row có thể click.

#### Audit row

- Timestamp.
- User.
- Question.
- Results.
- Mode badge.
- Status badge.
- Optional chevron/detail affordance.

Yêu cầu row:

- `rounded-xl` hoặc `rounded-2xl`.
- `border border-cyan-300/10` mặc định.
- Background:
  - `bg-[linear-gradient(90deg,rgba(34,211,238,0.08),rgba(15,23,42,0.55))]`
  - hoặc tương đương.
- Hover:
  - border cyan rõ hơn.
  - background cyan/navy sáng hơn nhẹ.
  - shadow/glow rất nhẹ.
- Selected:
  - border cyan rõ.
  - glow rõ hơn hover.
  - background cyan mờ.
- Không dùng table border dày kiểu cũ.
- Không để row quá cao. Chiều cao khoảng 64-76px là hợp lý.

### 5. Typography

- Page title: đồng bộ với các trang khác, khoảng `text-2xl font-bold text-slate-50`.
- Table header labels:
  - uppercase nhỏ.
  - tracking nhẹ.
  - màu `text-slate-400` hoặc cyan-slate.
- Question:
  - `font-semibold`.
  - `text-slate-50`.
  - Nếu quá dài, line clamp 2 dòng.
- Timestamp/user/result:
  - rõ nhưng phụ hơn question.
  - dùng `font-mono` cho timestamp/results nếu hệ thống đang dùng như vậy.

### 6. Badges mode/status

Làm badge đồng bộ và đẹp hơn:

- `SEARCH`: cyan badge.
- `AGGREGATION`: purple badge.
- `SUCCESS`: green badge.
- `FAILED`: red/rose badge.
- Text uppercase.
- Border + background mờ + glow nhẹ.

Không đổi giá trị dữ liệu backend; chỉ format hiển thị.

### 7. Edited/Filtered/AI Corrected labels trong question

Nếu question có prefix:

- `[Edited SearchPlan]`
- `[Filtered Result]`
- `[AI Corrected]`

Hiển thị đẹp hơn trong row:

- Prefix thành badge nhỏ màu amber/cyan/purple tùy loại.
- Phần còn lại của question là text chính.
- Không render prefix thô quá dài nếu có thể parse được.

Ví dụ:

```text
[EDITED SEARCHPLAN] Show failed login trend by hour in the last 24 hours
```

Không thay đổi dữ liệu gốc, chỉ parse để hiển thị.

### 8. Pagination cố định cuối màn hình

Giữ behavior pagination hiện tại:

- Investigation và Audit hiện có footer/pagination cố định ở cuối UI.
- Không để user phải kéo xuống mới thấy pagination.
- Nếu không có data hoặc chỉ có 1 page:
  - vẫn giữ footer gọn ở cuối.
  - disable prev/next rõ.
  - không làm footer trông rỗng khó chịu.

Nếu Query Library cũng dùng component pagination tương tự thì không làm hỏng.

### 9. Empty/loading/error states

Không bỏ qua:

- Loading list.
- Empty list.
- Error state nếu có.

Polish nhẹ:

- Empty state nằm trong card glass.
- Text rõ, không quá dài.

### 10. Không phá logic hiện tại

Không được phá:

- Server-side filter/pagination.
- Search query debounce hoặc submit hiện tại nếu có.
- Mode/status filters.
- Pinned only filter ở Investigation.
- Pin/unpin.
- Row click mở detail.
- Detail panel.
- Export Audit CSV.
- RBAC: viewer/analyst/admin visibility.
- Recent queries/history behavior.

## Implementation Hints

Nên cân nhắc tạo/reuse helper nhỏ nếu đang lặp nhiều:

- `ModeBadge`
- `StatusBadge`
- `QueryPrefixBadge`
- `formatQuestionForDisplay`

Nhưng chỉ tạo abstraction nếu giúp code gọn và không làm quá tay.

Nếu có component chung cho list row giữa Investigation và Audit, có thể reuse. Nếu refactor quá lớn, giữ riêng từng file nhưng dùng class/style đồng bộ.

## Tests

Cập nhật test nếu UI text/structure thay đổi:

- Investigation list vẫn render rows.
- Mode/status filters vẫn hoạt động.
- Pinned only vẫn hoạt động.
- Row click vẫn mở detail.
- Audit search user/question vẫn render và gọi filter đúng.
- Export Audit CSV button vẫn có.

Chạy test liên quan nếu có:

```bash
cd frontend
npm run test -- investigations audit history
```

Nếu không có test target rõ:

```bash
npm run test
```

## Verification

Chạy:

```bash
cd frontend
npm run lint
npm run build
```

Và nếu có test liên quan:

```bash
npm run test -- investigations audit
```

## Kỳ Vọng Cuối Cùng

- Investigation nhìn gần tinh thần ảnh `refactor_ui/investigation&refer-for-audit.png`.
- Audit nhìn đồng bộ với Investigation.
- Row không còn phẳng, mà thành card glass có hover/selected đẹp.
- Filter/search bar đẹp và rõ hơn.
- Badge mode/status đẹp, nhất quán.
- Pagination vẫn cố định cuối màn hình.
- Không phá filter, pagination, detail, pin/unpin, export, RBAC.
