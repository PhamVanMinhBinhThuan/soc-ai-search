# Q18 - CI/CD và Smoke Test

## Câu trả lời ngắn

CI/CD giúp phát hiện lỗi trước khi demo hoặc deploy thật:

- **CI** kiểm tra backend test, frontend test/lint/build và Docker Compose config.
- **CD** SSH vào VPS, pull code mới, build/restart containers.
- **Smoke test** kiểm tra public domain frontend/API/auth có phản hồi đúng không.

Câu nói khi bảo vệ:

> CI/CD giúp em phát hiện lỗi sớm: test fail, build fail, Docker config sai, deploy lỗi hoặc domain public không phản hồi. Nhờ vậy trước buổi demo em không chỉ tin code chạy local, mà còn kiểm tra được hệ thống public thật.

## 1. CI đang kiểm tra gì?

File chính:

- `.github/workflows/ci.yml`

Các job chính:

| Job | Mục đích |
| --- | --- |
| Backend tests and coverage | Chạy Maven verify cho backend |
| Frontend tests, lint and build | Chạy test, lint, build cho React/Vite |
| Docker Compose config | Kiểm tra file Compose có hợp lệ không |

Các lệnh quan trọng trong CI:

```bash
./mvnw verify
npm ci
npm test
npm run lint
npm run build
docker compose config --quiet
```

Ý nghĩa:

- Nếu backend test fail thì không deploy.
- Nếu frontend build fail thì không deploy.
- Nếu Docker Compose config sai thì phát hiện trước khi lên VPS.

## 2. CD deploy lên VPS như thế nào?

File chính:

- `.github/workflows/deploy.yml`

CD được trigger khi workflow CI trên nhánh `main` thành công, hoặc chạy thủ công bằng `workflow_dispatch`.

Luồng chính:

```text
CI pass trên main
  |
  v
CD workflow
  |
  v
Validate VPS secrets
  |
  v
SSH vào DigitalOcean VPS
  |
  v
git fetch/reset latest main
  |
  v
docker compose config --quiet
  |
  v
docker compose up -d --build
  |
  v
Run public domain smoke test
```

Các GitHub Secrets quan trọng:

- `VPS_HOST`
- `VPS_USER`
- `VPS_PORT`
- `VPS_APP_DIR`
- `VPS_SSH_KEY`

Trên VPS, workflow dùng compose production:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy up -d --build
```

Ý nghĩa:

- `--profile auth`: bật Keycloak.
- `--profile proxy`: bật Caddy.
- `--build`: build lại backend/frontend image nếu code thay đổi.
- `up -d`: chạy container ở background.

## 3. Smoke test là gì?

Smoke test là kiểm tra nhanh sau deploy để đảm bảo hệ thống “còn sống” ở các điểm quan trọng.

Nó không thay thế full test, nhưng giúp bắt lỗi deploy phổ biến:

- domain không trỏ đúng;
- HTTPS/Caddy lỗi;
- backend health không phản hồi;
- Keycloak OIDC config lỗi;
- CORS preflight lỗi;
- port nhạy cảm bị public ra Internet.

## 4. Smoke test domain kiểm tra gì?

File chính:

- `scripts/smoke-test-day-11-domain.ps1`

Script kiểm tra:

| Check | URL |
| --- | --- |
| Frontend HTTPS | `https://soc-ai-search.app` |
| Backend health HTTPS | `https://api.soc-ai-search.app/api/v1/health/live` |
| Keycloak OIDC config HTTPS | `https://auth.soc-ai-search.app/realms/soc-ai-search/.well-known/openid-configuration` |
| CORS preflight | `OPTIONS https://api.soc-ai-search.app/api/v1/search` từ origin frontend |
| Public port exposure | Kiểm tra các port nội bộ không mở public |

Lệnh chạy:

```powershell
pwsh ./scripts/smoke-test-day-11-domain.ps1 -VpsIp "<VPS_IP>"
```

Trong GitHub Actions, CD chạy:

```powershell
./scripts/smoke-test-day-11-domain.ps1 -VpsIp "$env:VPS_HOST"
```

## 5. Regression smoke test kiểm tra gì?

File chính:

- `scripts/smoke-test-day-10-regression.ps1`

Mục tiêu là kiểm tra nhanh các chức năng quan trọng sau nhiều ngày phát triển:

- backend health;
- Elasticsearch health;
- OpenAPI;
- các endpoint search/aggregation chính;
- một số regression liên quan RBAC nếu có token;
- đảm bảo các thay đổi mới không làm hỏng luồng cũ.

Lệnh local/VPS:

```powershell
pwsh ./scripts/smoke-test-day-10-regression.ps1 -BackendUrl "http://localhost:8081"
```

## 6. RBAC smoke test kiểm tra gì?

File chính:

- `scripts/smoke-test-day-09-rbac.ps1`

Script này kiểm tra:

- backend health;
- OpenAPI có endpoint auth/search/history/audit;
- request không token bị chặn đúng;
- Viewer bị cấm export/history/audit;
- Analyst được search/export/history nhưng không được audit logs;
- Admin được audit logs và có quyền cao hơn qua role hierarchy.

Lệnh ví dụ:

```powershell
pwsh ./scripts/smoke-test-day-09-rbac.ps1 -BackendUrl "http://localhost:8081"
```

Nếu muốn kiểm tra đủ role thật thì truyền token Viewer/Analyst/Admin vào script.

## 7. Vì sao cần cả test và smoke test?

**Test trong CI** kiểm tra code ở mức logic:

- parser;
- validator;
- compiler;
- service;
- frontend component;
- permission logic.

**Smoke test** kiểm tra hệ thống thật sau khi chạy:

- container có lên không;
- domain có vào được không;
- API public có phản hồi không;
- Keycloak public có đúng không;
- CORS có bị chặn không.

Câu trả lời ngắn:

> Unit/integration test đảm bảo logic đúng. Smoke test đảm bảo bản deploy thật hoạt động được từ bên ngoài. Hai lớp này bổ sung cho nhau.

## 8. Nếu CD fail thì thường do đâu?

Các lỗi phổ biến:

| Lỗi | Nguyên nhân thường gặp |
| --- | --- |
| Missing secret | GitHub Secrets thiếu `VPS_HOST`, `VPS_SSH_KEY`, `VPS_APP_DIR`... |
| SSH fail | Sai key, sai user, sai port hoặc VPS chưa add public key |
| Compose config fail | `.env` production thiếu biến như `APP_DOMAIN`, `API_DOMAIN`, `AUTH_DOMAIN` |
| Frontend gọi sai API | `VITE_API_BASE_URL` sai hoặc chưa rebuild frontend |
| Keycloak redirect lỗi | Redirect URI/logout URI chưa đúng trong realm |
| Smoke domain fail | DNS/Caddy/backend/auth chưa sẵn sàng hoặc HTTPS chưa cấp xong |

## 9. Code/file cần đọc

- `.github/workflows/ci.yml`: CI backend/frontend/compose config.
- `.github/workflows/deploy.yml`: CD SSH vào VPS, build/restart, smoke test.
- `scripts/smoke-test-day-11-domain.ps1`: kiểm tra public domain app/API/auth/CORS/ports.
- `scripts/smoke-test-day-10-regression.ps1`: kiểm tra regression sau nhiều ngày phát triển.
- `scripts/smoke-test-day-09-rbac.ps1`: kiểm tra RBAC bằng token và endpoint guard.
- `docker-compose.yml`: service chính.
- `docker-compose.deploy.yml`: Caddy + production override.
- `Caddyfile`: route domain public.

## 10. Câu hỏi hội đồng dễ hỏi

### CI khác CD như thế nào?

CI kiểm tra code trước: test, lint, build, compose config.  
CD đưa code đã pass CI lên VPS và restart container.

### Smoke test có phải test đầy đủ không?

Không. Smoke test chỉ là kiểm tra nhanh những điểm sống còn sau deploy. Full test vẫn nằm ở CI/backend/frontend test.

### Vì sao cần smoke test public domain?

Vì app chạy local hoặc container healthy chưa chắc domain public dùng được. Smoke test public domain kiểm tra đúng thứ người dùng thật sẽ truy cập.

### Nếu deploy xong mà frontend không gọi được backend thì kiểm tra gì?

Kiểm tra `VITE_API_BASE_URL`, CORS backend, Caddy route `api.soc-ai-search.app`, backend health và việc frontend đã rebuild chưa.

### Vì sao cần kiểm tra Docker Compose config trong CI?

Vì một lỗi nhỏ trong YAML hoặc biến môi trường có thể làm deploy fail. `docker compose config --quiet` giúp bắt lỗi trước khi SSH lên VPS.

