# Prompt tích hợp API cho frontend ngày 6

Tiếp tục triển khai ngày 6 cho SOC AI Search MVP.

Mock UI trong `frontend/` đã hoàn thành. Nhiệm vụ hiện tại là kết nối UI với backend thật, giữ được chế độ mock để phát triển độc lập và xử lý đầy đủ các trạng thái giao diện.

## 1. Đọc trước khi sửa

Hãy đọc:

- `docs/requirement.md`
- `docs/architecture.md`
- `docs/sequence-flow.md`
- `docs/plan/14-day-mvp-plan.md`
- `frontend/src/App.tsx`
- `frontend/src/types/soc.ts`
- `frontend/src/lib/mock-data.ts`
- `frontend/src/components/soc/search-section.tsx`
- `frontend/src/components/soc/result-tabs.tsx`
- `frontend/src/components/soc/event-detail-drawer.tsx`
- `frontend/vite.config.ts`
- `frontend/nginx.conf`
- Backend controller/DTO:
  - `NaturalLanguageSearchRequest`
  - `NaturalLanguageSearchResponse`
  - `SearchErrorResponse`
  - `EventDetailResponse`
  - `EventErrorResponse`

Kiểm tra trạng thái Git trước khi sửa. Không xóa hoặc ghi đè các thay đổi frontend hiện có.

## 2. Phạm vi và nguyên tắc

- Frontend: React + TypeScript + Vite + Tailwind CSS + shadcn/ui.
- Dùng native `fetch`; không thêm Axios hoặc thư viện data-fetching mới.
- Không hardcode `http://localhost:8081` trong source code.
- Frontend gọi endpoint tương đối `/api/v1/...`.
- Khi chạy Vite local, `vite.config.ts` proxy `/api` tới `http://localhost:8081`.
- Khi chạy Docker, Nginx frontend proxy `/api` tới `http://backend:8080`.
- Giữ nguyên dark SOC design, Recharts, sidebar, query transparency, country flag và event detail drawer.
- Không triển khai summary thật, history, audit log, auth hoặc backend CSV trong prompt này.

## 3. API contract chính xác

### Natural language search

```http
POST /api/v1/search
Content-Type: application/json
```

Request:

```json
{
  "question": "Show me failed login attempts from China in the last 24h",
  "page": 0,
  "size": 20
}
```

Response dùng snake_case:

```ts
type NaturalLanguageSearchResponseDto = {
  original_question: string
  mode: 'search' | 'aggregation'
  search_plan: SearchPlanDto
  generated_dsl: Record<string, unknown>
  total: number
  page: number
  size: number
  total_pages: number
  llm_latency_ms: number
  search_latency_ms: number
  latency_ms: number
  aggregation_type:
    | 'count'
    | 'group_by'
    | 'top_n'
    | 'date_histogram'
    | null
  aggregation_results: AggregationResultItemDto[]
  chart_metadata: ChartMetadataDto | null
  events: SearchEventDto[]
}
```

Quy ước:

- `mode = "search"`:
  - `events` chứa dữ liệu;
  - `aggregation_type = null`;
  - `aggregation_results = []`;
  - `chart_metadata = null`.
- `mode = "aggregation"`:
  - `events = []`;
  - `aggregation_results` và `chart_metadata` chứa dữ liệu aggregation;
  - `total_pages = 0`.

Search error response:

```ts
type SearchErrorResponseDto = {
  message: string
  errors: string[]
}
```

Backend có thể trả:

- `400`: request không hợp lệ;
- `502`: LLM unavailable hoặc output LLM vẫn invalid sau repair;
- `503`: Elasticsearch/search dependency unavailable.

### Event detail

```http
GET /api/v1/events/{event_id}
```

Phải dùng `encodeURIComponent(eventId)` khi tạo URL.

Response:

```ts
type EventDetailResponseDto = {
  event_id: string
  index_name: string
  timestamp: string
  source: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  event_type: string
  user: string
  host: string
  ip: string
  country_code: string
  message: string
  raw: string
}
```

Error response:

```ts
type EventErrorResponseDto = {
  message: string
}
```

Backend có thể trả `400`, `404` hoặc `503`.

## 4. API client và mock mode

Tạo package riêng, ví dụ:

```text
frontend/src/services/api-client.ts
frontend/src/services/search-api.ts
```

Yêu cầu:

1. Tạo helper generic gọi `fetch` và parse JSON.
2. Nếu HTTP status không thành công, throw `ApiError` có tối thiểu:
   - `status`;
   - `message`;
   - `errors`.
3. Không trả stack trace hoặc response body thô ra UI.
4. Hỗ trợ `AbortSignal` để hủy request cũ.
5. API tối thiểu:

```ts
searchEvents(
  request: NaturalLanguageSearchRequestDto,
  signal?: AbortSignal,
): Promise<NaturalLanguageSearchResponseDto>

getEventDetail(
  eventId: string,
  signal?: AbortSignal,
): Promise<EventDetailResponseDto>
```

Tạo `frontend/.env.example`:

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=
```

Quy ước:

- `VITE_USE_MOCK` là biến build-time của Vite.
- Parse bằng `import.meta.env.VITE_USE_MOCK === "true"`.
- Mặc định là `false`.
- `VITE_API_BASE_URL` mặc định rỗng để dùng same-origin `/api`.
- Chỉ dùng `VITE_API_BASE_URL` khi thật sự cần gọi một origin khác.

Không được tự động fallback sang mock khi backend thật lỗi. Nếu API thật lỗi, UI phải hiển thị Error state để lỗi tích hợp được phát hiện.

Khi `VITE_USE_MOCK=true`:

- Không gọi mạng.
- Mock service trả Promise có cùng DTO với backend thật.
- Có thể delay cố định ngắn, ví dụ 300 ms, để kiểm tra Loading state.
- Reuse `mockScenarios` và `mockEventDetails`.
- Nếu câu hỏi hoặc event id không được mock hỗ trợ, trả `ApiError` có kiểm soát; không đoán hoặc tự chọn scenario đầu tiên.

## 5. Chuẩn hóa TypeScript DTO

Cập nhật `frontend/src/types/soc.ts` để phản ánh đúng backend:

- Thêm `NaturalLanguageSearchRequestDto`.
- Thêm `NaturalLanguageSearchResponseDto`.
- Thêm `SearchErrorResponseDto`.
- Thêm `EventErrorResponseDto`.
- Cho phép các field nullable đúng backend:
  - `aggregation_type`;
  - `chart_metadata`;
  - `search_plan.filters`;
  - `search_plan.aggregation`;
  - `search_plan.message_query`.

Không dùng `any`.

API client cần kiểm tra tối thiểu các field discriminant ở runtime:

- response là object;
- `mode` là `search` hoặc `aggregation`;
- `events` và `aggregation_results` là array;
- `generated_dsl` và `search_plan` là object.

Không thêm Zod hoặc validation library mới trong prompt này.

## 6. State model trong frontend

Không tiếp tục duy trì nhiều state độc lập như `mode`, `events`, `aggregationResults`, `searchPlan`, `generatedDsl` nếu các giá trị này đều đến từ cùng một response.

Ưu tiên một state response duy nhất:

```ts
const [response, setResponse] =
  useState<NaturalLanguageSearchResponseDto | null>(null)
```

Sau đó derive:

```ts
const mode = response?.mode
const events = response?.events ?? []
const aggregationResults = response?.aggregation_results ?? []
```

Tạo request state rõ ràng:

```ts
type RequestStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error'
```

State tối thiểu:

- `question`;
- `submittedRequest` để Retry đúng request cuối cùng;
- `response`;
- `requestStatus`;
- `searchError`;
- `activeTab`;
- `page`;
- `size`.

Khi chạy API thật, trạng thái ban đầu là `idle`, không hiển thị mock result như thể đó là dữ liệu backend thật.

Khi chạy mock mode, có thể giữ initial mock scenario hiện tại nhưng phải có badge rõ `Mock Dataset`.

## 7. Search flow

Tạo một hàm orchestration duy nhất, ví dụ:

```ts
executeSearch({
  question,
  page,
  size,
}: NaturalLanguageSearchRequestDto): Promise<void>
```

Flow:

1. Trim question.
2. Reject question blank ở frontend.
3. Set `loading`.
4. Clear error và result cũ để tránh hiển thị question mới với response cũ.
5. Hủy search request trước đó bằng `AbortController`.
6. Gọi search service.
7. Bỏ qua response của request đã bị abort.
8. Map response theo `mode`.
9. Set tab active:
   - `search` -> `raw`;
   - `aggregation` -> `analytics`.
10. Xác định empty:
    - search: `events.length === 0`;
    - aggregation: `aggregation_results.length === 0`.
11. Set `success` hoặc `empty`.
12. Nếu lỗi không phải abort, set `error`.

Trong khi loading:

- Disable nút Search để tránh submit trùng.
- Hiển thị spinner trong nút.
- Hiển thị Skeleton tại metrics và vùng result.
- Không hiển thị dữ liệu cũ như thể đó là kết quả của request mới.

## 8. Error, empty và idle UI

Chỉ thêm component shadcn/ui cần thiết:

- `Alert`;
- `Skeleton`;
- spinner có thể dùng icon Lucide `LoaderCircle`.

### Idle

- Hiển thị hướng dẫn nhập câu hỏi hoặc chọn Suggested Query.
- Không hiển thị số liệu mock khi `VITE_USE_MOCK=false`.

### Empty

- HTTP vẫn là `200`.
- Hiển thị message rõ:
  - search: không tìm thấy event phù hợp;
  - aggregation: không có bucket phù hợp.
- `events = []` hoặc `aggregation_results = []` không được coi là exception.

### Error

- Hiển thị Alert màu đỏ.
- Hiển thị `message`.
- Nếu có `errors`, render danh sách ngắn gọn.
- Có nút Retry dùng đúng `submittedRequest` cuối cùng.
- Không hiển thị stack trace.

## 9. Render response đa hình

Giữ hai tab hiện tại để layout ổn định, nhưng:

- `mode = search`:
  - active `Raw Events`;
  - disable `Analytics View`;
  - render `events`.
- `mode = aggregation`:
  - active `Analytics View`;
  - disable `Raw Events`;
  - render Recharts và Summary Table từ cùng `aggregation_results`.

Không render đồng thời event data và aggregation data.

`chart_metadata.chart_type` map:

- `NUMBER` -> number/KPI view;
- `BAR` -> bar chart;
- `LINE` -> line chart.

`generated_dsl` và `search_plan` phải tiếp tục render dạng object pretty JSON, không stringify hai lần.

Metrics phải lấy từ API response:

- mode;
- total;
- SearchPlan validated;
- `llm_latency_ms`;
- `search_latency_ms`.

## 10. Pagination thật cho search mode

Requirement MVP có pagination, vì vậy nối pagination với API:

- Search mới hoặc Suggested Query mới luôn reset `page = 0`.
- Previous:
  - disable khi `page <= 0`;
  - gọi lại cùng question với `page - 1`.
- Next:
  - disable khi `page + 1 >= total_pages`;
  - gọi lại cùng question với `page + 1`.
- Dùng `page`, `size`, `total_pages` từ response để render.
- Không hiển thị pagination event list trong aggregation mode.
- `SearchPlan.size` không được dùng làm bucket limit aggregation ở frontend.

## 11. Event Detail Drawer

Khi click hoặc nhấn Enter/Space trên một event row:

1. Lấy `event_id`.
2. Mở Drawer ngay.
3. Set detail state `loading`.
4. Gọi `GET /api/v1/events/{event_id}`.
5. Trong Drawer hiển thị Skeleton khi loading.
6. Success:
   - tab Formatted Fields hiển thị metadata;
   - tab Raw Log hiển thị `raw`;
   - country code tiếp tục hiển thị cờ nếu có asset.
7. Error:
   - `404`: hiển thị Event not found;
   - `503`: hiển thị Event detail service unavailable;
   - có nút Retry.
8. Khi chọn event khác hoặc đóng Drawer, abort request detail trước đó.

State detail nên độc lập với search state:

```ts
type DetailStatus = 'idle' | 'loading' | 'success' | 'error'
```

## 12. Suggested Queries và search input

- Click Suggested Query:
  - cập nhật input;
  - reset page về 0;
  - gọi search ngay, không cần bấm Search lần nữa.
- Nút Search:
  - chạy câu hỏi đang nhập;
  - hỗ trợ `Ctrl + Enter` hoặc `Cmd + Enter`.
- Trong API mode, cho phép mọi câu hỏi không blank.
- Trong mock mode, chỉ các câu được mock hỗ trợ mới chạy; câu không hỗ trợ trả lỗi rõ.

## 13. AI Summary và CSV hiện tại

Backend `POST /api/v1/search` hiện chưa trả field `summary`.

Vì vậy:

- Không được tự bịa AI summary từ response.
- `Mock AI Summary` chỉ hiển thị khi `VITE_USE_MOCK=true`.
- Khi API thật, ẩn summary block hoặc hiển thị placeholder rõ `AI summary is not available yet`.
- Không gọi LLM trực tiếp từ frontend.

Backend CSV chưa thuộc prompt tích hợp này:

- Giữ client-side mock export chỉ trong mock mode.
- Trong API mode, disable hoặc ẩn export và ghi rõ backend export sẽ được tích hợp ở task sau.
- Không gọi endpoint CSV chưa tồn tại.

## 14. Verification bắt buộc

### Static verification

Chạy:

```powershell
cd frontend
npm run lint
npm run build
npm audit --audit-level=high
```

### Mock mode

Tạo `frontend/.env.local`:

```env
VITE_USE_MOCK=true
```

Verify:

- Không cần backend vẫn search được các Suggested Queries.
- Loading state xuất hiện.
- Search/aggregation tự chọn đúng tab.
- Event detail mock hoạt động.
- Câu không hỗ trợ trả error rõ.

### API mode

```env
VITE_USE_MOCK=false
```

Backend và dataset phải đang chạy.

Verify tối thiểu:

1. Search:
   - `Show me failed login attempts from China in the last 24h`
   - response render Raw Events.
2. Aggregation:
   - `Đếm số lần login thất bại theo từng user trong 7 ngày qua`
   - response render chart và Summary Table.
3. Event detail:
   - click một row;
   - Drawer trả metadata và raw log.
4. No-result:
   - trả Empty state, không trả Error state.
5. Backend/Elasticsearch unavailable:
   - Alert lỗi và Retry hoạt động.
6. Pagination:
   - Previous/Next gửi đúng page.
7. Browser console không có uncaught exception hoặc CORS error.

## 15. Báo cáo sau khi hoàn thành

Báo:

- file đã tạo hoặc sửa;
- cấu trúc API client;
- cách bật/tắt mock mode;
- kết quả lint/build/audit;
- các case đã test bằng API thật;
- phần nào chưa triển khai.

Không triển khai summary, history, audit persistence, auth hoặc backend CSV trong prompt này.
