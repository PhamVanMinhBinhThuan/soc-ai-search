# Prompt: Refactor Event Detail Drawer Into Centered Modal

Role: Bạn là Senior Frontend Engineer chuyên React, TypeScript, Tailwind CSS và UI/UX cho SOC/SIEM dashboard dark theme.

Task: Refactor UI phần `Event Details` sau khi click vào một event trong bảng `Event Logs`. Hiện tại event detail đang là drawer/popup trượt từ bên phải. Hãy đổi thành modal centered ở giữa màn hình, đẹp và đồng nhất với popup `Recent Queries`, theo ảnh tham chiếu:

- `refactor_ui/event_details.png`

File chính cần chỉnh:

- `frontend/src/components/soc/event-detail-drawer.tsx`

File test liên quan cần kiểm tra/cập nhật:

- `frontend/src/components/soc/event-detail-drawer.test.tsx`

Có thể tham khảo style modal hiện tại:

- `frontend/src/components/soc/history-sheet.tsx`

Không sửa backend trong task này.

## Mục Tiêu

Đổi `EventDetailDrawer` từ side drawer sang centered modal:

- Modal nằm giữa màn hình.
- Có backdrop tối + blur giống popup `Recent Queries`.
- Card modal có border cyan/slate, background navy glass, shadow/glow mềm.
- UI gần với ảnh `event_details.png`: header `Event Details`, severity badge cạnh title, nút close góc phải, segmented tabs `Formatted Fields` / `Raw Log`, nội dung formatted fields hiển thị như bảng thông tin gọn đẹp.

## Yêu Cầu Quan Trọng

Giữ nguyên behavior hiện tại:

- `open`, `onOpenChange`, `event`, `status`, `error`, `onRetry`, `canViewRawLog` vẫn hoạt động như cũ.
- Click outside modal thì đóng modal.
- Nút close góc phải đóng modal.
- Loading state vẫn hiển thị skeleton.
- Error state vẫn hiển thị alert + Retry.
- Success state vẫn hiển thị 2 tab:
  - `Formatted Fields`
  - `Raw Log`
- Viewer không có quyền raw log thì tab `Raw Log` vẫn bị disabled/locked.
- Không hiển thị raw data giả/placeholder cho Viewer.
- Không đổi data mapping, không đổi API, không đổi type.

## 1. Thay Sheet Bằng Centered Modal

Hiện tại đang dùng:

- `Sheet`
- `SheetContent`
- `SheetHeader`
- `SheetTitle`

Hãy thay bằng modal tự dựng giống `HistorySheet`:

```tsx
if (!open) return null

return (
  <div className="fixed inset-0 z-50 grid place-items-center ...">
    <div role="dialog" aria-modal="true" ...>
      ...
    </div>
  </div>
)
```

Yêu cầu modal:

- Backdrop:
  - `fixed inset-0 z-50`
  - `bg-slate-950/70`
  - `backdrop-blur-[6px]`
  - Có thể thêm overlay radial gradient nhẹ.
- Modal card:
  - `w-full max-w-2xl` hoặc `max-w-3xl` tùy nội dung.
  - `max-h-[86vh]`
  - `overflow-hidden`
  - `rounded-2xl` hoặc `rounded-[1.35rem]`.
  - Border: `border-cyan-300/20` hoặc `border-slate-400/18`.
  - Background: `bg-[#142238]/95`, `bg-[#0b1726]/95`, hoặc navy glass tương đương.
  - Shadow:
    - `shadow-[0_22px_80px_-46px_rgba(0,0,0,0.95),0_0_34px_-28px_#22d3ee]`.

## 2. Header Modal

Header giống ảnh:

```text
Event Details   [Severity Badge]                                      X
```

Yêu cầu:

- Title `Event Details` font rõ, `text-lg font-semibold`.
- Nếu có event thì hiển thị `SeverityBadge` cạnh title.
- Nút close góc phải dùng icon `X`, size vừa phải.
- Header có border-bottom nhẹ.
- Không hiển thị `event_id` ở header.
- Không hiển thị `index` trong formatted fields.

## 3. Tabs `Formatted Fields` Và `Raw Log`

Tabs cần là segmented control đẹp hơn hiện tại:

- Full width.
- Hai tab chia đều.
- Active tab có background tối hơn/cyan glow nhẹ.
- Inactive tab text slate.
- Icon giữ:
  - `Formatted Fields`: `FileText`.
  - `Raw Log`: `Braces`.
- Nếu raw log locked:
  - Tab `Raw Log` disabled.
  - `title="Raw log requires SOC_ANALYST or SOC_ADMIN role"` giữ nguyên.
  - Có thể vẫn hiển thị small locked state/alert gọn dưới tab, nhưng không render raw log giả.

Không hiển thị dòng dài kiểu:

```text
This account can view event metadata, but raw log access requires...
```

Nếu có alert locked thì chỉ cần:

```text
Raw log locked
```

## 4. Formatted Fields Layout

Formatted fields cần giống ảnh:

- Một card/table bên trong modal.
- Mỗi row có:
  - Icon bên trái.
  - Label màu slate.
  - Value canh phải.
- Row có border-bottom nhẹ.
- Background row/card hơi xanh đen.
- Message row có background nhấn nhẹ, vì message thường dài và quan trọng.

Fields hiển thị:

- Timestamp
- Source
- Event Type
- User
- Host
- Source IP
- Country Code
- Message

Không hiển thị:

- Event ID
- Index

Timestamp format:

- Dùng format hiện tại:
  - `06/07/2026, 04:07 PM`
- Không cần hiển thị `ICT`.
- Timezone vẫn là `Asia/Ho_Chi_Minh`.

Country:

- Dùng component `CountryCode`.
- Hiển thị cờ + mã quốc gia như bảng event logs.

Message:

- `mono={false}`.
- Cho phép wrap nhiều dòng.
- Có thể đặt trong row nền `bg-cyan-300/[0.06]` hoặc `bg-slate-800/45`.

## 5. Raw Log Tab

Nếu user có quyền raw log:

- Hiển thị raw log trong code panel đẹp:
  - Background gần đen/navy.
  - Border cyan/slate.
  - Font mono.
  - Scroll nếu dài.
- Có thể thêm header nhỏ `raw_event.log` nếu đẹp, nhưng không bắt buộc.

Nếu user không có quyền:

- Tab disabled.
- Không render raw content.
- Không render placeholder raw data.

## 6. Loading State

Loading vẫn nằm trong modal centered, không dùng drawer.

Yêu cầu:

- Skeleton trong card modal.
- Header vẫn có title `Event Details`.
- Skeleton tab + skeleton rows.
- Không làm modal nhảy layout quá mạnh.

## 7. Error State

Error vẫn nằm trong modal centered.

Yêu cầu:

- Alert border rose, background rose nhẹ.
- Title:
  - `Event not found` nếu 404.
  - `Event detail unavailable` nếu lỗi khác.
- Hiển thị `HTTP status` nếu có.
- Nút `Retry`.
- Nút close vẫn hoạt động.

## 8. Accessibility

Cần đảm bảo:

- Modal wrapper có `role="dialog"`.
- Có `aria-modal="true"`.
- Header title có `id`, dialog dùng `aria-labelledby`.
- Close button có `aria-label="Close event details"`.
- Click outside modal đóng modal.
- Click bên trong modal không đóng.
- Escape key nếu hệ thống hiện tại chưa có cũng không bắt buộc, nhưng nếu dễ làm thì thêm.

## 9. Không Phá Logic RBAC

Đây là phần quan trọng khi bảo vệ:

- Viewer được xem metadata/formatted fields.
- Viewer không được xem raw log.
- Analyst/Admin được xem raw log nếu backend trả `raw_visible=true` và `raw !== null`.
- UI chỉ phản ánh quyền; backend vẫn là nơi enforce chính.

Không được vì refactor UI mà làm Viewer thấy raw log.

## 10. Visual Style Mong Muốn

Tone giống `Recent Queries` modal và ảnh `event_details.png`:

- Dark navy background.
- Cyan/slate border.
- Glow nhẹ ở modal border.
- Table row rõ, sạch, không quá nhiều neon.
- Text chính: `text-slate-100`.
- Text phụ: `text-slate-400`.
- Accent cyan: `text-cyan-200`, `border-cyan-300/20`.
- Severity badge giữ style hiện tại.

Gợi ý layout:

```text
Backdrop blur
┌────────────────────────────────────────────────────────┐
│ Event Details  [High/Critical badge]                 X │
├────────────────────────────────────────────────────────┤
│ [Formatted Fields                ] [Raw Log          ] │
│                                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Timestamp                         06/07/2026...    │ │
│ │ Source                            edr              │ │
│ │ Event Type                        malware_detected │ │
│ │ User                              finance.user     │ │
│ │ Host                              finance-ws-07    │ │
│ │ Source IP                         10.20.5.33       │ │
│ │ Country Code                      🇻🇳 VN            │ │
│ │ Message                           ...              │ │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

## 11. Tests Và Verification

Cập nhật test nếu cần:

- `frontend/src/components/soc/event-detail-drawer.test.tsx`

Test nên đảm bảo:

- Modal render `Event Details`.
- Formatted fields hiển thị.
- Không hiển thị Event ID và Index.
- Timestamp format đúng.
- Viewer không thấy raw log content khi `canViewRawLog=false`.
- Raw log tab disabled/locked với Viewer.
- Analyst/Admin thấy raw log khi được phép.
- Close button gọi `onOpenChange(false)`.

Chạy:

```bash
cd frontend
npm run lint
npm run test -- event-detail-drawer
npm run build
```

Nếu test target không khớp, chạy trực tiếp:

```bash
npm run test -- event-detail-drawer.test.tsx
```

## Kỳ Vọng Cuối Cùng

- Event detail không còn là drawer bên phải.
- Event detail là modal centered đẹp như popup `Recent Queries`.
- UI gần ảnh `refactor_ui/event_details.png`.
- Formatted fields dễ đọc, chuyên nghiệp.
- Raw log permission không bị phá.
- Không thay đổi backend/API.
