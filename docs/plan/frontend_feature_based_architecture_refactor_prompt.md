# Prompt: Refactor Frontend To Feature-Based Enterprise Architecture

## 1. Vai Trò

Bạn là Senior Frontend Engineer có kinh nghiệm refactor React/TypeScript/Vite codebase theo hướng enterprise. Hãy refactor frontend của dự án SOC AI Search từ cấu trúc nghiêng về layer-based hiện tại sang cấu trúc feature-based rõ ràng, dễ mở rộng, dễ review và dễ onboard developer mới.

Mục tiêu không phải đổi UI hoặc viết lại app. Mục tiêu là tổ chức lại source code để codebase nhìn chuyên nghiệp hơn, module boundary rõ hơn, giảm việc gom quá nhiều domain SOC vào `components/soc`, `services`, `hooks`, `lib` ở root.

## 2. Bối Cảnh Dự Án

Frontend hiện dùng:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui / Radix UI style components
- React Router
- OIDC / Keycloak authentication

App chính là SOC AI Search, gồm các domain/tính năng:

- Dashboard
- Event Search
- Query Transparency
- Query Result
- AI Summary
- AI Follow-up Suggestions
- Event Detail Modal
- Recent Queries
- Investigations
- System Audit Logs
- Query Library
- Auth/RBAC

Hiện tại frontend đã được refactor một phần:

- API client đã tách thành `api-client`, `http-client`, `auth-token`, `api-error`.
- Search workflow đã được tách ra `use-search-workflow`.
- Result tabs đã được tách thành `components/soc/results/*`.
- Query Library data đã được tách vào `lib/query-library/*`.

Tuy nhiên, cấu trúc tổng thể vẫn chưa thật sự feature-based vì nhiều file domain vẫn nằm dưới:

```text
frontend/src/components/soc/
frontend/src/hooks/
frontend/src/services/
frontend/src/lib/
frontend/src/types/
```

## 3. Mục Tiêu Refactor

Sau refactor, cấu trúc frontend nên tiến gần đến:

```text
frontend/src/
  app/
    App.tsx
    routes.tsx
    providers.tsx
    app-routes.ts

  features/
    search/
      components/
      hooks/
      services/
      lib/
      types.ts
      index.ts

    dashboard/
      components/
      lib/
      types.ts
      index.ts

    investigations/
      components/
      services/
      types.ts
      index.ts

    audit-logs/
      components/
      services/
      types.ts
      index.ts

    query-library/
      components/
      data/
      types.ts
      index.ts

    auth/
      components/
      hooks/
      services/
      permissions.ts
      types.ts
      index.ts

  shared/
    components/
      ui/
      layout/
      display/
    services/
      api/
    lib/
    types/

  main.tsx
  index.css
```

Không nhất thiết phải tạo đúng 100% nếu codebase hiện tại chưa cần, nhưng hướng đi phải rõ: domain code nằm trong `features/*`, shared primitive nằm trong `shared/*`, app composition nằm trong `app/*`.

## 3.1. Những Điểm Nên Tham Khảo Từ Cấu Trúc Frontend Khác

Không copy toàn bộ cấu trúc frontend khác. Chỉ tham khảo những phần thật sự giúp codebase SOC AI Search chuyên nghiệp hơn:

1. **Layout riêng cho app**

   Nên tham khảo ý tưởng `layouts/AppLayout.tsx`. Dự án SOC AI Search có sidebar, main content, user profile, auth/RBAC menu và nhiều route nội bộ, vì vậy layout nên được tách khỏi `App.tsx`.

   Gợi ý áp dụng:

   ```text
   src/app/app-layout.tsx
   ```

   hoặc nếu layout thật sự dùng chung:

   ```text
   src/shared/components/layout/app-layout.tsx
   ```

2. **Routes tách riêng khỏi App**

   Nên tham khảo ý tưởng `routes/router.tsx`. `App.tsx` không nên chứa quá nhiều route/render logic.

   Gợi ý áp dụng:

   ```text
   src/app/routes.tsx
   src/app/app-routes.ts
   ```

   `App.tsx` nên chủ yếu làm composition: providers, layout và routes.

3. **Page component rõ ràng, nhưng đặt trong từng feature**

   Có thể tham khảo cách đặt tên `DashboardPage.tsx`, `ExportPage.tsx`, nhưng không nên gom tất cả vào `src/pages` nếu app đã có nhiều domain lớn. Với SOC AI Search, page nên sống trong feature tương ứng:

   ```text
   src/features/search/pages/search-page.tsx
   src/features/dashboard/pages/dashboard-page.tsx
   src/features/investigations/pages/investigations-page.tsx
   src/features/audit-logs/pages/audit-logs-page.tsx
   src/features/query-library/pages/query-library-page.tsx
   ```

   Cách này giữ được page rõ ràng cho routing, nhưng vẫn không tách page khỏi domain logic của nó.

4. **Generated API client là hướng phát triển, chưa bắt buộc làm ngay**

   Có thể tham khảo ý tưởng `services/generated/` nếu sau này dùng OpenAPI Generator để sinh typed API client từ Swagger/OpenAPI.

   Gợi ý tương lai:

   ```text
   src/shared/services/generated/
   ```

   Tuy nhiên trong refactor này, API client thủ công hiện tại đã có `api-client`, `http-client`, `auth-token`, `api-error`; chỉ cần tổ chức lại vào `shared/services/api`, chưa cần chuyển sang generated client.

Không nên copy các điểm sau:

- Không nên giữ `components/shared` và `components/ui` ở root; hãy chuyển sang `src/shared/components/...`.
- Không nên để `utils` root thành nơi gom mọi thứ; helper dùng riêng domain nên nằm trong `features/*/lib`, helper dùng chung mới vào `shared/lib`.
- Không nên để `constants` root chứa mọi constant; domain constants nên nằm trong feature tương ứng.
- Không nên gom tất cả page vào `src/pages` nếu page đó gắn chặt với một feature.

## 4. Nguyên Tắc Bắt Buộc

1. Không thay đổi behavior hiện tại.
2. Không đổi API request/response.
3. Không đổi route public:
   - `/dashboard`
   - `/search`
   - `/investigations`
   - `/audit-logs`
   - `/query-library`
4. Không đổi RBAC behavior.
5. Không đổi UI/visual trừ khi cần sửa import hoặc class name bị lỗi.
6. Không đổi test expectation nếu không có lý do kỹ thuật rõ ràng.
7. Không để circular dependency giữa `features`.
8. Feature không import ngược từ feature khác trừ khi qua public `index.ts` hoặc shared contract.
9. `shared` không được import từ `features`.
10. Sau mỗi phase lớn phải chạy test/build.

## 5. Mapping Đề Xuất Từ Cấu Trúc Hiện Tại Sang Cấu Trúc Mới

### 5.1 App Composition

Di chuyển:

```text
frontend/src/App.tsx
frontend/src/lib/app-routes.ts
```

Sang:

```text
frontend/src/app/App.tsx
frontend/src/app/app-routes.ts
frontend/src/app/routes.tsx
frontend/src/app/providers.tsx
```

Yêu cầu:

- `main.tsx` import `App` từ `@/app/App`.
- Nếu `App.tsx` vẫn còn quá dài, tách phần `<Routes>` sang `routes.tsx`.
- `providers.tsx` chứa các provider app-level nếu hiện tại hoặc tương lai có auth/router/theme provider.

### 5.2 Shared UI

Di chuyển:

```text
frontend/src/components/ui/*
```

Sang:

```text
frontend/src/shared/components/ui/*
```

Di chuyển các component dùng chung nhiều feature:

```text
frontend/src/components/soc/country-code.tsx
frontend/src/components/soc/severity-badge.tsx
```

Sang:

```text
frontend/src/shared/components/display/country-code.tsx
frontend/src/shared/components/display/severity-badge.tsx
```

Yêu cầu:

- Cập nhật toàn bộ import.
- Không để feature-specific component nằm trong shared.

### 5.3 Shared API Layer

Di chuyển:

```text
frontend/src/services/api-client.ts
frontend/src/services/http-client.ts
frontend/src/services/auth-token.ts
frontend/src/services/api-error.ts
frontend/src/services/api-error-messages.ts
```

Sang:

```text
frontend/src/shared/services/api/api-client.ts
frontend/src/shared/services/api/http-client.ts
frontend/src/shared/services/api/auth-token.ts
frontend/src/shared/services/api/api-error.ts
frontend/src/shared/services/api/api-error-messages.ts
```

Yêu cầu:

- Giữ façade `api-client.ts`.
- Có thể để re-export compatibility ở path cũ tạm thời trong 1 commit nếu muốn giảm diff, nhưng cuối cùng nên cập nhật import sang path mới.
- Giữ test cho retry 401 và error mapping.

### 5.4 Auth Feature

Di chuyển:

```text
frontend/src/auth/*
frontend/src/services/auth-api.ts
```

Sang:

```text
frontend/src/features/auth/
  components/
  hooks/
  services/
  auth-config.ts
  permissions.ts
  types.ts
  index.ts
```

Mapping gợi ý:

```text
auth-gate.tsx        -> features/auth/components/auth-gate.tsx
use-auth.ts          -> features/auth/hooks/use-auth.ts
auth-api.ts          -> features/auth/services/auth-api.ts
permissions.ts       -> features/auth/permissions.ts
auth-config.ts       -> features/auth/auth-config.ts
auth-context.tsx     -> features/auth/auth-context.tsx
```

Yêu cầu:

- Giữ role/permission behavior hiện tại.
- Test `permissions.test.ts`, `auth-gate.test.tsx` vẫn pass.

### 5.5 Dashboard Feature

Di chuyển:

```text
frontend/src/components/soc/dashboard/*
```

Sang:

```text
frontend/src/features/dashboard/components/*
frontend/src/features/dashboard/lib/dashboard-searchplans.ts
frontend/src/features/dashboard/index.ts
```

Yêu cầu:

- `SocDashboard` export qua `features/dashboard`.
- SearchPlan dashboard definitions nằm trong `features/dashboard/lib`.
- Không để dashboard import từ search feature.

### 5.6 Search Feature

Di chuyển các phần liên quan search:

```text
frontend/src/components/soc/search-section.tsx
frontend/src/components/soc/search-status.tsx
frontend/src/components/soc/query-transparency.tsx
frontend/src/components/soc/query-breakdown.tsx
frontend/src/components/soc/result-tabs.tsx
frontend/src/components/soc/results/*
frontend/src/components/soc/aggregation-chart.tsx
frontend/src/components/soc/metrics-summary.tsx
frontend/src/components/soc/follow-up-suggestions.tsx
frontend/src/components/soc/event-detail-drawer.tsx
frontend/src/components/soc/history-sheet.tsx
frontend/src/hooks/use-search-workflow.ts
frontend/src/hooks/use-event-detail.ts
frontend/src/hooks/use-search-export.ts
frontend/src/hooks/use-search-history-modal.ts
frontend/src/services/search-api.ts
frontend/src/services/search-plan-api.ts
frontend/src/services/search-plan-response.ts
frontend/src/services/mock-search-api.ts
frontend/src/services/query-refinement-api.ts
frontend/src/services/follow-up-suggestions-api.ts
frontend/src/services/csv-export-api.ts
frontend/src/lib/search-plan-constants.ts
frontend/src/lib/search-plan-filters.ts
frontend/src/lib/chart-time-format.ts
frontend/src/lib/audit-question-format.ts
frontend/src/lib/mock-data.ts
frontend/src/lib/mock-presentation.ts
```

Sang:

```text
frontend/src/features/search/
  components/
    search-section.tsx
    search-status.tsx
    query-transparency/
    results/
    summary/
    suggestions/
    event-detail/
    recent-queries/
  hooks/
    use-search-workflow.ts
    use-event-detail.ts
    use-search-export.ts
    use-search-history-modal.ts
  services/
    search-api.ts
    search-plan-api.ts
    search-plan-response.ts
    mock-search-api.ts
    query-refinement-api.ts
    follow-up-suggestions-api.ts
    csv-export-api.ts
  lib/
    search-plan-constants.ts
    search-plan-filters.ts
    chart-time-format.ts
    audit-question-format.ts
    mock-data.ts
    mock-presentation.ts
  types.ts
  index.ts
```

Yêu cầu:

- Các component search import shared UI từ `shared/components/ui`.
- Nếu component search cần `country-code` hoặc `severity-badge`, import từ `shared/components/display`.
- Giữ test search hiện có, cập nhật import path.

### 5.7 Investigations Feature

Di chuyển:

```text
frontend/src/components/soc/investigations/*
frontend/src/services/history-api.ts
frontend/src/lib/investigation-suggestions.ts
```

Sang:

```text
frontend/src/features/investigations/
  components/
  services/history-api.ts
  lib/investigation-suggestions.ts
  types.ts
  index.ts
```

Yêu cầu:

- `InvestigationsPage` export qua feature index.
- Nếu dùng chung `SearchHistoryItemDto`, cân nhắc để type ở `shared/types/soc.ts` hoặc feature-specific type.

### 5.8 Audit Logs Feature

Di chuyển:

```text
frontend/src/components/soc/admin/audit-logs-page.tsx
```

Sang:

```text
frontend/src/features/audit-logs/components/audit-logs-page.tsx
frontend/src/features/audit-logs/index.ts
```

Nếu audit dùng service chung với history, không duplicate logic. Có thể giữ audit endpoint function trong `features/investigations/services/history-api.ts` nếu hiện tại chung domain audit/history, hoặc tách `features/audit-logs/services/audit-api.ts` nếu rõ ràng hơn.

### 5.9 Query Library Feature

Di chuyển:

```text
frontend/src/components/soc/query-library-page.tsx
frontend/src/lib/query-library.ts
frontend/src/lib/query-library/*
```

Sang:

```text
frontend/src/features/query-library/
  components/query-library-page.tsx
  data/
    items.ts
    search.ts
    aggregation.ts
    time-series.ts
    playbooks.ts
    index.ts
  types.ts
  index.ts
```

Yêu cầu:

- Data tĩnh query library không nằm trong root `lib`.
- Page export qua `features/query-library`.

### 5.10 Layout / Sidebar

Di chuyển:

```text
frontend/src/components/soc/soc-sidebar.tsx
```

Sang:

```text
frontend/src/shared/components/layout/soc-sidebar.tsx
```

Hoặc nếu sidebar phụ thuộc mạnh vào app pages:

```text
frontend/src/app/components/soc-sidebar.tsx
```

Khuyến nghị: đặt trong `shared/components/layout` nếu nó chỉ nhận props và không tự biết business logic.

## 6. Import Boundary Rules

Áp dụng rule mềm trong refactor:

```text
app        -> features, shared
features   -> shared, same feature
shared     -> no features
```

Ví dụ hợp lệ:

```ts
import { Button } from "@/shared/components/ui/button";
import { SearchSection } from "@/features/search";
```

Ví dụ không nên:

```ts
// Không nên để dashboard import trực tiếp component nội bộ của search
import { ResultTabs } from "@/features/search/components/results/result-tabs";
```

Nếu cần dùng chung, đưa phần đó vào `shared` hoặc export chính thức qua `features/search/index.ts`.

## 7. Thứ Tự Thực Hiện Khuyến Nghị

### Phase 0: Baseline

Chạy trước khi sửa:

```bash
cd frontend
npm run lint
npm test -- --run
npm run build
```

Ghi nhận test nào đang pass/fail trước khi refactor.

### Phase 1: Tạo Skeleton Folder

Tạo:

```text
src/app
src/features/search
src/features/dashboard
src/features/investigations
src/features/audit-logs
src/features/query-library
src/features/auth
src/shared/components
src/shared/services
src/shared/lib
src/shared/types
```

Chưa move logic lớn ở phase này, chỉ tạo cấu trúc và index files nếu cần.

### Phase 2: Move Shared UI Và Shared API

Move:

- `components/ui` -> `shared/components/ui`
- `country-code`, `severity-badge` -> `shared/components/display`
- API client files -> `shared/services/api`

Chạy:

```bash
npm run lint
npm test -- --run src/services/api-client.test.ts
npm run build
```

### Phase 3: Move Auth

Move auth folder vào `features/auth`.

Chạy:

```bash
npm test -- --run src/features/auth
npm run build
```

### Phase 4: Move Dashboard, Query Library, Audit Logs

Đây là các feature tương đối độc lập, nên move trước search.

Chạy test tương ứng:

```bash
npm test -- --run src/features/dashboard src/features/query-library
npm run build
```

### Phase 5: Move Investigations

Move investigations page, master list, detail panel, badges, history API nếu phù hợp.

Chạy:

```bash
npm test -- --run src/features/investigations
npm run build
```

### Phase 6: Move Search Feature

Move phần lớn search components/hooks/services/lib.

Đây là phase rủi ro nhất. Làm theo từng cụm:

1. Move services.
2. Move lib.
3. Move hooks.
4. Move components.
5. Update App/routes imports.

Chạy:

```bash
npm test -- --run src/features/search
npm test -- --run src/App.test.tsx
npm run build
```

### Phase 7: App Routes And Public Exports

Tạo hoặc cập nhật:

```text
src/app/App.tsx
src/app/routes.tsx
src/app/providers.tsx
```

Mỗi feature nên có `index.ts` export public API.

Ví dụ:

```ts
export { SocDashboard } from "./components/soc-dashboard";
```

App chỉ import từ feature public entrypoint:

```ts
import { SocDashboard } from "@/features/dashboard";
import { QueryLibraryPage } from "@/features/query-library";
```

Không import sâu vào nội bộ feature nếu không cần.

### Phase 8: Frontend README

Sau khi hoàn tất refactor frontend, viết hoặc cập nhật:

```text
frontend/README.md
```

README phải ngắn gọn, trọng tâm, dễ đọc cho developer mới. Không viết quá dài như report. Có thể dùng icon/badge phù hợp để README nhìn đẹp và hiện đại hơn, nhưng chỉ dùng vừa đủ, không lạm dụng khiến file bị rối. Nội dung nên gồm:

1. **Tên module**

   Ví dụ:

   ```md
   # SOC AI Search Frontend
   ```

2. **Overview ngắn + visual badges/icons**

   Viết 2-3 câu mô tả frontend này dùng để làm gì: SOC dashboard, natural-language event search, investigations, audit logs và query library.

   Có thể dùng một hàng badge/icon nhỏ cho các công nghệ chính để README đẹp hơn, ví dụ:

   - React
   - TypeScript
   - Vite
   - Tailwind CSS
   - shadcn/ui / Radix UI
   - Keycloak/OIDC
   - Vitest

   Lưu ý: badge/icon chỉ để tăng tính trực quan. Không biến README thành danh sách tech stack quá dài. Ưu tiên phần kiến trúc, cách chạy và quy ước import.

3. **Kiến trúc thư mục**

   Mô tả ngắn:

   ```text
   src/app        App composition, routes, providers
   src/features   Domain features: search, dashboard, investigations, audit logs, query library, auth
   src/shared     Shared UI, API client, helpers, common types
   ```

4. **Cách chạy local**

   Ví dụ:

   ```bash
   npm install
   npm run dev
   ```

5. **Cách kiểm tra**

   ```bash
   npm run lint
   npm test -- --run
   npm run build
   ```

6. **Quy ước import**

   Ghi ngắn gọn:

   - Feature code import từ `shared`.
   - App import feature qua public `index.ts`.
   - Không import vòng giữa các feature.

7. **Ghi chú auth/API**

   Giải thích ngắn:

   - Frontend dùng OIDC/Keycloak để lấy access token.
   - API client tự gắn token vào request.
   - Khi gặp 401, API client có cơ chế refresh/retry theo logic hiện tại.

README nên dùng Markdown đẹp vừa đủ: heading rõ ràng, icon/badge phù hợp, bảng nhỏ nếu cần, code block cho command, không nhồi quá nhiều mô tả học thuật.

## 8. Tiêu Chí Hoàn Thành

Refactor chỉ được xem là hoàn thành khi:

1. App vẫn chạy với tất cả route cũ.
2. Không đổi UX hiện tại.
3. `App.tsx` nhỏ hơn trước và chủ yếu làm composition.
4. `components/soc` được xóa hoặc chỉ còn compatibility re-export tạm thời.
5. Domain code nằm trong `features/*`.
6. UI primitive nằm trong `shared/components/ui`.
7. API client core nằm trong `shared/services/api`.
8. Không còn import từ `@/components/soc/...` trong code mới, trừ khi là compatibility layer tạm thời.
9. Có `frontend/README.md` mô tả ngắn gọn kiến trúc frontend mới, tech stack, cách chạy, cách test và import conventions.
10. Tests pass.
11. Build pass.

## 9. Lệnh Kiểm Tra Bắt Buộc

Sau refactor chạy:

```bash
cd frontend
npm run lint
npm test -- --run
npm run build
```

Nếu full test quá lâu, tối thiểu phải chạy:

```bash
npm test -- --run src/App.test.tsx
npm test -- --run src/features/search
npm test -- --run src/features/dashboard
npm test -- --run src/features/investigations
npm test -- --run src/features/query-library
npm test -- --run src/shared/services/api
npm run build
```

## 10. Những Điều Không Làm Trong Refactor Này

Không làm các việc sau trong cùng refactor để tránh scope creep:

- Không đổi UI theme.
- Không đổi business logic search.
- Không đổi RBAC.
- Không đổi endpoint.
- Không đổi mock data.
- Không đổi backend.
- Không đổi test strategy.
- Không đổi router path.
- Không thêm state management library mới như Redux/Zustand nếu chưa có nhu cầu thật sự.

## 11. Ghi Chú Thiết Kế

Lý do chuyển sang feature-based architecture:

- Khi app lớn, developer thường làm việc theo tính năng, không theo loại file.
- Mỗi feature có thể sở hữu component, hook, service, helper và type của nó.
- Code review dễ hơn vì thay đổi Dashboard không lẫn với Search hoặc Audit.
- Dễ tách module, lazy load route, hoặc chia ownership về sau.
- Root `components`, `services`, `hooks`, `lib` không bị phình thành nơi chứa mọi thứ.

Điểm quan trọng: feature-based không có nghĩa là file nào cũng phải move ngay. Nếu một file thật sự dùng chung nhiều nơi, hãy đưa vào `shared`. Nếu một file chỉ phục vụ một domain, hãy để nó sống trong feature đó.
