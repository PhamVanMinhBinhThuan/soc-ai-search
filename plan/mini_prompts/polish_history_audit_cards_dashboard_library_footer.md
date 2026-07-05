# Prompt: Polish Investigation/Audit Question Cards, Compact Dashboard, and Sticky Query Library Pagination

Role: Bạn là Senior Frontend Engineer kiêm UI/UX Engineer chuyên React, TypeScript, Tailwind CSS và dark SOC/SIEM dashboard. Hãy refactor UI theo hướng đồng bộ với style neon/glass hiện tại, nhưng không thay đổi business logic.

## Bối cảnh

Hiện tại hệ thống đã có style neon/glass cho Dashboard, Investigations, System Audit Logs và Query Library. Tuy nhiên còn 3 điểm cần chỉnh:

1. Ở trang `Investigations` và `System Audit Logs`, phần hiển thị câu hỏi trong bảng/list vẫn chưa đẹp bằng card của `Query Library`. Khi click vào chi tiết thì câu hỏi/detail mới nhìn đẹp hơn, còn list chính vẫn giống bảng database.
2. Dashboard vẫn còn tràn nhẹ ở cuối màn hình. Cần compact thêm một chút để toàn bộ dashboard overview nằm gọn hơn trong một màn hình laptop 1080p.
3. Pagination của `Query Library` cần giữ cố định ở cuối UI giống `Investigations` và `System Audit Logs`, không để người dùng phải kéo xuống mới thấy phân trang.

Tham khảo ảnh UI mong muốn:

- `plan/mini_prompts/refactor_ui/investigation.png`
- `plan/mini_prompts/refactor_ui/library.png`
- `plan/mini_prompts/refactor_ui/dashboard.png`

## Files cần đọc trước

Đọc kỹ các file sau trước khi sửa:

- `frontend/src/components/soc/investigations/investigations-master-list.tsx`
- `frontend/src/components/soc/admin/audit-logs-page.tsx`
- `frontend/src/components/soc/query-library-page.tsx`
- `frontend/src/components/soc/dashboard/soc-dashboard.tsx`
- `frontend/src/components/soc/dashboard/kpi-cards.tsx`
- `frontend/src/components/soc/dashboard/events-over-time.tsx`
- `frontend/src/components/soc/dashboard/severity-distribution.tsx`
- `frontend/src/components/soc/dashboard/top-source-ips.tsx`
- `frontend/src/components/soc/investigations/investigation-badges.tsx`
- Các test liên quan trong `frontend/src/components/soc/**/*.test.tsx`

## 1. Investigation/Audit: làm câu hỏi đẹp như Query Library

### Mục tiêu

Trong `Investigations` và `System Audit Logs`, các row/câu hỏi trong danh sách chính phải nhìn gần với query cards ở `Query Library` hơn:

- Có cảm giác glass card / neon row.
- Câu hỏi là nội dung chính, dễ đọc.
- Prefix như `[Edited SearchPlan]`, `[Filtered Result]`, `[AI Corrected]` hiển thị bằng badge đẹp.
- Mode/status/results vẫn rõ nhưng không làm UI giống bảng thô.
- Khi hover/selected, row/card có glow cyan rõ hơn giống ảnh reference.

### Yêu cầu cho `Investigations`

Trong trạng thái full list (`expanded === true`) hiện tại đang dùng table. Có thể giữ table nếu ít rủi ro, nhưng cần style lại để row nhìn như card/strip:

- Table wrapper có border cyan/glow nhẹ.
- Row có chiều cao vừa phải, không quá cao.
- Mỗi row có background glass nhẹ:

```tsx
bg-[linear-gradient(90deg,rgba(34,211,238,0.035),rgba(8,10,15,0.2))]
```

- Hover:

```tsx
hover:bg-cyan-400/[0.075]
hover:shadow-[0_0_22px_-14px_rgba(34,211,238,0.9)]
```

- Selected row:

```tsx
bg-cyan-400/[0.11]
border-cyan-400/35
shadow-[0_0_26px_-12px_rgba(34,211,238,0.95)]
```

- Question cell nên giống Query Library card:
  - Question text `font-semibold`, sáng rõ.
  - Nếu có prefix, badge đứng trước câu hỏi.
  - Nếu có feedback, hiển thị muted, không lấn át câu hỏi.
  - Không để câu hỏi quá nhỏ hoặc quá nhạt.

Gợi ý: có thể tạo component nhỏ nội bộ như `QuestionCardSummary` hoặc refactor `QuestionSummary` để render đẹp hơn, nhưng không đổi data contract.

### Yêu cầu cho `System Audit Logs`

Áp dụng style tương tự `Investigations` để hai trang gần như tương đồng:

- Search/filter toolbar đồng bộ.
- Table header đồng bộ.
- Row hover/selected đồng bộ.
- Question prefix badge đồng bộ.
- Mode/status badge dùng lại style chung.
- Audit có thêm `User` column, nhưng question vẫn là nội dung nổi bật nhất.

### Lưu ý behavior

Không được thay đổi:

- Filter/search/pagination API.
- Pin/unpin investigation.
- Click row để mở detail.
- Export audit CSV.
- RBAC.
- Question parsing logic.

Chỉ thay đổi UI/layout/style.

## 2. Dashboard: compact thêm một chút để không tràn

### Mục tiêu

Dashboard hiện tại đã gần đủ đẹp nhưng vẫn tràn nhẹ ở cuối màn hình. Cần làm nhỏ lại thêm một chút để các section chính nằm gọn trong một màn hình laptop 1080p.

Giữ layout:

```text
Row 1:
  Left  : KPI cards 2x2
  Right : Severity Distribution

Row 2:
  Left  wide: Events Over Time
  Right     : Top Source IPs
```

### Việc cần làm

Giảm có kiểm soát:

- page padding dọc;
- gap giữa các card;
- padding trong KPI cards;
- chiều cao line chart;
- padding trong Top Source IPs;
- chiều cao từng row trong Top Source IPs;
- chiều cao donut nếu cần.

Gợi ý:

- `py-3` -> `py-2.5` nếu cần.
- `gap-3` -> `gap-2.5` nếu layout vẫn đẹp.
- `min-h-[220px]` -> `min-h-[200px]` hoặc `min-h-[205px]`.
- KPI card `p-4` -> `p-3.5`.
- Top Source IPs `gap-2.5` -> `gap-2`, `p-3` -> `p-2.5`.

### Không được làm

- Không làm dashboard quá chật hoặc khó đọc.
- Không làm chart warning width/height <= 0.
- Không phá responsive.
- Không đổi data fetching / auto refresh / API.

## 3. Query Library: pagination cố định cuối UI

### Mục tiêu

Ở `Query Library`, pagination phải giống `Investigations` và `System Audit Logs`:

- Luôn nằm ở cuối vùng UI.
- Người dùng không cần kéo danh sách xuống mới thấy pagination.
- List query scroll riêng ở giữa.
- Search/filter ở trên cố định theo layout hiện tại.

### Layout mong muốn

```text
Header
Search + category filters
Scrollable query list
Fixed footer pagination
```

### Yêu cầu

- Container chính dùng `flex min-h-0 flex-col`.
- Query list dùng `min-h-0 flex-1 overflow-y-auto`.
- Pagination footer dùng `shrink-0`, `border-t`, `bg-[#080A0F]/95`, `backdrop-blur`.
- Footer style đồng bộ Investigation/Audit:
  - cyan border top;
  - muted page text;
  - prev/next buttons cyan hover/glow.
- Nếu chỉ có 1 page hoặc không có kết quả:
  - Nếu có kết quả và chỉ 1 page, vẫn hiển thị `Page 1 of 1 · N total` ở footer.
  - Nếu không có kết quả, có thể không hiện footer hoặc hiện empty state rõ ràng, nhưng không để layout bị lửng.

### Không đổi behavior

- `Query Library` vẫn chỉ fill/focus câu hỏi vào ô search, không tự execute.
- Giữ 10 items/page.
- Giữ search/filter category.
- Giữ copy behavior.
- Không gọi LLM.

## 4. UI Style Guidelines

Giữ phong cách:

- background: `#080A0F`, `#0B0E13`
- card: `#111318`
- border: cyan muted / `#252A33`
- accent cyan: `#22D3EE`
- success: emerald
- aggregation: purple
- edited: amber

Ưu tiên:

- readable trước, neon sau.
- hover/selected rõ.
- table/list không quá cao.
- card/list không bị “database table thô”.

## 4.1. Sidebar divider phải rõ hơn

Hiện tại cạnh phải của sidebar hơi tối, chưa tách bạch rõ giữa sidebar và màn hình chính. Cần làm đường phân cách bên phải sidebar nổi bật hơn nhưng không quá chói.

Yêu cầu:

- Cạnh phải sidebar phải có border/glow cyan nhẹ để người dùng phân biệt rõ vùng navigation và content.
- Áp dụng trong `frontend/src/components/soc/soc-sidebar.tsx`.
- Không làm sidebar rộng hơn.
- Không đổi hành vi collapse/expand.
- Không đổi quyền hiển thị menu theo role.

Gợi ý style:

```tsx
className="
  border-r border-cyan-400/25
  shadow-[8px_0_28px_-24px_rgba(34,211,238,0.95)]
"
```

Có thể thêm một pseudo/absolute divider nếu dễ kiểm soát:

```tsx
<div className="pointer-events-none absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-cyan-300/45 to-transparent" />
```

Nếu dùng absolute divider:

- Sidebar cần `relative`.
- Divider không được che click menu.
- Divider phải hoạt động cả collapsed và expanded.

## 5. Tests

Cập nhật test nếu semantic thay đổi. Không cần test pixel-perfect.

Tối thiểu đảm bảo:

- `Investigations` vẫn render list, filters, row click, pagination.
- `System Audit Logs` vẫn render filters, export button, rows, pagination.
- `Query Library` vẫn paginate 10 item/trang và use/copy query hoạt động.
- Dashboard vẫn render KPI, charts, top IPs.

## 6. Verification

Chạy:

```bash
cd frontend
npm run lint
npm run test
npm run build
```

## Kỳ vọng cuối cùng

- Investigation/Audit list nhìn đẹp hơn, gần style Query Library hơn.
- Dashboard gọn hơn và không còn tràn nhẹ.
- Query Library pagination cố định cuối UI giống Audit/Investigation.
- Không thay đổi logic nghiệp vụ, chỉ polish UI/layout.
