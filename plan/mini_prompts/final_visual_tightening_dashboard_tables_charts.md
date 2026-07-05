# Prompt: Final Visual Tightening for Dashboard, Charts, Tables, Filters, and Page Titles

Role: Bạn là Senior Frontend Engineer kiêm UI/UX Engineer chuyên React, TypeScript, Tailwind CSS, Recharts và dashboard SOC/SIEM dark theme. Hãy tiếp tục polish giao diện để hệ thống nhìn “đã mắt” hơn, có màu sắc nổi bật hơn một chút, nhưng vẫn giữ cảm giác enterprise SOC console.

Mục tiêu: làm UI đẹp hơn rõ rệt ở các điểm còn hơi nhạt:

- Dashboard phải vừa hơn trong một màn hình.
- Card/border có accent màu nổi bật hơn.
- Tooltip line chart không bị lặp dòng `Events`.
- Line chart ở Search page phải đẹp và đồng bộ với Dashboard.
- Investigation/Audit/Query Library table/card border và column header phải rõ hơn.
- Search/filter controls phải có border/focus/active state đẹp hơn.
- Page title/header phải nổi bật hơn, không chỉ là chữ trắng phẳng.

Không thay đổi backend, API contract, RBAC, audit logic, search logic, export CSV logic hoặc LLM pipeline.

---

## 0. Files cần đọc trước khi sửa

Đọc kỹ các file liên quan trước khi chỉnh:

- `frontend/src/components/soc/dashboard/soc-dashboard.tsx`
- `frontend/src/components/soc/dashboard/kpi-cards.tsx`
- `frontend/src/components/soc/dashboard/events-over-time.tsx`
- `frontend/src/components/soc/dashboard/severity-distribution.tsx`
- `frontend/src/components/soc/dashboard/top-source-ips.tsx`
- `frontend/src/components/soc/result-tabs.tsx`
- `frontend/src/components/soc/aggregation-chart.tsx` nếu chart search/aggregation nằm ở file này
- `frontend/src/components/soc/investigations/investigations-page.tsx`
- `frontend/src/components/soc/investigations/investigations-master-list.tsx`
- `frontend/src/components/soc/admin/audit-logs-page.tsx`
- `frontend/src/components/soc/query-library-page.tsx`
- `frontend/src/components/soc/soc-sidebar.tsx`
- `frontend/src/lib/chart-time-format.ts`
- test liên quan trong `frontend/src/components/soc/**/*.test.tsx`

---

## 1. Dashboard phải vừa hơn trong một màn hình

Hiện tại Dashboard gần vừa nhưng phần dưới của `Events Over Time` và `Top Source IPs` vẫn bị tràn xuống một chút.

Yêu cầu:

- Tối ưu chiều cao để Dashboard nhìn như một overview console hoàn chỉnh.
- Giữ layout hiện tại:

```text
Row 1:
  Left  : KPI cards 2x2
  Right : Severity Distribution

Row 2:
  Left  wide: Events Over Time
  Right     : Top Source IPs
```

- Giảm nhẹ nhưng có kiểm soát:
  - page padding;
  - gap giữa các row/card;
  - min-height chart nếu đang quá cao;
  - padding trong card;
  - chiều cao item trong Top Source IPs.
- Không làm dashboard quá chật.
- Ưu tiên vừa màn hình laptop phổ biến 1080p.
- Không phá responsive mobile/tablet.

Gợi ý:

- `gap-3` thay vì `gap-4` nếu cần.
- `py-3` thay vì `py-4` ở header/card nếu cần.
- `min-h-[220px]` hoặc `min-h-[210px]` cho chart nếu hiện tại quá cao.
- Top Source IPs dùng row compact nhưng vẫn dễ đọc.

---

## 1.1. Dashboard style target: SOC Neon Command Center

Dashboard cần tiến gần style “SOC command center / cyber monitoring console” như ảnh tham khảo người dùng gửi. Không cần giống 100% pixel-perfect, nhưng nên lấy cảm hứng rõ ràng từ các đặc điểm sau:

- Nền dashboard có chiều sâu:
  - radial cyan glow rất mờ;
  - grid/HUD pattern rất nhẹ;
  - circuit-line hoặc scan-line effect rất mờ nếu làm bằng CSS an toàn.
- Card KPI có cảm giác “neon glass panel”:
  - border cyan/rose/amber phát sáng hơn hiện tại;
  - shadow/glow theo loại card;
  - background có overlay grid mờ bên trong card;
  - icon nằm trong ô nhỏ có glow.
- Header `SOC Overview` hoặc `SOC Console` có glow cyan nhẹ:
  - title nổi bật hơn;
  - metadata `Auto refresh every 3 minutes`, `Last updated`, `Refresh` nằm gọn như status strip.
- `Severity Distribution` có cảm giác nổi bật hơn:
  - donut có màu rực hơn một chút;
  - center label lớn, rõ;
  - legend gọn, màu theo severity.
  - Nếu có thể tạo multi-ring bằng Recharts mà không phức tạp thì làm; nếu không, giữ donut hiện tại nhưng tăng visual polish.
- `Events Over Time`:
  - chart card có border cyan glow;
  - line cyan sáng hơn;
  - area fill rõ hơn nhưng không che grid;
  - grid line có màu cyan/blue rất mờ;
  - tooltip dạng HUD tối, không lặp `Events`.
- `Top Source IPs`:
  - ranking bar giống cyber monitor:
    - `#1`, `#2`, ...
    - IP monospace;
    - event count canh phải;
    - bar cyan/blue sáng hơn;
    - row top 1 nổi bật hơn.
- Sidebar active `Dashboard` có glow/gradient rõ hơn như ảnh, nhưng không phá các page khác.

Gợi ý CSS pattern cho dashboard/card:

```tsx
// dashboard page
bg-[radial-gradient(circle_at_80%_8%,rgba(34,211,238,0.16),transparent_30%),radial-gradient(circle_at_20%_90%,rgba(255,45,85,0.08),transparent_28%),#071018]

// subtle grid overlay, dùng pseudo element hoặc absolute child nếu tiện
bg-[linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.08)_1px,transparent_1px)]
bg-size-[24px_24px]
```

Gợi ý card neon:

```tsx
className="
  relative overflow-hidden rounded-2xl border border-cyan-400/35
  bg-[linear-gradient(180deg,rgba(34,211,238,0.10),rgba(8,10,15,0.86))]
  shadow-[0_0_28px_-14px_rgba(34,211,238,0.95),inset_0_1px_0_rgba(255,255,255,0.08)]
"
```

Yêu cầu quan trọng:

- Không cần giống ảnh 100%.
- Không dùng ảnh nền bitmap.
- Không thêm dependency mới.
- Không làm text/chart khó đọc.
- Không làm dashboard quá chói.
- Phải giữ responsive và không gây chart width/height warning.
- Nếu style neon chỉ áp dụng mạnh ở Dashboard thì được; các trang Investigation/Audit/Query Library vẫn giữ enterprise dark, chỉ polish nhẹ.

---

## 2. Card border/accent được phép màu mè hơn một chút

Hiện tại card đã ổn nhưng vẫn hơi nhạt. Có thể làm màu sắc nổi bật hơn một chút, miễn là không thành game UI quá mức.

Yêu cầu:

- Card dashboard nên có accent border/glow theo loại:
  - Events: cyan.
  - Critical / High Events: rose/red.
  - Top Source IP: cyan/blue.
  - Failed Logins: amber.
  - Severity Distribution: violet/cyan nhẹ.
  - Events Over Time: cyan border/glow nhẹ.
  - Top Source IPs: rose/cyan accent cho ranking.
- Có thể thêm:
  - top border gradient;
  - inner glow nhẹ;
  - hover glow rõ hơn;
  - background gradient mờ.
- Không dùng animation nặng.
- Không làm text khó đọc.

Ví dụ style chấp nhận được:

```tsx
className="
  rounded-2xl border border-cyan-500/25
  bg-[linear-gradient(180deg,rgba(34,211,238,0.08),rgba(17,19,24,0.92))]
  shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_30px_-22px_rgba(34,211,238,0.9)]
"
```

Với rose/amber/violet, dùng opacity thấp tương tự.

---

## 3. Fix tooltip line chart bị lặp `Events`

Hiện tại khi hover/mount vào điểm trên `Events Over Time`, tooltip hiện hai dòng giống nhau:

```text
Events: 70
Events: 70
```

Nguyên nhân có thể do chart có cả `Area dataKey="events"` và `Line dataKey="events"`, Recharts tooltip nhận cả hai series.

Yêu cầu:

- Tooltip chỉ được hiển thị một dòng event count.
- Tooltip format đẹp:

```text
05/07/2026, 06:00 AM
Events: 70
```

- Không làm mất area fill.
- Không làm mất line chart.
- Không phá local time formatting.

Hướng xử lý gợi ý:

- Tạo custom tooltip component dùng chung cho line chart.
- Trong custom tooltip, lấy duy nhất value đầu tiên hoặc lọc duplicate theo `dataKey`.
- Không phụ thuộc vào việc `Area` có `tooltipType="none"` hay không, vì support có thể khác theo version Recharts.

Ví dụ logic:

```tsx
const eventValue = payload?.find(item => item.dataKey === "events")?.value
```

Nếu có nhiều payload cùng `dataKey="events"`, chỉ render một dòng.

---

## 4. Đồng bộ line chart ở Search page với Dashboard

Hiện tại line chart trong Search page chưa đổ bóng/area fill đẹp như Dashboard.

Yêu cầu:

- Line chart ở Search result aggregation `date_histogram` phải có style tương tự Dashboard:
  - cyan line;
  - cyan gradient area fill nhẹ bên dưới;
  - tooltip format local time;
  - tooltip không lặp dòng;
  - grid/border/card style đồng bộ.
- Nếu có chart component chung thì reuse.
- Nếu chưa tiện refactor component chung, ít nhất copy cùng style một cách an toàn.
- Không phá bar chart, count result, summary table hoặc raw events table.

Cần kiểm tra các file có thể liên quan:

- `frontend/src/components/soc/result-tabs.tsx`
- `frontend/src/components/soc/aggregation-chart.tsx`
- `frontend/src/lib/chart-time-format.ts`

Yêu cầu đặc biệt:

- Nếu trục X trên line chart có range trên 2 ngày, vẫn giữ format có ngày như logic hiện tại.
- Nếu range trong ngày, trục X chỉ cần giờ như `9 AM`, `8 PM`.
- Tooltip phải hiện đủ ngày + giờ.

---

## 5. Polish Investigation / Audit / Query Library table and card borders

Hiện tại các bảng/list ở Investigations, System Audit Logs và Query Library vẫn hơi giống database table thô.

Yêu cầu:

### Table/list wrapper

- Thêm border rõ hơn quanh vùng table/list.
- Dùng border gần `#252A33`, nhưng có thể thêm cyan glow nhẹ ở selected/active.
- Surface nên gần `#111318`.
- Có thể dùng rounded card wrapper nếu layout cho phép.

### Column header

Các title field trong bảng như:

- Timestamp
- Question
- Results
- Mode
- Status
- User

nên nổi bật hơn:

- uppercase;
- tracking-wide;
- màu text có thể là `text-slate-400` hoặc cyan muted;
- border-bottom rõ hơn;
- background header nhẹ.

Gợi ý:

```tsx
className="bg-[#111318]/95 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400"
```

Hoặc dùng cyan-muted cho header quan trọng:

```tsx
text-cyan-200/70
```

### Row states

- Hover rõ hơn:

```css
background: rgba(34, 211, 238, 0.055);
```

- Selected rõ hơn:

```css
background: rgba(34, 211, 238, 0.095);
border-left: 3px solid #22D3EE;
```

- Không làm layout bị giật khi selected.

### Query Library cards

- Query card border nên đẹp hơn:
  - default border `#252A33`;
  - hover border cyan;
  - subtle glow hover.
- Badge trên card có thể màu nổi bật hơn một chút.
- Không làm card quá cao.

---

## 5.2. Query Library style target: Neon Glass Query Cards

Trang `Query Library` nên tiến gần style “neon glass query library” như ảnh tham khảo người dùng gửi. Không cần giống 100%, nhưng cần tạo cảm giác một thư viện truy vấn SOC hiện đại, gọn, sáng và dễ chọn hơn.

Đặc điểm mong muốn:

- Background xanh đen có cyan glow nhẹ, đồng bộ với Dashboard/Investigation.
- Search bar ở đầu trang nổi bật:
  - border cyan glow;
  - icon search màu cyan;
  - background glass/dark;
  - focus state sáng hơn.
- Category chips:
  - active `All` hoặc category đang chọn có cyan fill/glow rõ;
  - inactive chip vẫn có border và hover nhẹ;
  - spacing gọn, không chiếm quá nhiều chiều cao.
- Query cards dạng glass panel:
  - nền xanh đen;
  - border cyan mờ;
  - hover border cyan sáng hơn;
  - subtle glow;
  - card đầu/hover có thể nổi bật hơn nhẹ.
- Question là nội dung chính:
  - font-semibold;
  - text sáng;
  - không quá nhỏ.
- Badge trong card:
  - `SEARCH`: cyan;
  - `AGGREGATION`: purple;
  - `MULTI-FILTER`: violet/slate;
  - `COUNT`: emerald/amber;
  - `TOP N`: amber/violet;
  - `LINE/TIME SERIES`: sky/cyan;
  - `BAR`: fuchsia/purple;
  - `PLAYBOOK`: rose/indigo.
- `Expected: ...` nhỏ, muted, nằm dưới badge.
- Action buttons bên phải:
  - Copy icon button;
  - Use/Fill query icon button.
  - Có thể đặt label nhỏ dưới icon như ảnh nếu đẹp và không làm card quá cao.

Quan trọng về hành vi:

- Nếu logic hiện tại của Query Library chỉ điền câu hỏi vào ô search và focus input, **không dùng chữ `Execute`** vì dễ gây hiểu nhầm là chạy query ngay.
- Nên dùng label:
  - `Use`
  - hoặc `Fill`
  - hoặc chỉ icon + tooltip/aria-label `Use this query`.
- Không tự đổi hành vi thành execute trực tiếp nếu trước đó đã thống nhất là chỉ fill query.

Gợi ý query card:

```tsx
className="
  group rounded-2xl border border-cyan-400/22
  bg-[linear-gradient(180deg,rgba(34,211,238,0.08),rgba(8,20,30,0.72))]
  shadow-[0_0_24px_-18px_rgba(34,211,238,0.9),inset_0_1px_0_rgba(255,255,255,0.05)]
  hover:border-cyan-300/55 hover:bg-cyan-400/[0.08]
"
```

Gợi ý action button:

```tsx
className="
  inline-flex size-9 items-center justify-center rounded-xl
  border border-cyan-400/25 bg-cyan-400/10 text-cyan-200
  hover:border-cyan-300/60 hover:bg-cyan-400/18
  hover:shadow-[0_0_18px_-8px_rgba(34,211,238,0.9)]
"
```

Yêu cầu:

- Giữ pagination 10 items/page.
- Giữ search/filter logic.
- Giữ copy behavior.
- Giữ use/fill behavior hiện tại.
- Không gọi LLM ở Query Library.
- Không thêm dependency.
- Không làm card quá cao hoặc quá rối.

---

## 5.1. Investigation / Audit style target: SOC Glass Table

Trang `Investigations` và `System Audit Logs` nên tiến gần style “SOC glass table / neon terminal” như ảnh tham khảo người dùng gửi. Không cần giống 100%, nhưng cần lấy cảm hứng rõ ràng từ các đặc điểm:

- Background xanh đen có radial cyan glow nhẹ.
- Header page gọn, có icon trong rounded square cyan glow.
- Toolbar nằm trong vùng glass/strip rõ hơn:
  - search input có border cyan glow;
  - mode/status dropdown có glass background;
  - pinned button có amber/cyan active state;
  - spacing gọn, canh hàng đẹp.
- Table wrapper có border cyan rất mờ và glow nhẹ.
- Table header có nền xanh đậm/cyan mờ:
  - column label uppercase;
  - màu header rõ hơn hiện tại;
  - border-bottom sáng hơn.
- Row default không quá phẳng:
  - border-bottom xanh/cyan mờ;
  - text chính rõ;
  - timestamp font-mono dịu hơn.
- Row hover sáng hơn:

```css
background: rgba(34, 211, 238, 0.055);
```

- Selected row nổi bật giống ảnh:

```css
background: rgba(34, 211, 238, 0.10);
border: 1px solid rgba(34, 211, 238, 0.38);
box-shadow: 0 0 24px -14px rgba(34, 211, 238, 0.9);
```

- Nếu dùng `border-left`, phải tránh layout bị giật.
- Star pinned icon:
  - default mờ;
  - pinned/selected sáng cyan hoặc amber tùy ngữ cảnh.
- Prefix badges trong question:
  - `EDITED SEARCHPLAN`: amber/yellow glow;
  - `FILTERED RESULT`: cyan glow;
  - `AI CORRECTED`: purple glow.
- Mode/status badges:
  - `SEARCH`: cyan glow.
  - `AGGREGATION`: purple glow.
  - `SUCCESS`: emerald glow.
  - `FAILED`: rose glow.
- Pagination footer:
  - gọn ở cuối;
  - có border-top cyan mờ;
  - nút next/prev có cyan hover/glow.

Gợi ý toolbar/search input:

```tsx
className="
  h-10 rounded-xl border border-cyan-400/25
  bg-cyan-950/10
  shadow-[0_0_24px_-18px_rgba(34,211,238,0.9)]
  hover:border-cyan-400/45
  focus:border-cyan-300/70
  focus:ring-2 focus:ring-cyan-400/20
"
```

Gợi ý table header:

```tsx
className="
  bg-[linear-gradient(90deg,rgba(34,211,238,0.08),rgba(168,85,247,0.04))]
  text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-100/65
"
```

Gợi ý selected row:

```tsx
className="
  border border-cyan-400/35
  bg-cyan-400/[0.09]
  shadow-[0_0_24px_-14px_rgba(34,211,238,0.9)]
"
```

Yêu cầu:

- Áp dụng style này cho `Investigations`.
- Áp dụng style tương tự cho `System Audit Logs` để hai trang đồng bộ.
- Không làm chữ quá mờ như ảnh tham khảo; ưu tiên readability.
- Không đổi filter logic, pagination API, detail panel logic, pin logic, export logic.
- Không cần thêm animation nặng.

---

## 6. Search/filter controls phải có border/focus/active state đẹp hơn

Hiện tại các ô:

- Search input;
- Mode dropdown;
- Status dropdown;
- User search;
- Category filters;
- Pinned only;

đang hơi nhạt.

Yêu cầu:

- Input/select có border mặc định rõ hơn.
- Focus state phải đẹp:

```tsx
focus:border-cyan-400/70
focus:ring-2
focus:ring-cyan-400/15
```

- Search icon có thể dùng cyan muted khi focus hoặc mặc định `text-cyan-300/60`.
- Dropdown nếu đang khác `all` thì có active border/background:
  - mode != all -> cyan/violet border;
  - status SUCCESS -> emerald;
  - status FAILED -> rose.
- Pinned only active -> amber border/background rõ hơn.
- Không phá keyboard accessibility.

Gợi ý:

```tsx
className="
  h-10 rounded-xl border border-[#2B3240]
  bg-[#111318]/90
  text-sm text-zinc-100
  placeholder:text-slate-500
  transition
  hover:border-cyan-400/35
  focus:border-cyan-400/70
  focus:ring-2 focus:ring-cyan-400/15
"
```

---

## 7. Page title/header nổi bật hơn

Hiện tại title các trang chủ yếu là chữ trắng:

- `SOC Overview`
- `Investigations`
- `System Audit Logs`
- `Query Library`

Yêu cầu:

- Giữ text dễ đọc, không đổi toàn bộ title thành màu neon quá gắt.
- Có thể thêm:
  - gradient glow nhẹ sau icon;
  - text shadow cyan rất nhẹ;
  - icon container sáng hơn;
  - accent line nhỏ dưới title/header nếu đẹp.
- Title nên đồng bộ giữa các trang.

Gợi ý:

```tsx
<h1 className="
  text-xl font-semibold tracking-tight text-zinc-50
  drop-shadow-[0_0_14px_rgba(34,211,238,0.18)]
">
```

Icon wrapper:

```tsx
className="
  flex size-9 items-center justify-center rounded-xl
  border border-cyan-400/35 bg-cyan-400/12
  shadow-[0_0_24px_-12px_rgba(34,211,238,0.9)]
"
```

Không thêm subtitle nếu prompt trước đã yêu cầu bỏ subtitle.

---

## 8. Không được làm

- Không sửa backend.
- Không đổi API contract.
- Không đổi query/search/audit/export behavior.
- Không đổi RBAC.
- Không đổi seed data.
- Không thêm dependency UI mới nếu không cần.
- Không làm animation nặng.
- Không làm chart bị warning width/height <= 0.
- Không xóa test chỉ để pass.

---

## 9. Tests cần cập nhật

Cập nhật test nếu semantic thay đổi.

Tối thiểu kiểm tra:

- Dashboard vẫn render KPI, Severity Distribution, Events Over Time, Top Source IPs.
- Line chart tooltip không render duplicate `Events`.
- Query Library vẫn paginate đúng 10 item/trang.
- Investigations/Audit vẫn render search/filter/table/footer.
- Query Breakdown country behavior không bị ảnh hưởng.

Không cần test pixel-perfect.

---

## 10. Verification

Chạy trong frontend:

```bash
cd frontend
npm run lint
npm run test
npm run build
```

Nếu full test quá lâu, ít nhất chạy:

```bash
npm run lint
npm run test -- dashboard result-tabs query-library investigations audit query-breakdown
npm run build
```

---

## Kỳ vọng cuối cùng

Sau khi hoàn thành:

- Dashboard nằm gọn hơn trong một màn hình.
- Card nhìn nổi bật, có chiều sâu và màu sắc SOC hơn.
- Tooltip line chart không còn lặp `Events`.
- Line chart Search page đẹp như Dashboard.
- Investigation/Audit/Query Library bớt giống database table thô.
- Search/filter controls nhìn rõ và có focus/active state tốt.
- Page title/header nổi bật hơn nhưng vẫn giữ enterprise dark SOC theme.
