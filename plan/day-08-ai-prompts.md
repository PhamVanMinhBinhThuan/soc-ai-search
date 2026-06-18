# Prompt triển khai Ngày 8 - SOC AI Search MVP

## 1. Review kế hoạch Day 8

Day 8 đổi trọng tâm tuần 2 sang **Keycloak auth foundation** trước khi deploy. Mục tiêu là thay `demo-analyst` bằng identity thật từ JWT, nhưng vẫn giữ phạm vi đủ gọn cho MVP.

Day 8 tập trung vào:

- thêm Keycloak vào môi trường local;
- tạo realm/client/role demo;
- tắt public self-registration;
- backend verify JWT bằng Spring Security OAuth2 Resource Server;
- frontend login/logout bằng OIDC;
- hiển thị identity và role trên UI;
- vẫn giữ chế độ local/test không bật auth để không làm vỡ test hiện có.

Day 8 **chưa làm RBAC chi tiết theo từng action**. Các phần như viewer bị chặn export, analyst xem raw log, admin xem audit log sẽ để Day 9.

Quy trình cấp tài khoản MVP:

1. Admin đăng nhập Keycloak Admin Console.
2. Admin tạo user mới.
3. Admin gán role `SOC_VIEWER`, `SOC_ANALYST` hoặc `SOC_ADMIN`.
4. Admin gửi required actions email `VERIFY_EMAIL` và `UPDATE_PASSWORD`.
5. User mở email, verify email và tự đặt mật khẩu.

Không tạo bảng user trong app. Keycloak quản lý user/role; PostgreSQL chỉ lưu identity lấy từ JWT vào `search_query_logs`.

## 2. Phạm vi và thứ tự thực hiện

Ngày 8 được chia thành **3 prompt**:

1. Keycloak local infrastructure, realm/client/roles và tài liệu vận hành.
2. Backend Spring Security Resource Server, identity extraction và auth-aware audit.
3. Frontend OIDC login/logout, API Bearer token, smoke test và review cuối ngày.

Chỉ chuyển sang prompt tiếp theo khi prompt trước đã chạy verify thành công.

Không triển khai trong Day 8:

- fine-grained RBAC endpoint guard;
- role-based UI permission chi tiết;
- self-registration approval workflow trong app;
- bảng `app_users`;
- deploy VPS;
- Jenkins, ArgoCD, Kubernetes.

---

## Prompt 1 - Keycloak local infrastructure và realm foundation

```text
Tiếp tục triển khai ngày 8 cho SOC AI Search MVP.

Hãy thêm Keycloak local foundation vào project, chuẩn bị realm/client/roles cho OIDC login.

Đọc trước:
- docs/requirement.md
- docs/architecture.md
- docs/sequence-flow.md
- plan/14-day-mvp-plan.md
- plan/day-07-ai-prompts.md
- docker-compose.yml
- .env.example
- README.md

Yêu cầu:
1. Kiểm tra trạng thái repository trước khi sửa. Không ghi đè thay đổi hiện có.
2. Thêm Keycloak vào Docker Compose local theo cách rõ ràng:
   - có thể dùng service luôn có trong compose hoặc profile `auth`;
   - ưu tiên image Keycloak version ổn định, không dùng `latest`;
   - không expose Keycloak như production public; local có thể map port để dev đăng nhập;
   - không public Elasticsearch/PostgreSQL/Kibana qua thay đổi này.
3. Thêm biến môi trường vào `.env.example`, không ghi secret thật:
   - `KEYCLOAK_PORT`, mặc định gợi ý `8082`;
   - `KEYCLOAK_ADMIN`;
   - `KEYCLOAK_ADMIN_PASSWORD`;
   - `KEYCLOAK_REALM`, mặc định `soc-ai-search`;
   - `KEYCLOAK_FRONTEND_CLIENT_ID`, ví dụ `soc-ai-search-frontend`;
   - `KEYCLOAK_ISSUER_URI`;
   - `APP_AUTH_ENABLED`, mặc định local/test có thể là `false`, bản demo public đặt `true`;
   - các biến frontend tương ứng `VITE_AUTH_ENABLED`, `VITE_KEYCLOAK_AUTHORITY`, `VITE_KEYCLOAK_CLIENT_ID`.
4. Tuyệt đối không commit password thật, API key thật hoặc credential mentor vào repo.
5. Tạo cấu trúc config Keycloak và auto-import để không mất realm khi container bị xóa:
   - `infra/keycloak/README.md`;
   - `infra/keycloak/realm-export/`;
   - cấu hình `docker-compose.yml` mount thư mục `infra/keycloak/realm-export/` vào `/opt/keycloak/data/import/`;
   - thêm command khởi động phù hợp, ví dụ `start-dev --import-realm`, để Keycloak tự nạp realm khi chạy container mới;
   - nếu chưa tạo realm export ngay trong prompt này, README phải ghi rõ cách export realm sau khi cấu hình thủ công để tránh mất cấu hình.
6. Realm/client/role yêu cầu:
   - realm: `soc-ai-search`;
   - role realm-level hoặc client-level, chọn cách đơn giản và ghi rõ:
     - `SOC_VIEWER`;
     - `SOC_ANALYST`;
     - `SOC_ADMIN`;
   - frontend client dùng OIDC Authorization Code + PKCE cho SPA;
   - redirect URI local gồm frontend dev URL, ví dụ `http://localhost:3000/*`;
   - web origins phù hợp local, ví dụ `http://localhost:3000`;
   - backend là OAuth2 Resource Server nên không cần client riêng trong MVP; backend chỉ cần `issuer-uri`/JWKS để verify JWT, không dùng password grant trong app runtime.
7. Tắt public self-registration trong realm.
8. Không tạo workflow user tự đăng ký/chờ duyệt trong app.
9. Không hardcode demo user/password trong backend hoặc frontend.
10. Nếu tạo realm import file, không chứa secret production; nếu có demo user local thì phải:
    - chỉ dùng cho local;
    - password nằm trong `.env` hoặc README hướng dẫn tạo thủ công;
    - không dùng làm credential production.
11. Viết README ngắn cho Keycloak local:
    - cách bật Keycloak;
    - cách mở Admin Console;
    - cách tạo realm/client/roles nếu không dùng import;
    - cách import/export realm qua `infra/keycloak/realm-export/`;
    - cách tạo user demo;
    - cách gán role;
    - cách gửi required actions email `VERIFY_EMAIL` và `UPDATE_PASSWORD`;
    - ghi rõ self-registration bị tắt.
12. Cập nhật README.md chính ở mức ngắn gọn, link sang `infra/keycloak/README.md`.
13. Không sửa backend security hoặc frontend login trong prompt này, trừ khi cần biến env placeholder.
14. Chạy verify:
    - `docker compose config --quiet`;
    - nếu có thể, chạy Keycloak local và kiểm tra container healthy hoặc endpoint realm reachable;
    - không cần gọi backend auth trong prompt này.
15. Báo file đã tạo/sửa và lệnh verify.

Không triển khai RBAC endpoint guard, frontend OIDC, deploy VPS, audit changes hoặc user approval workflow trong prompt này.
```

### Checkpoint Prompt 1

```powershell
docker compose config --quiet

# Nếu Keycloak nằm trong profile auth:
docker compose --profile auth up -d keycloak

# Nếu Keycloak là service thường:
docker compose up -d keycloak
```

---

## Prompt 2 - Backend Resource Server và identity từ JWT

```text
Tiếp tục triển khai ngày 8 cho SOC AI Search MVP.

Hãy tích hợp backend với Keycloak bằng Spring Security OAuth2 Resource Server.

Đọc trước:
- docs/requirement.md
- docs/architecture.md
- docs/sequence-flow.md
- plan/14-day-mvp-plan.md
- docker-compose.yml
- .env.example
- backend/pom.xml
- backend/src/main/resources/application.properties
- backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchService.java
- backend/src/main/java/com/soc/ai/search/audit hoặc package audit hiện có
- backend/src/main/java/com/soc/ai/search/history hoặc package history hiện có
- backend/src/main/java/com/soc/ai/search/config hoặc security config hiện có

Yêu cầu:
1. Kiểm tra trạng thái repository trước khi sửa. Không ghi đè thay đổi hiện có.
2. Thêm dependency Spring Security OAuth2 Resource Server nếu project chưa có:
   - không thêm framework auth khác;
   - không tự viết JWT parser thủ công.
3. Tạo package security rõ ràng, ví dụ:
   - `com.soc.ai.search.security`
4. Tạo cấu hình auth qua environment/properties:
   - `APP_AUTH_ENABLED`, mặc định `false` cho local/test hiện tại để không phá toàn bộ test cũ;
   - khi `APP_AUTH_ENABLED=true`, các business API phải yêu cầu JWT hợp lệ;
   - `KEYCLOAK_ISSUER_URI` hoặc property tương đương để Spring verify token;
   - nếu cần, `KEYCLOAK_JWK_SET_URI`;
   - cập nhật `application.properties`, `.env.example`, `docker-compose.yml` nếu cần.
5. Cấu hình security:
   - permit health endpoints:
     - `/api/v1/health/live`;
     - `/api/v1/health/ready`;
   - Day 8 permit Swagger/OpenAPI trong local/dev để dễ debug:
     - `/swagger-ui/**`;
     - `/v3/api-docs/**`;
     - Day 11 deploy public sẽ bọc Swagger bằng Basic Auth ở reverse proxy hoặc role admin, không mở tự do lâu dài;
   - phải cấu hình `.cors(Customizer.withDefaults())` trong `SecurityFilterChain` để request `OPTIONS` preflight từ React không bị Spring Security chặn 401 trước khi tới CORS;
   - khi auth enabled, business endpoints như `/api/v1/search`, `/api/v1/events/**`, `/api/v1/search/history`, `/api/v1/audit-logs`, export CSV yêu cầu authentication;
   - Day 8 chỉ cần authenticated user, chưa phân quyền chi tiết theo role; RBAC endpoint guard để Day 9.
6. Map roles từ Keycloak JWT:
   - bắt buộc dùng `JwtAuthenticationConverter` và `JwtGrantedAuthoritiesConverter` hoặc converter dựa trên API chuẩn của Spring Security 6;
   - hỗ trợ lấy role từ `realm_access.roles`;
   - nếu dùng client roles thì hỗ trợ `resource_access.<client>.roles`;
   - convert thành Spring authorities dạng `ROLE_SOC_VIEWER`, `ROLE_SOC_ANALYST`, `ROLE_SOC_ADMIN` hoặc format thống nhất;
   - không hardcode một user cụ thể.
7. Tạo service/helper lấy current principal, ví dụ:
   - `CurrentUser`;
   - `CurrentUserService`;
   - trả tối thiểu:
     - identity;
     - username/preferred_username nếu có;
     - email nếu có;
     - roles.
8. Identity precedence hợp lý:
   - ưu tiên `preferred_username`;
   - nếu không có thì dùng `email`;
   - nếu không có thì dùng `sub`;
   - nếu `APP_AUTH_ENABLED=false`, dùng `APP_DEMO_USER_IDENTITY`, mặc định `demo-analyst`.
9. Audit/history phải dùng identity từ `CurrentUserService` thay vì hardcode `demo-analyst` khi auth enabled.
10. Mở rộng hoặc thêm endpoint introspection tiện cho frontend:
    - `GET /api/v1/auth/me`;
    - trả `authenticated`, `identity`, `username`, `email`, `roles`;
    - khi auth disabled, trả demo identity và role demo phù hợp, ví dụ `SOC_ANALYST`;
    - khi auth enabled mà chưa login, endpoint trả 401 theo security config.
11. Error handling:
    - unauthenticated trả 401 rõ ràng;
    - invalid/expired token trả 401;
    - không lộ stack trace hoặc token content.
12. Không tạo bảng user trong PostgreSQL.
13. Không tạo đăng ký/duyệt user trong app.
14. Không triển khai fine-grained RBAC Day 9 trong prompt này:
    - chưa chặn viewer export;
    - chưa chặn viewer raw log;
    - chưa chặn audit theo admin role.
15. Thêm test:
    - auth disabled vẫn cho phép gọi business endpoint/controller test hiện có không bị vỡ;
    - `GET /api/v1/auth/me` khi auth disabled trả demo identity;
    - converter map `realm_access.roles = ["SOC_ANALYST"]` thành authority đúng;
    - converter map nhiều role đúng;
    - identity precedence `preferred_username` > `email` > `sub`;
    - khi auth enabled, request không token vào business endpoint trả 401;
    - khi auth enabled, token mock hợp lệ gọi được endpoint tối thiểu hoặc controller test;
    - audit/history lấy identity từ principal khi auth enabled;
    - không có stack trace trong auth error response.
16. Chạy backend test.
17. Nếu Keycloak đang chạy local, verify thủ công:
    - gọi `/api/v1/auth/me` không token khi auth enabled -> 401;
    - đăng nhập/lấy token bằng cách phù hợp local hoặc qua frontend ở Prompt 3;
    - gọi `/api/v1/auth/me` với token -> trả identity/roles.
18. Báo file đã tạo/sửa, lệnh verify và kết quả.

Không triển khai frontend login/logout, role-based UI permission, deploy VPS hoặc Keycloak user approval workflow trong prompt này.
```

### Checkpoint Prompt 2

```powershell
cd backend
.\mvnw.cmd test
cd ..

# Auth disabled smoke
Invoke-RestMethod "http://localhost:8081/api/v1/auth/me"

# Auth enabled case cần bật APP_AUTH_ENABLED=true và có token thật/mock phù hợp.
```

---

## Prompt 3 - Frontend OIDC login/logout, token API client và Day 8 smoke test

```text
Tiếp tục triển khai ngày 8 cho SOC AI Search MVP.

Hãy tích hợp frontend React với Keycloak/OIDC và tạo smoke test nhẹ cho auth foundation.

Đọc trước:
- docs/requirement.md
- docs/architecture.md
- docs/sequence-flow.md
- plan/14-day-mvp-plan.md
- plan/day-07-ai-prompts.md
- frontend/package.json
- frontend/src/App.tsx
- frontend/src/services/api-client.ts
- frontend/src/services/search-api.ts
- frontend/src/services/history-api.ts
- frontend/src/services/csv-export-api.ts
- frontend/src/components/soc/soc-sidebar.tsx
- frontend/src/components/soc hoặc các component header/layout hiện có
- backend endpoint `GET /api/v1/auth/me` từ Prompt 2

Yêu cầu:
1. Kiểm tra trạng thái repository trước khi sửa. Không ghi đè thay đổi hiện có.
2. Tích hợp OIDC cho frontend bằng thư viện phù hợp với React/Vite:
   - ưu tiên `react-oidc-context` vì thư viện này xây trên `oidc-client-ts` và phù hợp React SPA;
   - nếu không dùng `react-oidc-context`, phải giải thích lý do kỹ thuật rõ ràng.
   - Không tự viết flow OAuth2/OIDC bằng tay;
   - Day 8 MVP dùng `sessionStorage` cho OIDC user/token state để đơn giản và giảm rủi ro token tồn tại quá lâu;
   - không dùng `localStorage` cho token;
   - ghi rõ trade-off MVP: `sessionStorage` vẫn là SPA storage, đủ cho demo/local nhưng production nghiêm ngặt hơn có thể cần BFF/session cookie.
3. Cấu hình qua Vite env:
   - `VITE_AUTH_ENABLED`, mặc định `false` cho local/mock;
   - `VITE_KEYCLOAK_AUTHORITY`, ví dụ `http://localhost:8082/realms/soc-ai-search`;
   - `VITE_KEYCLOAK_CLIENT_ID`, ví dụ `soc-ai-search-frontend`;
   - `VITE_KEYCLOAK_REDIRECT_URI`, ví dụ `http://localhost:3000/auth/callback`;
   - `VITE_KEYCLOAK_POST_LOGOUT_REDIRECT_URI`, ví dụ `http://localhost:3000`;
   - `VITE_KEYCLOAK_SCOPE`, ví dụ `openid profile email`;
   - cập nhật `frontend/.env.example` nếu có, hoặc README nếu project không có file này.
4. Tạo auth module rõ ràng, ví dụ:
   - `frontend/src/auth/auth-config.ts`;
   - `frontend/src/auth/auth-client.ts`;
   - `frontend/src/auth/auth-context.tsx`;
   - `frontend/src/auth/use-auth.ts`;
   - `frontend/src/auth/AuthCallbackPage.tsx` nếu cần.
5. Frontend behavior:
   - khi `VITE_AUTH_ENABLED=false`, app chạy như hiện tại với mock/demo identity;
   - khi `VITE_AUTH_ENABLED=true`:
     - nếu chưa login, hiển thị login screen hoặc nút `Sign in with Keycloak`;
     - sau login, quay lại dashboard;
     - có nút logout;
     - hiển thị identity và roles ở header/sidebar;
     - nếu token hết hạn, cố gắng silent renew nếu thư viện hỗ trợ hoặc đưa user login lại rõ ràng.
6. API client:
   - mọi request tới backend API khi auth enabled phải gắn `Authorization: Bearer <access_token>`;
   - không gắn token vào URL;
   - không log token ra console;
   - nếu backend trả 401, hiển thị message rõ và hướng user login lại;
   - giữ cơ chế `VITE_USE_MOCK` hiện có, mock mode không cần token.
7. Không triển khai role-based UI permission chi tiết trong prompt này:
   - chưa cần ẩn export theo viewer;
   - chưa cần chặn audit UI theo admin;
   - Day 9 mới làm UI permission theo role.
8. Component UI tối thiểu:
   - header/sidebar hiển thị identity;
   - badge role, ví dụ `SOC_ANALYST`;
   - login/logout button;
   - loading state khi đang xử lý callback/session restore.
9. Nếu app chưa có router, chọn cách tối giản:
   - xử lý `/auth/callback` bằng component route nếu có router;
   - hoặc detect URL callback ở auth provider và restore về dashboard;
   - không refactor frontend routing lớn nếu chưa cần.
10. Thêm test phù hợp:
    - auth disabled render dashboard không cần login;
    - auth enabled chưa login render login state;
    - API client gắn Bearer token khi auth enabled;
    - API client không gắn token khi auth disabled/mock;
    - `/api/v1/auth/me` response map đúng identity/roles nếu có client helper;
    - logout gọi auth client;
    - không log token hoặc đưa token vào URL API.
11. Tạo smoke test PowerShell cho Day 8, ví dụ `scripts/smoke-test-day-08.ps1`:
    - kiểm tra backend health;
    - kiểm tra frontend trả HTML;
    - kiểm tra Keycloak realm endpoint reachable nếu Keycloak local đang chạy;
    - kiểm tra `/api/v1/auth/me`:
      - auth disabled trả demo identity;
      - nếu chạy với `-AuthEnabled` và có token truyền vào thì trả identity/roles;
    - kiểm tra OpenAPI có `/api/v1/auth/me`;
    - smoke phải fail rõ ràng khi checkpoint không đạt;
    - nếu không có token thật, smoke không tự bịa credential.
12. Cập nhật README.md:
    - cách chạy local không auth;
    - cách bật Keycloak auth;
    - cách tạo user trong Keycloak Admin Console;
    - cách gán role;
    - cách gửi required actions email `VERIFY_EMAIL` và `UPDATE_PASSWORD`;
    - cách chạy smoke test ngày 8;
    - ghi rõ fine-grained RBAC sẽ làm ngày 9.
13. Chạy verify:
    - backend test nếu backend bị chạm;
    - frontend lint;
    - frontend build;
    - docker compose config;
    - smoke test ngày 8 nếu môi trường đang chạy.
14. Báo file đã tạo/sửa, lệnh verify và kết quả.

Không triển khai fine-grained RBAC, deploy VPS, self-registration approval workflow, bảng user hoặc report/slide trong prompt này.
```

### Checkpoint Prompt 3

```powershell
cd frontend
npm run lint
npm run build
cd ..

cd backend
.\mvnw.cmd test
cd ..

docker compose config --quiet
.\scripts\smoke-test-day-08.ps1
```

---

## Prompt Review Cuối Ngày 8

```text
Hãy review và verify toàn bộ kết quả triển khai ngày 8 cho SOC AI Search MVP.

Đọc lại:
- docs/requirement.md
- docs/architecture.md
- docs/sequence-flow.md
- plan/14-day-mvp-plan.md
- plan/day-08-ai-prompts.md
- README.md
- docker-compose.yml
- .env.example

Kiểm tra:
1. Keycloak đã có trong local Docker Compose hoặc profile rõ ràng.
2. Keycloak có cấu hình `realm-export`/auto-import hoặc README ghi rõ cách export/import để không mất realm khi container bị xóa.
3. Có hướng dẫn realm/client/roles cho `SOC_VIEWER`, `SOC_ANALYST`, `SOC_ADMIN`.
4. Backend Resource Server không cần client riêng trong MVP; backend verify bằng issuer-uri/JWKS.
5. Public self-registration bị tắt trong quy trình Keycloak MVP.
6. Quy trình tạo user là admin tạo trong Keycloak, gán role, gửi `VERIFY_EMAIL` và `UPDATE_PASSWORD`.
7. Không tạo bảng user trong app.
8. Không hardcode user/password thật trong repo.
9. `.env.example` có đủ biến Keycloak/frontend/backend auth placeholder và không còn biến backend client dư nếu không dùng.
10. Backend dùng Spring Security OAuth2 Resource Server, không tự parse JWT thủ công.
11. SecurityFilterChain có CORS phù hợp để request `OPTIONS` từ frontend không bị 401.
12. Swagger/OpenAPI được permit trong local/dev; deploy public sẽ bảo vệ bằng Basic Auth hoặc admin role ở ngày 11.
13. Backend dùng converter chuẩn Spring Security 6 hoặc tương đương rõ ràng để map `realm_access.roles` thành authorities.
14. Backend có thể bật/tắt auth bằng config, local/test không bị vỡ.
15. Khi auth enabled, business API yêu cầu JWT.
16. Health endpoint vẫn accessible.
17. `/api/v1/auth/me` hoạt động.
18. Token hợp lệ được map identity và role.
19. Audit/history lấy identity từ JWT khi auth enabled, hoặc demo identity khi auth disabled.
20. Frontend ưu tiên `react-oidc-context` hoặc có lý do rõ nếu chọn thư viện khác.
21. Frontend dùng `sessionStorage` cho OIDC state/token trong MVP, không dùng `localStorage`.
22. Frontend có login/logout OIDC khi auth enabled.
23. Frontend gắn Bearer token vào API request khi auth enabled.
24. Frontend không log token và không đưa token vào URL.
25. Header/sidebar hiển thị identity và role.
26. Frontend vẫn chạy được mock/local khi auth disabled.
27. Backend test pass.
28. Frontend lint/build pass.
29. docker compose config hợp lệ.
30. Smoke test ngày 8 pass hoặc ghi rõ checkpoint nào cần token thật/manual.
31. Không triển khai fine-grained RBAC Day 9 trước thời điểm.
32. Không triển khai deploy VPS trong Day 8.

Sau đó:
1. Sửa lỗi nhỏ nếu phát hiện.
2. Cập nhật README.md nếu thiếu:
   - cách bật Keycloak;
   - cách tạo user/role;
   - cách chạy app auth disabled/auth enabled;
   - cách chạy smoke test ngày 8;
   - ghi rõ RBAC chi tiết sẽ làm ngày 9.
3. Chạy verify phù hợp.
4. Báo checklist PASS/FAIL theo từng mục.
5. Liệt kê việc còn cần làm ở ngày 9 nhưng không triển khai chúng.
```
