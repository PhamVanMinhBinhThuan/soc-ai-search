# Prompt triển khai Ngày 9 - SOC AI Search MVP

## 1. Review kế hoạch Day 9

Day 9 tập trung vào **RBAC và UI permission** sau khi Day 8 đã có Keycloak auth foundation.

Mục tiêu là làm cho 3 role demo hoạt động khác nhau, đủ rõ để trình bày với mentor/hội đồng:

- `SOC_VIEWER`: xem dashboard, search, aggregation và event detail cơ bản.
- `SOC_ANALYST`: có toàn bộ quyền viewer, thêm xem raw log, export CSV và query history của chính mình.
- `SOC_ADMIN`: có toàn bộ quyền analyst, thêm xem audit log và quản trị user/role trong Keycloak Admin Console.

Day 9 không tạo bảng user trong app. Keycloak vẫn là nguồn quản lý user/role. Backend chỉ đọc JWT, map role và áp permission guard.

## 2. Phạm vi và thứ tự thực hiện

Ngày 9 được chia thành **3 prompt**:

1. Backend RBAC guard cho endpoint nhạy cảm và raw log redaction.
2. Frontend role-based UI permission và xử lý 403.
3. Smoke test RBAC, README và review cuối ngày.

Chỉ chuyển sang prompt tiếp theo khi prompt trước đã chạy verify thành công.

Không triển khai trong Day 9:

- deploy VPS;
- workflow tự đăng ký rồi chờ duyệt trong app;
- bảng `app_users`;
- Keycloak Admin REST API trong app;
- multi-tenant;
- policy engine phức tạp như OPA/Casbin;
- report/slide.

---

## Prompt 1 - Backend RBAC guard và raw log permission

```text
Tiếp tục triển khai ngày 9 cho SOC AI Search MVP.

Hãy triển khai RBAC guard ở backend dựa trên role từ Keycloak/JWT đã có ở Day 8.

Đọc trước:
- docs/requirement.md
- docs/architecture.md
- docs/sequence-flow.md
- docs/plan/14-day-mvp-plan.md
- docs/plan/day-08-ai-prompts.md
- backend/src/main/java/com/soc/ai/search/security
- backend/src/main/java/com/soc/ai/search/search
- backend/src/main/java/com/soc/ai/search/event
- backend/src/main/java/com/soc/ai/search/audit
- backend/src/main/java/com/soc/ai/search/export hoặc package CSV export hiện có
- backend/src/main/resources/application.properties

Yêu cầu:
1. Kiểm tra trạng thái repository trước khi sửa. Không ghi đè thay đổi hiện có.
2. Giữ nguyên cơ chế `APP_AUTH_ENABLED=false` cho local/test:
   - khi auth disabled, các test hiện có không bị vỡ;
   - demo identity mặc định vẫn có quyền tương đương `SOC_ANALYST`.
3. Khi `APP_AUTH_ENABLED=true`, backend phải dùng JWT role đã map từ Day 8:
   - `SOC_VIEWER`;
   - `SOC_ANALYST`;
   - `SOC_ADMIN`.
4. Chuẩn hóa role/authority:
   - JWT role có thể là `SOC_VIEWER`, `SOC_ANALYST`, `SOC_ADMIN`;
   - Spring authority nên thống nhất dạng `ROLE_SOC_VIEWER`, `ROLE_SOC_ANALYST`, `ROLE_SOC_ADMIN`;
   - không hardcode user cụ thể.
5. Tạo helper/service nhỏ cho RBAC nếu cần, ví dụ:
   - `RoleNames`;
   - `RbacPermissionService`;
   - `CurrentUserService` mở rộng thêm helper kiểm tra role.
   Không tạo abstraction lớn hoặc policy engine ngoài phạm vi MVP.
6. Role hierarchy nghiệp vụ:
   - `SOC_ADMIN` có toàn bộ quyền của `SOC_ANALYST`;
   - `SOC_ANALYST` có toàn bộ quyền của `SOC_VIEWER`;
   - `SOC_VIEWER` chỉ được quyền xem cơ bản.
   - Bắt buộc cấu hình hierarchy ở Spring Security, ví dụ dùng `RoleHierarchyImpl` hoặc `MethodSecurityExpressionHandler` tương đương:
     - `ROLE_SOC_ADMIN > ROLE_SOC_ANALYST`;
     - `ROLE_SOC_ANALYST > ROLE_SOC_VIEWER`.
   - Mục tiêu: khi dùng `@PreAuthorize("hasRole('SOC_ANALYST')")`, user có role `SOC_ADMIN` cũng tự động được phép truy cập, không cần check thủ công kiểu `admin || analyst`.
   - Không yêu cầu admin phải được gán lặp thêm role analyst/viewer trong Keycloak chỉ để pass permission.
7. Áp quyền endpoint:
   - `POST /api/v1/search`: `SOC_VIEWER`, `SOC_ANALYST`, `SOC_ADMIN`;
   - `POST /api/v1/search/plan`: `SOC_VIEWER`, `SOC_ANALYST`, `SOC_ADMIN`;
   - `GET /api/v1/events/{event_id}`: cả 3 role được gọi, nhưng raw log chỉ trả cho `SOC_ANALYST` và `SOC_ADMIN`;
   - `GET /api/v1/search/history`: chỉ `SOC_ANALYST` và `SOC_ADMIN`;
   - `GET /api/v1/search/{query_id}/export.csv`: chỉ `SOC_ANALYST` và `SOC_ADMIN`;
   - `GET /api/v1/audit-logs`: chỉ `SOC_ADMIN`;
   - ingest endpoints `POST /api/v1/events` và `POST /api/v1/events/bulk`: khi auth enabled, chỉ `SOC_ADMIN` được gọi để tránh viewer/analyst ghi dữ liệu vào demo public.
8. Với event detail:
   - không tạo endpoint mới nếu không cần;
   - nếu user không có quyền raw log, response vẫn trả metadata cơ bản nhưng `raw` phải bị redacted rõ ràng, ví dụ `raw = null`;
   - nên bổ sung field boolean nếu phù hợp, ví dụ `raw_visible` hoặc `can_view_raw`, để frontend hiển thị thông báo đúng;
   - không trả raw log cho `SOC_VIEWER`.
9. Với history:
   - `SOC_ANALYST` chỉ xem query history của chính mình;
   - `SOC_ADMIN` có thể xem audit log toàn hệ thống qua `/api/v1/audit-logs`;
   - không tự mở history toàn hệ thống cho analyst.
10. Với audit:
   - chỉ `SOC_ADMIN` được xem audit log;
   - audit record vẫn lưu identity từ JWT như Day 8.
11. Error handling:
   - chưa đăng nhập -> HTTP 401;
   - đã đăng nhập nhưng thiếu quyền -> HTTP 403;
   - response body ngắn gọn, ví dụ `{ "message": "Forbidden" }`;
   - không lộ stack trace, token content, claim nội bộ hoặc exception class.
12. Swagger/OpenAPI:
   - giữ Swagger permit trong local/dev như Day 8;
   - annotation/description nên ghi rõ endpoint nào cần role nào.
13. Không tạo bảng user trong PostgreSQL.
14. Không gọi Keycloak Admin REST API từ backend trong prompt này.
15. Thêm test backend:
   - unauthenticated gọi business endpoint khi auth enabled -> 401;
   - viewer gọi search -> 200;
   - viewer gọi event detail -> 200 nhưng không có raw log;
   - viewer gọi export CSV -> 403;
   - viewer gọi history -> 403;
   - viewer gọi audit log -> 403;
   - analyst gọi event detail -> có raw log;
   - analyst gọi export CSV -> 200 hoặc service layer được phép;
   - analyst gọi history -> 200 và chỉ scope theo identity hiện tại;
   - analyst gọi audit log -> 403;
   - admin gọi audit log -> 200;
   - test trực tiếp role hierarchy: admin pass endpoint/method guard yêu cầu `SOC_ANALYST`, analyst pass guard yêu cầu `SOC_VIEWER`;
   - admin gọi ingest endpoint -> allowed khi auth enabled;
   - role hierarchy hoạt động đúng;
   - auth disabled vẫn giữ behavior local/test cũ;
   - 403 response không lộ stack trace.
16. Chạy backend test.
17. Báo file đã tạo/sửa và lệnh verify.

Không triển khai frontend permission, smoke test PowerShell, deploy VPS hoặc Keycloak user management UI trong prompt này.
```

### Checkpoint Prompt 1

```powershell
cd backend
.\mvnw.cmd test
cd ..

docker compose config --quiet
```

---

## Prompt 2 - Frontend role-based UI permission và 403 UX

```text
Tiếp tục triển khai ngày 9 cho SOC AI Search MVP.

Hãy cập nhật frontend để UI phản ánh đúng quyền theo role `SOC_VIEWER`, `SOC_ANALYST`, `SOC_ADMIN`.

Đọc trước:
- docs/requirement.md
- docs/architecture.md
- docs/plan/14-day-mvp-plan.md
- docs/plan/day-08-ai-prompts.md
- frontend/src/auth
- frontend/src/App.tsx
- frontend/src/services/api-client.ts
- frontend/src/services/search-api.ts
- frontend/src/services/history-api.ts
- frontend/src/services/csv-export-api.ts
- frontend/src/components/soc

Yêu cầu:
1. Kiểm tra trạng thái repository trước khi sửa. Không ghi đè thay đổi hiện có.
2. Tạo helper permission phía frontend, ví dụ:
   - `frontend/src/auth/permissions.ts`;
   - helper tối thiểu:
     - `canSearch`;
     - `canViewBasicEventDetail`;
     - `canViewRawLog`;
     - `canExportCsv`;
     - `canViewHistory`;
     - `canViewAuditLogs`;
     - `isAdmin`.
3. Role hierarchy frontend phải khớp backend:
   - `SOC_ADMIN` >= `SOC_ANALYST` >= `SOC_VIEWER`;
   - nếu user có nhiều role, lấy quyền cao nhất;
   - nếu không có role hợp lệ, xem như viewer hoặc blocked rõ ràng tùy context, nhưng không cấp quyền analyst/admin.
   - Auth context/provider phải có trạng thái loading rõ ràng, ví dụ `isLoading` hoặc tương đương;
   - khi `isLoading = true`, không được vội đánh giá role và không render các nội dung nhạy cảm như Export, Raw Log, History hoặc Audit;
   - chỉ áp dụng permission sau khi thư viện OIDC đã khởi tạo xong và token/claims đã được parse;
   - mục tiêu là tránh UI nhấp nháy từ viewer sang analyst/admin trong 1-2 giây đầu sau khi restore session.
4. Khi `VITE_AUTH_ENABLED=false`, giữ demo/local behavior:
   - identity demo vẫn hiển thị;
   - role demo mặc định tương đương `SOC_ANALYST`;
   - không làm hỏng mock UI và local dev.
5. UI permission:
   - `SOC_VIEWER`:
     - được search/aggregation;
     - được xem event detail metadata cơ bản;
     - không thấy raw log hoặc thấy tab raw log disabled kèm thông báo cần role analyst;
     - không thấy hoặc bị disable nút Export CSV;
     - không thấy History Sheet;
     - không thấy Audit Log/Admin links.
   - `SOC_ANALYST`:
     - được search/aggregation;
     - được xem raw log;
     - được export CSV;
     - được xem query history của mình;
     - không thấy Audit Log/Admin links.
   - `SOC_ADMIN`:
     - có toàn bộ quyền analyst;
     - thấy Audit Log/Admin entry hoặc link hướng dẫn mở Keycloak Admin Console nếu UI chưa có trang audit riêng.
6. Không chỉ dựa vào frontend để bảo mật:
   - frontend chỉ ẩn/disable để UX rõ;
   - backend RBAC ở Prompt 1 mới là nguồn bảo vệ thật.
7. Khi API trả 403:
   - hiển thị Alert rõ: “Bạn không có quyền thực hiện thao tác này” hoặc tiếng Anh tương đương nhất quán với UI;
   - không crash dashboard;
   - không tự logout user;
   - không retry vô hạn.
8. Khi API trả 401:
   - hiển thị message session expired/please login again;
   - nếu auth enabled, hướng user đăng nhập lại.
9. Event detail drawer:
   - nếu response có `raw = null` hoặc `raw_visible = false`, tab Raw Log phải hiển thị trạng thái locked/disabled;
   - không render raw log giả nếu backend không trả raw;
   - metadata tab vẫn hoạt động.
10. Export CSV:
   - disable nếu role không đủ quyền;
   - disable khi đang loading search;
   - nếu backend trả 403, hiển thị alert.
11. History:
   - chỉ fetch history khi role đủ quyền và History Sheet mở;
   - viewer không gọi history API;
   - nếu role không đủ quyền, không spam API.
12. Audit/Admin UI:
   - admin-only entry có thể là placeholder hoặc link ngoài tới Keycloak Admin Console;
   - không triển khai Keycloak Admin REST API trong app.
13. Thêm test frontend:
   - permission helper cho viewer/analyst/admin;
   - auth loading không render action nhạy cảm và không đánh giá nhầm role;
   - viewer không thấy hoặc không dùng được export;
   - viewer raw log bị locked khi raw bị null;
   - analyst thấy export/raw/history;
   - admin thấy audit/admin entry;
   - 403 từ API hiển thị alert;
   - auth disabled vẫn render demo analyst behavior.
14. Chạy frontend test/lint/build.
15. Báo file đã tạo/sửa và lệnh verify.

Không triển khai backend RBAC, deploy VPS, Keycloak Admin API hoặc self-registration workflow trong prompt này.
```

### Checkpoint Prompt 2

```powershell
cd frontend
npm test
npm run lint
npm run build
cd ..
```

---

## Prompt 3 - Smoke test RBAC, README và review cuối ngày

```text
Tiếp tục triển khai ngày 9 cho SOC AI Search MVP.

Hãy tạo smoke test RBAC và cập nhật tài liệu vận hành Day 9.

Đọc trước:
- docs/plan/14-day-mvp-plan.md
- docs/plan/day-08-ai-prompts.md
- README.md
- infra/keycloak/README.md
- scripts/smoke-test-day-08.ps1
- backend security/RBAC code vừa tạo
- frontend permission code vừa tạo

Yêu cầu:
1. Kiểm tra trạng thái repository trước khi sửa. Không ghi đè thay đổi hiện có.
2. Tạo smoke test PowerShell cho Day 9, ví dụ:
   - `scripts/smoke-test-day-09-rbac.ps1`.
3. Script nhận tham số:
   - `BackendUrl`, mặc định `http://localhost:8081`;
   - `FrontendUrl`, mặc định `http://localhost:3000`;
   - `ViewerToken`, optional;
   - `AnalystToken`, optional;
   - `AdminToken`, optional;
   - `RequireTokens`, switch optional.
4. Smoke script không tự bịa credential và không hardcode password.
5. Nếu không truyền token:
   - script vẫn kiểm tra backend health;
   - frontend HTTP 200;
   - OpenAPI có endpoint auth/RBAC liên quan;
   - nếu auth enabled, request business endpoint không token phải trả 401;
   - in hướng dẫn ngắn cách lấy token thủ công qua Keycloak/frontend;
   - nếu có `-RequireTokens` thì fail rõ ràng khi thiếu token.
6. Nếu có `ViewerToken`, verify:
   - `/api/v1/auth/me` trả role `SOC_VIEWER`;
   - viewer gọi search hoặc search/plan được 200;
   - viewer gọi event detail được 200 nhưng raw bị null/redacted hoặc `raw_visible = false`;
   - viewer export CSV bị 403;
   - viewer history bị 403;
   - viewer audit log bị 403.
7. Nếu có `AnalystToken`, verify:
   - `/api/v1/auth/me` trả role `SOC_ANALYST`;
   - analyst search được 200;
   - analyst event detail có raw log;
   - analyst export CSV được 200 nếu có `query_id` hợp lệ;
   - analyst history được 200;
   - analyst audit log bị 403.
8. Nếu có `AdminToken`, verify:
   - `/api/v1/auth/me` trả role `SOC_ADMIN`;
   - admin audit log được 200;
   - admin export CSV được;
   - admin raw log xem được;
   - nếu ingest endpoint được test, admin gọi được còn viewer/analyst không được.
9. Script phải fail rõ ràng nếu checkpoint không đạt.
10. Cập nhật README.md:
    - role matrix Day 9;
    - cách tạo 3 user demo trong Keycloak:
      - viewer;
      - analyst;
      - admin;
    - role nào được làm gì;
    - cách test UI theo từng role;
    - cách chạy smoke test Day 9;
    - cách truyền token vào smoke test nếu muốn test tự động;
    - ghi rõ frontend permission chỉ là UX, backend RBAC mới là bảo vệ thật.
11. Cập nhật `infra/keycloak/README.md` nếu thiếu:
    - cách gán role;
    - cách kiểm tra token claim có `realm_access.roles`;
    - nhắc self-registration vẫn tắt.
12. Chạy verify:
    - backend test;
    - frontend test/lint/build;
    - docker compose config;
    - smoke test Day 9 ở chế độ không token;
    - nếu có token local thì chạy thêm với token viewer/analyst/admin.
13. Báo file đã tạo/sửa, lệnh verify và kết quả.

Không triển khai deploy VPS, report/slide, Keycloak Admin API hoặc workflow tự đăng ký trong app.
```

### Checkpoint Prompt 3

```powershell
cd backend
.\mvnw.cmd test
cd ..

cd frontend
npm test
npm run lint
npm run build
cd ..

docker compose config --quiet
.\scripts\smoke-test-day-09-rbac.ps1

# Nếu có token thật:
.\scripts\smoke-test-day-09-rbac.ps1 `
  -ViewerToken "<viewer-access-token>" `
  -AnalystToken "<analyst-access-token>" `
  -AdminToken "<admin-access-token>" `
  -RequireTokens
```

---

## Prompt Review Cuối Ngày 9

```text
Hãy review và verify toàn bộ kết quả triển khai ngày 9 cho SOC AI Search MVP.

Đọc lại:
- docs/requirement.md
- docs/architecture.md
- docs/sequence-flow.md
- docs/plan/14-day-mvp-plan.md
- docs/plan/day-08-ai-prompts.md
- docs/plan/day-09-ai-prompts.md
- README.md
- infra/keycloak/README.md

Kiểm tra:
1. Backend nhận diện đúng 3 role `SOC_VIEWER`, `SOC_ANALYST`, `SOC_ADMIN`.
2. Role hierarchy đúng: admin >= analyst >= viewer.
3. Backend có cấu hình Spring Security role hierarchy, ví dụ `ROLE_SOC_ADMIN > ROLE_SOC_ANALYST > ROLE_SOC_VIEWER`, không chỉ check thủ công `admin || analyst`.
4. Backend test xác nhận admin pass guard yêu cầu analyst và analyst pass guard yêu cầu viewer.
5. Khi auth disabled, local/test behavior cũ không bị vỡ.
6. Khi auth enabled, business API yêu cầu JWT.
7. Unauthenticated request vào protected business endpoint trả 401.
8. User thiếu quyền trả 403, không trả 500.
9. 401/403 không lộ stack trace, token hoặc claim nội bộ.
10. Viewer gọi search/aggregation được.
11. Viewer xem event detail cơ bản được.
12. Viewer không nhận raw log.
13. Viewer bị chặn export CSV.
14. Viewer bị chặn history.
15. Viewer bị chặn audit logs.
16. Analyst xem raw log được.
17. Analyst export CSV được.
18. Analyst xem query history của mình được.
19. Analyst bị chặn audit logs.
20. Admin xem audit logs được.
21. Admin có quyền analyst.
22. Ingest endpoints khi auth enabled không mở cho viewer/analyst nếu đã áp guard admin-only.
23. Audit/history vẫn lưu identity từ JWT khi auth enabled.
24. Frontend hiển thị identity và role đúng.
25. Frontend có auth loading state và không render action nhạy cảm trước khi OIDC parse token/claims xong.
26. Frontend viewer không thấy hoặc không dùng được export/raw/history/audit.
27. Frontend analyst thấy export/raw/history nhưng không thấy audit admin.
28. Frontend admin thấy audit/admin entry.
29. Frontend xử lý 403 bằng alert rõ ràng, không crash.
30. Frontend xử lý 401 bằng thông báo login/session rõ ràng.
31. History Sheet chỉ fetch khi role đủ quyền và sheet đang mở.
32. CSV export button bị disable khi role không đủ quyền hoặc search đang loading.
33. Backend test pass.
34. Frontend test/lint/build pass.
35. docker compose config hợp lệ.
36. Smoke test Day 9 pass ở chế độ có thể chạy được trong local hiện tại.
37. README có role matrix và hướng dẫn tạo user demo Keycloak.
38. Không tạo bảng user trong app.
39. Không triển khai Keycloak Admin REST API trong app.
40. Không triển khai deploy VPS trong Day 9.

Sau đó:
1. Sửa lỗi nhỏ nếu phát hiện.
2. Cập nhật README.md nếu thiếu:
   - role matrix;
   - cách tạo 3 user demo;
   - cách test UI từng role;
   - cách chạy smoke test Day 9.
3. Chạy verify phù hợp.
4. Báo checklist PASS/FAIL theo từng mục.
5. Liệt kê việc còn cần làm ở Day 10 nhưng không triển khai chúng.
```
