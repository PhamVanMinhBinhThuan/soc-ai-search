# Prompt: Final UI Polish, Viewer Permissions, Country Flags, Time Formatting, Dashboard Layout, Sidebar Cleanup

Role: Bạn là Senior Frontend Engineer chuyên React, TypeScript, Tailwind CSS, UI/UX cho SOC/SIEM dark theme. Hãy review kỹ code hiện tại trước khi sửa, không đoán tên file.

Mục tiêu: Hoàn thiện một số lỗi/polish UI cuối cho hệ thống SOC AI Search. Các thay đổi phải nhỏ gọn, đúng luồng hiện tại, không làm hỏng CI/CD, RBAC, search, audit/history, export CSV.

## Bối cảnh code hiện tại cần đọc trước

Đọc các file liên quan trước khi sửa:

- `frontend/src/components/soc/event-detail-drawer.tsx`
- `frontend/src/components/soc/search-section.tsx`
- `frontend/src/components/soc/query-breakdown.tsx`
- `frontend/src/components/soc/query-transparency.tsx`
- `frontend/src/components/soc/result-tabs.tsx`
- `frontend/src/components/soc/country-code.tsx`
- `frontend/src/lib/chart-time-format.ts`
- `frontend/src/components/soc/dashboard/soc-dashboard.tsx`
- `frontend/src/components/soc/dashboard/kpi-cards.tsx`
- `frontend/src/components/soc/dashboard/events-over-time.tsx`
- `frontend/src/components/soc/dashboard/severity-distribution.tsx`
- `frontend/src/components/soc/dashboard/top-source-ips.tsx`
- `frontend/src/components/soc/soc-sidebar.tsx`
- `frontend/src/auth/permissions.ts`
- Các test tương ứng nếu có:
  - `frontend/src/components/soc/event-detail-drawer.test.tsx`
  - `frontend/src/components/soc/search-section.test.tsx`
  - `frontend/src/components/soc/query-breakdown.test.tsx`
  - `frontend/src/components/soc/result-tabs.test.tsx`
  - `frontend/src/components/soc/dashboard/soc-dashboard.test.tsx`
  - `frontend/src/components/soc/soc-sidebar.test.tsx`

## 1. Xóa subtitle raw log access của Viewer trong Event Details

Hiện tại khi Viewer mở chi tiết event sau khi search, tab raw log có dòng:

```text
This account can view event metadata, but raw log access requires SOC_ANALYST or SOC_ADMIN. The dashboard does not render placeholder raw data.
```

Yêu cầu:

- Chỉ xóa dòng subtitle/text dài này khỏi UI.
- Vẫn giữ title/trạng thái chính của raw log bị khóa, ví dụ `Raw log locked` hoặc title hiện tại tương đương.
- Viewer vẫn không được xem raw log.
- Không render placeholder raw data.
- Không xóa toàn bộ empty/locked state của tab raw log; chỉ làm nó gọn hơn bằng cách bỏ subtitle dài.
- Không thay đổi quyền RBAC backend/frontend.

Kỳ vọng:

- Viewer xem formatted fields bình thường.
- Raw log không hiển thị dữ liệu thật cho Viewer.
- Tab raw log vẫn có title locked rõ ràng nhưng không còn đoạn mô tả dài gây rối UI.

## 2. Ẩn nút Recent Queries với Viewer

Hiện tại Viewer không có chức năng Investigations/History nhưng vẫn thấy nút `Recent Queries` cạnh `View queries` ở search page.

Yêu cầu:

- Ẩn hoàn toàn nút `Recent Queries` với Viewer.
- Không chỉ disable, phải không render.
- Analyst/Admin vẫn thấy `Recent Queries`.
- Dùng permission helper hiện có, ưu tiên `canViewHistory(...)` trong `frontend/src/auth/permissions.ts`.
- Không phá `View queries`.

Gợi ý file:

- `frontend/src/components/soc/search-section.tsx`
- Nơi truyền props từ `App.tsx` nếu cần.

Test:

- Viewer không thấy nút `Recent Queries`.
- Analyst/Admin vẫn thấy nút này khi handler được truyền.

## 3. Sửa country display trong Query Breakdown, Investigation Detail, Audit Detail

Hiện tại ở tab `Query Breakdown`, country đang hiện chưa đẹp hoặc bị lỗi, ví dụ chỉ thấy mã `CN` hoặc text/cờ không đúng. Trong Event Logs table đã có cách hiển thị country tốt hơn.

Yêu cầu:

- Tái sử dụng component hiện có:

```text
frontend/src/components/soc/country-code.tsx
```

- Component này đã import cờ từ `flag-icons` cho các nước mock:
  - `VN`
  - `CN`
  - `US`
  - `RU`
  - `SG`
  - `DE`
- Cần hiển thị country trong Query Breakdown dưới dạng đẹp và nhất quán, ví dụ:
  - flag icon + `CN`
  - nếu có thể thêm tên nước: `China`
- Không dùng emoji flag hardcode vì hiện tại đã từng bị lỗi encoding.
- Nếu cần tên nước, bổ sung mapping ASCII/UTF-8 an toàn:

```ts
CN -> China
VN -> Vietnam
US -> United States
RU -> Russia
SG -> Singapore
DE -> Germany
```

- Nếu `country_code` là array, render từng country bằng pill/chip nhỏ.
- Nếu unknown code, hiển thị code bình thường, không crash.

Các nơi phải đồng nhất:

- Query Breakdown ở Search page.
- Query Breakdown trong All Investigations detail.
- Query Breakdown trong System Audit Logs detail.

Gợi ý:

- Có thể đổi `BreakdownRow.value` từ `string` sang `ReactNode` nếu cần.
- Hoặc tạo helper render riêng cho country rows.
- Không render `null`, `{}`, hoặc bảng rỗng như dữ liệu thật.

Test:

- Query Breakdown render `CN` với flag/name đúng.
- Multi-country array như `["VN", "CN"]` render nhiều pill.
- Unknown code không crash.

## 4. Format thời gian UTC trong Summary Table của aggregation line chart

Hiện tại khi aggregation `date_histogram` tạo line chart, phần `Summary Table` vẫn hiển thị time dạng UTC raw:

```text
2026-07-04T11:00:00.000Z
```

Yêu cầu:

- Format cột time trong Summary Table giống cách hiển thị khi hover/mount vào điểm trên line chart ở Search page và Dashboard.
- Tái sử dụng helper hiện có:

```text
frontend/src/lib/chart-time-format.ts
```

Trong file này có các helper:

- `createLocalChartTickFormatter(...)`
- `formatLocalChartTooltipLabel(...)`

Yêu cầu hiển thị:

- Không hiện raw ISO UTC trên table.
- Với range <= 2 ngày: format kiểu giờ local, ví dụ `9 AM`, `8 PM` hoặc format có phút nếu helper hiện có dùng.
- Với range > 2 ngày: có thêm ngày/tháng để tránh mơ hồ.
- Tooltip/line chart và Summary Table phải thống nhất.
- Không phá sorting/pagination của summary table.

File chính:

- `frontend/src/components/soc/result-tabs.tsx`

Test:

- Aggregation date_histogram Summary Table không còn raw ISO string.
- Format dùng local formatter.

## 5. Điều chỉnh Dashboard layout để tất cả nằm trong một màn hình hơn

Hiện tại Dashboard đã có auto-refresh và các chart/card, nhưng layout vẫn chiếm nhiều chiều cao. Mong muốn mới:

- Dashboard nhìn gọn hơn, dễ theo dõi trong một màn hình.
- Giữ layout row 1 gần với hiện tại: KPI cards dạng `2x2` ở bên trái và `Severity Distribution` ở bên phải.
- Row 2 hiển thị `Events Over Time` bên trái và `Top Source IPs` bên phải.
- Mục tiêu là toàn bộ phần dashboard chính nằm gọn trong một màn hình hơn để tiện theo dõi khi demo.
- Tức layout desktop đề xuất:

```text
Row 1:
  Left  : KPI cards 2x2
  Right : Severity Distribution
Row 2:
  Left  wide: Events Over Time
  Right     : Top Source IPs
```

Yêu cầu UI:

- Giữ dark SOC theme hiện tại.
- Thu nhỏ padding/height nếu đang quá lớn.
- Không làm chart bị lỗi width/height âm.
- Không phá ResponsiveContainer/Recharts.
- Trên màn hình nhỏ vẫn stack dọc hợp lý.
- Top Source IPs không chiếm full width nữa trong dashboard.
- Events Over Time vẫn là chart rộng chính.
- Severity Distribution giữ vị trí ở hàng đầu như hiện tại, không chuyển xuống cùng cột với Top Source IPs.
- Cân đối chiều cao giữa Row 1 và Row 2 để hạn chế scroll dọc.

Gợi ý file:

- `frontend/src/components/soc/dashboard/soc-dashboard.tsx`
- `frontend/src/components/soc/dashboard/events-over-time.tsx`
- `frontend/src/components/soc/dashboard/severity-distribution.tsx`
- `frontend/src/components/soc/dashboard/top-source-ips.tsx`

Test:

- Dashboard render đủ Events Over Time, Severity Distribution, Top Source IPs.
- Không có warning Recharts width/height <= 0 trong test nếu có thể kiểm tra.

## 6. Sidebar cleanup: xóa Keycloak Console và đưa System Audit Logs thành mục chính

Hiện tại sidebar có `Admin Tools` submenu gồm:

- `System Audit Logs`
- `Keycloak Console`

Yêu cầu:

- Xóa `Keycloak Console` khỏi sidebar.
- Xóa luôn submenu `Admin Tools` nếu không còn cần thiết.
- Đưa `System Audit Logs` thành một mục chính của sidebar, ngang cấp với:
  - Dashboard
  - Event Search
  - Investigations
  - Query Library
- Chỉ Admin thấy `System Audit Logs`.
- Viewer/Analyst không thấy.
- Khi collapsed sidebar, tooltip vẫn hoạt động.
- Active state của `audit-logs` vẫn đúng.
- Không phá `onOpenAuditLogs`/`onPageChange` flow hiện tại.

Gợi ý:

- `frontend/src/components/soc/soc-sidebar.tsx`
- Có thể dùng icon `History`, `ShieldCheck`, hoặc `ScrollText`, nhưng phải đẹp và nhất quán.
- Nếu dùng `onOpenAuditLogs`, đảm bảo click sidebar item vẫn mở đúng page audit logs.

Test:

- Admin thấy `System Audit Logs` là nav item chính.
- Admin không thấy `Keycloak Console`.
- Viewer/Analyst không thấy `System Audit Logs`.
- Click `System Audit Logs` gọi đúng handler/page change.

## Không được làm

- Không sửa backend nếu không cần.
- Không thay đổi RBAC logic backend.
- Không thay đổi API contract.
- Không đổi dữ liệu mock/seed.
- Không làm lại chart formatter từ đầu nếu có helper sẵn.
- Không thêm dependency mới nếu không thật cần thiết.
- Không làm UI chữ dài hơn hiện tại.

## Verification bắt buộc

Chạy trong frontend:

```bash
cd frontend
npm run lint
npm run test -- event-detail-drawer.test.tsx search-section.test.tsx query-breakdown.test.tsx result-tabs.test.tsx soc-sidebar.test.tsx soc-dashboard.test.tsx
npm run build
```

Nếu test file nào không tồn tại hoặc pattern không đúng, chạy test liên quan thực tế bằng Vitest.

## Kỳ vọng cuối cùng

- Viewer UI sạch hơn, không thấy raw-log warning dài và không thấy Recent Queries.
- Query Breakdown hiển thị country đẹp, có cờ/tên hoặc ít nhất cờ + code, đồng nhất Search/Investigation/Audit.
- Summary Table của line chart dùng local formatted time, không hiện raw UTC ISO.
- Dashboard gọn hơn, Events Over Time bên trái, Severity Distribution và Top Source IPs ở cột phải.
- Sidebar admin gọn hơn: không còn Keycloak Console, System Audit Logs là mục chính chỉ admin thấy.
- CI frontend lint/test/build pass.
