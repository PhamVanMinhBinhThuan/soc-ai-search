# Day 06 - Prompt Thiết Kế UI Bằng Stitch Cho SOC AI Search MVP

File này dùng để copy prompt vào AI UI generator như Stitch nhằm tạo giao diện cho MVP.

Quy ước ngôn ngữ trong file:

- Phần hướng dẫn, ghi chú và tiêu đề dùng tiếng Việt có dấu.
- Phần prompt copy trực tiếp vào Stitch dùng tiếng Anh để công cụ sinh UI hiểu ổn định hơn.
- Các câu hỏi demo tiếng Việt được giữ nguyên tiếng Việt có dấu vì đây là dữ liệu nghiệp vụ cần hiển thị trong UI.

## 1. Bối Cảnh Ngắn Gọn

Dự án: **SOC AI Event Search**

Mục tiêu MVP:

- Analyst nhập câu hỏi tự nhiên bằng tiếng Việt hoặc tiếng Anh.
- Backend chuyển câu hỏi thành `SearchPlan`.
- Backend validate `SearchPlan` và compile thành Elasticsearch DSL.
- Backend thực thi search hoặc aggregation trên Elasticsearch.
- UI phải làm nổi bật luồng cốt lõi của đề tài:
  - Natural Language Question;
  - SearchPlan;
  - Validation;
  - DSL Compilation;
  - Elasticsearch;
  - Results.
- UI hiển thị:
  - câu hỏi gốc;
  - query type `SEARCH` hoặc `AGGREGATION`;
  - `SearchPlan`;
  - `generated_dsl`;
  - bảng event search;
  - chart/table aggregation;
  - event detail gồm raw log;
  - trạng thái loading, error và empty.

Tech stack frontend đã chốt:

- React + TypeScript + Vite.
- Tailwind CSS.
- shadcn/ui.
- lucide-react.
- Recharts cho chart.

Hướng thiết kế:

- Dark SOC dashboard.
- Chuyên nghiệp, rõ nghiệp vụ, phù hợp demo tại Viettel Cyber Security.
- Có cảm giác giống SIEM/SOC investigation console, lấy cảm hứng từ Kibana Security, Splunk và Grafana nhưng không sao chép y nguyên.
- Không cần nhiều page trong MVP. Ưu tiên một dashboard chính có thể demo đầy đủ luồng.
- Trên desktop, nên chia layout:
  - khu vực chính bên trái cho Results/Aggregation;
  - panel điều tra bên phải cho `SearchPlan` và `generated_dsl`.

## 2. Prompt Tổng Thể Cho Stitch

Copy prompt này vào Stitch:

```text
Design a professional dark-mode SOC dashboard web application for an MVP project named "SOC AI Event Search".

The product helps SOC analysts search, aggregate, and investigate security events using natural language. The UI should feel like a modern SIEM/SOC investigation console inspired by Kibana Security, Splunk, and Grafana, while remaining original. It must look serious, clean, technical, and demo-ready.

Target users:
- SOC analyst
- Security engineer
- Mentor or reviewer evaluating an MVP demo

Technology constraints:
- The UI will be implemented with React, TypeScript, Tailwind CSS, shadcn/ui, lucide-react, and Recharts.
- Design components should map cleanly to shadcn/ui components such as Card, Button, Textarea, Table, Tabs, Dialog, Sheet, Badge, Skeleton, Alert, Separator, ScrollArea, and Tooltip.
- Do not design a marketing landing page. Design a real application dashboard.

Primary screen:
Create one main dashboard screen called "SOC AI Event Search".

Core value to make visible:
The UI must clearly show the AI search pipeline:
Natural Language Question -> SearchPlan -> Validation -> DSL Compilation -> Elasticsearch -> Results.
This pipeline is the main value of the project, so it should be visible near the search box.

Desktop layout:
- Top area: header, search box, and execution pipeline.
- Main area: two-column investigation layout.
- Left column around 70% width: Results or Aggregation.
- Right column around 30% width: SearchPlan and Generated DSL investigation panel.
- On smaller screens, stack these sections vertically.

Layout requirements:

1. Top header
   - App name: "SOC AI Event Search"
   - Subtitle: "AI-assisted event search for SOC analysts"
   - Backend status badge: "Backend connected"
   - Small environment badge: "MVP Demo"

2. Natural language search panel
   - Large textarea input with placeholder:
     "Ask in Vietnamese or English, e.g. Show failed login attempts from China in the last 24h"
   - Primary button: "Search"
   - Secondary button: "Clear"
   - Example question chips:
     - "Show me failed login attempts from China in the last 24h"
     - "Tìm alert critical trong 7 ngày qua"
     - "Tìm malware detected trong 7 ngày qua"
     - "Đếm số lần login thất bại theo từng user trong 7 ngày qua"
     - "Top 10 IP có nhiều alert nhất tháng này"
     - "Số event theo giờ trong 24h qua"

3. Execution pipeline panel
   Add a compact stepper or pipeline visualization directly below the search box:
   - Question
   - SearchPlan
   - Validation
   - DSL Compilation
   - Elasticsearch
   - Results

   Show completed stages with a green or cyan accent.
   Show current/loading stage with an amber accent.
   Show failed stage with a red accent.
   The purpose is to help reviewers understand the AI-to-query workflow immediately.

4. Summary metric cards
   Show five compact cards after search:
   - Query Type: SEARCH or AGGREGATION
   - Total Events
   - SearchPlan Status: VALIDATED
   - LLM Latency
   - Execution Latency

   Query Type should be a prominent badge.
   SearchPlan Status should be a green badge when validated.
   Execution Latency means Elasticsearch query latency, whether the mode is search or aggregation.

5. Main result area
   Use a two-column layout on desktop:
   - Left: Results/Aggregation content.
   - Right: Investigation panel with SearchPlan and Generated DSL.

   On mobile, stack them vertically.

6. Results and aggregation tabs
   The left content area may use tabs:
   - Results
   - Aggregation

   For mode = search, emphasize the Results tab.
   For mode = aggregation, emphasize the Aggregation tab.

7. Search result table
   For mode = search, show a dense but readable event table:
   - timestamp
   - severity
   - source
   - event_type
   - user
   - host
   - ip
   - country_code
   - message
   - action button: "View"

   Severity badge colors:
   - low: slate or blue
   - medium: amber
   - high: orange
   - critical: red

8. Aggregation result
   For mode = aggregation, show:
   - a concise natural-language aggregation explanation above the chart
   - a chart area
   - a table below the chart
   - chart_metadata display

   Example aggregation explanation:
   "Showing top 10 IP addresses with the most alerts within the last 30 days."

   Supported chart types:
   - NUMBER: big number card for count
   - BAR: bar chart for group_by and top_n
   - LINE: time-series line chart for date_histogram

   Chart containers should have a fixed desktop height around 320-400px.

   Aggregation table columns:
   - key
   - value

9. Right-side investigation panel
   On desktop screens, keep SearchPlan and Generated DSL visible in a right-side investigation panel instead of hiding them completely behind tabs.

   The panel should contain:
   - Query type badge: SEARCH or AGGREGATION
   - SearchPlan Status: VALIDATED
   - Validated SearchPlan JSON
   - Compiled Elasticsearch DSL JSON
   - Copy button for each JSON block

   Add helper text:
   - SearchPlan: "LLM output is parsed and validated before execution"
   - Generated DSL: "Generated by backend compiler after SearchPlan validation"

10. Event detail drawer or modal
   When clicking "View" on a search result row, open a right-side drawer:
   - title: "Event Detail"
   - event_id
   - timestamp
   - severity
   - source
   - event_type
   - user
   - host
   - ip
   - country_code
   - message
   - raw log in a monospace code block

   Optional visual section:
   Add a small "Investigation Timeline" section using synthetic context only.
   Example timeline items:
   - Alert Generated
   - Failed Login
   - Account Lockout
   - Privilege Escalation Check

   Make it clear this is UI context and not a real backend feature yet.

11. Initial empty state
   In the initial state, do not show a boring blank panel.
   Show suggested investigation cards that populate the search box when clicked:
   - Failed login attempts
   - Critical alerts
   - Top source IPs

   Each card should include:
   - title
   - short description
   - example question
   - small icon

12. Other states
   Include visual states for:
   - Loading state: skeleton cards and skeleton table rows
   - Error state: alert card with retry action
   - No result state: empty table with a clear message and suggestion

Visual style:
- Dark background using slate/zinc tones.
- Accent colors: cyan, emerald, amber, red.
- Use subtle borders, soft shadows, rounded cards, and clear spacing.
- Typography should look technical and readable.
- Keep density suitable for security analysts: compact tables, but enough whitespace.
- Make the dashboard feel production-like, not like a student toy project.

Responsive behavior:
- Desktop first.
- On smaller screens, stack panels vertically.
- Search panel should stay prominent.
- Right-side investigation panel should move below results on mobile.

Important content rules:
- Do not show fake API keys, passwords, or real personal data.
- Do not show real SOC logs; use synthetic demo data only.
- Do not include authentication UI unless needed as a small placeholder.
- Do not design unrelated pages such as pricing, marketing, onboarding, or documentation.

Please generate a polished UI mockup for the main dashboard with realistic synthetic demo data.
```

## 3. Prompt Riêng Cho Search Result Table

Dùng prompt này nếu muốn Stitch tập trung vào bảng kết quả search:

```text
Design the search results section for a dark SOC event search dashboard.

Context:
The user has asked: "Show me failed login attempts from China in the last 24h".
The backend returned mode = "search".

Create a professional results table with:
- timestamp
- severity badge
- source
- event_type
- user
- host
- ip
- country_code
- message
- "View" action

Add pagination controls below the table.
Add a top summary row with:
- Query Type: SEARCH
- SearchPlan Status: VALIDATED
- Total results: 312
- Page: 1
- Page size: 20
- Execution latency: 43 ms

Style:
- Dark SOC console
- Compact but readable table
- Critical and high severity rows should be visually noticeable but not noisy
- Use shadcn/ui style components
```

## 4. Prompt Riêng Cho Aggregation Và Chart

Dùng prompt này nếu muốn Stitch tập trung vào chart thống kê:

```text
Design the aggregation results section for a SOC AI Event Search dashboard.

The backend supports aggregation modes:
- count
- group_by
- top_n
- date_histogram

Create a card layout that can display:
1. COUNT as a large number card
2. GROUP_BY and TOP_N as a bar chart with a table
3. DATE_HISTOGRAM as a line chart with a table

Example question:
"Đếm số lần login thất bại theo từng user trong 7 ngày qua"

Example response:
- mode: aggregation
- aggregation_type: group_by
- chart_metadata.chart_type: BAR
- aggregation_results:
  - admin: 142
  - vpn.user: 88
  - finance.user: 61
  - svc.backup: 27

UI requirements:
- Show a prominent Query Type badge: AGGREGATION.
- Show SearchPlan Status: VALIDATED.
- Show a concise natural-language explanation above the chart.
- Example explanation: "Counting failed login events grouped by user within the last 7 days."
- Show chart on top and table below.
- Chart container should have fixed desktop height around 320-400px.
- Show generated_dsl and SearchPlan in a right-side investigation panel or nearby tabs.
- Keep the UI professional for a cybersecurity demo.
```

## 5. Prompt Riêng Cho Event Detail Drawer

Dùng prompt này nếu muốn Stitch tập trung vào modal/detail:

```text
Design an event detail drawer for a SOC event search dashboard.

The drawer opens when the analyst clicks "View" on an event row.

Fields to display:
- event_id
- index_name
- timestamp
- source
- severity
- event_type
- user
- host
- ip
- country_code
- message
- raw

Design requirements:
- Right-side drawer
- Header with severity badge and event_type
- Key-value grid for structured fields
- Raw log displayed in a monospace code block with copy button
- Close button
- Dark theme
- Professional SOC analyst workflow

Optional visual section:
Include a small "Investigation Timeline" section using synthetic event history only.
Example timeline items:
- Alert Generated
- Failed Login
- Account Lockout
- Privilege Escalation Check

This timeline is a UI visualization for demo context, not a required backend feature yet.
```

## 6. Prompt Riêng Cho Loading, Error Và Empty State

Dùng prompt này nếu muốn Stitch sinh các state để UI trông hoàn thiện hơn:

```text
Design loading, error, and empty states for a SOC AI Event Search dashboard.

States:
1. Initial empty state:
   - Message: "Start by asking a natural language question"
   - Show suggested investigation cards that populate the search box when clicked:
     - Failed login attempts
     - Critical alerts
     - Top source IPs
   - Each card should have a title, description, example question, and icon

2. Loading state:
   - Skeleton metric cards
   - Skeleton table rows
   - Pipeline stepper showing the current stage
   - Small text: "Generating SearchPlan and querying Elasticsearch..."

3. Error state:
   - Alert card
   - Message: "Search failed"
   - Secondary text: "Please check your query or backend availability"
   - Retry button

4. No result state:
   - Message: "No events matched this query"
   - Suggestion: "Try widening the time range or removing a filter"

Use dark mode, shadcn/ui style, and a professional cybersecurity dashboard aesthetic.
```

## 7. Prompt Cho AI Code Frontend Sau Khi Có UI Từ Stitch

Sau khi chọn được UI từ Stitch, copy prompt này cho coding AI để implement:

```text
You are implementing the frontend for SOC AI Event Search MVP.

Read:
- README.md
- docs/requirement.md
- plan/day-06-stitch-ui-prompts.md
- frontend/package.json
- frontend/src/App.tsx
- frontend/src/index.css

Current stack:
- React + TypeScript + Vite
- Tailwind CSS
- shadcn/ui
- lucide-react
- Recharts if charts are needed

Backend APIs:
- GET /api/v1/health/live
- POST /api/v1/search
- POST /api/v1/search/plan
- GET /api/v1/events/{event_id}

Implement the UI based on the Stitch design:
1. Keep a single dashboard page for MVP.
2. Create small reusable components:
   - AppShell
   - SearchPanel
   - SuggestedInvestigationCards
   - ExampleQuestionChips
   - ExecutionPipeline
   - MetricsCards
   - ResultsTabs
   - EventTable
   - AggregationPanel
   - InvestigationPanel
   - JsonViewer
   - EventDetailDrawer
   - EmptyState
   - LoadingState
   - ErrorState
3. Add API helper in src/lib/api.ts.
4. Use TypeScript types matching backend response:
   - NaturalLanguageSearchResponse
   - SearchEvent
   - AggregationResultItem
   - ChartMetadata
   - EventDetailResponse
5. Call POST /api/v1/search from the search form.
6. If response.mode = "search", render event table.
7. If response.mode = "aggregation", render chart/table and events = [].
8. Show generated_dsl and search_plan as pretty JSON objects, not strings.
9. Keep SearchPlan and Generated DSL visible in the right-side investigation panel on desktop.
10. Display Query Type badge and SearchPlan Status badge.
11. Show execution pipeline stages: Question, SearchPlan, Validation, DSL Compilation, Elasticsearch, Results.
12. Click event row "View" to call GET /api/v1/events/{event_id} and open detail drawer.
13. Preserve backend health status.
14. Do not add auth, routing, global state library, CSV, audit history, or summary yet unless already available from backend.
15. Run npm run lint and npm run build.

Keep the implementation clean, small, and demo-ready.
```

## 8. Lưu Ý Khi Dùng Stitch

- Nên generate 2-3 version, sau đó chọn version rõ ràng nhất thay vì version nhiều hiệu ứng nhất.
- Ưu tiên dashboard có đúng workflow của SOC analyst: search -> pipeline -> result -> DSL transparency -> event detail.
- Không chọn UI quá màu mè hoặc quá giống marketing landing page.
- Khi Stitch sinh text demo, thay lại bằng các field đúng với API backend.
- Nếu Stitch sinh sidebar phức tạp, có thể cắt bớt để MVP gọn hơn.
- Nếu Stitch sinh nhiều page, gom lại thành một dashboard để kịp tiến độ.
- `Investigation Timeline` trong detail drawer chỉ nên là phần minh họa bằng synthetic context, không được trình bày như một backend feature đã hoàn thành.
