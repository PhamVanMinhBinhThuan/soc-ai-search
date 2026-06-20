# Mini Prompt - Keycloak Email Onboarding Cho User Do Admin Tạo

Hãy triển khai và chuẩn hóa luồng onboarding tài khoản Keycloak cho SOC AI Search MVP.

Hiện tại project đã có Keycloak, RBAC 3 role (`SOC_VIEWER`, `SOC_ANALYST`, `SOC_ADMIN`) và frontend/backend auth đang chạy được. Tuy nhiên tài khoản demo hiện vẫn được admin tạo thủ công rồi đặt password thủ công. Mục tiêu task này là làm luồng chuyên nghiệp hơn:

```text
Admin tạo user trong Keycloak
        ↓
Gán role phù hợp
        ↓
Keycloak gửi email cho user
        ↓
User bấm link trong email
        ↓
User xác thực email / đổi mật khẩu / cập nhật thông tin nếu cần
        ↓
User đăng nhập SOC AI Search
```

## Bối cảnh bắt buộc phải đọc trước

Trước khi sửa, hãy đọc và hiểu các file sau:

- `README.md`
- `.env.example`
- `docker-compose.yml`
- `docker-compose.deploy.yml`
- `Caddyfile`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `infra/keycloak/README.md`
- `infra/keycloak/realm-export/soc-ai-search-realm.json`
- `frontend/.env.example`
- `frontend/src/auth/auth-config.ts`
- `frontend/src/auth/auth-context.tsx`
- `backend/src/main/java/com/soc/ai/search/security/SecurityConfig.java`

Không tự đoán kiến trúc. Hãy giữ đúng stack hiện tại:

- DigitalOcean VPS
- Caddy reverse proxy
- Docker Compose
- Keycloak
- Spring Boot backend
- React/Vite frontend
- GitHub Actions CI/CD

Không cập nhật docs theo hướng AWS/Nginx/Certbot vì project hiện đã chuyển sang DigitalOcean + Caddy.

## Mục tiêu

1. Cấu hình Keycloak realm/client để hỗ trợ admin-created user onboarding bằng email.
2. Không bật public self-registration.
3. Admin vẫn là người tạo user và gán role.
4. User nhận email để verify email và/hoặc đổi mật khẩu lần đầu.
5. Không commit credential thật, SMTP password thật, API key thật hoặc demo password thật.
6. Không phá login/logout hiện tại của frontend.
7. Không phá CI/CD deploy hiện tại.

## Yêu cầu chi tiết

### 1. Không bật self-registration

Giữ nguyên chủ trương SOC thực tế:

- Public self-registration phải tắt.
- Người dùng không được tự đăng ký ở màn hình login.
- Admin tạo tài khoản trong Keycloak Admin Console.

Trong realm export, đảm bảo:

```json
"registrationAllowed": false
```

Nếu đang có setting liên quan self-registration thì không được bật nó lên.

### 2. Bổ sung cấu hình email/SMTP bằng biến môi trường

Thêm placeholder cấu hình SMTP cho Keycloak trong `.env.example` và nếu cần trong `docker-compose.yml` / `docker-compose.deploy.yml`.

Ví dụ tên biến có thể dùng:

```env
KEYCLOAK_SMTP_HOST=
KEYCLOAK_SMTP_PORT=587
KEYCLOAK_SMTP_FROM=no-reply@soc-ai-search.app
KEYCLOAK_SMTP_FROM_DISPLAY_NAME=SOC AI Search
KEYCLOAK_SMTP_USER=
KEYCLOAK_SMTP_PASSWORD=
KEYCLOAK_SMTP_AUTH=true
KEYCLOAK_SMTP_STARTTLS=true
KEYCLOAK_SMTP_SSL=false
```

Yêu cầu bảo mật:

- `.env.example` chỉ chứa placeholder.
- Không ghi SMTP password thật.
- Không ghi email password/app password thật.
- Không commit user password thật.

Sử dụng cấu hình mẫu của Mailtrap cho môi trường local/dev hoặc Gmail App Password cho production/demo thật để làm ví dụ trong `.env.example` và tài liệu. Đây chỉ là ví dụ placeholder, không được hardcode tài khoản thật hoặc app password thật.

Ví dụ local/dev với Mailtrap nên thể hiện rõ đây là sandbox email để test luồng onboarding mà không gửi email ra người dùng thật. Ví dụ production/demo với Gmail App Password phải ghi rõ cần tạo app password riêng, không dùng mật khẩu Gmail chính.

Nếu Keycloak realm export có thể cấu hình SMTP server bằng JSON, hãy thêm cấu hình dựa trên env/placeholders nếu Keycloak import hỗ trợ an toàn. Nếu không phù hợp, hãy cập nhật tài liệu hướng dẫn admin cấu hình SMTP thủ công trong Keycloak Admin Console.

### 3. Required Actions cho user mới

Thiết kế luồng user mới như sau:

Khi admin tạo user mới, admin nên chọn hoặc hệ thống nên document rõ các required actions:

- `VERIFY_EMAIL`
- `UPDATE_PASSWORD`
- nếu phù hợp: `UPDATE_PROFILE`

Mục tiêu:

- User không nhận password cố định từ admin.
- User tự đặt password qua email/action link.
- Email verified được xử lý đúng qua Keycloak.

Nếu có thể cấu hình trong realm export để default required actions phù hợp, hãy làm. Nếu Keycloak không tự áp dụng required actions cho mọi user mới qua realm config, hãy cập nhật `infra/keycloak/README.md` và `README.md` hướng dẫn admin thao tác rõ ràng:

1. Create user.
2. Điền username/email/first name/last name.
3. Assign realm role.
4. Vào tab Credentials hoặc Required user actions.
5. Chọn `Update Password`, `Verify Email`, `Update Profile` nếu cần.
6. Bấm `Send verify email` hoặc `Execute actions email`.

### 4. Realm export phải không chứa demo users/passwords

Không thêm user thật vào `infra/keycloak/realm-export/soc-ai-search-realm.json`.

Realm export chỉ nên chứa:

- realm config;
- client config;
- role config;
- SMTP config nếu an toàn và không chứa secret thật;
- required action config nếu phù hợp.

Không chứa:

- `analyst.demo` password;
- user thật;
- SMTP password thật;
- client secret thật.

### 5. Deploy domain và redirect vẫn phải đúng

Không làm hỏng các cấu hình đã deploy:

- App: `https://soc-ai-search.app`
- API: `https://api.soc-ai-search.app`
- Auth: `https://auth.soc-ai-search.app`

Keycloak client `soc-ai-search-frontend` vẫn phải có redirect/logout URI hợp lệ cho local và production:

- `http://localhost:3000/*`
- `http://localhost:5173/*` nếu Vite local dev đang dùng port 5173;
- `https://soc-ai-search.app/*`
- post logout redirect local/prod tương ứng.

Đảm bảo `Web Origins`, `Valid Redirect URIs` và `Valid post logout redirect URIs` trong `soc-ai-search-realm.json` bao gồm đầy đủ URL qua Caddy và local dev. Luồng email action cũng phải quay về đúng React app: sau khi user bấm link email để verify/update password, nút `Back to Application` không được gây `Invalid redirect uri` và nên đưa user về `https://soc-ai-search.app` ở deploy hoặc local frontend URL khi dev.

Không sửa lung tung `client_id`, realm name hoặc authority nếu không cần.

### 6. Frontend không cần custom Keycloak login theme

Không triển khai custom Keycloak login theme trong task này.

Không thêm docs về custom theme.

Ưu tiên task này là email onboarding và deploy-safe config.

### 7. README/docs cần cập nhật rõ

Cập nhật tài liệu ngắn gọn, chuyên nghiệp:

- `README.md`
- `infra/keycloak/README.md`
- nếu cần thêm `docs/auth-rbac.md` hoặc cập nhật docs hiện có.

Nội dung cần có:

- Luồng tạo user bởi admin.
- Luồng gửi email verify/update password.
- Cách cấu hình SMTP cho local/deploy.
- Cách test email bằng provider thật hoặc mail sandbox.
- Lưu ý không commit secret.
- Role mapping:
  - `SOC_VIEWER`
  - `SOC_ANALYST`
  - `SOC_ADMIN`
- Demo credentials không lưu trong repo, gửi riêng nếu cần.

### 8. CI/CD không được fail

Sau khi sửa, phải chạy các lệnh verify phù hợp ở local:

```powershell
cd frontend
npm test
npm run build
cd ..

cd backend
.\mvnw.cmd test
cd ..
```

Nếu môi trường là Linux/VPS/GitHub Actions thì dùng tương đương:

```bash
cd frontend
npm test
npm run build
cd ..

cd backend
./mvnw test
cd ..
```

Kiểm tra Docker Compose config:

```bash
docker compose config
```

Nếu có profile deploy/auth/proxy thì kiểm tra thêm nếu phù hợp:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy config
```

Không được bỏ qua lỗi test/build bằng cách xóa test hoặc disable workflow.

### 9. Kiểm tra deploy smoke liên quan

Đọc `.github/workflows/deploy.yml` để hiểu CD đang chạy lệnh nào.

Nếu thay đổi Caddy/Keycloak/env ảnh hưởng deploy, đảm bảo smoke test vẫn hợp lý.

Nếu có script smoke domain, kiểm tra không làm hỏng:

```powershell
.\scripts\smoke-test-day-11-domain.ps1
```

hoặc trên GitHub Actions/Linux:

```bash
pwsh ./scripts/smoke-test-day-11-domain.ps1
```

Không hardcode secret vào workflow.

Nếu thêm biến môi trường SMTP mới, hãy cập nhật `.github/workflows/deploy.yml` để truyền các biến này từ GitHub Secrets sang VPS trong quá trình deploy. Không in secret ra log. Nếu workflow hiện tại render/copy `.env` trên VPS, hãy bổ sung mapping cho các biến SMTP mới theo cùng pattern hiện có.

## Test thủ công cần mô tả lại sau khi làm

Sau khi triển khai, hãy báo cách test thủ công:

1. Login Keycloak Admin Console.
2. Tạo user mới, ví dụ `new.analyst`.
3. Điền email thật hoặc email sandbox.
4. Gán role `SOC_ANALYST`.
5. Gửi `Execute actions email` với action `UPDATE_PASSWORD` và `VERIFY_EMAIL`.
6. User mở email, đặt password, verify email.
7. User login `https://soc-ai-search.app`.
8. Kiểm tra UI hiển thị đúng role `SOC_ANALYST`.
9. Kiểm tra analyst export CSV được.
10. Logout không bị `Invalid redirect uri`.

## Không làm trong task này

- Không thêm self-registration public.
- Không thêm custom Keycloak login theme.
- Không viết hệ thống duyệt user riêng trong backend.
- Không lưu user/password trong PostgreSQL.
- Không thay đổi SearchPlan/search/aggregation logic.
- Không thêm sort asc/desc cho bảng kết quả.
- Không thay đổi role policy hiện tại nếu không cần.
- Không commit secret thật.

## Báo cáo kết quả

Khi hoàn thành, hãy báo:

- File đã sửa/tạo.
- Cấu hình SMTP/env mới.
- Luồng admin-created user onboarding hoạt động như thế nào.
- Các lệnh verify đã chạy và kết quả.
- Có cần thao tác thủ công nào trên Keycloak Admin Console ở VPS hiện tại hay không.

Lưu ý quan trọng:

Nếu Keycloak trên VPS đang dùng volume cũ, thay đổi trong `realm-export` có thể không tự apply vào realm đang chạy. Nếu cần, hãy ghi rõ một trong hai hướng:

1. Cập nhật thủ công realm/client/SMTP trong Keycloak Admin Console trên VPS; hoặc
2. Re-import realm sau khi backup, với cảnh báo rằng reset volume có thể mất user đã tạo thủ công.

