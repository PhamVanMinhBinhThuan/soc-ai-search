# Prompt: Add Query Breakdown Visualization For SearchPlan

## Role

Bạn là Senior Frontend Engineer chuyên React, TypeScript, Tailwind CSS và UI/UX cho SOC/SIEM dashboard dark theme.

## Bối cảnh

Hiện tại hệ thống SOC AI Search đã có `Query Transparency` để hiển thị:

- `Validated SearchPlan`
- `Compiled DSL`

Nhưng SearchPlan là JSON nên analyst không chuyên kỹ thuật có thể khó đọc. Tôi muốn thêm một lớp visual/human-readable để người dùng hiểu nhanh câu hỏi tự nhiên đã được hệ thống chuyển thành điều kiện truy vấn gì.

Không gọi LLM mới. Không thêm backend. Không lưu thêm DB.

Chỉ đọc `search_plan` hiện có và render thành UI dễ hiểu.

## Files cần đọc trước

Frontend:

- `frontend/src/components/soc/query-transparency.tsx`
- `frontend/src/components/soc/investigations/investigation-detail-panel.tsx`
- `frontend/src/types/soc.ts`
- `frontend/src/components/soc/result-tabs.tsx`
- `frontend/src/components/soc/admin/audit-logs-page.tsx`
- `frontend/src/components/soc/investigations/investigations-page.tsx`

Test hiện có:

- `frontend/src/components/soc/query-transparency.test.tsx` nếu có
- `frontend/src/components/soc/result-tabs.test.tsx`
- `frontend/src/components/soc/investigations/investigation-detail-panel.test.tsx` nếu có

Nếu test file chưa có thì tạo test phù hợp, ưu tiên test component mới.

## Mục tiêu

Tạo một component dùng chung để visualize SearchPlan:

```text
Query Breakdown
```

Component này sẽ hiển thị SearchPlan thành bảng dễ đọc:

| Field | Value |
| --- | --- |
| Mode | Search / Aggregation |
| Time range | Last 24 hours |
| Severity | high, critical |
| Event type | failed_login |
| User | admin |
| Host | vpn-gw-01 |
| Source IP | 203.0.113.45 |
| Country | CN |
| Message contains | brute force |
| Aggregation | Top N |
| Group by | Source IP |
| Limit | Top 5 |
| Interval | hour |
| Sort | Newest first |
| Visualization | Raw events table / Number / Bar chart / Line chart |

Chỉ hiển thị những field có ý nghĩa. Field `null`, empty array, empty string thì không cần render.

Lưu ý type hiện tại:

- `severity`, `event_type`, `country_code` có thể là array.
- `user`, `host`, `ip`, `source`, `message_query` là single string.
- Không tự biến single string field thành multi-select/multi-value UI.

## Yêu cầu chức năng

### 1. Tạo component dùng chung

Tạo file mới:

```text
frontend/src/components/soc/query-breakdown.tsx
```

Props gợi ý:

```ts
type QueryBreakdownProps = {
  searchPlan: SearchPlanDto | null
  chartMetadata?: ChartMetadataDto | null
  className?: string
}
```

Yêu cầu:

- Không mutate `searchPlan`.
- Không gọi API.
- Không gọi LLM.
- Không phụ thuộc vào `original_question`.
- Render deterministic từ `searchPlan`.
- Nếu `searchPlan` null thì hiển thị empty state ngắn gọn hoặc không render tùy context.

### 2. Mapping Field / Value

Mapping cơ bản:

#### Mode

- `search` -> `Search`
- `aggregation` -> `Aggregation`

#### Time range

Convert relative time sang human-readable:

- `now` -> `Now`
- `now-24h` -> `Last 24 hours`
- `now-12h` -> `Last 12 hours`
- `now-7d` -> `Last 7 days`
- `now-30d` -> `Last 30 days`
- `now-10d`, `now-11d`, `now-12d` -> `Last 10/11/12 days`

Nếu là ISO timestamp thì giữ format readable ngắn:

```text
2026-06-29T00:00:00Z -> 29/06/2026, 00:00 UTC
```

Nếu có cả `from` và `to`:

```text
Last 24 hours to now
```

hoặc:

```text
2026-06-01 -> 2026-06-30
```

Chọn cách hiển thị gọn, dễ đọc.

#### Filters

Render các filter sau nếu có:

- `source`
- `severity`
- `event_type`
- `user`
- `host`
- `ip`
- `country_code`
- `message_query`

Tên hiển thị nên đẹp:

- `source` -> `Source`
- `event_type` -> `Event type`
- `country_code` -> `Country`
- `ip` -> `Source IP`
- `message_query` -> `Message contains`

Array thì join bằng `, `.

#### Aggregation

Nếu `mode = aggregation`, render:

- `Aggregation`: `Count`, `Group by`, `Top N`, `Time series`
- `Group by`: field nếu có
- `Limit`: `Top N` nếu có
- `Interval`: `hour`, `day`, `minute` nếu có
- `Bucket order`: highest first / lowest first nếu có `order`

Mapping:

- `count` -> `Count`
- `group_by` -> `Group by`
- `top_n` -> `Top N`
- `date_histogram` -> `Time series`

Field mapping:

- `ip` -> `Source IP`
- `host` -> `Host`
- `user` -> `User`
- `severity` -> `Severity`
- `event_type` -> `Event type`
- `source` -> `Source`
- `country_code` -> `Country`

#### Sort

Nếu searchPlan có `sort`:

- `timestamp desc` -> `Newest first`
- `timestamp asc` -> `Oldest first`
- `severity desc` -> `Highest severity first`
- `severity asc` -> `Lowest severity first`

#### Visualization

Render một row `Visualization`.

Mapping:

- `mode = search` -> `Raw events table`
- `aggregation.type = count` -> `Number`
- `aggregation.type = group_by` -> `Bar chart`
- `aggregation.type = top_n` -> `Bar chart`
- `aggregation.type = date_histogram` -> `Line chart`

Nếu `chartMetadata` có thông tin chính xác hơn thì có thể ưu tiên dùng `chartMetadata`, nhưng không bắt buộc nếu type hiện tại không đủ rõ.

### 3. UI/UX yêu cầu

Thiết kế dark SOC/SIEM giống hệ thống hiện tại.

Component nên có:

- Header nhỏ: `Query Breakdown`
- Icon phù hợp từ `lucide-react`, ví dụ `ListTree`, `TableProperties`, `SlidersHorizontal`, hoặc `ScanSearch`.
- Badge mode: `SEARCH` hoặc `AGGREGATION`.
- Bảng 2 cột `Field` / `Value`.
- Border `border-zinc-800`.
- Background `bg-zinc-950/40` hoặc tương đương.
- Rounded `rounded-2xl`.
- Text dễ đọc, không quá sáng.
- Các value quan trọng có thể dùng badge/chip nhẹ:
  - severity high/critical có màu amber/red;
  - aggregation có màu violet/cyan;
  - time range màu cyan.

Không làm UI rối. Ưu tiên clean hơn là nhiều màu.

### 4. Tích hợp vào Search page

Trong:

```text
frontend/src/components/soc/query-transparency.tsx
```

Thêm tab mới đứng trước JSON:

```text
Query Breakdown | Validated SearchPlan | Compiled DSL
```

Yêu cầu:

- Default active tab nên là `Query Breakdown`.
- `Validated SearchPlan` và `Compiled DSL` vẫn giữ nguyên.
- Khi user search mới, edit SearchPlan, hoặc apply filter, `response.search_plan` thay đổi thì Query Breakdown tự cập nhật.
- Không gọi API mới.
- Không gọi summary mới.

### 5. Tích hợp vào Investigation / Audit detail

Trong:

```text
frontend/src/components/soc/investigations/investigation-detail-panel.tsx
```

Reuse component `QueryBreakdown`.

Hiển thị Query Breakdown trong detail panel của:

- All Investigations
- System Audit Logs

Vì cả hai đang dùng `InvestigationDetailPanel`.

Cách hiển thị đề xuất:

- Đặt `Query Breakdown` phía trên tabs `Validated SearchPlan / Compiled DSL`; hoặc
- Thêm tab `Query Breakdown` trước hai tab JSON/DSL trong detail panel.

Khuyến nghị: dùng cùng pattern tab:

```text
Query Breakdown | Validated SearchPlan | Compiled DSL
```

Yêu cầu:

- Nếu query không có `search_plan`, hiển thị empty state gọn hoặc ẩn tab.
- Không hiển thị query_id trong Query Breakdown.
- Không hiển thị latency trong Query Breakdown.
- Không thay đổi logic Run Again, Pin, Export.

Nếu `searchPlan` hoặc `generatedDsl` null/empty trong Investigation/Audit detail, vẫn giữ đủ 3 tab để UI nhất quán:

- Query Breakdown: `No SearchPlan available to build a query breakdown.`
- Validated SearchPlan: `No SearchPlan stored for this query.`
- Compiled DSL: `No compiled DSL stored for this query.`

Không render bảng rỗng, không render `null`, không render `{}` như dữ liệu thật.

### 6. Hành vi sau edit/filter

Yêu cầu rõ:

- Sau khi user edit SearchPlan thành công, Query Breakdown phải phản ánh SearchPlan mới.
- Sau khi user apply filter/sort thành công, Query Breakdown phải phản ánh SearchPlan mới.
- Không giữ breakdown cũ.
- Không dựa vào original question để render breakdown.

Lý do: breakdown là bản visualize của SearchPlan hiện tại.

### 7. Không được phá các phần hiện có

Không được phá:

- Edit SearchPlan.
- Reset to AI Plan.
- Compiled DSL tab.
- CSV export.
- Pagination.
- Investigation detail.
- Audit detail.
- RBAC.
- AI Summary visibility.
- Filter & Sort Results.

Không thay đổi backend nếu không cần.

## Test bắt buộc

Thêm/cập nhật test frontend.

Test tối thiểu:

1. QueryBreakdown render search mode:
   - Mode Search.
   - Time range Last 24 hours.
   - Event type failed_login.
   - Visualization Raw events table.

2. QueryBreakdown render aggregation top_n:
   - Mode Aggregation.
   - Aggregation Top N.
   - Group by Source IP.
   - Limit Top 5.
   - Visualization Bar chart.

3. QueryBreakdown render date_histogram:
   - Aggregation Time series.
   - Interval hour.
   - Visualization Line chart.

4. QueryTransparency có tab `Query Breakdown` đứng trước `Validated SearchPlan`.

5. InvestigationDetailPanel hiển thị Query Breakdown khi có `search_plan`.

6. Null/empty fields không render thành dòng `null`.

## Verification bắt buộc

Chạy:

```bash
cd frontend
npm run lint
npm run test -- query-breakdown
npm run test -- result-tabs.test.tsx
npm run build
```

Nếu test tên khác thì chạy đúng test liên quan.

Nếu có thay đổi type shared lớn, chạy thêm:

```bash
cd frontend
npm run test
```

## Kỳ vọng cuối cùng

Sau task này:

- Người dùng không cần đọc JSON SearchPlan để hiểu hệ thống đang query gì.
- Search page có tab `Query Breakdown`.
- Investigation detail và Audit detail cũng có Query Breakdown.
- Query Breakdown luôn bám theo SearchPlan hiện tại sau search/edit/filter.
- UI đẹp, gọn, phù hợp dark SOC dashboard.

## Câu giải thích khi bảo vệ

> Em không bắt analyst đọc JSON. SearchPlan vẫn được giữ để audit và transparency kỹ thuật, nhưng UI có Query Breakdown để diễn giải các field quan trọng thành bảng Field/Value dễ đọc hơn. Phần này không dùng LLM, chỉ render deterministic từ SearchPlan đã validate nên nhanh, ổn định và không phát sinh chi phí.
