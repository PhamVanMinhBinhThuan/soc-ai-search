Create a modern, clean, and professional Cybersecurity SOC (Security Operations Center) Platform interface focused on an AI-powered Event Search feature. The design must be a premium Dark Mode console, utilizing a professional color palette (deep grays like zinc-950/zinc-900, slate, and dark blues, with sharp semantic neon accents for alert status: Red/Rose for Critical/High, Amber/Orange for Medium, Blue/Slate for Low, and Purple/Cyan for AI features).

The layout must consist of a compact Sidebar Navigation on the left and a data-dense Main Content Area on the right. 

The Main Content Area must follow a vertical top-to-bottom layout divided into the following sections to showcase an active, successfully executed AI search state:

1. Top AI Search Section
- A prominent, wide Search Input Textarea/Box with a Purple/Cyan AI sparkle icon. Inside the input, show this exact natural language query as pre-filled text: "Đếm số lần login thất bại theo từng user trong 7 ngày qua và hiển thị top 5"
- Below the search box, include a subtle row of "Suggested Queries" displayed as small, clickable pill tags.

2. Performance Metrics & AI Summarization Block
- Show 4 compact metric cards horizontally: 
  * Mode: Aggregation
  * Total Events: 1,240
  * AI Latency: 124ms
  * DB Latency: 42ms
- Below the metrics, render a stylized panel with a subtle purple/cyan gradient border to signify AI-generated insights.
- Display this concise summary text inside the panel: "Hệ thống phát hiện tổng cộng 1,240 lượt đăng nhập thất bại trong 7 ngày qua. User 'admin' có tỷ lệ cao nhất (45%), chủ yếu xuất phát từ các IP có Country Code là 'CN' và 'US'. Đề xuất kiểm tra các tài khoản này để phòng ngừa tấn công Brute Force."

3. Query Transparency & Architecture Panel
- A collapsible section/tabs showing the compilation from Natural Language to Elasticsearch DSL.
- Tab 1: [Validated SearchPlan] - showing a clean, structured JSON object.
- Tab 2: [Compiled Elasticsearch DSL] - showing a syntax-highlighted code block containing the generated Elasticsearch JSON DSL query (with size=0, query/bool/filter, and terms aggregation on user field). Include a small "Copy" icon button.

4. Action Toolbar & Analytics Visualization
- A horizontal toolbar with a Time-range picker ("Last 7 Days"), Filter dropdowns (Severity, Event Type), and an "Export CSV" button on the right.
- Since the active query is an aggregation statistic, display a 2-column chart layout below the toolbar using modern UI charts:
  * Left column: A clean Bar Chart showing the "Top 5 Users with Failed Logins" (X-axis: User, Y-axis: Count).
  * Right column: A smooth Donut/Pie Chart showing the "Severity Distribution" (High, Medium, Low) with corresponding colored slices.

5. Paginated Event Data Table
- A dense, production-grade data table displaying sample raw events.
- Columns: Timestamp, Event Type, Severity (using colored badges matching status rules), Source IP, User, Host, Country Code (with a tiny flag icon), and Message summary.
- Standard pagination controls (Page 1 of 25, Prev, Next) at the bottom right.

6. Event Detail Drawer (Slide-out Overlay State)
- Simulate a side drawer (shadcn/ui Sheet component) sliding out from the right side of the screen as if triggered by clicking an event row. 
- The drawer header displays "Event Details" and the unique `event_id`.
- The drawer content has two sub-tabs: 
  * [Formatted Fields]: Key-value pairs displaying the parsed log schema cleanly.
  * [Raw Log]: A dark, monospace monospace code block showing the un-truncated raw JSON log with horizontal scrolling.

Overall Aesthetic Guidelines:
- Avoid looking like a student project; it must feel like an industrial, enterprise-grade SecOps tool.
- Use subtle borders (e.g., border-zinc-800), soft dark shadows, and clean technical sans-serif typography.
- Maximize space efficiency with compact tables and cards, but maintain enough whitespace for absolute scannability.
- Use realistic, synthetic cybersecurity telemetry data. Do not include authentication UI or marketing landing page elements.