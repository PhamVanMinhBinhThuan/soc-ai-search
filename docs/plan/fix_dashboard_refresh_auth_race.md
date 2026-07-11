# Prompt: Fix Dashboard Refresh 401 Unauthorized

## Bối cảnh lỗi

Khi người dùng đang ở trang:

```text
https://soc-ai-search.app/dashboard
```

sau đó bấm refresh trình duyệt, Dashboard gọi nhiều request:

```text
POST https://api.soc-ai-search.app/api/v1/search/plan
```

và bị lỗi:

```text
401 Unauthorized
{"message":"Unauthorized","errors":["Authentication is required"]}
```

Quan sát trong DevTools Network cho request lỗi:

- Có `origin: https://soc-ai-search.app`.
- CORS response hợp lệ.
- Không có header `Authorization: Bearer <access_token>`.
- Backend trả 401 là đúng vì `/api/v1/search/plan` là endpoint cần đăng nhập.

Vì vậy lỗi nhiều khả năng là **frontend auth race condition sau hard refresh**:

1. Người dùng refresh trực tiếp ở route `/dashboard`.
2. React app render `SocDashboard`.
3. `SocDashboard` chạy `useEffect([])` và gọi `executeSearchPlan(...)` ngay.
4. `requestJson(...)` lấy token qua `setAccessTokenProvider(() => auth.accessToken)`.
5. Ở thời điểm dashboard gọi API, Keycloak/OIDC chưa hydrate xong hoặc `auth.accessToken` vẫn `null`.
6. Request được gửi đi không có `Authorization`.
7. Backend trả 401.

Không sửa bằng cách public endpoint backend. Endpoint `/api/v1/search/plan` vẫn phải yêu cầu authenticated user vì nó truy vấn dữ liệu SOC.

## File cần đọc kỹ

Frontend:

- `frontend/src/App.tsx`
- `frontend/src/auth/auth-context.tsx`
- `frontend/src/auth/auth-config.ts`
- `frontend/src/services/api-client.ts`
- `frontend/src/services/search-api.ts`
- `frontend/src/components/soc/dashboard/soc-dashboard.tsx`
- Các test liên quan trong:
  - `frontend/src/services/api-client.test.ts`
  - `frontend/src/App.test.tsx`
  - nếu có, dashboard tests

Backend chỉ đọc để xác nhận quyền, không ưu tiên sửa:

- `backend/src/main/java/com/soc/ai/search/security/SecurityConfig.java`
- `backend/src/main/java/com/soc/ai/search/search/execution/SearchController.java`

## Mục tiêu sửa

Sau khi refresh trực tiếp ở `/dashboard`:

- Dashboard không được gọi `/api/v1/search/plan` khi auth/token chưa sẵn sàng.
- Request gửi tới API phải có:

```text
Authorization: Bearer <access_token>
```

- Nếu auth đang loading, Dashboard hiển thị loading/skeleton nhẹ.
- Khi auth đã sẵn sàng, Dashboard tự fetch dữ liệu một lần.
- Không tạo loop gọi API liên tục.
- Auto-refresh hoặc nút Refresh cũng phải tôn trọng auth readiness.

## Hướng sửa đề xuất

### 1. Thêm auth readiness gate cho Dashboard

Hiện tại `SocDashboard` không nhận auth state, nên nó tự fetch ngay khi mount.

Sửa theo một trong hai cách:

#### Cách A - truyền auth state từ `App.tsx` vào `SocDashboard`

Trong `App.tsx`, khi render route dashboard:

```tsx
<SocDashboard
  authEnabled={auth.enabled}
  authLoading={auth.loading}
  authenticated={auth.authenticated}
  accessTokenReady={Boolean(auth.accessToken)}
/>
```

Trong `SocDashboard`:

- Nếu `authEnabled === true` và (`authLoading === true` hoặc `!authenticated` hoặc `!accessTokenReady`) thì không gọi API.
- Hiển thị trạng thái:

```text
Loading dashboard metrics...
```

hoặc skeleton cards.

- Chỉ chạy `fetchData` khi:

```ts
const canFetchDashboard =
  !authEnabled || (!authLoading && authenticated && accessTokenReady)
```

Effect nên phụ thuộc `canFetchDashboard`:

```tsx
useEffect(() => {
  if (!canFetchDashboard) return

  const controller = new AbortController()
  void fetchData(controller.signal)

  return () => controller.abort()
}, [canFetchDashboard])
```

#### Cách B - đọc auth trực tiếp trong `SocDashboard`

Trong `SocDashboard`, gọi:

```ts
const auth = useSocAuth()
```

Sau đó tự tính `canFetchDashboard`.

Ưu tiên Cách A nếu muốn component ít phụ thuộc global context hơn. Ưu tiên Cách B nếu codebase đang dùng context trực tiếp ở nhiều component page.

### 2. Không gửi request nếu token chưa có

`frontend/src/services/api-client.ts` hiện có:

```ts
let accessTokenProvider: (() => string | null) | null = null

export function authHeaders(): HeadersInit {
  const token = accessTokenProvider?.()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
```

Vấn đề là nếu provider trả `null`, `requestJson` vẫn fetch bình thường, dẫn đến request unauthenticated.

Không nhất thiết phải đổi toàn bộ behavior nếu auth-disabled mode/demo còn cần gọi API không token. Nhưng với auth-enabled production, nên có guard rõ ràng ở page/service trước khi gọi API.

Nếu muốn chắc hơn, có thể thêm helper:

```ts
export function hasAccessToken() {
  return Boolean(accessTokenProvider?.())
}
```

và dùng trong Dashboard. Không được làm hỏng mock mode hoặc auth-disabled local mode.

### 3. Cân nhắc async token refresh

Hiện tại token provider chỉ trả `auth.accessToken` hiện có. Nếu token đã gần hết hạn, request có thể fail 401 do expired token.

Nếu codebase đang dùng `react-oidc-context`, có thể cân nhắc mở rộng auth layer để refresh token trước khi request:

- Trước mắt, fix race sau refresh là ưu tiên.
- Không bắt buộc refactor `requestJson` thành async token provider nếu rủi ro lớn.
- Nếu làm async token provider, phải cập nhật test kỹ và đảm bảo mọi service vẫn hoạt động.

### 4. Dashboard fetch phải xử lý partial failure nhưng không che lỗi auth

Dashboard hiện dùng:

```ts
Promise.allSettled([
  executeSearchPlan(failedLoginsPlan, signal),
  executeSearchPlan(criticalPlan, signal),
  executeSearchPlan(timePlan, signal),
  executeSearchPlan(severityPlan, signal),
  executeSearchPlan(topIpPlan, signal),
])
```

Điều này tốt cho partial failure của từng card, nhưng với 401 thì dễ khiến UI chỉ hiện 0/N/A và người dùng không biết auth lỗi.

Sau khi fix auth gate:

- Nếu vẫn gặp 401 sau khi `canFetchDashboard === true`, nên hiển thị error banner nhỏ:

```text
Dashboard request is unauthorized. Please sign in again.
```

- Không silent biến 401 thành zero metrics.
- Partial failure vẫn giữ cho lỗi Elasticsearch/card riêng lẻ, nhưng auth failure nên hiện rõ.

### 5. Refresh button và auto-refresh

Nút `Refresh` hiện gọi:

```tsx
onClick={() => fetchData()}
```

Sửa để:

- Disable khi auth chưa sẵn sàng.
- Không gọi API nếu `!canFetchDashboard`.
- Nếu sau này có auto-refresh 10 phút, interval cũng phải kiểm tra `canFetchDashboard`.

Ví dụ:

```tsx
<button
  onClick={() => {
    if (canFetchDashboard) void fetchData()
  }}
  disabled={refreshing || !canFetchDashboard}
>
```

## Không được làm

- Không mở public `/api/v1/search/plan`.
- Không bỏ Spring Security.
- Không hardcode token.
- Không bắt Dashboard dùng mock data khi auth lỗi production.
- Không swallow 401 thành `0`/`N/A` mà không có thông báo.
- Không làm hỏng mock mode/local auth-disabled mode.

## Tests bắt buộc

### Frontend unit/component tests

Cập nhật hoặc thêm test cho Dashboard/API client.

Các test tối thiểu:

1. Dashboard không gọi `executeSearchPlan` khi auth enabled nhưng `authLoading=true`.
2. Dashboard không gọi `executeSearchPlan` khi auth enabled nhưng `accessTokenReady=false`.
3. Dashboard gọi `executeSearchPlan` khi auth enabled, authenticated, token ready.
4. Refresh button disabled khi auth chưa ready.
5. `requestJson` vẫn attach `Authorization: Bearer <token>` khi token provider có token.
6. Không phá auth-disabled/mock mode.

Nếu dùng `useSocAuth` trực tiếp trong Dashboard, mock provider/hook trong test.

### Manual verification

Sau khi build/deploy:

1. Mở DevTools Network.
2. Login bình thường.
3. Vào:

```text
https://soc-ai-search.app/dashboard
```

4. Bấm refresh trình duyệt.
5. Kiểm tra các request:

```text
POST https://api.soc-ai-search.app/api/v1/search/plan
```

phải có:

```text
Authorization: Bearer ...
```

6. Không còn 401 sau refresh.
7. Dashboard hiển thị dữ liệu thật thay vì toàn `0`, `N/A`, `No data available`.

## Lệnh verification cần chạy

Frontend:

```bash
cd frontend
npm run lint
npm run test -- api-client.test.ts
npm run test -- soc-dashboard
npm run build
```

Nếu test dashboard chưa tồn tại, tạo/cập nhật test phù hợp rồi chạy đúng file test đó.

Backend thường không cần đổi. Nếu có đổi security/backend contract thì chạy:

```bash
cd backend
./mvnw test
```

Trên Windows PowerShell:

```powershell
cd frontend
npm run lint
npm run test -- api-client.test.ts
npm run build
```

## Acceptance Criteria

- Hard refresh tại `/dashboard` không còn gửi request thiếu `Authorization`.
- Không còn lỗi console:

```text
POST /api/v1/search/plan 401 Unauthorized
```

- Dashboard chỉ fetch khi auth/token đã sẵn sàng.
- UI có loading/error state rõ ràng thay vì im lặng hiển thị số 0 do 401.
- Các luồng Event Search, Query Result filter, Investigations, Audit Logs không bị ảnh hưởng.
- CI frontend pass.

