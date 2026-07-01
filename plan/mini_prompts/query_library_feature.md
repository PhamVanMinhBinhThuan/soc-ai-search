# Prompt: Implement Guide / Query Library Page

## Handoff Note For The Next AI

Bạn là AI khác được giao tiếp tục task này. Hãy làm **đúng scope** trong prompt, không tự mở rộng.

Trước khi code, bắt buộc đọc các file sau để hiểu project hiện tại:

- `plan/mini_prompts/query_library_feature.md`
- `plan/mini_prompts/query_library_questions.md`
- `frontend/src/App.tsx`
- `frontend/src/components/soc/search-section.tsx`
- `frontend/src/components/soc/soc-sidebar.tsx`
- `frontend/src/components/soc/follow-up-suggestions.tsx`
- `frontend/src/lib/mock-data.ts`
- `frontend/src/types/soc.ts`

Các quyết định sản phẩm đã chốt, **không đổi**:

1. Làm **page riêng** `/query-library`, không làm modal/drawer.
2. Sidebar group tên **Guide**, child item tên **Query Library**.
3. Search page chỉ thêm chip/button **View queries** cạnh 5 suggested queries.
4. Mỗi query item **không cần title**. Nội dung chính là `question`.
5. Query Library là **static/deterministic**, lấy từ `query_library_questions.md` rồi chuyển thành frontend data file.
6. Không gọi LLM.
7. Không gọi backend.
8. Không tạo audit khi click item.
9. Nút `Use` **không auto-run search**. Nó chỉ:
   - navigate về `/search`;
   - fill câu hỏi vào search box;
   - focus search input.
10. User phải tự bấm `Search` để chạy query.
11. Không đổi SearchPlan validator/compiler/backend.
12. Không phá AI Follow-up Suggestions hiện tại. Hai chức năng này khác nhau:
   - AI Follow-up Suggestions: LLM-generated, sau search thành công.
   - Query Library: static curated questions, page riêng.

Những lỗi cần tránh:

- Đừng đổi label `View queries` thành `More Suggestions` hoặc `View all queries`.
- Đừng làm item có title riêng nếu không cần.
- Đừng tự chạy query khi click `Use`.
- Đừng xóa 5 suggested queries hiện tại.
- Đừng import trực tiếp file `.md` ở runtime.
- Đừng thêm backend API mới cho task này.
- Đừng tạo static fallback cho AI Follow-up Suggestions trong task này.
- Đừng dùng popup nếu prompt đã yêu cầu page riêng.

Nếu cần chọn giải pháp kỹ thuật:

- Ưu tiên tạo `frontend/src/lib/query-library.ts`.
- Ưu tiên component riêng: `frontend/src/components/soc/query-library-page.tsx`.
- Ưu tiên reuse cơ chế focus search input đã có trong `SearchSection` / `App.tsx`.
- Ưu tiên test component riêng thay vì viết test integration quá nặng.

## Role

Bạn là **Senior Frontend Engineer** chuyên React, TypeScript, Tailwind CSS, UI/UX cho dashboard SOC/SIEM dark theme, và có tư duy sản phẩm tốt cho hệ thống điều tra an ninh mạng.

## Bối Cảnh Project

Project hiện tại là **SOC AI Search**.

Ứng dụng đã có:

- Trang `Event Search`.
- 5 suggested queries nhanh bên dưới ô search.
- Static Query Library / Playbooks ban đầu trong tài liệu.
- AI Follow-up Suggestions riêng, do LLM sinh sau search thành công.
- Sidebar dark theme.
- Dashboard, Investigations, Audit Logs.
- Natural Language -> SearchPlan -> Validator -> DSL -> Elasticsearch.

Tôi muốn làm một chức năng mới: **Query Library page**.

Đây là thư viện câu hỏi mẫu deterministic, lấy từ file:

- `plan/mini_prompts/query_library_questions.md`

Lưu ý:

- Không gọi LLM để tạo Query Library.
- Query Library khác với AI Follow-up Suggestions.
- Query Library là danh sách câu hỏi mẫu curated để user tham khảo.
- Các câu hỏi phải bám sát synthetic dataset để demo có kết quả.

## Mục Tiêu

Tạo một trang riêng:

```text
/query-library
```

Trang này hiển thị nhiều câu hỏi mẫu theo nhóm:

- `All`
- `Search`
- `Aggregation`
- `Top N`
- `Count`
- `Time Series`
- `Line Chart`
- `Bar Chart`
- `Multi-filter`
- `Playbook`

User có thể:

- Search/filter trong thư viện câu hỏi.
- Lọc theo category/tag.
- Phân trang.
- Copy câu hỏi.
- Use câu hỏi: chuyển về trang `/search`, điền câu hỏi vào ô search, focus input, **không tự chạy query**.

## Quyết Định UX Đã Chốt

### 1. Sidebar

Thêm một nhóm sidebar mới tên:

```text
Guide
```

Bên trong có item con:

```text
Query Library
```

Khi click:

```text
/query-library
```

Lý do chọn `Guide`:

- Sau này có thể thêm `Search Schema`, `SearchPlan Flow`, `User Guide`.
- Không dùng `Instruction` vì nghe giống prompt nội bộ.
- `Guide` tự nhiên hơn trong UI sản phẩm.

Sidebar mong muốn:

```text
Dashboard
Event Search
Investigations

Guide
  Query Library

Admin Tools
  System Audit Logs
```

Nếu sidebar hiện tại có collapse/expand group, hãy làm `Guide` tương tự style của `Investigations` hoặc `Admin Tools`.

### 2. Search Page Quick Link

Giữ nguyên 5 suggested queries hiện tại bên dưới ô search.

Thêm một chip/button nhỏ ở cuối hàng suggested:

```text
View queries
```

Khi click:

```text
navigate('/query-library')
```

Không mở popup/modal.
Không gọi API.
Không chạy search.

Ví dụ UI:

```text
Suggested:
[Failed login from China] [Critical events] [Failed login by user] [Top source IPs] [Events by hour] [View queries]
```

Label phải là:

```text
View queries
```

Không dùng `View all queries`.
Không dùng `More Suggestions`.

Lý do:

- `View queries` ngắn, rõ, không hứa là “all”.
- Đặt cạnh 5 suggested query rất tự nhiên.

### 3. Query Item Không Cần Title

Mỗi item trong Query Library **không cần title riêng**.

Question chính là nội dung trung tâm.

Ví dụ card:

```text
Show failed_login trend by hour in the last 24 hours

[AGGREGATION] [LINE] [TIME SERIES] [failed_login]

Expected: Line chart

[Copy icon] [Use icon]
```

Không tạo field `title` nếu không cần.

### 4. Cách A - Use Không Auto-run

Khi user click icon `Use`:

```text
Click Use
  -> navigate('/search')
  -> fill main search input with item.question
  -> focus search input
  -> do NOT auto-run search
```

User phải tự bấm nút `Search`.

Lý do:

- User vẫn kiểm soát.
- Không phát sinh search/audit/token ẩn.
- Nhất quán với AI Follow-up Suggestions.

Không thêm nút `Run`.
Không auto-submit.

## File Cần Tham Khảo

Đọc kỹ các file sau trước khi code:

- `plan/mini_prompts/query_library_questions.md`
- `frontend/src/lib/mock-data.ts`
- `frontend/src/components/soc/search-section.tsx`
- `frontend/src/App.tsx`
- `frontend/src/components/soc/soc-sidebar.tsx`
- `frontend/src/types/soc.ts`
- `frontend/src/components/soc/follow-up-suggestions.tsx`
- `frontend/src/components/soc/query-breakdown.tsx`
- `frontend/src/components/soc/investigations/investigations-page.tsx`

Nếu project đã có component phân trang dùng trong Raw Events / Investigations, hãy reuse để UI đồng nhất.

## Data Source

Tạo data file frontend mới:

```text
frontend/src/lib/query-library.ts
```

Lấy câu hỏi từ:

```text
plan/mini_prompts/query_library_questions.md
```

Không import `.md` trực tiếp ở runtime.
Hãy chuyển nội dung thành TypeScript data rõ ràng.

Data type đề xuất:

```ts
export type QueryLibraryCategory =
  | 'search'
  | 'aggregation'
  | 'top_n'
  | 'count'
  | 'time_series'
  | 'line_chart'
  | 'bar_chart'
  | 'multi_filter'
  | 'playbook'

export type QueryLibraryExpectedView =
  | 'event_logs_table'
  | 'number'
  | 'bar_chart'
  | 'line_chart'

export type QueryLibraryItem = {
  id: string
  question: string
  categories: QueryLibraryCategory[]
  badges: string[]
  expectedView: QueryLibraryExpectedView
  tags: string[]
}
```

Ví dụ item:

```ts
{
  id: 'failed-login-cn-24h',
  question: 'Show failed_login events from CN in the last 24 hours',
  categories: ['search', 'multi_filter'],
  badges: ['SEARCH', 'MULTI-FILTER'],
  expectedView: 'event_logs_table',
  tags: ['failed_login', 'CN', '24h', 'event logs'],
}
```

Không cần `title`.

## Nội Dung Câu Hỏi

Các câu hỏi phải phủ được nhiều demo case:

### Search

- failed_login
- account_lockout
- malware_detected
- privilege_escalation
- firewall_block
- suspicious_outbound
- large_transfer

### Aggregation

- group by user
- group by severity
- group by event_type
- group by host
- group by country_code

### Top N

- top source IPs
- top users
- top hosts
- top event types

### Count

- count all events in 24h
- count critical/high events
- count failed_login events
- count account_lockout events

### Time Series / Line Chart

- events by hour
- failed_login trend by hour
- account_lockout trend by hour
- malware trend by day if dataset supports it

### Bar Chart

- group by user
- group by severity
- top IPs
- top hosts

### Multi-filter

Cần có một số câu hỏi dùng nhiều filter cùng lúc:

- event_type + severity + country
- event_type + user + time range
- source + host + event_type
- severity + user + country

Ví dụ:

```text
Show high or critical failed_login events from CN for admin or vpn.user in the last 7 days
```

### Playbook

Playbook là các câu hỏi/kịch bản điều tra SOC, không nhất thiết là một filter đơn giản.

Ví dụ:

```text
Investigate possible brute force activity by showing failed_login events grouped by source IP in the last 24 hours
```

Các playbook nên vẫn là một câu hỏi natural-language có thể search được.

## Trang Query Library - UI Yêu Cầu Chi Tiết

Route:

```text
/query-library
```

Page title:

```text
Query Library
```

Subtitle:

```text
Reusable SOC investigation questions based on the synthetic dataset.
```

Tone:

- Dark SOC/SIEM.
- Enterprise dashboard.
- Ít chữ nhưng rõ.
- Font/size đồng nhất với Dashboard / Investigations / Search page.

## UI Visual Spec Bắt Buộc

Để tránh AI tự thiết kế lệch style, hãy bám các lựa chọn sau.

### Icon Cố Định

Dùng `lucide-react`.

Sidebar:

- Group `Guide`: dùng icon `BookOpen`.
- Child `Query Library`: dùng icon `Library` hoặc `ListSearch`. Ưu tiên `Library` nếu icon này có sẵn trong package, nếu không có thì dùng `ListSearch`.

Search page suggested row:

- Chip `View queries`: dùng icon `BookOpen`.

Query Library page:

- Page title icon: `Library` hoặc `BookOpen`.
- Search input icon: `Search`.
- Filter/category icon nếu cần: `SlidersHorizontal`.
- Copy button: `Copy`.
- Use button: `CornerDownLeft`.
- Empty state icon: `SearchX` hoặc `FileQuestion`.

Không dùng icon gây hiểu nhầm như `Play`, vì task này **không auto-run query**.

### Màu Và Tailwind Class Gợi Ý

Page wrapper:

```tsx
className="flex-1 min-w-0 bg-background text-foreground"
```

Main container:

```tsx
className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 p-4 sm:p-6"
```

Header card hoặc header row:

```tsx
className="rounded-2xl border border-border bg-card p-5"
```

Page title:

```tsx
className="text-2xl font-bold tracking-tight text-foreground"
```

Subtitle:

```tsx
className="mt-1 text-sm text-muted-foreground"
```

Search input:

```tsx
className="h-11 rounded-xl border border-border bg-zinc-950/50 px-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-cyan-400/50 focus-visible:ring-2 focus-visible:ring-cyan-400/20"
```

Filter chip inactive:

```tsx
className="rounded-full border border-border bg-secondary/45 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-cyan-400/30 hover:text-foreground"
```

Filter chip active:

```tsx
className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-100 shadow-[0_0_18px_-12px_#22d3ee]"
```

Query card:

```tsx
className="rounded-2xl border border-border bg-zinc-950/45 p-4 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/5"
```

Question text:

```tsx
className="text-sm font-semibold leading-6 text-foreground sm:text-base"
```

Expected view text:

```tsx
className="text-xs text-muted-foreground"
```

Action button base:

```tsx
className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-secondary/45 text-muted-foreground transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-100"
```

Use button nên nổi hơn Copy một chút:

```tsx
className="inline-flex size-9 items-center justify-center rounded-lg border border-cyan-400/35 bg-cyan-500/10 text-cyan-100 transition-colors hover:bg-cyan-400/20"
```

### Badge Style Cụ Thể

Tạo helper map màu badge, ví dụ:

```ts
const badgeClassName: Record<string, string> = {
  SEARCH: "border-cyan-400/30 bg-cyan-500/10 text-cyan-100",
  AGGREGATION: "border-violet-400/30 bg-violet-500/10 text-violet-100",
  COUNT: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
  "TOP N": "border-amber-400/30 bg-amber-500/10 text-amber-100",
  LINE: "border-sky-400/30 bg-sky-500/10 text-sky-100",
  BAR: "border-purple-400/30 bg-purple-500/10 text-purple-100",
  PLAYBOOK: "border-rose-400/30 bg-rose-500/10 text-rose-100",
  "MULTI-FILTER": "border-slate-400/30 bg-slate-500/10 text-slate-100",
}
```

Badge base:

```tsx
className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
```

### Layout Card Chi Tiết

Mỗi card nên bố trí:

```text
question text                                               [Copy] [Use]

[BADGE] [BADGE] [tag] [tag]
Expected: Line chart
```

Desktop:

- Question và action buttons nằm cùng hàng.
- Tags nằm dưới.

Mobile:

- Question full width.
- Buttons nằm dưới hoặc bên phải nhưng không bị vỡ layout.

### View Queries Chip

Chip `View queries` ở search page:

- Không quá nổi bật hơn 5 suggested chips.
- Có icon `BookOpen`.
- Text chính xác: `View queries`.

Class gợi ý:

```tsx
className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-100 transition-colors hover:bg-cyan-400/15"
```

### Typography

Không dùng font lạ.
Giữ font hiện tại của app.

Ưu tiên:

- Page title: `text-2xl font-bold`
- Section title: `text-sm font-semibold`
- Query text: `text-sm sm:text-base font-semibold leading-6`
- Metadata/tag: `text-xs`
- Badge: `text-[11px] uppercase tracking-[0.12em]`

### Motion / Animation

Không cần animation phức tạp.

Chỉ dùng:

- hover transition;
- subtle border/background transition;
- copied state ngắn 1-2 giây.

Không thêm `framer-motion` nếu chưa cần.

### Layout Gợi Ý

```text
Query Library                                      [total queries]
Reusable SOC investigation questions...

[ Search queries...                                      ]

[All] [Search] [Aggregation] [Top N] [Count] [Time Series] [Line Chart] [Bar Chart] [Multi-filter] [Playbook]

---------------------------------------------------------

Card 1
Show failed_login events from CN in the last 24 hours

[SEARCH] [MULTI-FILTER] [failed_login] [CN] [24h]
Expected: Event logs table
                                     [copy icon] [use icon]

Card 2
Show failed_login trend by hour in the last 24 hours

[AGGREGATION] [LINE] [TIME SERIES]
Expected: Line chart
                                     [copy icon] [use icon]

Pagination
Showing 1-10 of 42                              [prev] [next]
```

### Card Style

Mỗi query card:

- Background: `bg-card` hoặc `bg-zinc-950/45`.
- Border: `border-border`.
- Hover: `hover:border-cyan-400/40`, `hover:bg-cyan-400/5`.
- Rounded: `rounded-2xl` hoặc `rounded-xl`.
- Padding: đủ thoáng, không quá cao.
- Question text: font rõ, `text-sm` hoặc `text-base`, `font-semibold`.
- Tags/badges: nhỏ, uppercase, màu theo loại.

Badge màu gợi ý:

- `SEARCH`: cyan/teal.
- `AGGREGATION`: purple.
- `COUNT`: emerald.
- `TOP N`: amber.
- `LINE`: sky/cyan.
- `BAR`: violet.
- `PLAYBOOK`: rose hoặc amber.
- `MULTI-FILTER`: slate/cyan.

### Search Box Trong Query Library

Placeholder:

```text
Search queries, tags, event types, users, hosts...
```

Search client-side theo:

- `question`
- `badges`
- `tags`
- `categories`
- `expectedView`

Không cần backend.

### Filter Chips

Filter chips:

```text
All
Search
Aggregation
Top N
Count
Time Series
Line Chart
Bar Chart
Multi-filter
Playbook
```

Khi active:

- border cyan/purple nổi bật.
- background nhẹ.

Không dùng dropdown cho category vì số lượng vừa phải và nên nhìn rõ.

### Pagination

Phân trang client-side.

Mỗi trang:

```text
8 hoặc 10 queries
```

Ưu tiên 8 nếu card cao, 10 nếu compact.

Pagination UI nên giống pagination trong Raw Events / Investigations nếu có thể.

Không infinite scroll.

### Empty State

Nếu không có query match search/filter:

```text
No matching queries
Try another keyword or clear filters.
```

Style đồng nhất với empty state của app.

## Button / Icon Behavior

### Copy Icon

Icon gợi ý:

- `Copy`
- hoặc `Clipboard`

Behavior:

```text
copy item.question to clipboard
show small success state: Copied
```

Không cần toast lớn nếu app chưa có toast.
Có thể đổi icon/text nhỏ tạm thời trong 1-2 giây.

### Use Icon

Icon gợi ý:

- `Send`
- `ArrowUpRight`
- `Search`
- `CornerDownLeft`

Tooltip / aria-label:

```text
Use this query
```

Behavior:

```text
navigate('/search')
set main search input = item.question
focus search input
do not submit
```

Không hiện chữ `Run`.
Không auto-search.

## Kết Nối App State

Hiện tại `SearchSection` đã có:

- `question`
- `onQuestionChange`
- search input focus signal hoặc ref nếu đã làm cho AI Follow-up Suggestions.

Hãy reuse cơ chế đó.

Gợi ý:

- Đưa hàm `useQuery(question)` hoặc `handleUseLibraryQuery(question)` vào `App.tsx`.
- Khi từ Query Library click `Use`:
  - navigate `/search`;
  - set `question`;
  - tăng `searchFocusSignal`;
  - không gọi `submitQuestion`.

Nếu cần truyền state qua `navigate`, có thể dùng:

```ts
navigate('/search', { state: { queryToUse: item.question } })
```

Sau đó `App` đọc `location.state` và set question/focus.

Nhưng ưu tiên giải pháp đơn giản, tránh race condition.

## Search Page Suggested Row

Trong `SearchSection`:

- Giữ 5 suggested query hiện tại.
- Thêm chip/button `View queries`.
- Click `View queries` gọi callback mới:

```ts
onOpenQueryLibrary?: () => void
```

Trong `App.tsx`:

```ts
onOpenQueryLibrary={() => navigate('/query-library')}
```

Style `View queries`:

- giống suggested chip nhưng có icon nhỏ `BookOpen` hoặc `Library`.
- không quá nổi bật hơn Search button.
- hover border cyan.

## Sidebar

Trong `SocSidebar`:

- Thêm group `Guide`.
- Child item: `Query Library`.
- Active state khi route là `/query-library`.
- Dùng icon phù hợp:
  - Group Guide: `BookOpen`, `Compass`, `GraduationCap`.
  - Query Library: `Library`, `ListSearch`, `BookMarked`.

Không làm sidebar quá rối.

## Không Được Làm

- Không gọi LLM.
- Không gọi backend.
- Không auto-run query khi click `Use`.
- Không tạo audit khi click `Use`.
- Không thay đổi SearchPlan validator/compiler.
- Không thay đổi 5 suggested queries hiện tại trừ việc thêm `View queries`.
- Không làm modal/drawer nữa. Đây là **page riêng**, không phải popup.
- Không dùng title riêng cho item nếu question đã đủ rõ.

## Accessibility

Đảm bảo:

- Button có `aria-label` rõ:
  - `Copy query`
  - `Use this query`
  - `View queries`
- Filter chips có `aria-pressed`.
- Search input có label hoặc aria-label.
- Keyboard navigation cơ bản dùng được.

## Test Bắt Buộc

Thêm/cập nhật frontend tests.

Gợi ý files:

- `frontend/src/components/soc/query-library-page.test.tsx`
- `frontend/src/components/soc/search-section.test.tsx` nếu có
- `frontend/src/App.test.tsx` nếu route integration đã có pattern

Test tối thiểu:

1. Query Library page render được title `Query Library`.
2. Data từ `query-library.ts` render ra ít nhất vài câu hỏi.
3. Search input lọc theo question/tag.
4. Category filter `Search` chỉ hiển thị search items.
5. Category filter `Aggregation` chỉ hiển thị aggregation items.
6. Pagination hoạt động.
7. Copy button gọi clipboard API.
8. Use button gọi callback/navigate về `/search`, fill input, focus search input, không submit search.
9. `SearchSection` hiển thị chip `View queries`.
10. Click `View queries` navigate đến `/query-library`.

Nếu test App integration quá phức tạp, hãy test component riêng và helper function rõ ràng.

## Verification

Chạy:

```bash
cd frontend
npm run lint
npm run test
npm run build
```

Nếu có thay đổi route/App lớn, chạy thêm các test liên quan.

Không cần chạy backend test nếu không đổi backend.

## Kỳ Vọng Cuối Cùng

Sau khi hoàn thành:

- Sidebar có `Guide > Query Library`.
- Search page có chip `View queries` cạnh 5 suggested query.
- `/query-library` là một trang đẹp, đồng nhất dark SOC theme.
- Page có search/filter/pagination.
- Câu hỏi lấy từ `query_library_questions.md` và chuyển thành `query-library.ts`.
- Mỗi item không cần title, question là nội dung chính.
- Item có badges/tags/expected view.
- Có Copy icon.
- Có Use icon.
- Click Use chỉ fill + focus search input, không auto-run.
- Không gọi LLM, không gọi backend, không tạo audit.

## Câu Giải Thích Khi Bảo Vệ

> Query Library là thư viện query/playbook mẫu deterministic, giúp analyst mới biết cách bắt đầu điều tra. Các câu hỏi được thiết kế theo synthetic dataset nên demo ổn định. Khi user chọn một query, hệ thống chỉ đưa câu hỏi vào ô search để user xác nhận; sau đó nếu user bấm Search thì câu hỏi vẫn đi qua pipeline Natural Language -> SearchPlan -> Validator -> DSL -> Elasticsearch, không bypass guardrail và không tạo audit ẩn.
