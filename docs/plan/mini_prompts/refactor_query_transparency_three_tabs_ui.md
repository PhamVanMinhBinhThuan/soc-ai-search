# Prompt: Refactor Query Transparency Three Tabs UI

Role: Bạn là Senior Frontend Engineer chuyên React, TypeScript, Tailwind CSS và UI/UX cho dashboard SOC/SIEM dark theme.

Task: Refactor UI khu vực `Query Transparency` của trang Event Search để 3 tab `Query Breakdown`, `Validated SearchPlan`, `Compiled DSL` đẹp, gọn, rõ ràng và đồng nhất hơn theo ảnh tham chiếu.

Ảnh tham chiếu:

- `refactor_ui/query_transparency/query_breakdown.png`
- `refactor_ui/query_transparency/validated_searchplan.png`

File chính cần chỉnh:

- `frontend/src/components/soc/query-transparency.tsx`
- `frontend/src/components/soc/query-breakdown.tsx`

File test liên quan:

- `frontend/src/components/soc/query-transparency.test.tsx`
- `frontend/src/components/soc/query-breakdown.test.tsx`

Không sửa backend trong task này.

## Bối cảnh hiện tại

Khu vực `Query Transparency` hiện đã có đủ chức năng:

- Tab `Query Breakdown`: diễn giải SearchPlan thành bảng dễ đọc.
- Tab `Validated SearchPlan`: hiển thị JSON SearchPlan và cho Analyst/Admin edit.
- Tab `Compiled DSL`: hiển thị Elasticsearch DSL read-only.
- Bên phải tab breakdown có `Correct or Refine Query`.

Mục tiêu là giữ nguyên toàn bộ behavior, chỉ refactor UI để panel này giống một inspection console chuyên nghiệp hơn: compact, dễ scan, ít rối, font đồng nhất với các trang dashboard/investigation/query library đã polish.

## Yêu Cầu Bắt Buộc

Giữ nguyên toàn bộ behavior hiện tại:

- Collapse/expand `Query Transparency`.
- Chuyển tab giữa `Query Breakdown`, `Validated SearchPlan`, `Compiled DSL`.
- Copy JSON.
- Edit SearchPlan.
- Reset to AI Plan.
- Cancel.
- Run Edited Plan.
- Correct or Refine Query.
- Apply refined query.
- Permission: Viewer không edit SearchPlan, Analyst/Admin edit được.

Chỉ refactor UI/layout/style. Không đổi API, không đổi DTO, không đổi SearchPlan contract, không đổi generated DSL.

## 1. Container Chính `Query Transparency`

Thiết kế giống một glass inspection panel:

- Rounded: `rounded-2xl`.
- Border: `border-cyan-400/20` hoặc `border-slate-700/60`.
- Background: `bg-[#08131f]/90`, `bg-slate-950/70`, hoặc tương đương.
- Có shadow/glow nhẹ, không quá neon:
  - `shadow-[0_20px_60px_-45px_rgba(34,211,238,0.55)]`.
- Header gọn:
  - Icon bên trái.
  - Title `Query Transparency`.
  - Chevron collapse/expand bên phải.
- Không làm header quá cao.

## 2. Tab List

Tab list cần sạch hơn và giống ảnh tham chiếu:

- Nằm ngay dưới header.
- Active tab có nền tối hơn, border/underline cyan nhẹ.
- Inactive tab màu `text-slate-400`, hover `text-slate-100`.
- Giữ icon cho từng tab:
  - Query Breakdown: `ListTree`.
  - Validated SearchPlan: `FileJson2`.
  - Compiled DSL: `Code2`.
- Text tab:
  - `Query Breakdown`
  - `Validated SearchPlan`
  - `Compiled DSL`
- Không dùng padding quá lớn khiến panel bị cao.

## 3. Tab `Query Breakdown`

Layout mong muốn trên màn hình rộng:

```text
Query Breakdown tab

┌──────────────────────────────────────────────┬──────────────────────────────┐
│ Query Breakdown                              │ Correct or Refine Query       │
│ ┌──────────────┬───────────────────────────┐ │ ┌──────────────────────────┐ │
│ │ FIELD        │ VALUE                     │ │ │ textarea                 │ │
│ │ Mode         │ Aggregation               │ │ │                          │ │
│ │ Time range   │ Last 30 days to now       │ │ │ Reset           Refine    │ │
│ │ Group by     │ Source IP                 │ │ └──────────────────────────┘ │
│ └──────────────┴───────────────────────────┘ │                              │
└──────────────────────────────────────────────┴──────────────────────────────┘
```

Yêu cầu:

- Dùng layout 2 cột trên màn hình rộng:
  - Cột trái: Query Breakdown table.
  - Cột phải: Correct or Refine Query.
- Trên màn hình nhỏ, stack dọc.
- Cột trái rộng hơn cột phải, ví dụ `lg:grid-cols-[minmax(0,1.7fr)_minmax(360px,0.8fr)]`.
- Bảng breakdown nhìn như inspection table:
  - Header row `FIELD` / `VALUE`.
  - Header nhỏ, uppercase, tracking vừa phải.
  - Row border mảnh, dễ đọc.
  - Body `text-sm`.
  - Value hiển thị dạng pill/badge.
- Không render row nếu field null/empty.
- Nếu `searchPlan` null, vẫn giữ tab và hiển thị:
  - `No SearchPlan available to build a query breakdown.`

Badge style gợi ý:

- Mode/Aggregation/Visualization: violet.
- Time range: cyan.
- Severity: amber/rose nếu dễ làm.
- Default field: slate.
- Country dùng component `CountryCode`.
- Nếu `CountryCode` đã hiển thị cờ + mã quốc gia thì không cần thêm tên quốc gia dài bên cạnh.

## 4. `Correct or Refine Query` Panel

Panel bên phải cần gọn hơn:

- Title: `Correct or Refine Query`.
- Icon nhỏ bên trái title.
- Không hiển thị subtitle dài.
- Textarea nền tối, border slate/cyan nhẹ.
- Placeholder giữ ý nghĩa hiện tại:
  - `Example: Change the time range to last 7 days and include vpn.user`
- Buttons:
  - `Reset`: ghost/subtle.
  - `Refine`: primary cyan.
- Buttons nằm dưới textarea, canh phải.
- Không đổi logic refine.

## 5. Tab `Validated SearchPlan`

Thiết kế giống code panel clean theo ảnh `validated_searchplan.png`.

Viewer mode:

- JSON viewer nằm trong card riêng.
- Header code panel có:
  - File label `search_plan.json`.
  - Có thể thêm 3 chấm màu nhỏ như code window nếu đẹp.
  - Button `Copy` bên phải.
- Code font monospaced, dễ đọc.
- Background: `#07111d`, `#0B1220`, hoặc tương đương.
- Border slate/cyan nhẹ.
- Không làm code panel quá sáng.

Edit mode:

- CodeMirror vẫn dùng JSON mode và theme hiện tại.
- Buttons dưới editor:
  - `Reset to AI Plan`
  - `Cancel`
  - `Run Edited Plan`
- Buttons canh phải.
- Error JSON hiển thị rõ nhưng không phá layout.
- Không đổi logic parse/validate/run.

Permission:

- Nếu không có quyền edit, hiển thị cảnh báo nhỏ gọn:
  - `SearchPlan editing requires ANALYST or ADMIN.`
- Nếu có quyền, nút `Edit SearchPlan` nên nằm gọn phía phải code panel hoặc phía trên code panel, không gây rối.

## 6. Tab `Compiled DSL`

Thiết kế giống `Validated SearchPlan`:

- Code panel label: `compiled_dsl.json`.
- Có nút `Copy`.
- Có badge nhỏ `Read-only`.
- Không có edit button.
- Nếu `generatedDsl` null/empty trong Investigation/Audit detail, hiển thị:
  - `No compiled DSL stored for this query.`
- Không render `{}` hoặc `null` như dữ liệu thật.

## 7. Copy Button

Giữ behavior hiện tại:

- Click copy JSON vào clipboard.
- Hiển thị `Copied` khi thành công.
- Hiển thị `Copy failed` khi lỗi.

Polish UI:

- Button nhỏ, nằm ở góc phải header code panel.
- Không che nội dung code.
- Dùng icon `Copy` / `Check` nếu đang có sẵn.

## 8. Không Phá Các Phần Khác

Không thay đổi:

- AI Summary.
- Query Result.
- Next Investigation Steps.
- Result filter/sort.
- Search header.
- Dashboard.
- Investigation/Audit behavior.

Nếu `QueryBreakdown` được dùng chung ở Investigation/Audit detail, style mới phải vẫn đẹp ở các trang đó.

## 9. Visual Style

Tone mong muốn:

- Navy/slate dark, không đen phẳng.
- Border mảnh, sáng vừa phải.
- Ít glow hơn dashboard.
- Table rõ dòng, dễ đọc.
- Font size:
  - Section title: `text-sm` hoặc `text-base`.
  - Table header: `text-[11px] uppercase tracking-[0.18em]`.
  - Body: `text-sm`.
- Giảm padding thừa.
- Ưu tiên compact vì Query Transparency thường nằm giữa Search Header, AI Summary và Query Result.

## 10. Tests Và Verification

Cập nhật test nếu text/role/class thay đổi.

Chạy:

```bash
cd frontend
npm run lint
npm run test -- query-transparency query-breakdown
npm run build
```

Nếu test target không match tên file, chạy test tương ứng trực tiếp:

```bash
npm run test -- query-transparency.test.tsx query-breakdown.test.tsx
```

## Kỳ Vọng Cuối Cùng

- `Query Transparency` nhìn giống một professional inspection panel.
- 3 tab rõ ràng, compact, dễ scan.
- `Query Breakdown` có bảng đẹp và refiner panel bên phải gọn.
- `Validated SearchPlan` và `Compiled DSL` có code panel đẹp, copy button rõ.
- Không mất bất kỳ behavior hiện tại nào.
