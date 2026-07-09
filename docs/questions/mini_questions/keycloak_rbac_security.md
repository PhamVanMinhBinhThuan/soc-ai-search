# Keycloak, OIDC và RBAC trong SOC AI Search

## 1. Keycloak dùng để làm gì trong đồ án?

Trong hệ thống này, Keycloak đóng vai trò là **Identity Provider**: quản lý đăng nhập, user, role và cấp access token cho frontend.

Backend **không tự lưu password** và cũng không tự xử lý form login. Backend chỉ nhận JWT access token từ frontend, kiểm tra token đó có hợp lệ không, sau đó dựa vào role trong token để quyết định user được phép gọi API nào.

Câu trả lời ngắn khi bảo vệ:

> Em dùng Keycloak để tách phần xác thực và quản lý người dùng ra khỏi backend nghiệp vụ. Frontend đăng nhập qua Keycloak, nhận JWT, gửi JWT về backend. Backend dùng Spring Security kiểm tra token và enforce quyền theo role Viewer, Analyst, Admin.

## 2. Các khái niệm cần nhớ

| Khái niệm | Ý nghĩa trong đồ án |
| --- | --- |
| Realm | Không gian quản lý riêng của hệ thống. Đồ án dùng realm `soc-ai-search`. |
| Client | Ứng dụng đăng nhập vào Keycloak. Frontend dùng client `soc-ai-search-frontend`. |
| User | Tài khoản demo như viewer, analyst, admin. |
| Role | Quyền nghiệp vụ gắn cho user: `SOC_VIEWER`, `SOC_ANALYST`, `SOC_ADMIN`. |
| Access token | JWT do Keycloak cấp sau khi login, frontend gửi kèm mỗi request. |
| JWK Set URI | Endpoint public key để backend verify chữ ký JWT. |
| Issuer URI | Địa chỉ realm dùng để backend kiểm tra token có đúng nguồn phát hành không. |

## 3. Luồng xác thực tổng quát

```text
User
  -> Frontend redirect sang Keycloak login
  -> Keycloak xác thực user
  -> Frontend nhận access token JWT
  -> Frontend gọi API với header Authorization: Bearer <token>
  -> Spring Security verify JWT bằng issuer-uri / jwk-set-uri
  -> Backend convert role Keycloak thành ROLE_SOC_*
  -> @PreAuthorize / RbacPermissionService kiểm tra quyền
  -> API trả dữ liệu hoặc trả 401/403
```

Trong dự án, config chính nằm ở:

- `backend/src/main/java/com/soc/ai/search/security/SecurityConfig.java`
- `backend/src/main/java/com/soc/ai/search/security/KeycloakJwtGrantedAuthoritiesConverter.java`
- `backend/src/main/java/com/soc/ai/search/security/RbacPermissionService.java`
- `backend/src/main/resources/application.properties`
- `docker-compose.yml`

## 4. Backend cấu hình xác thực ở đâu?

Trong `application.properties`:

```properties
app.auth.enabled=${APP_AUTH_ENABLED:false}
spring.security.oauth2.resourceserver.jwt.issuer-uri=${KEYCLOAK_ISSUER_URI:http://localhost:8082/realms/soc-ai-search}
spring.security.oauth2.resourceserver.jwt.jwk-set-uri=${KEYCLOAK_JWK_SET_URI:http://localhost:8082/realms/soc-ai-search/protocol/openid-connect/certs}
```

Ý nghĩa:

- `APP_AUTH_ENABLED=true`: bật xác thực thật bằng Keycloak.
- `issuer-uri`: backend kiểm tra token có đúng realm phát hành không.
- `jwk-set-uri`: backend lấy public key để verify chữ ký JWT.

Trong `SecurityConfig.java`, backend chạy theo kiểu REST API stateless:

- Tắt CSRF vì API dùng JWT, không dùng session form truyền thống.
- Bật CORS cho frontend domain.
- Session policy là `STATELESS`, nghĩa là backend không lưu session login.
- Public endpoints gồm health check và Swagger.
- Các API còn lại cần authenticated.
- OAuth2 Resource Server dùng JWT.

## 5. Role được map từ Keycloak sang Spring Security như thế nào?

Keycloak để role trong JWT ở các claim như:

- `realm_access.roles`
- `resource_access.<client>.roles`

Spring Security lại cần authority dạng `ROLE_...` để dùng `hasRole(...)`.

Vì vậy dự án có class:

```text
KeycloakJwtGrantedAuthoritiesConverter
```

Class này làm 3 việc:

1. Đọc role từ `realm_access` và `resource_access`.
2. Thêm prefix `ROLE_` nếu role chưa có prefix.
3. Trả về authorities như:

```text
SOC_VIEWER  -> ROLE_SOC_VIEWER
SOC_ANALYST -> ROLE_SOC_ANALYST
SOC_ADMIN   -> ROLE_SOC_ADMIN
```

Nhờ đó backend có thể viết:

```java
@PreAuthorize("@rbacPermissionService.authDisabled() or hasRole('SOC_VIEWER')")
```

Ý nghĩa của 2 vế:

- `@rbacPermissionService.authDisabled()`: nếu tắt auth trong local/dev thì cho qua để dễ test.
- `hasRole('SOC_VIEWER')`: khi bật auth thật, user phải có role Viewer trở lên.

## 6. Role hierarchy là gì?

Dự án định nghĩa role hierarchy trong `SecurityConfig.java`:

```text
ROLE_SOC_ADMIN > ROLE_SOC_ANALYST
ROLE_SOC_ANALYST > ROLE_SOC_VIEWER
```

Ý nghĩa:

- Admin kế thừa quyền Analyst.
- Analyst kế thừa quyền Viewer.
- Viewer chỉ có quyền xem/search cơ bản.

Điểm cần nhớ:

> Role hierarchy không phải bắt buộc của Keycloak. Đây là logic do backend Spring Security định nghĩa để đơn giản hóa kiểm tra quyền. Keycloak chỉ cấp role, backend quyết định role đó được phép làm gì.

## 7. Ma trận quyền chính

| Nhóm chức năng | Viewer | Analyst | Admin |
| --- | :---: | :---: | :---: |
| Search bằng câu hỏi tự nhiên | Có | Có | Có |
| Xem Query Transparency / Query Breakdown | Có | Có | Có |
| Correct or Refine Query | Có | Có | Có |
| Xem event detail metadata | Có | Có | Có |
| Xem raw log đầy đủ | Không | Có | Có |
| Export result CSV | Không | Có | Có |
| Xem investigations/history | Không | Có | Có |
| Pin/unpin investigation | Không | Có | Có |
| Xem system audit logs | Không | Không | Có |
| Export audit CSV | Không | Không | Có |
| Ingest event/bulk event | Không | Không | Có |

Lưu ý quan trọng:

> Frontend có thể ẩn nút theo role để UX đẹp hơn, nhưng bảo mật thật nằm ở backend. Nếu user mở DevTools và tự gọi API, backend vẫn kiểm tra JWT và role.

## 8. 401 và 403 khác nhau thế nào?

| Mã lỗi | Khi nào xảy ra | Ví dụ |
| --- | --- | --- |
| 401 Unauthorized | Chưa đăng nhập, thiếu token, token sai hoặc token hết hạn. | Gọi API không gửi `Authorization: Bearer <token>`. |
| 403 Forbidden | Token hợp lệ nhưng role không đủ quyền. | Viewer cố export CSV hoặc xem system audit logs. |

Trong `SecurityConfig.java`, backend trả JSON rõ ràng:

- 401: `Authentication is required`
- 403: `Insufficient role`

## 9. Vì sao không chỉ ẩn nút trên UI?

Ẩn nút chỉ giúp giao diện dễ dùng hơn, không phải bảo mật thật.

Nếu chỉ ẩn nút trên frontend, user vẫn có thể:

- Mở DevTools.
- Copy request.
- Sửa endpoint hoặc payload.
- Gọi thẳng API export/audit bằng token của họ.

Vì vậy backend phải enforce bằng:

- `@PreAuthorize(...)`
- `RbacPermissionService`
- JWT role từ Keycloak

Câu trả lời khi bảo vệ:

> UI chỉ là lớp hỗ trợ trải nghiệm. Quyền truy cập thật được kiểm tra ở backend, vì mọi request đều có thể bị gọi thủ công ngoài giao diện.

## 10. Swagger Authorize dùng như thế nào?

Swagger UI có nút **Authorize**. Khi test API:

1. Login frontend hoặc lấy access token từ Keycloak.
2. Copy JWT token bắt đầu bằng `eyJ...`.
3. Dán vào Swagger Authorize.
4. Không cần tự gõ chữ `Bearer` nếu Swagger config đã hướng dẫn như vậy.

Sau đó Swagger sẽ tự gửi:

```http
Authorization: Bearer <token>
```

Nếu token sai hoặc hết hạn, API sẽ trả 401.

## 11. Keycloak chạy ở đâu khi deploy?

Trong deploy, Keycloak chạy như một service container trong Docker Compose. Public domain thường là:

```text
https://auth.soc-ai-search.app
```

Frontend public:

```text
https://soc-ai-search.app
```

Backend public:

```text
https://api.soc-ai-search.app
```

Caddy đứng trước để reverse proxy HTTPS vào các container nội bộ. Backend không cần expose trực tiếp Keycloak database ra ngoài.

## 12. Vì sao dùng Keycloak thay vì tự làm login?

Các lý do chính:

1. **Chuẩn OIDC/JWT**: phù hợp với hệ thống web hiện đại.
2. **Không tự lưu password**: giảm rủi ro bảo mật.
3. **Quản lý role rõ ràng**: Viewer, Analyst, Admin.
4. **Có admin console**: dễ tạo user, reset password, gán role.
5. **Tách auth khỏi nghiệp vụ**: backend tập trung vào search, audit, export, RBAC enforcement.

## 13. Câu hỏi hội đồng có thể hỏi

### Vì sao backend vẫn cần kiểm tra role nếu Keycloak đã login rồi?

Keycloak chỉ xác thực user là ai và cấp role. Backend mới là nơi biết API nào cần role nào. Vì vậy backend vẫn phải kiểm tra role trước khi trả dữ liệu.

### Role hierarchy có nằm trong Keycloak không?

Không bắt buộc. Trong đồ án, role hierarchy được cấu hình ở Spring Security:

```text
Admin > Analyst > Viewer
```

Keycloak cấp role, backend diễn giải role đó theo hierarchy.

### Viewer có xem raw log được không?

Không. Viewer chỉ xem metadata cơ bản. Raw log đầy đủ yêu cầu `SOC_ANALYST` hoặc `SOC_ADMIN`, được kiểm tra bằng `RbacPermissionService.canViewRawLog()`.

### Nếu token hết hạn thì sao?

API sẽ trả 401. Frontend có cơ chế lấy token mới/silent refresh rồi retry request. Nếu refresh thất bại, user cần đăng nhập lại.

### Nếu user có token hợp lệ nhưng không đủ quyền thì sao?

Backend trả 403. Ví dụ Viewer gọi API export CSV hoặc system audit logs.

### Tại sao public health và Swagger không cần token?

Health check dùng cho deploy/smoke test để kiểm tra service còn sống. Swagger cần mở để xem tài liệu API. Tuy nhiên các API nghiệp vụ bên trong Swagger vẫn cần Authorize nếu auth đang bật.

## 14. Câu trả lời ngắn gọn khi trình bày

> Phần xác thực của hệ thống dùng Keycloak theo chuẩn OpenID Connect. Sau khi user login, frontend nhận JWT access token và gửi token trong header Authorization. Backend Spring Security verify token bằng issuer-uri và JWK Set URI của Keycloak, sau đó convert role trong JWT thành Spring authority như `ROLE_SOC_VIEWER`, `ROLE_SOC_ANALYST`, `ROLE_SOC_ADMIN`. Các API được bảo vệ bằng `@PreAuthorize` và service RBAC ở backend, nên dù frontend có ẩn nút hay không thì quyền truy cập thật vẫn được kiểm soát ở server.

## 15. Keycloak so với tự làm JWT trong backend

Lưu ý: hệ thống vẫn dùng JWT. Điểm khác là JWT được **Keycloak phát hành và ký số**, thay vì backend tự tạo token.

### Nếu tự làm JWT trong backend

Backend sẽ phải tự xử lý nhiều phần liên quan đến identity:

- Tự lưu user và password.
- Tự hash password an toàn.
- Tự làm login/logout.
- Tự tạo access token và refresh token.
- Tự xử lý token hết hạn.
- Tự làm reset password, verify email.
- Tự làm role management.
- Tự làm admin UI để tạo user/gán quyền.
- Tự xử lý các vấn đề bảo mật như brute-force login, password policy, account lockout.

Ưu điểm:

- Đơn giản hơn ở giai đoạn demo nhỏ nếu chỉ cần vài tài khoản hardcode.
- Ít service hơn khi deploy.
- Không cần cấu hình realm/client/redirect URI.

Nhược điểm:

- Rủi ro bảo mật cao hơn vì tự viết authentication rất dễ thiếu case.
- Backend phải gánh thêm logic không thuộc nghiệp vụ chính.
- Khó mở rộng sang verify email, reset password, SSO, quản trị user.
- Không giống mô hình enterprise thực tế.

### Nếu dùng Keycloak

Keycloak đảm nhiệm phần identity:

- Đăng nhập.
- Quản lý user.
- Quản lý role.
- Phát hành JWT.
- Verify email.
- Update/reset password.
- Admin console.
- Cấu hình client/redirect URI theo chuẩn OIDC.

Backend chỉ cần:

- Verify JWT.
- Đọc role trong token.
- Enforce quyền trên API.

Ưu điểm:

- Theo chuẩn OIDC/OAuth2, gần với hệ thống doanh nghiệp.
- Backend không lưu password.
- Có sẵn admin console để tạo user và gán role.
- Dễ chứng minh RBAC với `SOC_VIEWER`, `SOC_ANALYST`, `SOC_ADMIN`.
- Tách rõ authentication khỏi nghiệp vụ search/audit/export.

Nhược điểm:

- Thêm một service cần deploy và vận hành.
- Cấu hình ban đầu phức tạp hơn tự làm JWT.
- Cần hiểu các khái niệm realm, client, issuer URI, JWK Set URI.
- Nếu cấu hình sai redirect URI hoặc issuer thì login/API dễ lỗi.

Câu trả lời ngắn khi bảo vệ:

> Nếu tự làm JWT thì backend phải tự quản lý password, login, refresh token, reset password và role. Em chọn Keycloak vì đây là giải pháp Identity Provider theo chuẩn OIDC, có sẵn quản lý user/role, email verification và admin console. Backend vẫn dùng JWT, nhưng JWT do Keycloak phát hành; backend chỉ verify token và enforce quyền nghiệp vụ.

## 16. Luồng hoạt động khi có Keycloak

### Luồng đăng nhập

```text
1. User mở frontend.
2. Frontend phát hiện chưa đăng nhập.
3. Frontend redirect user sang Keycloak.
4. User nhập username/password trên trang login của Keycloak.
5. Keycloak xác thực thành công.
6. Keycloak redirect về frontend callback URL.
7. Frontend nhận access token JWT.
8. Frontend lưu token trong auth state.
```

Trong luồng này, backend **không nhận password** và **không xử lý form login**.

### Luồng gọi API sau khi đăng nhập

```text
1. Frontend gọi API backend.
2. Frontend gắn header:
   Authorization: Bearer <access_token>
3. Spring Security nhận request.
4. Backend verify JWT bằng public key từ JWK Set URI.
5. Backend kiểm tra issuer, expiry và chữ ký token.
6. Backend đọc role từ JWT.
7. KeycloakJwtGrantedAuthoritiesConverter map role thành ROLE_SOC_*.
8. @PreAuthorize hoặc RbacPermissionService kiểm tra quyền.
9. Nếu đủ quyền, API chạy; nếu không, trả 401 hoặc 403.
```

Ví dụ:

```http
GET /api/v1/search/history
Authorization: Bearer eyJ...
```

Backend sẽ kiểm tra token và role. Nếu user là `SOC_ANALYST` hoặc `SOC_ADMIN`, API history được phép chạy. Nếu user chỉ là `SOC_VIEWER`, backend trả 403.

### Luồng gửi email verify/update password

```text
1. Admin tạo user trong Keycloak Admin Console.
2. Admin chọn Execute actions email.
3. Chọn Verify Email và Update Password.
4. Keycloak render email bằng template trong custom theme.
5. Keycloak gửi email qua SMTP đã cấu hình.
6. User click link trong email.
7. User verify email và đặt password trên trang Keycloak.
```

Template email nằm ở:

```text
infra/keycloak/theme/custom-theme/email/html/executeActions.ftl
```

Theme được mount vào Keycloak container qua `docker-compose.yml`:

```yaml
keycloak:
  volumes:
    - ./infra/keycloak/theme:/opt/keycloak/themes
```

SMTP được cấu hình trong Keycloak Admin Console:

```text
Realm settings -> Email
```

Câu trả lời ngắn:

> Email verify/update password do Keycloak gửi, không phải backend. Keycloak dùng SMTP được cấu hình trong Admin Console và render nội dung từ custom email template. Backend không xử lý password reset nên giảm rủi ro bảo mật.

