# Q14 - Dashboard Và Static Suggestions Hoạt Động Như Thế Nào?

## 1. Câu trả lời ngắn

Dashboard dùng các **SearchPlan cố định** để gọi backend aggregation/search API. Dashboard **không gọi LLM**, nên nhanh hơn, ổn định hơn và không tốn chi phí AI. Static suggestions/playbooks cũng được viết sẵn ở frontend, không sinh bằng LLM.

Câu cần nhớ khi bảo vệ:

> Dashboard không cần AI vì nó chạy các SearchPlan aggregation cố định. Điều này giúp dashboard nhanh, ổn định, ít tốn chi phí LLM và không làm nhiễu audit history.

---

## 2. Dashboard gọi API nào?

Code liên quan:

```text
frontend/src/components/soc/dashboard/soc-dashboard.tsx
frontend/src/services/search-api.ts
```

Dashboard gọi:

```ts
executeSearchPlan(plan, signal)
```

Trong `search-api.ts`:

```ts
const payload = await requestJson('/api/v1/search/plan', {
  method: 'POST',
  body: JSON.stringify(plan),
})
```

Ý nghĩa:

- Dashboard không gửi natural language question.
- Dashboard không gọi `/api/v1/search`.
- Dashboard gọi thẳng endpoint kỹ thuật `/api/v1/search/plan`.
- SearchPlan đã được frontend định nghĩa sẵn.

---

## 3. Vì sao Dashboard không gọi LLM?

Dashboard dùng các câu hỏi cố định như:

- tổng events 24h;
- failed logins 24h;
- critical/high alerts 24h;
- events over time;
- severity distribution;
- top source IPs.

Các truy vấn này không cần AI suy luận mỗi lần render. Nếu gọi LLM cho dashboard thì:

- chậm hơn;
- tốn chi phí hơn;
- dễ fail hơn;
- tạo nhiều audit history nhiễu;
- không cần thiết vì metric dashboard là cố định.

Câu trả lời mẫu:

> LLM chỉ dùng cho natural language search. Dashboard là telemetry cố định nên dùng SearchPlan có sẵn để ổn định và tiết kiệm chi phí.

---

## 4. Dashboard chạy những SearchPlan nào?

Code liên quan:

```text
frontend/src/components/soc/dashboard/soc-dashboard.tsx
```

Dashboard hiện chạy 5 query:

### Failed logins 24h

```ts
const failedLoginsPlan = {
  mode: 'search',
  page: 0,
  size: 1,
  filters: {
    timestamp: { from: 'now-24h', to: 'now' },
    event_type: ['failed_login'],
  },
}
```

Mục đích:

```text
KPI Failed Logins
```

### Critical / High alerts 24h

```ts
const criticalPlan = {
  mode: 'search',
  page: 0,
  size: 1,
  filters: {
    timestamp: { from: 'now-24h', to: 'now' },
    severity: ['critical', 'high'],
  },
}
```

Mục đích:

```text
KPI Critical / High Alerts
```

### Events over time

```ts
const timePlan = {
  mode: 'aggregation',
  filters: { timestamp: { from: 'now-24h', to: 'now' } },
  aggregation: { type: 'date_histogram', interval: 'hour' },
}
```

Mục đích:

```text
Line chart Events Over Time
```

### Severity distribution

```ts
const severityPlan = {
  mode: 'aggregation',
  filters: { timestamp: { from: 'now-24h', to: 'now' } },
  aggregation: { type: 'group_by', field: 'severity', top_n: 10 },
}
```

Mục đích:

```text
Pie chart Severity Distribution
```

### Top source IPs

```ts
const topIpPlan = {
  mode: 'aggregation',
  filters: { timestamp: { from: 'now-24h', to: 'now' } },
  aggregation: { type: 'top_n', field: 'ip', top_n: 10 },
}
```

Mục đích:

```text
Top Source IPs card/list
```

---

## 5. Dashboard có những UI card/chart nào?

Code liên quan:

```text
frontend/src/components/soc/dashboard/kpi-cards.tsx
frontend/src/components/soc/dashboard/events-over-time.tsx
frontend/src/components/soc/dashboard/severity-distribution.tsx
frontend/src/components/soc/dashboard/top-source-ips.tsx
```

Các phần chính:

| UI | Code | Dữ liệu |
| --- | --- | --- |
| KPI Cards | `KpiCards` | total events, failed logins, critical/high alerts, top source IP |
| Events Over Time | `EventsOverTime` | `date_histogram` theo giờ |
| Severity Distribution | `SeverityDistribution` | `group_by severity` |
| Top Source IPs | `TopSourceIps` | `top_n ip` |

Thư viện chart:

```text
Recharts
```

Ví dụ:

- `LineChart` cho events over time.
- `PieChart` cho severity distribution.
- Bar/progress list cho top IPs.

---

## 6. Nếu một dashboard card lỗi thì sao?

Code liên quan:

```text
frontend/src/components/soc/dashboard/soc-dashboard.tsx
```

Dashboard dùng:

```ts
const [failedRes, critRes, timeRes, sevRes, topIpRes] =
  await Promise.allSettled([
    executeSearchPlan(failedLoginsPlan, signal),
    executeSearchPlan(criticalPlan, signal),
    executeSearchPlan(timePlan, signal),
    executeSearchPlan(severityPlan, signal),
    executeSearchPlan(topIpPlan, signal),
  ])
```

Ý nghĩa:

- `Promise.all` sẽ fail toàn bộ nếu một request fail.
- `Promise.allSettled` chờ tất cả request xong, dù có request fail.
- Card nào fail thì dùng fallback `0` hoặc `[]`.
- Card khác vẫn render bình thường.

Ví dụ:

```ts
const safeTotal = (res) =>
  res.status === 'fulfilled' ? res.value.total : 0
```

Câu nói khi bảo vệ:

> Dashboard có partial failure handling. Nếu một metric lỗi, các chart/card khác vẫn hiển thị, tránh làm sập toàn bộ dashboard.

---

## 7. Auto-refresh 10 phút nằm ở đâu?

Code liên quan:

```text
frontend/src/components/soc/dashboard/soc-dashboard.tsx
```

State:

```ts
const [autoRefresh, setAutoRefresh] = useState(true)
```

Effect:

```ts
useEffect(() => {
  if (!autoRefresh) return
  const interval = setInterval(() => {
    void fetchData()
  }, 10 * 60 * 1000)

  return () => clearInterval(interval)
}, [autoRefresh])
```

Ý nghĩa:

- Dashboard tự refresh mỗi 10 phút.
- User có thể tắt/bật auto-refresh.
- Có nút refresh thủ công.
- `lastUpdated` hiển thị thời điểm cập nhật gần nhất.

Câu nói khi bảo vệ:

> Dashboard không streaming realtime trong MVP, nhưng có auto-refresh 10 phút để cập nhật dữ liệu mới mà không gây tải liên tục.

---

## 8. Static Suggestions / Playbooks là gì?

Code liên quan:

```text
frontend/src/lib/investigation-suggestions.ts
```

Static suggestions là các gợi ý được định nghĩa sẵn ở frontend, ví dụ:

```ts
const PLAYBOOKS = [
  {
    title: 'Failed login investigation',
    question: 'Show all failed logins grouped by IP in the last 24 hours...',
  },
  {
    title: 'Privilege escalation review',
    question: 'Show all successful logins by admin or root in the last 7 days',
  },
]
```

Ý nghĩa:

- Không gọi LLM để sinh suggestion.
- Không tốn token/cost.
- Kết quả deterministic, dễ demo.
- Có thể xem như investigation playbook mẫu cho SOC analyst.

---

## 9. Suggestions có thay đổi theo kết quả hiện tại không?

Có, nhưng vẫn là logic tĩnh/deterministic.

Function:

```ts
export function getSuggestions(response: NaturalLanguageSearchResponseDto | null): Suggestion[]
```

Nó xem response hiện tại:

- nếu `event_type` có `failed_login` thì gợi ý failed-login follow-up;
- nếu severity có `critical/high` thì gợi ý critical alert aggregation;
- nếu aggregation top IP thì gợi ý xem event của IP đó;
- nếu có malware thì gợi ý malware triage;
- nếu có user/IP context thì gợi ý query liên quan.

Ví dụ:

```ts
if (filters?.event_type?.includes('failed_login')) {
  suggestions.push(...)
}
```

Điểm quan trọng:

> Suggestions nhìn có vẻ thông minh nhưng không gọi AI. Nó là rule-based suggestion dựa trên response hiện tại.

---

## 10. Suggestions khác mock question ở đâu?

Mock question là các câu demo cố định để test UI/LLM mock.

Static suggestions/playbooks là:

- bộ gợi ý điều tra;
- có thể thay đổi theo kết quả hiện tại;
- giúp analyst đi bước tiếp theo;
- không cần gọi LLM.

Câu nói khi bảo vệ:

> Suggestions không phải LLM generation. Đây là playbook rule-based ở frontend, giúp gợi ý hướng điều tra tiếp theo một cách ổn định và không tốn chi phí.

---

## 11. Dashboard có lưu audit/history không?

Dashboard gọi:

```http
POST /api/v1/search/plan
```

chứ không gọi:

```http
POST /api/v1/search
```

Ý nghĩa:

- Dashboard không tạo natural language search mới.
- Không gọi LLM.
- Không làm nhiễu history natural-language của user.

Tùy implementation backend, `/api/v1/search/plan` có thể không lưu audit giống `/api/v1/search`, hoặc chỉ phục vụ kỹ thuật. Khi bảo vệ nên nhấn mạnh:

> Dashboard là các technical SearchPlan cố định, không phải câu hỏi tự nhiên của analyst, nên mục tiêu là telemetry nhanh chứ không phải tạo thêm lịch sử điều tra.

---

## 12. Câu trả lời mẫu khi hội đồng hỏi

### Dashboard có dùng AI không?

> Không. Dashboard dùng các SearchPlan aggregation cố định và gọi `/api/v1/search/plan`. LLM chỉ dùng cho natural language search và summary.

### Vì sao cùng `group_by severity`, dashboard hiển thị pie chart nhưng search lại hiển thị bar chart?

> Vì cùng một aggregation result có thể được visualize khác nhau tùy màn hình. Ở trang Search/Aggregation, UI render theo `chart_metadata` mặc định từ backend: `GROUP_BY` và `TOP_N` là bar chart. Riêng dashboard là curated view, frontend biết trước card này là “Severity Distribution”, nên chủ động dùng component `SeverityDistribution` với pie/donut chart để trực quan hơn.

Ví dụ dashboard dùng SearchPlan:

```ts
const severityPlan = {
  mode: 'aggregation',
  filters: { timestamp: { from: 'now-24h', to: 'now' } },
  aggregation: { type: 'group_by', field: 'severity', top_n: 10 },
}
```

Backend trả dữ liệu dạng chung:

```json
[
  { "key": "critical", "value": 10 },
  { "key": "high", "value": 30 },
  { "key": "medium", "value": 80 }
]
```

Nhưng UI quyết định chart khác nhau:

| Nơi hiển thị | Ai quyết định chart | Chart |
| --- | --- | --- |
| Search result | Backend `chart_metadata` | Bar |
| Dashboard | Frontend component cố định `SeverityDistribution` | Pie/Donut |

Câu nói khi bảo vệ:

> Dữ liệu giống nhau, chỉ khác cách visualize. Search result dùng rule chung để đơn giản MVP, còn dashboard là màn hình curated nên chọn pie chart cho severity distribution để dễ nhìn hơn.

### KPI Critical / High Alerts không dùng aggregation count, vậy sao vẫn count được?

> Vì `mode = search` vẫn trả về `hits.total` từ Elasticsearch. Dashboard không cần lấy toàn bộ events, chỉ cần tổng số document match filter, nên dùng search plan `size = 1` rồi đọc `response.total`.

Ví dụ:

```ts
const criticalPlan = {
  mode: 'search',
  page: 0,
  size: 1,
  filters: {
    timestamp: { from: 'now-24h', to: 'now' },
    severity: ['critical', 'high'],
  },
}
```

Elasticsearch search response luôn có:

```json
{
  "hits": {
    "total": {
      "value": 178
    }
  }
}
```

Backend mapper đưa giá trị đó ra:

```ts
response.total
```

Vì vậy dashboard có thể lấy:

```text
Critical / High Alerts = response.total
```

So sánh nhanh:

| Cách | Dùng khi nào | Kết quả |
| --- | --- | --- |
| `mode=search`, đọc `total` | Count tổng số document match filter | `hits.total` |
| `mode=aggregation`, `type=count` | Muốn response aggregation/NUMBER chart chuẩn hóa | `total` + chart metadata |
| `group_by/top_n/date_histogram` | Muốn chia nhóm/thống kê bucket | `aggregation_results` |

Câu nói khi bảo vệ:

> Search mode vẫn có `hits.total`, nên có thể dùng để làm KPI count đơn giản. Với dashboard KPI, em để `size=1` để không lấy nhiều event, nhưng vẫn lấy được tổng số match từ Elasticsearch.

### Vì sao không dùng LLM cho dashboard?

> Vì dashboard là các metric cố định. Gọi LLM sẽ chậm, tốn chi phí và dễ fail hơn. SearchPlan cố định giúp dashboard nhanh, ổn định và dễ kiểm soát.

### Nếu một card dashboard lỗi thì sao?

> Frontend dùng `Promise.allSettled`, nên một API fail không làm sập toàn bộ dashboard. Card lỗi dùng fallback `0` hoặc `[]`, các card khác vẫn hiển thị.

### Dashboard cập nhật dữ liệu mới như thế nào?

> Dashboard có auto-refresh mỗi 10 phút và nút refresh thủ công. MVP chưa làm streaming realtime để tránh tăng độ phức tạp.

### Suggestions/playbooks có gọi LLM không?

> Không. Suggestions là static/rule-based trong frontend. Nó dựa trên response hiện tại để gợi ý hướng điều tra tiếp theo, nên deterministic và không tốn token LLM.

---

## 13. Một câu cực ngắn để nhớ

> Dashboard dùng SearchPlan cố định, không gọi LLM; suggestions là playbook rule-based, nhanh, ổn định và không tốn chi phí AI.
