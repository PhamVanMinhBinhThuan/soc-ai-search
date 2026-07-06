# Prompt: Polish Search Aggregation Bar Chart And Threat Ranking Visualization

Role: Bạn là Senior Frontend Engineer chuyên React, TypeScript, Tailwind CSS, Recharts và UI/UX cho dashboard SOC/SIEM dark theme.

Task: Cải thiện visualization aggregation trong trang Search để bar chart đẹp, chuyên nghiệp và phù hợp ngữ cảnh SOC hơn, đặc biệt với các truy vấn `top_n` / `group_by`.

## Bối cảnh hiện tại

Trang Search hiện đã có visual style neon/cyber giống các trang Dashboard, Investigations, Audit và Query Library. Tuy nhiên chart aggregation dạng bar trong trang Search còn hơi phẳng:

- Bar đang dùng một màu đỏ giống nhau.
- Khoảng cách bar lớn, thiếu cảm giác ranking/threat analysis.
- Tooltip chưa đẹp như line chart.
- Summary table bên dưới vẫn ổn nhưng chưa hỗ trợ cảm giác “Top ranking”.
- Line chart đã đẹp hơn nhờ gradient fill, glow line, tooltip format local time.

File chính cần đọc/sửa:

- `frontend/src/components/soc/aggregation-chart.tsx`
- `frontend/src/components/soc/result-tabs.tsx`
- `frontend/src/types/soc.ts`

Test liên quan cần đọc/cập nhật nếu có:

- `frontend/src/components/soc/result-tabs.test.tsx`
- `frontend/src/components/soc/aggregation-chart.test.tsx` nếu tồn tại

Không thay đổi backend nếu không thật sự cần.

## Mục tiêu UX

Aggregation trong trang Search không nên chỉ “vẽ chart”, mà nên chọn cách visualize phù hợp loại dữ liệu SOC.

Đề xuất rule:

```text
date_histogram -> line chart như hiện tại
count          -> big number card
top_n/group_by severity -> severity-colored chart/table
top_n/group_by ip/user/host/source -> threat ranking / horizontal bar
top_n/group_by event_type/country_code -> polished vertical bar
```

Nếu chưa thể làm toàn bộ rule trong một lần, ưu tiên:

1. Làm đẹp bar chart hiện tại.
2. Thêm horizontal threat ranking cho aggregation field thuộc `ip`, `user`, `host`, `source`.
3. Giữ line chart hiện tại không bị phá.

## Yêu cầu quan trọng về dữ liệu

Hiện `AggregationChart` chỉ nhận:

```ts
data: AggregationResultItemDto[]
metadata?: ChartMetadataDto
```

Trong đó:

```ts
AggregationResultItemDto = {
  key: string
  value: number
}

ChartMetadataDto = {
  chart_type: ChartType
  x_axis_label: string
  y_axis_label: string
}
```

Nếu cần biết aggregation field (`ip`, `severity`, `event_type`, ...), có thể truyền thêm prop từ `ResultTabs` xuống `AggregationChart`, ví dụ:

```ts
aggregationField?: string | null
aggregationType?: AggregationType | null
```

Nguồn lấy:

```ts
response.search_plan.aggregation?.field
response.search_plan.aggregation?.type
```

Không đổi API backend nếu không cần. Chỉ truyền dữ liệu đã có sẵn trong response.

## Yêu cầu UI chung

Giữ style cyber/SOC hiện tại:

- Nền chart: dark navy/black, có cyan grid nhẹ.
- Border: cyan 20-35%.
- Shadow/glow cyan nhẹ.
- Không dùng màu quá chói toàn màn hình.
- Text primary: `#F8FAFC`.
- Text secondary: `#94A3B8`.
- Cyan accent: `#22D3EE`.
- Red/pink accent: `#FF2D55` hoặc `#FB3B66`.
- Amber accent: `#F59E0B`.
- Purple aggregation: `#A855F7`.

Chart phải nhìn cùng ngôn ngữ với:

- Dashboard line chart.
- Dashboard Top Source IPs.
- Query Library cards.
- Investigation/Audit table neon style.

## Phần 1: Làm đẹp Vertical Bar Chart hiện tại

Áp dụng cho aggregation không phải `LINE`, không phải `NUMBER`, và không thuộc nhóm threat ranking nếu chưa chuyển sang horizontal.

Yêu cầu:

1. Bar không dùng một màu phẳng.
2. Dùng gradient fill cho bar:

```text
top:    #ff4d6d / #fb7185
bottom: #be123c / rgba đỏ đậm
```

hoặc dùng palette theo index:

```text
#FB3B66, #F59E0B, #22D3EE, #A855F7, #10B981
```

3. Bar có radius nhẹ ở top:

```ts
radius={[8, 8, 0, 0]}
```

4. Thêm shadow/glow nhẹ nếu Recharts cho phép qua SVG filter hoặc CSS class.
5. Data label phía trên bar nên là:

```text
1,599
```

Không nên để label quá mờ.

6. Tooltip custom, không dùng tooltip mặc định.

Tooltip nên có:

```text
<key>
Events: 1,599
Share: 24.5%
```

Tính `Share` bằng:

```ts
value / sum(data.value) * 100
```

7. Tooltip style:

```text
rounded-xl
border cyan
bg #111318/95
shadow cyan nhẹ
backdrop blur
```

8. Trục X:

- Nếu key dài như IP/user/event_type, cần tránh bị cắt.
- Có thể `interval={0}` với angle nhẹ `-8` hoặc giữ ngang nhưng `minTickGap`.
- Với IP nên ưu tiên horizontal ranking ở phần 2.

## Phần 2: Threat Ranking Horizontal Bar

Áp dụng khi:

```ts
aggregationField in ["ip", "user", "host", "source"]
```

Với dữ liệu top IP, top user, top host, top source, nên dùng layout horizontal ranking thay vì vertical bar.

### UI mong muốn

Mỗi item là một row:

```text
#1  198.51.100.200                         1,599 events
██████████████████████████████████████

#2  10.10.1.15                             1,589 events
████████████████████████████████████
```

Yêu cầu:

- Container vẫn nằm trong card chart hiện tại.
- Dùng `data.slice(0, topN)` theo dữ liệu đã có.
- Rank `#1`, `#2`, `#3` rõ ràng.
- Key dùng font mono nếu là IP/host/user.
- Count căn phải.
- Bar width tính theo max value:

```ts
widthPercent = item.value / maxValue * 100
```

- Row đầu tiên nổi bật hơn:
  - border cyan/rose rõ hơn
  - background cyan hoặc red rất nhẹ
  - bar glow mạnh hơn

### Màu bar theo rank

Đề xuất:

```ts
rank 1: #FB3B66
rank 2: #F59E0B
rank 3: #22D3EE
rank 4: #A855F7
rank 5+: #64748B
```

Không cần gọi severity thật vì aggregation top IP không có severity trong bucket. Đây là visual ranking, không phải severity fact.

### Tooltip / accessibility

- Mỗi row có `title` hoặc `aria-label`:

```text
Rank 1, 198.51.100.200, 1,599 events
```

- Không cần Recharts cho horizontal ranking nếu làm bằng HTML/CSS sẽ đẹp và kiểm soát tốt hơn.
- Nếu dùng Recharts horizontal `BarChart layout="vertical"` cũng được, nhưng HTML/CSS ranking list có thể đơn giản hơn và đẹp hơn.

## Phần 3: Severity Aggregation

Nếu aggregation field là `severity`, nên dùng màu đúng mức độ:

```text
critical -> red/pink
high     -> amber/orange
medium   -> cyan
low      -> slate/gray
```

Nếu giữ bar chart:

- Bar critical màu đỏ.
- Bar high màu amber.
- Bar medium màu cyan.
- Bar low màu slate.

Thứ tự nếu có thể normalize:

```text
critical -> high -> medium -> low
```

Không bắt buộc thay đổi data order nếu backend đã trả order theo count, nhưng nếu sort theo severity thì phải đảm bảo không phá ý nghĩa top_n/order.

## Phần 4: Summary Table bên dưới

`Summary Table` hiện nằm trong `ResultTabs`.

Không cần rewrite lớn, nhưng nên polish nhẹ để hợp chart:

- Border cyan nhẹ thay vì border xám.
- Header background cyan/blue rất nhẹ.
- Count value dùng cyan hoặc màu theo severity nếu field là severity.
- Nếu đang hiển thị top_n ranking, có thể thêm cột `Rank` nếu không phá test quá nhiều.

Nếu thêm cột rank thì cập nhật tests tương ứng. Nếu sợ ảnh hưởng test, chỉ polish style.

## Phần 5: Không phá line chart

Line chart hiện đã đẹp:

- gradient fill
- cyan line glow
- local time formatter
- custom tooltip

Không được phá:

- `metadata.chart_type === "LINE"`
- `date_histogram`
- local time formatter:

```ts
createLocalChartTickFormatter
formatLocalChartTooltipLabel
```

Nếu refactor `AggregationChart`, hãy giữ nguyên line chart behavior.

## Phần 6: Không phá count card

`metadata.chart_type === "NUMBER"` vẫn hiển thị number card.

Có thể polish nhẹ:

- Border cyan.
- Background cyber.
- Label rõ hơn.

Nhưng không đổi behavior.

## Phần 7: Contract / Props đề xuất

Nếu cần thêm props cho `AggregationChart`, dùng kiểu:

```ts
export function AggregationChart({
  data,
  metadata,
  aggregationField,
  aggregationType,
}: {
  data: AggregationResultItemDto[]
  metadata?: ChartMetadataDto
  aggregationField?: string | null
  aggregationType?: AggregationType | null
}) { ... }
```

Trong `ResultTabs`, truyền:

```tsx
<AnalyticsView
  aggregationResults={aggregationResults}
  chartMetadata={chartMetadata}
  aggregationField={response?.search_plan.aggregation?.field ?? null}
  aggregationType={response?.search_plan.aggregation?.type ?? null}
/>
```

Sau đó trong `AnalyticsView` truyền tiếp xuống `AggregationChart`.

Lưu ý:

- Không thay đổi backend DTO.
- Không làm `response` thành required ở nơi không cần.
- Giữ fallback nếu `aggregationField` null.

## Phần 8: Tests

Cập nhật hoặc thêm tests nếu hiện có:

1. `AggregationChart` render line chart khi `chart_type=LINE`.
2. `AggregationChart` render number card khi `chart_type=NUMBER`.
3. Khi `aggregationField="ip"` thì render threat ranking rows:
   - có `#1`
   - có IP
   - có count
4. Khi `aggregationField="severity"` thì dùng severity labels và không crash.
5. `ResultTabs` vẫn render analytics view và summary table.

Nếu project chưa có test cho `AggregationChart`, có thể thêm test nhẹ hoặc cập nhật `result-tabs.test.tsx`.

## Phần 9: Verification

Chạy:

```bash
cd frontend
npm run lint
npm run test -- result-tabs aggregation-chart
npm run build
```

Nếu không có `aggregation-chart.test.tsx`, chạy:

```bash
npm run test -- result-tabs
```

## Kỳ vọng cuối cùng

Sau khi hoàn thành:

- Bar chart trên trang Search đẹp hơn rõ rệt.
- Top IP/User/Host/Source nhìn giống threat ranking chuyên nghiệp.
- Tooltip đẹp như line chart.
- Summary table không bị lệch visual.
- Line chart hiện tại không bị hỏng.
- Không thay đổi backend hoặc SearchPlan contract.
- UI phù hợp phong cách cyber/SOC hiện tại của hệ thống.
