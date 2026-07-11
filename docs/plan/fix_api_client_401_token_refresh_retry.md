# Prompt: Fix 401 After Refresh With Authenticated API Client Retry

## Bối cảnh lỗi hiện tại

Sau khi vào trang:

```text
https://soc-ai-search.app/dashboard
```

rồi refresh trình duyệt tại chính route `/dashboard`, Dashboard vẫn gọi:

```text
POST https://api.soc-ai-search.app/api/v1/search/plan
```

và console xuất hiện nhiều lỗi:

```text
Failed to load resource: the server responded with a status of 401 ()
```

Dashboard hiển thị:

- `Events = 0`
- `Critical / High Events = 0`
- `Top Source IP = N/A`
- `Events Over Time = No data available`

Trước đó đã có fix gate Dashboard để không gọi API khi `auth.accessToken` chưa sẵn sàng. Nhưng lỗi vẫn còn, nghĩa là vấn đề có thể không chỉ là “token chưa có”, mà là:

- token có nhưng đã stale/expired;
- OIDC/Keycloak chưa renew kịp sau hard refresh;
- nhiều request Dashboard bắn song song, request nào cũng dùng cùng token cũ;
- `api-client.ts` hiện chưa có cơ chế refresh token khi gặp 401 rồi retry request ban đầu.

## Chẩn đoán kỹ thuật

Hiện tại `frontend/src/services/api-client.ts` đang hoạt động theo kiểu:

```ts
let accessTokenProvider: (() => string | null) | null = null

export function authHeaders(): HeadersInit {
  const token = accessTokenProvider?.()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function requestJson(path, init) {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      Accept: 'application/json',
      ...authHeaders(),
      ...init.headers,
    },
  })
}
```

Điểm yếu:

1. `requestJson` chỉ đính kèm token hiện có.
2. Nếu backend trả `401`, client lập tức throw `ApiError`.
3. Không có bước gọi Keycloak/OIDC để renew token.
4. Không retry request ban đầu với token mới.
5. Khi Dashboard gọi 5 request song song, nếu thêm refresh một cách ngây thơ thì có thể tạo ra 5 lần refresh token cùng lúc.

Vì vậy cần sửa ở tầng API client theo pattern gần giống **decorator/authenticated fetch wrapper**:

```text
requestJson(...)
  -> attach current access token
  -> fetch
  -> if 401:
       refresh token bằng OIDC/Keycloak
       retry request ban đầu đúng 1 lần với token mới
  -> nếu nhiều request cùng 401:
       chỉ 1 request thực sự gọi refresh
       các request còn lại chờ cùng refreshPromise
```

## Mục tiêu sửa

Sau khi refresh trực tiếp tại `/dashboard`:

- Không còn 5 request `/api/v1/search/plan` fail 401.
- Nếu token cũ/stale, request đầu tiên gặp 401 sẽ trigger refresh token.
- Các request song song cùng chờ một refresh chung.
- Sau khi refresh thành công, request ban đầu được retry đúng 1 lần.
- Nếu refresh thất bại, hệ thống hiển thị lỗi session expired/sign in again như hiện tại.
- Không tạo infinite retry loop.
- Không phá mock mode hoặc auth-disabled local mode.

## File cần đọc

Frontend bắt buộc:

- `frontend/src/services/api-client.ts`
- `frontend/src/services/api-client.test.ts`
- `frontend/src/auth/auth-context.tsx`
- `frontend/src/auth/auth-config.ts`
- `frontend/src/auth/use-auth.ts`
- `frontend/src/App.tsx`
- `frontend/src/components/soc/dashboard/soc-dashboard.tsx`
- `frontend/src/services/search-api.ts`
- `frontend/src/services/search-plan-api.ts`
- `frontend/src/services/history-api.ts`
- `frontend/src/services/query-refinement-api.ts`
- `frontend/src/services/follow-up-suggestions-api.ts`

Backend chỉ đọc để hiểu response 401, không ưu tiên sửa:

- `backend/src/main/java/com/soc/ai/search/security/SecurityConfig.java`

## Yêu cầu thiết kế

### 1. Tạo token refresh provider trong auth layer

Mở rộng `SocAuthState` trong `frontend/src/auth/auth-context.tsx` để có khả năng refresh token:

```ts
refreshAccessToken: () => Promise<string | null>
```

Với auth-disabled/demo mode:

```ts
refreshAccessToken: async () => null
```

Với OIDC/Keycloak mode, dùng API của `react-oidc-context` / `oidc-client-ts`.

Gợi ý:

```ts
const refreshedUser = await oidc.signinSilent()
return refreshedUser?.access_token ?? oidc.user?.access_token ?? null
```

Nếu version thư viện không có `signinSilent`, kiểm tra API thực tế của `useOidcAuth()`:

- có thể là `oidc.signinSilent()`;
- hoặc `oidc.userManager.signinSilent()`;
- hoặc cách tương đương trong `react-oidc-context`.

Không đoán bừa. Hãy kiểm tra type/package và dùng đúng API hiện có.

### 2. Đăng ký token provider và refresh provider vào API client

Hiện `App.tsx` đang có:

```ts
useEffect(() => {
  setAccessTokenProvider(() => auth.accessToken);
  return () => setAccessTokenProvider(null);
}, [auth.accessToken]);
```

Hãy refactor thành một API rõ hơn, ví dụ:

```ts
setAuthTokenHandlers({
  getAccessToken: () => auth.accessToken,
  refreshAccessToken: auth.refreshAccessToken,
})
```

hoặc giữ `setAccessTokenProvider` và thêm:

```ts
setAccessTokenRefreshProvider(auth.refreshAccessToken)
```

Ưu tiên thiết kế rõ ràng, dễ test.

### 3. Sửa `requestJson` thành authenticated request wrapper

Trong `frontend/src/services/api-client.ts`, thêm logic:

1. Build request với token hiện tại.
2. Gọi `fetch`.
3. Nếu response không phải 401, xử lý như cũ.
4. Nếu response là 401 và có refresh provider:
   - gọi refresh token single-flight;
   - retry request ban đầu đúng 1 lần với token mới;
   - nếu retry vẫn 401 thì throw `ApiError(401)`.

Pseudo-code:

```ts
let refreshAccessTokenProvider: (() => Promise<string | null>) | null = null
let tokenRefreshPromise: Promise<string | null> | null = null

async function refreshTokenOnce() {
  if (!refreshAccessTokenProvider) return null

  if (!tokenRefreshPromise) {
    tokenRefreshPromise = refreshAccessTokenProvider()
      .catch(() => null)
      .finally(() => {
        tokenRefreshPromise = null
      })
  }

  return tokenRefreshPromise
}

async function fetchWithAuth(path, init, tokenOverride?) {
  const token = tokenOverride ?? accessTokenProvider?.()
  return fetch(apiUrl(path), {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body != null ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
}

export async function requestJson(path, init = {}) {
  let response = await fetchWithAuth(path, init)

  if (response.status === 401 && refreshAccessTokenProvider) {
    const freshToken = await refreshTokenOnce()
    if (freshToken) {
      response = await fetchWithAuth(path, init, freshToken)
    }
  }

  return parseOrThrow(response)
}
```

### 4. Single-flight refresh là bắt buộc

Dashboard hiện gọi 5 request song song.

Khi cả 5 request cùng nhận 401:

- request đầu tiên tạo `tokenRefreshPromise`;
- 4 request còn lại không được tự gọi refresh;
- 4 request còn lại chỉ `await tokenRefreshPromise`;
- sau khi có token mới, cả 5 retry request gốc với token mới.

Acceptance quan trọng:

```text
5 requests receive 401 at the same time
=> refreshAccessToken is called exactly 1 time
=> original requests are retried after refresh
```

### 5. Không retry vô hạn

Mỗi request chỉ retry sau refresh tối đa 1 lần.

Không được:

```text
401 -> refresh -> retry -> 401 -> refresh -> retry -> ...
```

Nếu retry vẫn 401:

- throw `ApiError(401)`;
- UI hiện message session expired/sign in again.

### 6. Không refresh với request bị abort

Nếu `AbortSignal` đã abort:

- không refresh;
- không retry.

Nếu trong lúc chờ refresh mà signal abort:

- request nên kết thúc bằng abort/error phù hợp.

Không để Dashboard unmount rồi vẫn setState do retry muộn.

### 7. Không phá auth-disabled / mock mode

Local/demo mode có thể không có token.

Yêu cầu:

- Nếu không có refresh provider thì behavior cũ vẫn hoạt động.
- Mock mode không bị ảnh hưởng.
- Các request public nếu có vẫn chạy được khi không token.

### 8. Dashboard vẫn nên giữ auth readiness gate

Không revert fix trước đó ở `SocDashboard`.

Hai lớp bảo vệ cần cùng tồn tại:

1. Page-level gate:
   - Dashboard không gọi API khi auth chưa hydrate hoặc token chưa có.
2. API-client-level retry:
   - Nếu token có nhưng stale/expired, refresh và retry.

## Tests bắt buộc

### `frontend/src/services/api-client.test.ts`

Thêm/cập nhật test:

1. Attach Authorization như cũ khi token provider có token.
2. Nếu request trả 401 lần đầu:
   - gọi refresh provider;
   - retry request với token mới;
   - trả payload thành công.
3. Nếu nhiều request song song đều 401:
   - refresh provider chỉ được gọi 1 lần;
   - tất cả request retry thành công với token mới.
4. Nếu refresh provider trả `null`:
   - throw `ApiError(401)`.
5. Nếu retry sau refresh vẫn 401:
   - throw `ApiError(401)`;
   - không refresh lần 2.
6. Nếu không cấu hình refresh provider:
   - behavior cũ không bị phá.

### Auth context tests nếu có

Nếu mở rộng `SocAuthState`, cập nhật các test mock auth state:

- `frontend/src/App.test.tsx`
- các test dùng `SocAuthState`
- đảm bảo mock state có `refreshAccessToken`.

### Dashboard test

Giữ các test đã có:

- Dashboard không fetch khi auth loading.
- Dashboard không fetch khi token chưa ready.
- Dashboard fetch khi auth/token ready.

Không cần Dashboard test trực tiếp refresh token nếu đã test ở API client.

## Verification cần chạy

Frontend:

```bash
cd frontend
npm run lint
npm run test -- api-client.test.ts
npm run test -- soc-dashboard.test.tsx
npm run build
```

Nếu có sửa auth-context/App test:

```bash
npm run test -- App.test.tsx
```

Nếu CI có full frontend test:

```bash
npm run test
```

## Manual test sau deploy

1. Login vào `https://soc-ai-search.app`.
2. Vào `/dashboard`.
3. Refresh trình duyệt tại `/dashboard`.
4. Mở DevTools Network.
5. Kiểm tra:
   - nếu request đầu bị 401 do token stale, phải có retry sau refresh token;
   - request retry phải có `Authorization: Bearer <new-token>`;
   - cuối cùng dashboard hiển thị data, không còn toàn 0/N/A.
6. Kiểm tra console không còn 5 lỗi 401 đỏ liên tiếp.
7. Kiểm tra Event Search, Investigations, Audit Logs vẫn gọi API bình thường.

## Cách giải thích khi bảo vệ

Nếu hội đồng hỏi vì sao cần wrapper này:

> Sau khi refresh trang hoặc khi token hết hạn, frontend có thể đang giữ access token cũ. Vì Dashboard gọi nhiều API song song, nếu mỗi request tự refresh token riêng thì sẽ tạo nhiều request refresh không cần thiết. Em xử lý ở tầng API client: request nào gặp 401 sẽ kích hoạt refresh token, các request khác dùng chung một `refreshPromise`, sau đó tất cả retry lại request gốc đúng một lần với token mới. Backend vẫn giữ bảo mật, không mở public endpoint.

## Acceptance Criteria

- Refresh tại `/dashboard` không còn làm Dashboard mất dữ liệu do 401.
- `requestJson` có cơ chế retry 401 bằng token mới.
- Nhiều request song song chỉ refresh token một lần.
- Không retry vô hạn.
- Không phá mock/auth-disabled mode.
- Frontend lint/test/build pass.

