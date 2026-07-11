# Prompt: Enterprise UI Polish for Dashboard, Investigations, Audit Logs, and Query Library

Role: Bạn là Senior Frontend Engineer kiêm UI/UX Engineer chuyên React, TypeScript, Tailwind CSS, accessibility và dashboard SOC/SIEM dark theme. Hãy cải thiện giao diện các trang chính để hệ thống nhìn giống một enterprise SOC console hơn, không còn cảm giác đơn điệu hoặc giống bảng database thô.

Mục tiêu: polish UI cho 4 khu vực:

- Dashboard
- Investigations
- System Audit Logs
- Query Library

Các thay đổi phải tập trung vào giao diện, spacing, hierarchy, component reuse và visual consistency. Không thay đổi backend, API contract, RBAC, audit logic, search logic, export CSV logic hoặc LLM pipeline nếu không thật sự cần.

## Bối cảnh

Hiện tại các chức năng đã tạm ổn, nhưng UI còn một số vấn đề:

- Dashboard nhìn hơi phẳng, thiếu cảm giác SOC command center.
- Investigations và System Audit Logs đang giống bảng database đơn giản, chưa có hierarchy rõ giữa question, metadata, mode, status.
- Query Library đang giống danh sách câu hỏi dài, chưa giống thư viện truy vấn có tổ chức.
- Badge, card, table row, toolbar, pagination giữa các trang chưa hoàn toàn đồng nhất.
- Một số khoảng cách/padding còn lớn hoặc trống, làm UI kém chặt chẽ.

Mục tiêu không phải làm lại toàn bộ giao diện, mà là nâng cấp có kiểm soát để UI đẹp hơn, chuyên nghiệp hơn, thống nhất hơn và vẫn pass CI.

## Files cần đọc trước khi sửa

Đọc kỹ các file hiện có trước khi chỉnh:

- `frontend/src/App.tsx`
- `frontend/src/components/soc/dashboard/soc-dashboard.tsx`
- `frontend/src/components/soc/dashboard/kpi-cards.tsx`
- `frontend/src/components/soc/dashboard/events-over-time.tsx`
- `frontend/src/components/soc/dashboard/severity-distribution.tsx`
- `frontend/src/components/soc/dashboard/top-source-ips.tsx`
- `frontend/src/components/soc/investigations/investigations-page.tsx`
- `frontend/src/components/soc/investigations/investigations-master-list.tsx`
- `frontend/src/components/soc/investigations/investigation-detail-panel.tsx`
- `frontend/src/components/soc/audit` nếu có thư mục riêng cho audit
- `frontend/src/components/soc/query-library-page.tsx`
- `frontend/src/components/soc/soc-sidebar.tsx`
- `frontend/src/components/soc/query-breakdown.tsx`
- `frontend/src/components/soc/result-tabs.tsx`
- `frontend/src/components/ui/*` để tận dụng component có sẵn
- `frontend/src/auth/permissions.ts`
- `frontend/src/types/soc.ts`

Đọc test liên quan nếu có:

- `frontend/src/components/soc/dashboard/*.test.tsx`
- `frontend/src/components/soc/investigations/*.test.tsx`
- `frontend/src/components/soc/query-library-page.test.tsx`
- `frontend/src/components/soc/soc-sidebar.test.tsx`
- các test App/page nếu có

## Nguyên tắc thiết kế chung

### 1. Enterprise SOC/SIEM dark theme

Giữ phong cách dark theme hiện tại nhưng làm sắc nét hơn:

- Background tổng thể: gần `bg-zinc-950`.
- Card: `bg-zinc-900/70`, `bg-zinc-950/40`, hoặc gradient rất nhẹ.
- Border: `border-zinc-800`, active border cyan/violet/emerald tùy ngữ cảnh.
- Text chính: `text-zinc-100`.
- Text phụ: `text-zinc-400` hoặc `text-muted-foreground`.
- Accent chính: cyan.
- Aggregation: violet.
- Success: emerald.
- Failed/error: rose.
- Warning/attention: amber.

Không dùng màu quá rực hoặc nhiều màu không có ý nghĩa.

### 2. Typography và spacing

Chuẩn hóa typography:

- Page title: `text-xl` hoặc `text-2xl`, font-semibold, tracking-tight.
- Section/card title: `text-sm` hoặc `text-base`, font-semibold.
- Metadata: `text-xs`, muted.
- Badge: `text-[11px]`, uppercase khi cần.
- Table body: `text-sm`; timestamp/result number có thể dùng `font-mono`.

Spacing:

- Page padding desktop: khoảng `px-5/px-6`, `py-4/py-5`.
- Card padding: `p-4` hoặc `p-5`, không quá rộng.
- Toolbar gap: `gap-3`.
- Row height bảng vừa đủ, không quá cao.

### 2.1. Design tokens and visual states

Sử dụng bộ màu dưới đây như định hướng thị giác. Không bắt buộc hardcode mọi nơi nếu project đã có Tailwind token/class tương đương, nhưng kết quả UI nên gần với palette này:

- Main background: `#080A0F`
- Sidebar background: `#0B0E13`
- Card background: `#111318`
- Card hover background: `#161A22`
- Border: `#252A33`
- Text primary: `#F8FAFC`
- Text secondary: `#94A3B8`
- Cyan accent: `#22D3EE`
- Red accent: `#FF2D55`
- Green success: `#10B981`
- Purple aggregation: `#A855F7`

#### Global/page background

Với Dashboard, Investigations, System Audit Logs và Query Library, có thể dùng radial background rất nhẹ để nền không bị đen phẳng:

```css
background:
  radial-gradient(circle at 85% 5%, rgba(34, 211, 238, 0.08), transparent 28%),
  radial-gradient(circle at 20% 90%, rgba(255, 45, 85, 0.05), transparent 30%),
  #080A0F;
```

Yêu cầu:

- Opacity phải thấp.
- Không làm giảm độ đọc của text/chart/table.
- Không làm UI giống game; vẫn giữ cảm giác enterprise SOC/SIEM.

#### Card and table surfaces

- Card nên dùng surface tối nhất quán gần `#111318`.
- Card hover có thể gần `#161A22`.
- Border nên gần `#252A33`.
- Hạn chế dùng pure black cho toàn bộ surface vì làm UI bị phẳng.

#### Table/list row states

Các row trong Investigations, System Audit Logs và Query Library không nên quá phẳng.

Hover state gợi ý:

```css
background: rgba(34, 211, 238, 0.045);
```

Selected row state gợi ý:

```css
background: rgba(34, 211, 238, 0.08);
border-left: 3px solid #22D3EE;
```

Yêu cầu:

- Hover state phải tinh tế, không quá sáng.
- Selected row phải nhìn rõ nhưng không aggressive.
- Left border không được làm layout bị giật; dùng padding compensation hoặc pseudo-element nếu cần.

### 3. Component reuse

Nếu thấy lặp nhiều, có thể tạo component nhỏ trong cùng khu vực hoặc thư mục soc:

- `PageHeader`
- `FilterToolbar`
- `ModeBadge`
- `StatusBadge`
- `QueryTypeBadge`
- `EmptyState`
- `PaginationBar`
- `QueryListRow`

Chỉ tạo component nếu giúp code rõ hơn. Không refactor quá rộng.

### 4. Accessibility

Phải giữ hoặc bổ sung:

- `aria-label` cho icon button.
- `aria-current` cho nav item active.
- Focus ring rõ ràng.
- Không dùng màu làm tín hiệu duy nhất cho status.
- Button icon-only phải có tooltip hoặc aria-label.

## Yêu cầu chi tiết theo trang

## 1. Dashboard UI Polish

Mục tiêu: Dashboard nhìn như SOC command center, gọn, rõ hierarchy, không phẳng.

Giữ layout hiện tại:

```text
Row 1:
  Left  : KPI cards 2x2
  Right : Severity Distribution

Row 2:
  Left  wide: Events Over Time
  Right     : Top Source IPs
```

Yêu cầu:

- Header `SOC Overview` phải nổi bật hơn nhưng vẫn gọn.
- Giữ `Last 24h`, `Auto refresh every 3 minutes`, `Last updated`, `Refresh`.
- Có thể đưa metadata vào một status strip nhỏ bên phải header.
- KPI cards nên có chiều sâu hơn:
  - subtle gradient hoặc glow rất nhẹ theo loại KPI.
  - icon trong ô nhỏ bên phải.
  - số liệu nổi bật hơn.
  - label uppercase nhỏ.
- Severity Distribution:
  - giữ donut chart.
  - legend gọn, canh đều, dễ đọc.
  - total ở giữa rõ.
- Events Over Time:
  - giữ line chart rộng.
  - card header đẹp hơn.
  - không gây warning width/height <= 0.
- Top Source IPs:
  - hiển thị rank `#1`, `#2`, `#3` hoặc visual hierarchy nhẹ.
  - bar màu đẹp hơn, nhất quán.
  - IP dùng monospace.

Không thay đổi:

- dashboard query plans.
- auto refresh logic.
- audit false behavior.
- token/auth retry logic.

### Dashboard and sidebar premium polish

#### Sidebar premium polish

- Làm sidebar có cảm giác cao cấp và enterprise SOC hơn, nhưng không biến thành game UI.
- Active nav item nên dùng gradient cyan nhẹ thay vì nền xanh phẳng.
- Có thể thêm left accent border hoặc soft cyan glow rất nhẹ cho active item.
- Icon trong sidebar cần đồng nhất về size/stroke cảm giác thị giác.
- Logo block `SOC Console` có thể nổi bật hơn một chút, nhưng không làm sidebar cao hơn quá nhiều.
- User profile ở cuối sidebar nên nằm trong một compact card nhỏ với border/background nhẹ.
- Giữ sidebar gọn, nghiêm túc, dễ đọc.

Gợi ý active item style:

```css
background: linear-gradient(
  90deg,
  rgba(0, 224, 255, 0.16),
  rgba(255, 45, 85, 0.04)
);
border-left: 3px solid rgba(34, 211, 238, 0.9);
```

#### Dashboard visual depth

- Thêm chiều sâu thị giác rất nhẹ cho dashboard background.
- Có thể dùng radial gradient rất mờ:
  - cyan glow ở góc trên phải.
  - rose/red glow ở góc dưới trái.
  - opacity thấp để UI vẫn nghiêm túc.
- Không áp dụng gradient quá mạnh hoặc làm giảm độ đọc của chart/card.

Gợi ý background:

```css
background:
  radial-gradient(circle at 80% 10%, rgba(0, 229, 255, 0.08), transparent 30%),
  radial-gradient(circle at 20% 90%, rgba(255, 45, 85, 0.06), transparent 30%),
  #080A0F;
```

#### Events Over Time chart polish

- Cải thiện chart `Events Over Time` để nhìn cao cấp hơn.
- Thêm area/gradient fill cyan rất nhẹ bên dưới line nếu làm an toàn với Recharts.
- Giữ line màu cyan.
- Giữ local time axis formatting và tooltip behavior hiện tại.
- Không được gây warning width/height <= 0.

#### Severity Distribution polish

- Sắp xếp severity theo đúng ưu tiên SOC:
  1. Critical
  2. High
  3. Medium
  4. Low
- Donut center label cần rõ hơn, ví dụ:
  - số tổng lớn.
  - label `Events` hoặc `Total Events` nhỏ bên dưới.
- Legend nên chuyển thành chip/capsule compact, không rời rạc.
- Màu severity giữ nhất quán:
  - Critical: rose.
  - High: amber.
  - Medium: cyan.
  - Low: zinc/gray.

#### Source IP ranking polish

- Cải thiện card `Top Source IPs` thành ranking view gọn và đẹp hơn.
- Có thể giữ title `Top Source IPs` hoặc đổi thành `Source IP Ranking`.
- Thêm rank label cho từng dòng: `#1`, `#2`, `#3`, ...
- Dòng đầu có thể nổi bật hơn bằng border/background rose rất mờ.
- Bar nên có background mờ và màu theo rank.
- IP dùng monospace, event count canh phải.
- Ranking dựa trên số lượng event, không phải risk score thật.
- Không hiển thị fake severity/risk badge như `CRITICAL`, `HIGH`, `MEDIUM` nếu backend không trả risk/severity theo từng IP.
- Nếu dùng từ `Threat`, phải ghi rõ đây là ranking theo event volume, không phải risk classification.

## 2. Investigations UI Polish

Mục tiêu: Investigations phải nhìn giống workspace điều tra, không giống bảng database thô.

Hiện tại có:

- Search question.
- Mode dropdown.
- Status dropdown.
- Pinned only.
- Table/list: timestamp, question, results, mode, status.
- Pagination.
- Detail panel khi click row.

Yêu cầu:

### Header

- Làm `Investigations` title rõ hơn bằng visual hierarchy, không cần thêm subtitle.
- Giữ header gọn: icon trong ô rounded/cyan nhẹ + title `Investigations`.
- Title nên dùng cùng cỡ/font với các page header khác, ví dụ `text-xl` hoặc `text-2xl`, `font-semibold`, `tracking-tight`.
- Căn spacing giữa header, toolbar và content đều hơn.
- Không thêm dòng mô tả/subtitle dưới title để tránh UI rối.

### Filter toolbar

- Toolbar nên nằm trong một card hoặc strip riêng.
- Search input chiếm phần lớn width.
- Mode/status dropdown và Pinned button canh hàng gọn.
- Button `Pinned only` active state phải rõ.
- Không để toolbar quá cao.

### Pagination behavior

- Pagination của Investigations tăng lên 10 query mỗi trang.
- Pagination footer phải cố định ở cuối vùng màn hình/trang nội dung; không bắt người dùng kéo xuống cuối list mới thấy phân trang.
- Nếu danh sách dài, chỉ vùng table/list nên scroll; pagination vẫn nhìn thấy ở cuối màn hình.
- Pagination behavior theo số lượng dữ liệu:
  - Nếu `total === 0`: ẩn pagination footer, ưu tiên empty state ở giữa.
  - Nếu `total > 0` và `totalPages === 1`: giữ footer gọn ở cuối, chỉ hiển thị text nhẹ như `Page 1 of 1 · X total` hoặc `Showing 1 - X of X`, không hiển thị nút prev/next.
  - Nếu `totalPages > 1`: hiển thị đầy đủ pagination controls.

### Table/list

Row nên có hierarchy:

- Timestamp nhỏ, monospace.
- Question là text chính, font-semibold.
- Nếu question có prefix:
  - `[Edited SearchPlan]`
  - `[Filtered Result]`
  - `[AI Corrected]`
  thì có thể render prefix thành badge nhỏ, còn phần original question là text chính.
- Mode/status badge thống nhất:
  - SEARCH: cyan
  - AGGREGATION: violet
  - SUCCESS: emerald
  - FAILED: rose
- Pinned icon không làm row rối.
- Hover state nhẹ.
- Selected row state rõ nếu detail panel đang mở.

### Empty state

Nếu không có result:

- Hiển thị empty state đẹp:
  - icon
  - title: `No investigations found`
  - description: `Try clearing filters or changing the search text.`

### Detail panel

Nếu có detail panel:

- Header detail nên có title, mode/status/result count rõ.
- Detail panel hiện tại đã lược bỏ `query_id`; không cần thêm lại và không cần xử lý `query_id`.
- Giữ Query Breakdown / Validated SearchPlan / Compiled DSL tabs.
- Nếu không có AI summary thì ẩn summary block như logic hiện tại.

Không thay đổi:

- server-side filter/pagination.
- pin/unpin logic.
- current user scope.
- export CSV behavior.

## 3. System Audit Logs UI Polish

Mục tiêu: Audit Logs phải giống admin/security audit console, cùng style với Investigations nhưng phân biệt đây là trang Admin.

Hiện tại có:

- Question search.
- User search.
- Mode dropdown.
- Status dropdown.
- Export Audit CSV.
- Table.
- Detail panel.

Yêu cầu:

### Header

- Title `System Audit Logs`.
- Icon admin/security phù hợp.
- Export Audit CSV button ở góc phải, nổi bật vừa đủ.
- Có thể thêm metadata nhỏ: `Admin-only audit trail` nếu đẹp.

### Toolbar

- Question search và User search nằm cùng hàng trên desktop.
- Mode/status dropdown nằm cùng hàng.
- Trên màn nhỏ thì stack hợp lý.
- Toolbar card/strip thống nhất với Investigations.

### Pagination behavior

- Pagination của System Audit Logs tăng lên 10 query mỗi trang.
- Pagination footer phải cố định ở cuối vùng màn hình/trang nội dung; không bắt người dùng kéo xuống cuối list mới thấy phân trang.
- Nếu danh sách dài, chỉ vùng table/list nên scroll; pagination vẫn nhìn thấy ở cuối màn hình.
- Pagination behavior theo số lượng dữ liệu:
  - Nếu `total === 0`: ẩn pagination footer, ưu tiên empty state ở giữa.
  - Nếu `total > 0` và `totalPages === 1`: giữ footer gọn ở cuối, chỉ hiển thị text nhẹ như `Page 1 of 1 · X total` hoặc `Showing 1 - X of X`, không hiển thị nút prev/next.
  - Nếu `totalPages > 1`: hiển thị đầy đủ pagination controls.

### Table/list

- User column rõ nhưng không quá chiếm chỗ.
- Question column vẫn là trọng tâm.
- Prefix `[AI Corrected]`, `[Filtered Result]`, `[Edited SearchPlan]` nên được render thành badge nếu có.
- Mode/status badge giống Investigations.
- Result count canh phải, monospace.
- Row hover/selected state đồng nhất.

### Empty state

Nếu filter không có kết quả:

- `No audit logs found`
- `Try clearing filters or searching a different user/question.`

### Detail panel

- Header detail gọn.
- Không hiển thị pin icon trong audit detail nếu audit không hỗ trợ pin.
- Nếu query không có AI summary thì ẩn summary block.
- Giữ tabs Query Breakdown / SearchPlan / DSL.

Không thay đổi:

- admin-only permission.
- audit CSV export logic.
- server-side filter/pagination.

## 4. Query Library UI Polish

Mục tiêu: Query Library phải giống thư viện truy vấn điều tra có tổ chức, không chỉ là list câu hỏi.

Hiện tại có:

- Search input.
- Category filters: All, Search, Aggregation, Top N, Count, Time Series, Line Chart, Bar Chart, Multi-filter, Playbook.
- List query cards.
- Copy / fill/run icon.
- Pagination 10 items mỗi trang.

Yêu cầu:

### Header

- Title `Query Library` cùng cỡ với các page header khác.
- Không hiện text dài dư thừa.
- Không thêm subtitle dưới title. Header chỉ cần icon + title `Query Library` giống các page khác.

### Search/filter area

- Search input trong card/strip đẹp.
- Category filters dạng pill đẹp như status badge.
- Active category rõ.
- Các filter badge không được quá "thô"; dùng border/accent nhẹ.

### Query cards

Mỗi query card nên có:

- Question chính nổi bật.
- Tags/category badges nhỏ:
  - SEARCH
  - AGGREGATION
  - TOP N
  - COUNT
  - TIME SERIES
  - MULTI-FILTER
  - PLAYBOOK
- Expected output nhỏ:
  - `Expected: Event logs table`
  - `Expected: Bar chart`
  - `Expected: Line chart`
  - `Expected: Number`
- Icon theo loại query nếu hợp lý.
- Copy button icon-only có aria-label.
- Fill/Search button icon-only có aria-label, tooltip nếu có sẵn.
- Hover state: border cyan nhẹ, background sáng nhẹ.
- Không để card quá cao.

### Pagination

- 10 items mỗi trang.
- Pagination style đồng nhất với Investigations/Audit/Raw Events.
- Hiển thị `Page x of y` và tổng số kết quả nếu đang filter.
- Pagination footer phải cố định ở cuối vùng màn hình/trang nội dung; không bắt người dùng kéo xuống cuối list mới thấy phân trang.
- Nếu danh sách dài, chỉ vùng list/content nên scroll; pagination vẫn nhìn thấy ở cuối màn hình.
- Pagination behavior theo số lượng dữ liệu:
  - Nếu `total === 0`: ẩn pagination footer, ưu tiên empty state ở giữa.
  - Nếu `total > 0` và `totalPages === 1`: giữ footer gọn ở cuối, chỉ hiển thị text nhẹ như `Page 1 of 1 · X total` hoặc `Showing 1 - X of X`, không hiển thị nút prev/next.
  - Nếu `totalPages > 1`: hiển thị đầy đủ pagination controls.

### Data correctness

- Không tự ý sửa nội dung câu hỏi nếu không cần.
- Đảm bảo các câu hỏi từ `docs/plan/mini_prompts/query_library_questions.md` đã được đưa vào đúng nhóm/tag.
- Nếu phát hiện câu hỏi bị gắn sai tag, sửa tag cho đúng:
  - Search/event logs table -> `Search`
  - Count/number -> `Count`
  - Top N/bar chart -> `Top N`, `Bar Chart`, `Aggregation`
  - Date histogram/line chart -> `Time Series`, `Line Chart`, `Aggregation`
  - Nhiều filter -> `Multi-filter`
  - Kịch bản điều tra nhiều bước -> `Playbook`

Không thay đổi:

- click behavior đã thống nhất: nếu hiện tại query card chỉ fill vào search box thì giữ như vậy; nếu code hiện tại có route/focus logic thì không phá.
- không gọi LLM ở Query Library.

## 5. Shared Badge System

Nếu code đang có nhiều badge style rời rạc, hãy chuẩn hóa bằng helper/component.

Gợi ý style:

```ts
SEARCH      -> cyan
AGGREGATION -> violet
SUCCESS     -> emerald
FAILED      -> rose
PINNED      -> amber
COUNT       -> amber
TIME SERIES -> cyan
TOP N       -> fuchsia/violet
PLAYBOOK    -> indigo
```

Badge nên:

- text nhỏ.
- border nhẹ.
- background alpha thấp.
- uppercase nếu là loại/status.
- không dùng màu quá chói.

## 6. Query Breakdown country display note

Hiện tại Query Breakdown đã có country display bằng component cờ + mã quốc gia, vì vậy không thêm tên quốc gia kế bên nữa.

Yêu cầu:

- Country trong Query Breakdown chỉ hiển thị dạng flag icon + code, ví dụ `CN`, `VN`, `US`.
- Không hiển thị thêm tên nước như `China`, `Vietnam`, `United States`, ...
- Nếu `country_code` là array, render từng country thành pill/chip nhỏ.
- Nếu unknown code, vẫn hiển thị code bình thường, không crash.
- Giữ đồng nhất ở Search page, Investigation detail và System Audit Logs detail.

## 7. Shared Page Structure

Nếu hợp lý, tạo hoặc tái sử dụng pattern:

```tsx
<PageHeader />
<FilterToolbar />
<ContentCard />
<PaginationBar />
```

Không bắt buộc tạo component mới nếu làm vậy khiến diff quá lớn. Ưu tiên ít rủi ro.

## 8. Không được làm

- Không sửa backend.
- Không đổi API contract.
- Không đổi RBAC rules.
- Không đổi query/search/audit/export behavior.
- Không đổi seed data.
- Không thêm dependency UI mới nếu không cần.
- Không dùng animation nặng.
- Không tạo UI quá màu mè làm mất chất SOC/SIEM.
- Không xóa test hiện có chỉ để pass.

## 9. Tests cần cập nhật

Cập nhật hoặc thêm tests nếu UI đổi semantic:

- Dashboard render đủ KPI, Severity Distribution, Events Over Time, Top Source IPs.
- Investigations render toolbar, filters, rows, mode/status badges, empty state nếu có.
- Audit Logs render user/question search, mode/status filters, export button, rows.
- Query Library render search input, category filters, query cards, pagination 10 items/page.
- Investigations, Audit Logs và Query Library đều dùng pagination 10 items/page.
- Pagination footer của Investigations, Audit Logs và Query Library không bị đẩy xuống cuối content dài; người dùng không cần kéo xuống mới thấy phân trang.
- Query Breakdown country chỉ hiển thị flag + code, không hiển thị tên nước.
- Sidebar vẫn active đúng page nếu có liên quan.

Không cần test pixel-perfect. Test hành vi và nội dung quan trọng.

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
npm run test -- dashboard investigations audit query-library soc-sidebar
npm run build
```

## Kỳ vọng cuối cùng

Sau khi hoàn thành:

- Dashboard nhìn giống SOC command center hơn, có chiều sâu và visual hierarchy.
- Investigations nhìn giống workspace điều tra, row dễ đọc hơn, filter gọn hơn.
- System Audit Logs nhìn giống admin audit console, rõ user/question/mode/status.
- Query Library nhìn như thư viện truy vấn có tổ chức, query cards đẹp và dễ chọn.
- Badge, button, table row, pagination giữa các trang thống nhất hơn.
- UI vẫn giữ dark SOC theme hiện tại, không phá logic, không phá RBAC, không phá CI.
