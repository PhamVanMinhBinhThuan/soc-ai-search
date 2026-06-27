# Q11 - RBAC, Keycloak Và JWT Hoạt Động Như Thế Nào?

## 1. Câu trả lời ngắn

Hệ thống dùng **Keycloak** để đăng nhập và cấp role cho user. Sau khi login thành công, Keycloak cấp cho frontend một **access token dạng JWT**. Frontend gửi JWT đó trong header:

```http
Authorization: Bearer <access_token>
```

Backend dùng **Spring Security OAuth2 Resource Server** để verify JWT, đọc role trong token, map thành Spring authority, rồi enforce quyền bằng RBAC.

Câu cần nhớ khi bảo vệ:

> Keycloak cấp danh tính và role. Frontend chỉ giữ token và gửi kèm request. Backend mới là nơi verify JWT và chặn quyền thật sự.

---

## 2. Hệ thống có những role nào?

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/security/RoleNames.java
infra/keycloak/realm-export/soc-ai-search-realm.json
```

Trong `RoleNames.java`:

```java
public static final String VIEWER = "SOC_VIEWER";
public static final String ANALYST = "SOC_ANALYST";
public static final String ADMIN = "SOC_ADMIN";

public static final String ROLE_VIEWER = "ROLE_" + VIEWER;
public static final String ROLE_ANALYST = "ROLE_" + ANALYST;
public static final String ROLE_ADMIN = "ROLE_" + ADMIN;
```

Ý nghĩa:

| Role | Ý nghĩa |
| --- | --- |
| `SOC_VIEWER` | Xem/search cơ bản |
| `SOC_ANALYST` | Điều tra, edit SearchPlan, export CSV, pin investigation |
| `SOC_ADMIN` | Quản trị, xem audit logs, toàn quyền |

Trong Keycloak realm export cũng có sẵn 3 role này để admin gán cho user.

---

## 3. Capability matrix

| Chức năng | Viewer | Analyst | Admin |
| --- | :---: | :---: | :---: |
| Search | Yes | Yes | Yes |
| Event detail cơ bản | Yes | Yes | Yes |
| Edit SearchPlan | No | Yes | Yes |
| Export CSV | No | Yes | Yes |
| Pin/unpin investigation | No | Yes | Yes |
| Audit logs | No | No | Yes |

Điểm quan trọng:

> Ẩn button trên UI không đủ bảo mật. Backend vẫn phải kiểm tra role. Nếu Viewer tự gọi API export bằng Postman, backend vẫn trả `403 Forbidden`.

---

## 4. Keycloak cấp JWT/access token cho web như thế nào?

Code frontend liên quan:

```text
frontend/src/auth/auth-config.ts
frontend/src/auth/auth-context.tsx
frontend/src/services/api-client.ts
frontend/src/App.tsx
```

Frontend dùng thư viện:

```ts
react-oidc-context
oidc-client-ts
```

Trong `auth-config.ts`, app cấu hình OIDC:

```ts
export const oidcConfig = {
  authority: 'https://auth.soc-ai-search.app/realms/soc-ai-search',
  client_id: 'soc-ai-search-frontend',
  redirect_uri: 'https://soc-ai-search.app/auth/callback',
  post_logout_redirect_uri: 'https://soc-ai-search.app',
  scope: 'openid profile email',
  response_type: 'code',
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
}
```

Ý nghĩa:

- `authority`: địa chỉ realm Keycloak.
- `client_id`: client frontend đã khai báo trong Keycloak.
- `redirect_uri`: nơi Keycloak redirect browser về sau khi login.
- `response_type: "code"`: dùng Authorization Code Flow.
- `scope: "openid profile email"`: xin thông tin định danh cơ bản.
- `sessionStorage`: lưu trạng thái OIDC/token trong phiên trình duyệt.

Flow login:

```text
User bấm Login
    ↓
Frontend gọi oidc.signinRedirect()
    ↓
Browser chuyển sang Keycloak login page
    ↓
User nhập username/password
    ↓
Keycloak xác thực user và role
    ↓
Keycloak redirect về /auth/callback với authorization code
    ↓
react-oidc-context đổi code lấy token
    ↓
Frontend có access_token/id_token trong oidc.user
```

Trong `auth-context.tsx`, frontend lấy token:

```ts
const user = oidc.user
const accessToken = user?.access_token ?? null
```

Token này là JWT do Keycloak ký. Bên trong JWT có các claim như:

```json
{
  "sub": "...",
  "preferred_username": "analyst.demo",
  "email": "...",
  "realm_access": {
    "roles": ["SOC_ANALYST"]
  }
}
```

Nói ngắn gọn:

> Frontend không tự tạo token. Frontend chỉ redirect user sang Keycloak. Keycloak login xong thì trả token về frontend theo chuẩn OIDC.

---

## 5. Frontend gửi token xuống backend như thế nào?

Code liên quan:

```text
frontend/src/App.tsx
frontend/src/services/api-client.ts
```

Trong `App.tsx`, app đưa access token vào API client:

```ts
setAccessTokenProvider(() => auth.accessToken)
```

Trong `api-client.ts`, mọi request API sẽ lấy token và gắn vào header:

```ts
export function authHeaders(): HeadersInit {
  const token = accessTokenProvider?.()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
```

Ví dụ khi frontend gọi search:

```http
POST /api/v1/search
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json
```

Ý nghĩa:

- Frontend không gửi username/password cho backend.
- Backend chỉ nhận Bearer token.
- Token chứng minh user đã login thành công ở Keycloak.

---

## 6. Backend xác thực JWT như thế nào?

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/security/SecurityConfig.java
backend/src/main/resources/application.properties
```

Trong `application.properties`:

```properties
app.auth.enabled=${APP_AUTH_ENABLED:false}
spring.security.oauth2.resourceserver.jwt.issuer-uri=${KEYCLOAK_ISSUER_URI:http://localhost:8082/realms/soc-ai-search}
spring.security.oauth2.resourceserver.jwt.jwk-set-uri=${KEYCLOAK_JWK_SET_URI:http://localhost:8082/realms/soc-ai-search/protocol/openid-connect/certs}
```

Trong `SecurityConfig.java`, nếu auth enabled:

```java
http
    .authorizeHttpRequests(authorize -> authorize
        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
        .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
        .anyRequest().authenticated())
    .oauth2ResourceServer(oauth2 -> oauth2
        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter)));
```

Ý nghĩa:

- Health/Swagger được public.
- API còn lại phải có JWT hợp lệ.
- Backend không gọi Keycloak để hỏi từng request.
- Backend tự verify chữ ký JWT bằng public key lấy từ JWKS endpoint của Keycloak.

JWKS là gì?

```text
Keycloak giữ private key để ký JWT.
Backend lấy public key từ /protocol/openid-connect/certs để verify JWT.
```

Backend kiểm tra:

- JWT có chữ ký hợp lệ không.
- JWT có hết hạn chưa.
- `issuer` có đúng realm Keycloak không.
- Sau đó mới tạo `Authentication` trong Spring Security.

Nếu token sai hoặc thiếu:

```text
401 Unauthorized
```

---

## 7. Backend lấy role từ JWT như thế nào?

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/security/KeycloakJwtGrantedAuthoritiesConverter.java
backend/src/main/java/com/soc/ai/search/security/SecurityConfig.java
```

Keycloak thường để role trong claim:

```json
{
  "realm_access": {
    "roles": ["SOC_ANALYST"]
  }
}
```

Spring Security mặc định không tự hiểu `realm_access.roles`, nên project có converter riêng:

```java
public class KeycloakJwtGrantedAuthoritiesConverter
        implements Converter<Jwt, Collection<GrantedAuthority>> {
```

Converter đọc role:

```java
roles.addAll(extractRoles(jwt.getClaim("realm_access")));
```

Sau đó thêm prefix `ROLE_`:

```java
.map(role -> role.startsWith(ROLE_PREFIX) ? role : ROLE_PREFIX + role)
.map(SimpleGrantedAuthority::new)
```

Ví dụ:

```text
JWT role: SOC_ANALYST
Spring authority: ROLE_SOC_ANALYST
```

Vì sao cần prefix `ROLE_`?

> Spring Security convention dùng authority dạng `ROLE_...` khi check `hasRole(...)` hoặc RBAC role.

---

## 8. Role hierarchy hoạt động như thế nào?

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/security/SecurityConfig.java
```

Code:

```java
@Bean
RoleHierarchy roleHierarchy() {
    return RoleHierarchyImpl.fromHierarchy(String.join("\n",
            RoleNames.ROLE_ADMIN + " > " + RoleNames.ROLE_ANALYST,
            RoleNames.ROLE_ANALYST + " > " + RoleNames.ROLE_VIEWER));
}
```

Ý nghĩa:

```text
SOC_ADMIN > SOC_ANALYST > SOC_VIEWER
```

Tức là:

- Admin tự động có quyền Analyst.
- Analyst tự động có quyền Viewer.
- Viewer chỉ có quyền Viewer.

Ví dụ:

User có `ROLE_SOC_ADMIN`, khi check `hasAnalyst(...)` vẫn pass.

---

## 9. RbacPermissionService làm gì?

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/security/RbacPermissionService.java
```

Các hàm chính:

```java
public boolean hasViewer(Authentication authentication) {
    return authDisabled() || hasRole(authentication, RoleNames.ROLE_VIEWER);
}

public boolean hasAnalyst(Authentication authentication) {
    return authDisabled() || hasRole(authentication, RoleNames.ROLE_ANALYST);
}

public boolean hasAdmin(Authentication authentication) {
    return authDisabled() || hasRole(authentication, RoleNames.ROLE_ADMIN);
}
```

Hàm kiểm tra role:

```java
private boolean hasRole(Authentication authentication, String role) {
    if (authentication == null || !authentication.isAuthenticated()) {
        return false;
    }

    return roleHierarchy.getReachableGrantedAuthorities(authentication.getAuthorities()).stream()
            .anyMatch(authority -> role.equals(authority.getAuthority()));
}
```

Ý nghĩa:

- Lấy role hiện tại của user từ Spring Security.
- Áp dụng role hierarchy.
- Kiểm tra user có đủ quyền không.

Nếu `APP_AUTH_ENABLED=false`, service cho phép pass để chạy local/demo nhanh:

```java
return authDisabled() || ...
```

Khi deploy public thì bật:

```env
APP_AUTH_ENABLED=true
```

---

## 10. CurrentUserService làm gì?

Code liên quan:

```text
backend/src/main/java/com/soc/ai/search/security/CurrentUserService.java
```

Nó lấy user hiện tại từ `SecurityContextHolder`:

```java
var authentication = SecurityContextHolder.getContext().getAuthentication();
var jwt = jwtAuthentication.getToken();
```

Sau đó lấy các claim:

```java
var username = claimAsString(jwt, "preferred_username").orElse(null);
var email = claimAsString(jwt, "email").orElse(null);
var subject = claimAsString(jwt, "sub").orElse(jwt.getSubject());
```

Và trả về `CurrentUser`:

```java
return new CurrentUser(
        true,
        identity,
        username,
        email,
        roles(authentication));
```

Ý nghĩa:

- Biết user hiện tại là ai.
- Lấy `identity` để lưu audit/history.
- Lấy roles để frontend/backend biết user có quyền gì.

Endpoint `/api/v1/auth/me` dùng service này để frontend xác nhận user/role từ backend.

---

## 11. Frontend kiểm tra quyền ở đâu?

Code liên quan:

```text
frontend/src/auth/permissions.ts
frontend/src/auth/auth-context.tsx
```

Frontend có role rank:

```ts
export type SocRole = 'SOC_VIEWER' | 'SOC_ANALYST' | 'SOC_ADMIN'

const roleRank: Record<SocRole, number> = {
  SOC_VIEWER: 1,
  SOC_ANALYST: 2,
  SOC_ADMIN: 3,
}
```

Các hàm permission:

```ts
export function canSearch(context: PermissionContext) {
  return hasAtLeastRole(context, 'SOC_VIEWER')
}

export function canExportCsv(context: PermissionContext) {
  return hasAtLeastRole(context, 'SOC_ANALYST')
}

export function canViewAuditLogs(context: PermissionContext) {
  return hasAtLeastRole(context, 'SOC_ADMIN')
}

export function canEditSearchPlan(context: PermissionContext) {
  return hasAtLeastRole(context, 'SOC_ANALYST')
}
```

Ý nghĩa:

- Viewer được search.
- Analyst được export/edit/pin.
- Admin được audit logs.

Nhưng cần nhấn mạnh:

> Frontend permission chỉ để ẩn/hiện UI. Backend vẫn enforce thật bằng Spring Security/RBAC.

---

## 12. Nếu user không có quyền thì sao?

Trong `SecurityConfig`, backend trả JSON lỗi có kiểm soát.

Nếu chưa đăng nhập hoặc thiếu token:

```java
response.setStatus(HttpStatus.UNAUTHORIZED.value());
new AuthErrorResponse("Unauthorized", List.of("Authentication is required"))
```

HTTP status:

```text
401 Unauthorized
```

Nếu đã đăng nhập nhưng thiếu role:

```java
response.setStatus(HttpStatus.FORBIDDEN.value());
new AuthErrorResponse("Forbidden", List.of("Insufficient role"))
```

HTTP status:

```text
403 Forbidden
```

Phân biệt nhanh:

| Status | Ý nghĩa |
| --- | --- |
| `401 Unauthorized` | Chưa login/token không hợp lệ/token hết hạn |
| `403 Forbidden` | Đã login nhưng không đủ role |

---

## 13. Câu trả lời mẫu khi hội đồng hỏi

### Keycloak cấp token cho frontend như thế nào?

> Frontend dùng OIDC Authorization Code Flow. Khi user bấm login, React redirect sang Keycloak. User đăng nhập ở Keycloak, sau đó Keycloak redirect về `/auth/callback` với authorization code. Thư viện `react-oidc-context` đổi code lấy token và lưu token trong `sessionStorage`. Frontend dùng `access_token` này để gọi backend.

### Backend xác thực token đó như thế nào?

> Backend là OAuth2 Resource Server. Mỗi request gửi `Authorization: Bearer <access_token>`. Spring Security verify chữ ký JWT bằng public key lấy từ JWKS endpoint của Keycloak, kiểm tra issuer/expiry, rồi tạo Authentication cho request.

### Backend lấy role ở đâu?

> Role nằm trong JWT claim của Keycloak, thường là `realm_access.roles`. Project có `KeycloakJwtGrantedAuthoritiesConverter` để đọc role đó và map thành Spring authority như `ROLE_SOC_ANALYST`.

### Ẩn button trên UI có đủ bảo mật không?

> Không. UI chỉ cải thiện trải nghiệm. Backend vẫn kiểm tra token và role. Nếu Viewer tự gọi API export bằng Postman thì backend vẫn trả `403 Forbidden`.

### Admin có cần gán cả Analyst và Viewer không?

> Không cần. Backend có role hierarchy: `SOC_ADMIN > SOC_ANALYST > SOC_VIEWER`, nên Admin tự động có quyền của Analyst và Viewer.

### Nếu token hết hạn thì sao?

> Request sẽ bị backend reject với `401 Unauthorized`. Frontend OIDC có cơ chế renew token nếu còn session hợp lệ; nếu không, user cần đăng nhập lại.

### Renew token là cấp token mới hay gia hạn token cũ?

> Renew token thường là **cấp một access token mới**, không phải sửa/gia hạn trực tiếp access token cũ. JWT access token đã phát hành là một chuỗi đã được Keycloak ký, bên trong có `exp` cố định, nên không thể "kéo dài hạn" token đó. Khi renew thành công, frontend nhận một access token mới với thời hạn mới.

### Có dùng access token để renew không?

> Không nên hiểu như vậy. Access token dùng để gọi API backend. Việc renew thường dựa vào **refresh token** hoặc session đăng nhập còn hợp lệ ở Keycloak. Với SPA dùng `react-oidc-context`, thư viện OIDC sẽ xử lý cơ chế renew theo cấu hình và trạng thái phiên đăng nhập. Backend của mình không tự renew token; backend chỉ verify token hiện tại.

Flow dễ nhớ:

```text
Access token còn hạn
    -> frontend gọi backend bình thường

Access token gần hết hạn / hết hạn
    -> OIDC client xin token mới từ Keycloak nếu session còn hợp lệ
    -> frontend dùng access token mới cho request tiếp theo

Không renew được
    -> user cần login lại
```

---

## 14. Một câu cực ngắn để nhớ

> Keycloak login và cấp JWT. Frontend gửi JWT qua Bearer token. Backend verify JWT bằng JWKS, map role, áp dụng role hierarchy và chặn API trái quyền.
