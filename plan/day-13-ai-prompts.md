# Prompt triển khai Ngày 13 - SOC AI Search MVP

## 1. Review kế hoạch Day 13

Sau Day 12, hệ thống đã có backend/frontend đầy đủ, public deploy, CI/CD, Keycloak/RBAC, audit/history, CSV export, SearchPlan transparency và UI SOC console. Day 13 nên tập trung vào các tính năng polish có giá trị demo cao nhưng không làm thay đổi kiến trúc lớn:

- Static Query Suggestions / Investigation Playbooks: gợi ý bước điều tra tiếp theo dựa trên kết quả hiện tại, không gọi LLM thêm.
- Pin/Unpin query history và trang `Investigations` đầy đủ: biến audit/history thành workflow điều tra thật sự.
- SOC Overview Dashboard dùng aggregation API có sẵn, có manual refresh và auto-refresh mặc định 10 phút.
- Giữ `Recent Queries` drawer như quick access, nhưng sidebar `Investigations` mở trang đầy đủ.

Không làm trong Day 13:

- Không thêm multi-turn conversation.
- Không thêm saved dashboard/saved query phức tạp.
- Không thêm advanced aggregation như percentile/cardinality/multi-level group-by.
- Không thêm streaming/realtime phức tạp.
- Không cho edit Elasticsearch DSL.
- Không đổi schema event Elasticsearch.
- Không commit secret hoặc credential demo.

Day 13 chia thành 4 prompt:

1. Backend history detail + pin/unpin + filter nhẹ.
2. Frontend `Investigations` page + sidebar submenu + Recent Queries drawer, tích hợp API vào UI mock đã có.
3. Static investigation suggestions/playbooks + SOC Overview Dashboard auto-refresh 10 phút, tích hợp API vào UI dashboard mock đã có.
4. Review, CI/CD, smoke và demo checklist.

Chỉ chuyển prompt tiếp theo khi prompt trước đã chạy test/build phù hợp.

---

## Prompt 1 - Backend History Detail, Pin/Unpin Và Filter Nhẹ

```text
Tiếp tục triển khai ngày 13 cho SOC AI Search MVP.

Hãy bổ sung backend support cho trang Investigations: xem chi tiết query history, pin/unpin query và filter nhẹ.

Đọc trước:
- README.md
- docs/requirement.md
- docs/architecture.md
- docs/sequence-flow.md
- plan/day-12-ai-prompts.md
- backend/src/main/resources/db/migration/V1__create_search_query_logs.sql
- backend/src/main/java/com/soc/ai/search/audit/SearchQueryLog.java
- backend/src/main/java/com/soc/ai/search/audit/SearchHistoryItem.java
- backend/src/main/java/com/soc/ai/search/audit/AuditQueryService.java
- backend/src/main/java/com/soc/ai/search/audit/AuditQueryController.java
- backend/src/main/java/com/soc/ai/search/audit/SearchQueryLogRepository.java
- backend/src/main/java/com/soc/ai/search/audit/SearchQueryLogLookupService.java
- backend/src/main/java/com/soc/ai/search/security/SecurityConfig.java
- backend/src/main/java/com/soc/ai/search/security/CurrentUserService.java
- backend/src/test/java/com/soc/ai/search/audit
- backend/src/test/java/com/soc/ai/search/security/RbacEndpointGuardTest.java

Yêu cầu:
1. Kiểm tra trạng thái repository trước khi sửa.
2. Không tạo bảng saved_queries mới trong prompt này.
3. Mở rộng bảng `search_query_logs` bằng Flyway migration mới, ví dụ `V2__add_query_pin_fields.sql`:
   - `pinned BOOLEAN NOT NULL DEFAULT FALSE`;
   - `pinned_at TIMESTAMPTZ` nullable.
4. Cập nhật entity `SearchQueryLog`:
   - thêm field `pinned`;
   - thêm field `pinnedAt`;
   - không phá constructor/test hiện có;
   - nếu cần thêm method domain nhỏ như `setPinned(boolean, Instant)`, giữ đơn giản.
5. API history list hiện tại vẫn giữ contract cũ nhưng bổ sung field mới trong item:
   - `pinned`;
   - `pinned_at`.
6. Thêm endpoint detail:
   - `GET /api/v1/search/history/{query_id}`;
   - chỉ `SOC_ANALYST` và `SOC_ADMIN` được gọi;
   - analyst chỉ xem được query của chính mình;
   - admin có thể xem tất cả hoặc giữ theo policy hiện tại nếu codebase đang scope theo identity, nhưng phải nhất quán và test rõ;
   - response có tối thiểu:
     - `query_id`;
     - `user_identity` nếu admin endpoint/response hiện cho phép;
     - `question`;
     - `mode`;
     - `status`;
     - `result_count`;
     - `latency_ms`;
     - `summary`;
     - `error_message` nếu failed;
     - `search_plan` JSON object;
     - `generated_dsl` JSON object;
     - `created_at`;
     - `pinned`;
     - `pinned_at`.
7. Thêm endpoint pin/unpin:
   - `PATCH /api/v1/search/history/{query_id}/pin`;
   - request body Java record, ví dụ `{ "pinned": true }`;
   - chỉ `SOC_ANALYST` và `SOC_ADMIN`;
   - analyst chỉ pin/unpin query của chính mình;
   - khi `pinned=true`, set `pinned_at=now` nếu trước đó chưa pinned;
   - khi `pinned=false`, set `pinned_at=null`;
   - response của `PATCH /pin` bắt buộc trả DTO query log/history item đã được cập nhật, có `pinned` và `pinned_at` mới, để frontend cập nhật UI ngay mà không cần gọi GET thêm.
8. Mở rộng `GET /api/v1/search/history` hỗ trợ filter nhẹ nếu không làm phình scope:
   - `pinned=true|false` optional;
   - `status=SUCCESS|FAILED` optional;
   - `mode=search|aggregation` optional;
   - `q=` optional để search trong question nếu làm được gọn;
   - nếu quá nhiều, ưu tiên `pinned`, `status`, `mode`; bỏ `q` cũng được.
9. Sort ổn định:
   - pinned view nên sort `pinned_at DESC`, sau đó `created_at DESC`, `id DESC`;
   - all history vẫn `created_at DESC`, `id DESC`.
10. Không thay đổi CSV export behavior theo `query_id`.
11. Không thay đổi audit persistence semantics ngoài việc default pin fields.
12. Không lưu secret, credential hoặc raw event mới vào PostgreSQL.
13. Error handling:
   - invalid `query_id` -> 400;
   - query not found hoặc không thuộc analyst -> 404;
   - unauthorized/forbidden theo security hiện có;
   - không lộ stack trace.
14. Swagger/OpenAPI annotation hữu ích cho endpoint mới.
15. Thêm backend tests:
   - migration/entity mapping pin fields;
   - history item có `pinned`, `pinned_at`;
   - detail trả `search_plan` và `generated_dsl` object;
   - analyst không xem/pin query của user khác;
   - analyst pin/unpin query của mình thành công;
   - pinned filter chỉ trả pinned queries;
   - status/mode filter nếu triển khai;
   - invalid UUID trả 400;
   - unknown query_id trả 404;
   - RBAC: viewer bị 403 với detail/pin; analyst/admin được phép.
16. Chạy backend test:

```powershell
cd backend
.\mvnw.cmd test
cd ..
```

Linux tương đương:

```bash
cd backend
./mvnw test
cd ..
```

17. Nếu sửa OpenAPI/security config, đảm bảo frontend smoke/API contract không bị phá.
18. Báo file đã sửa/tạo và test đã chạy.

Không triển khai frontend trong prompt này. Không tạo saved query table. Không thêm advanced dashboard trong prompt này.
```

---

## Prompt 2 - Frontend Investigations Page, Sidebar Submenu Và Recent Queries Drawer

```text
Tiếp tục triển khai ngày 13 cho SOC AI Search MVP.

Hãy tích hợp API thật vào UI mock trang `Investigations` đã có và giữ `Recent Queries` drawer như quick access.

Quan trọng:
- UI All Investigations đã được mock trước trong `image_ui/investigation_ui/`.
- Không thiết kế lại UI từ đầu, không đổi theme lớn, không phá layout mock đang có.
- Nhiệm vụ chính là nối API, state, RBAC, loading/error/empty states, filters, pin/unpin, detail panel và đồng bộ Recent Queries drawer.
- Chỉ chỉnh UI ở mức cần thiết để khớp backend contract và làm trải nghiệm mượt hơn.

Đọc trước:
- README.md
- plan/day-06-prompt-v0.dev-part1.md
- plan/day-12-ai-prompts.md
- image_ui/investigation_ui/
- frontend/src/App.tsx
- frontend/src/components/soc/soc-sidebar.tsx
- frontend/src/components/soc/history-sheet.tsx
- frontend/src/components/soc/query-transparency.tsx
- frontend/src/components/soc/result-tabs.tsx
- frontend/src/components/ui
- frontend/src/services/history-api.ts
- frontend/src/services/csv-export-api.ts
- frontend/src/services/search-api.ts
- frontend/src/services/api-client.ts
- frontend/src/auth/permissions.ts
- frontend/src/types/soc.ts
- backend history endpoints vừa tạo ở Prompt 1

Yêu cầu UX/navigation:
1. Kiểm tra trạng thái repository trước khi sửa.
2. Đọc UI mock trong `image_ui/investigation_ui/` và các component frontend hiện có để hiểu visual/layout trước khi sửa code.
3. Sidebar có nhóm cha `Investigations` có thể expand/collapse.
4. Bên trong nhóm `Investigations` có 2 mục con:
   - `All Investigations`: mở trang lịch sử đầy đủ;
   - `Recent Queries`: mở drawer quick access hiện tại.
5. Click `Investigations` cha chỉ expand/collapse, không mở drawer trực tiếp.
6. Click `All Investigations` chuyển main content sang trang Investigations.
7. Click `Recent Queries` mở drawer bên phải như hiện tại.
8. Header có thể giữ icon/button `Recent Queries` cạnh user/logout nếu hiện có, nhưng không bắt buộc. Nếu giữ, label/tooltip phải rõ.
9. Drawer hiện tại đổi vai trò thành quick access:
   - tên `Recent Queries` hoặc `Recent Investigations` đều được, nhưng thống nhất toàn UI;
   - chỉ hiển thị 5 query gần nhất;
   - có Run Again;
   - có Pin/Unpin icon nhỏ nếu backend đã có;
   - cuối drawer có nút `View all history` / `View all investigations` để chuyển tới page đầy đủ.

Yêu cầu trang `All Investigations`:
10. Nếu mock đã có component tương ứng, refactor/tái sử dụng component đó. Nếu chưa có file rõ ràng, tạo page/component riêng, ví dụ `frontend/src/components/soc/investigations-page.tsx`.
11. Trang này phải giữ visual direction của mock trong `image_ui/investigation_ui/`:
    - background zinc/slate dark;
    - cyan/purple accents cho AI/query;
    - emerald success, rose failed, amber warning;
    - compact but premium spacing;
    - không giống student project.
12. Layout desktop phải bám theo mock hiện tại; nếu cần chuẩn hóa, dùng hướng sau:

```text
+---------------------------------------------------------------+
| Investigations                                                |
| Audit-backed query history, pinned investigations, replay      |
| [All] [Pinned] [Success] [Failed] [Search] [Aggregation]       |
| Search question...                         Refresh            |
+-------------------------------+-------------------------------+
| Query List / Table            | Detail Panel                  |
| time, question, mode, status  | Question                      |
| result, latency, pin, actions | Mode / Status / Result        |
|                               | Summary / Error               |
|                               | Tabs: SearchPlan | DSL        |
|                               | Buttons: Run Again Export Pin |
+-------------------------------+-------------------------------+
```

13. Nếu project không dùng router, có thể dùng state trong `App.tsx` để switch giữa `Event Search` và `All Investigations`. Không bắt buộc thêm React Router nếu project chưa có.
14. Query list/table cột tối thiểu:
    - Time;
    - Question;
    - Mode;
    - Status;
    - Results;
    - Latency;
    - Pin;
    - Actions.
15. Filters trên page:
    - `All`;
    - `Pinned`;
    - `Success`;
    - `Failed`;
    - `Search`;
    - `Aggregation`.
16. Nếu backend supports filters, gọi API với query params. Nếu backend chỉ support một phần, frontend degrade rõ ràng, không fake sai dữ liệu.
17. Có search input nhỏ để lọc question nếu backend có `q`; nếu chưa có backend `q`, có thể filter client-side trên items đang load và ghi chú TODO nhỏ trong code comment nếu cần.
18. Detail panel:
    - khi chưa chọn item: hiển thị empty state đẹp, gợi ý chọn một investigation;
    - khi chọn item: gọi `GET /api/v1/search/history/{query_id}`;
    - hiển thị metadata, summary/error;
    - tabs `SearchPlan` và `Generated DSL` dùng code block/pretty JSON;
    - DSL read-only, badge `Read-only · Generated by backend compiler`;
    - có Copy button.
19. Actions:
    - `Run Again`: chạy lại câu hỏi qua natural language endpoint nếu có question;
    - `Export CSV`: chỉ enabled nếu có quyền `SOC_ANALYST`/`SOC_ADMIN`, query success và có query_id;
    - `Pin/Unpin`: gọi endpoint pin;
    - refresh list/detail sau pin/unpin.
20. RBAC:
    - `SOC_VIEWER` không thấy Investigations page hoặc thấy lock state tùy policy hiện tại;
    - `SOC_ANALYST` thấy history của mình, pin/unpin, export;
    - `SOC_ADMIN` theo policy hiện tại.
21. Loading/error states:
    - skeleton list;
    - skeleton detail;
    - alert lỗi 400/403/404/503;
    - retry button;
    - không crash khi `search_plan` hoặc `generated_dsl` null vì query failed. Nếu bị lỗi, hiển thị Error Alert rõ ràng trong Detail Panel thay vì các tab SearchPlan/DSL vô nghĩa.
22. Không thêm saved query table/UI riêng. Chỉ pin/unpin history.
23. Không gọi Elasticsearch trực tiếp từ frontend.
24. Không cho edit DSL.
25. Không phá Event Search page hiện tại.

Prompt UI implementation guidance:
26. Không yêu cầu AI generate UI mới từ đầu vì mock đã có ở `image_ui/investigation_ui/`. Hãy yêu cầu AI:
    - giữ layout, spacing, dark theme, badge style, card/table style theo mock;
    - chỉ chỉnh các phần cần thiết để bind data thật;
    - nếu component mock đang dùng static data, thay bằng props/state/API data;
    - giữ SearchPlan/DSL panel read-only, có copy button;
    - giữ empty/loading/error state cùng style với mock.
27. Nếu cần polish nhỏ, giữ style:
    - premium dark SOC console;
    - compact split-pane investigation workspace;
    - left list/table with hover glow;
    - right detail inspector inspired by Kibana/Splunk inspect panel;
    - pinned star with subtle amber glow;
    - status badges with emerald/rose;
    - JSON panels with monospace, cyan syntax feeling, copy button;
    - empty states and skeleton loading polished;
    - no marketing/landing-page elements inside app console.
28. UI copy đề xuất:
    - Page title: `Investigations`;
    - Subtitle: `Audit-backed query history, pinned investigations, and replay`;
    - Drawer title: `Recent Queries`;
    - Button: `View all investigations`;
    - Detail empty: `Select an investigation to inspect SearchPlan and DSL`.

Tests:
29. Frontend tests:
    - sidebar expand `Investigations` shows `All Investigations` and `Recent Queries`;
    - clicking `Recent Queries` opens drawer;
    - clicking `All Investigations` shows page;
    - page calls history API with selected filters;
    - selecting item calls detail API;
    - detail renders SearchPlan and DSL tabs;
    - pin/unpin calls API and updates UI;
    - pin state đồng bộ giữa `Recent Queries` drawer và `All Investigations` page: nếu user pin/unpin ở drawer thì list/detail page đang mở phải cập nhật ngay, và ngược lại. Có thể invalidate cache, refetch nhẹ hoặc sync shared state; không để icon pin lệch nhau;
    - viewer does not see/execute restricted actions;
    - export disabled for viewer;
    - Run Again uses existing search flow.
30. Chạy verify:

```powershell
cd frontend
npm test
npm run build
cd ..
```

31. Nếu sửa backend contract trong lúc làm frontend, chạy lại backend test.
32. Báo file đã sửa/tạo và test đã chạy.

Không triển khai SOC Overview hoặc Query Suggestions trong prompt này.
```

---

## Prompt 3 - Static Query Suggestions, Investigation Playbooks Và SOC Overview Dashboard

```text
Tiếp tục triển khai ngày 13 cho SOC AI Search MVP.

Hãy bổ sung Static Query Suggestions / Investigation Playbooks và tích hợp API thật vào UI mock SOC Overview Dashboard đã có.

Quan trọng:
- Dashboard UI đã được mock trước trong `image_ui/image_dashboard/`.
- Không thiết kế lại dashboard từ đầu, không đổi theme lớn, không phá layout mock đang có.
- Nhiệm vụ chính là nối aggregation API thật, refresh state, partial failure, auto-refresh 10 phút, và bind chart/table/KPI vào UI mock.
- Static Query Suggestions / Investigation Playbooks có thể thêm mới hoặc gắn vào UI hiện có, nhưng không được làm dashboard/search page rối hơn.

Đọc trước:
- README.md
- docs/architecture.md
- docs/sequence-flow.md
- image_ui/image_dashboard/
- frontend/src/App.tsx
- frontend/src/components/soc/search-section.tsx
- frontend/src/components/soc/result-tabs.tsx
- frontend/src/components/soc/metrics-summary.tsx
- frontend/src/components/soc/aggregation-chart.tsx
- frontend/src/services/search-api.ts
- frontend/src/services/api-client.ts
- frontend/src/types/soc.ts
- frontend/src/auth/permissions.ts
- backend endpoint `POST /api/v1/search/plan`
- backend SearchPlan aggregation contract

Phần A - Static Query Suggestions / Investigation Playbooks:
1. Không gọi LLM để tạo suggestions trong prompt này.
2. Suggestions là static/deterministic dựa trên response hiện tại:
   - `response.mode`;
   - `response.search_plan.filters`;
   - `response.search_plan.aggregation`;
   - `response.aggregation_type`;
   - `response.total`;
   - status empty/success nếu cần.
3. Tạo helper riêng, ví dụ `frontend/src/lib/investigation-suggestions.ts`.
4. Suggested next questions tối thiểu:
   - Nếu event_type có `failed_login`:
     - `Top 10 IP có nhiều failed login nhất trong 24h qua`;
     - `Đếm failed login theo user trong 7 ngày qua`;
     - `Số failed login theo giờ trong 24h qua`;
     - `Tìm failed login của user admin`.
   - Nếu severity có `critical` hoặc `high`:
     - `Top host có nhiều critical alert nhất trong 7 ngày qua`;
     - `Đếm alert critical theo source trong 7 ngày qua`;
     - `Số critical event theo giờ trong 24h qua`.
   - Nếu aggregation top IP:
     - `Tìm event mới nhất từ IP đứng đầu` nếu có thể build question an toàn;
     - hoặc `Tìm failed login từ IP 203.0.113.45 trong 24h qua` khi bucket key có IP.
   - Nếu malware/message_query:
     - `Top host có malware detected trong 7 ngày qua`;
     - `Tìm raw event malware detected mới nhất`.
5. Thêm Playbook templates tĩnh:
   - `Failed login investigation`;
   - `Privilege escalation review`;
   - `Malware triage`;
   - `Firewall block review`;
   - `Account lockout investigation`.
6. UI suggestions nằm dưới search result hoặc gần search box:
   - Section title: `Suggested next steps`;
   - Card/pill có icon, category, short description;
   - click suggestion fill question và chạy search ngay hoặc fill input tùy UX hiện tại; ưu tiên click chạy search giống suggested queries hiện có.
7. Không gợi ý field/schema mà backend chưa hỗ trợ.
8. Không gửi raw event hoặc result data vào LLM.
9. Không thay thế suggested queries hiện tại; có thể giữ suggested queries ở search box và thêm `Suggested next steps` sau result.

Phần B - SOC Overview Dashboard:
10. Nếu mock dashboard đã có component tương ứng, refactor/tái sử dụng component đó. Nếu chưa có file rõ ràng, tạo page/component riêng, ví dụ `SocOverviewDashboard`, nhưng phải bám sát mock trong `image_ui/image_dashboard/`.
11. Sidebar có item `Overview` nếu trước đây đã xóa/ẩn mà muốn dùng lại. Nếu sidebar hiện chỉ còn Event Search/Investigations, thêm lại `Overview` chỉ khi page thật sự hoạt động.
12. Dashboard dùng `POST /api/v1/search/plan` với SearchPlan aggregation cố định. Không gọi LLM.
13. Cards/charts tối thiểu:
    - Total Events last 24h: COUNT all events;
    - Failed Logins last 24h: COUNT với `event_type = ["failed_login"]`;
    - Critical/High Events last 24h nếu làm được gọn: COUNT hoặc GROUP_BY severity rồi cộng critical/high ở frontend;
    - Severity Distribution: GROUP_BY severity top_n 10;
    - Top Source IPs: TOP_N ip top_n 10;
    - Events Over Time: DATE_HISTOGRAM hour last 24h;
    - Top Users hoặc Top Hosts nếu làm gọn được.
14. Dashboard query labels nếu backend/audit/history lưu query:
    - dùng prefix rõ `[Dashboard]` để phân biệt với query do user chủ động chạy;
    - ví dụ:
      - `[Dashboard] Total events in the last 24h`;
      - `[Dashboard] Failed login count in the last 24h`;
      - `[Dashboard] Severity distribution in the last 24h`;
      - `[Dashboard] Top source IPs in the last 24h`;
      - `[Dashboard] Events over time in the last 24h`.
15. Không để dashboard auto-refresh làm spam `Recent Queries` drawer:
    - nếu dashboard calls được audit vào `search_query_logs`, Recent Queries drawer mặc định nên ẩn các query có question bắt đầu bằng `[Dashboard]`;
    - `All Investigations` page có thể thêm filter/toggle `User Queries` và `Dashboard Queries` nếu làm được gọn;
    - nếu chưa có field phân loại riêng, dùng prefix `[Dashboard]` là contract tạm cho MVP.
16. Manual refresh button bắt buộc.
17. Auto-refresh optional nhưng nếu làm thì mặc định 10 phút:

```text
AUTO_REFRESH_INTERVAL_MS = 10 * 60 * 1000
```

18. Auto-refresh chỉ chạy khi dashboard page đang active/mounted.
19. Không refresh khi tab/page đã unmount.
20. Không dùng interval quá ngắn như 5s/10s.
21. UI hiển thị `Last updated` timestamp.
22. UI có toggle nhỏ `Auto-refresh 10m` nếu làm được gọn; nếu không, hardcode 10 phút và có text rõ.
23. Nếu một aggregation lỗi, dashboard không crash toàn trang:
    - card lỗi hiển thị alert nhỏ;
    - các card khác vẫn render.
24. Nếu auth/RBAC chặn viewer theo policy, hiển thị lock state rõ. Nếu viewer được search/view overview theo policy hiện tại, giữ behavior nhất quán.
25. Không thêm realtime streaming.
26. Không thêm advanced aggregation ngoài contract hiện có.

Prompt UI implementation guidance cho dashboard/suggestions:
27. Không yêu cầu AI generate dashboard UI mới từ đầu vì mock đã có ở `image_ui/image_dashboard/`. Hãy yêu cầu AI:
    - giữ layout, dark theme, card style, chart container, iconography và visual hierarchy theo mock;
    - thay dữ liệu mock bằng API data thật;
    - giữ skeleton/empty/error states cùng visual style;
    - không đổi sidebar/header chung ngoài phần cần route tới dashboard.
28. Khi bind dữ liệu vào SOC Overview:
    - dashboard sẽ gọi khoảng 4-5 aggregation API; nếu fetch thủ công, dùng `Promise.allSettled` hoặc render từng card/chart độc lập với skeleton riêng để card nào có data trước thì render trước. Tuyệt đối không để toàn bộ dashboard bị treo chỉ vì một API chậm/lỗi, và tránh tình trạng component spam/re-render liên tục gây quá tải cho backend;
    - top KPI cards: Total Events, Critical/High Events, Top Source IP, Last Updated;
    - chart grid 2 columns desktop, 1 column mobile;
    - line chart for events over time;
    - bar chart for top IP/users;
    - donut/pie or horizontal bars for severity distribution;
    - dark zinc/slate background;
    - neon cyan/purple for AI/SOC accents;
    - semantic colors for severity;
    - compact card headers with icons from lucide-react;
    - skeleton loading and empty state polished.
29. Suggestions/playbooks UI:
    - cards or pills with subtle border/hover glow;
    - category badges: `Next step`, `Playbook`, `Aggregation`, `Raw events`;
    - button text: `Run` or click entire card;
    - avoid overwhelming the page; show 4-6 best suggestions.

Tests:
30. Frontend tests:
    - suggestion helper returns failed_login suggestions;
    - suggestion helper does not suggest unsupported fields;
    - clicking suggestion triggers existing search flow;
    - dashboard calls `/api/v1/search/plan` for total count/failed login count/severity/top IP/time histogram;
    - dashboard query labels use `[Dashboard]` prefix if they are persisted to history/audit;
    - Recent Queries drawer hides dashboard-generated queries by default so auto-refresh does not spam quick history;
    - dashboard renders partial success if one request fails;
    - refresh button refetches;
    - auto-refresh interval is 10 minutes and cleanup happens on unmount;
    - no LLM endpoint is called for suggestions/dashboard.
31. Nếu có mock mode, dashboard should render with mock/fake service or test mocks without requiring real backend.
32. Chạy verify:

```powershell
cd frontend
npm test
npm run build
cd ..
```

33. Nếu thêm backend endpoint hoặc change API contract, chạy backend test.
34. Báo file đã sửa/tạo và test đã chạy.

Không triển khai multi-turn conversation, saved dashboard, saved query, streaming hoặc advanced aggregation trong prompt này.
```

---

## Prompt 4 - Review Day 13, CI/CD Và Demo Flow

```text
Hãy review và verify toàn bộ kết quả triển khai ngày 13 cho SOC AI Search MVP.

Đọc lại:
- README.md
- docs/architecture.md
- docs/sequence-flow.md
- plan/day-13-ai-prompts.md
- .github/workflows/ci.yml
- .github/workflows/deploy.yml
- docker-compose.yml
- docker-compose.deploy.yml
- Caddyfile
- backend/src/main/resources/db/migration
- backend/src/main/java/com/soc/ai/search/audit
- frontend/src/App.tsx
- frontend/src/components/soc
- frontend/src/services
- frontend/src/auth/permissions.ts

Kiểm tra checklist:
1. Repository không chứa secret thật, credential thật, API key thật.
2. Flyway migration pin fields hợp lệ.
3. `search_query_logs` có `pinned`, `pinned_at` hoặc equivalent.
4. History list trả pinned fields.
5. History detail endpoint trả SearchPlan và generated DSL object/map.
6. Pin/unpin endpoint hoạt động và scope theo identity/RBAC.
7. Viewer không truy cập được history detail/pin nếu policy hiện tại chặn viewer.
8. Analyst chỉ thao tác query của mình.
9. Recent Queries drawer vẫn mở nhanh, hiển thị 5 query gần nhất.
10. Drawer có `View all investigations`.
11. Sidebar `Investigations` expand/collapse có `All Investigations` và `Recent Queries`.
12. `All Investigations` mở page đầy đủ, không mở drawer.
13. Investigations page có list/table, filters, detail panel.
14. Detail panel hiển thị SearchPlan và generated DSL read-only.
15. Pin/unpin từ UI hoạt động.
16. Run Again từ UI hoạt động.
17. Export CSV vẫn hoạt động theo query_id và RBAC.
18. Static Query Suggestions không gọi LLM.
19. Suggestions không dùng field unsupported.
20. Playbook templates render đẹp và click chạy search/fill query đúng UX đã chọn.
21. SOC Overview Dashboard dùng `/api/v1/search/plan`, không gọi LLM.
22. Dashboard có total events, failed logins, severity distribution, top IP, events over time.
23. Dashboard-generated history/audit query nếu có dùng prefix `[Dashboard]`.
24. Recent Queries drawer không bị spam bởi dashboard auto-refresh và mặc định không hiện dashboard queries.
25. Dashboard manual refresh hoạt động.
26. Dashboard auto-refresh nếu có thì là 10 phút, cleanup khi unmount.
27. Dashboard partial failure không crash toàn page.
28. Event Search page cũ vẫn chạy.
29. Editable SearchPlan feature nếu đã có từ mini prompt khác không bị phá.
30. Logout/Auth/RBAC không bị phá.
31. Frontend test pass.
32. Frontend build pass.
33. Backend test pass nếu backend đã sửa.
34. Docker compose config hợp lệ.
35. CI workflow không cần secret mới hoặc đã document GitHub Secrets nếu có.
36. Deploy workflow không bị thay đổi nguy hiểm.
37. Public smoke/domain vẫn chạy nếu môi trường sẵn sàng.

Chạy verify phù hợp:

```powershell
git status --short

git grep -n -E "AIza|sk-[A-Za-z0-9]|ghp_[A-Za-z0-9]|BEGIN (RSA|OPENSSH|PRIVATE) KEY"

cd backend
.\mvnw.cmd test
cd ..

cd frontend
npm test
npm run build
cd ..

docker compose config --quiet
```

Nếu deploy/domain đang sẵn sàng:

```powershell
.\scripts\smoke-test-day-11-domain.ps1
```

Nếu không chạy smoke domain được, ghi rõ SKIP reason và lệnh cần chạy trên GitHub Actions/VPS.

Cập nhật README/docs nếu cần:
- mô tả `Investigations` page;
- mô tả pin/unpin history;
- mô tả static suggestions/playbooks;
- mô tả SOC Overview Dashboard và auto-refresh 10 phút;
- không ghi credential thật.

Báo kết quả:
- PASS/FAIL/SKIP theo checklist;
- file đã sửa/tạo;
- lệnh verify đã chạy;
- demo flow 3 phút cho Day 13;
- việc còn lại nếu có nhưng không triển khai thêm trong prompt review.
```

---

## Demo Flow Gợi Ý Sau Day 13

```text
1. Login analyst.
2. Vào Overview, xem KPI/charts và Last updated.
3. Bấm Refresh, giải thích dashboard dùng aggregation API có sẵn, không gọi LLM.
4. Vào Event Search, chạy failed login query.
5. Xem Suggested next steps, bấm Top IP hoặc group by user.
6. Mở Recent Queries drawer, pin một query.
7. Bấm View all investigations.
8. Trong All Investigations, filter Pinned.
9. Chọn query, xem SearchPlan và DSL read-only.
10. Run Again hoặc Export CSV.
11. Giải thích audit trail: question -> SearchPlan -> DSL -> result/latency/status được lưu trong PostgreSQL.
```


