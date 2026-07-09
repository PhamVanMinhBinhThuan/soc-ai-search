# CI/CD Pipeline trong SOC AI Search

## 1. CI/CD là gì?

CI/CD là luồng tự động kiểm tra và triển khai code.

- **CI (Continuous Integration)**: mỗi lần push/PR, hệ thống tự chạy test, lint, build để kiểm tra code có an toàn để merge/deploy không.
- **CD (Continuous Deployment)**: sau khi CI pass trên branch `main`, hệ thống tự deploy bản mới lên VPS.

Trong đồ án, CI/CD được cấu hình bằng GitHub Actions:

```text
.github/workflows/ci.yml
.github/workflows/deploy.yml
```

## 2. Luồng tổng quát

```text
Developer push code lên GitHub
        ↓
GitHub Actions chạy CI
        ↓
Backend verify + coverage gate
Frontend test/lint/build
Docker Compose config check
        ↓
Nếu CI pass trên main
        ↓
CD SSH vào VPS
        ↓
Pull latest main
Rebuild/restart Docker containers
        ↓
Health check nội bộ
        ↓
Smoke test public domain
```

## 3. CI đang kiểm tra gì?

File:

```text
.github/workflows/ci.yml
```

CI có 3 job chính.

| Job | Lệnh chính | Mục đích |
|---|---|---|
| Backend tests and coverage | `./mvnw verify` | Chạy test backend và JaCoCo coverage gate. |
| Frontend tests, lint and build | `npm test`, `npm run lint`, `npm run build` | Kiểm tra test UI, code style và build production frontend. |
| Docker Compose config | `docker compose config --quiet` | Kiểm tra file Docker Compose có hợp lệ không. |

### Backend CI

Backend dùng Java 21 và Maven:

```bash
cd backend
chmod +x ./mvnw
./mvnw verify
```

`verify` chạy:

- unit/service/controller tests;
- JaCoCo report;
- JaCoCo coverage gate.

Coverage gate hiện tại yêu cầu:

```text
INSTRUCTION COVEREDRATIO >= 0.50
```

Tức là instruction coverage backend phải từ 50% trở lên.

### Frontend CI

Frontend dùng Node.js 24:

```bash
cd frontend
npm ci
npm test
npm run lint
npm run build
```

Ý nghĩa:

- `npm test`: chạy Vitest/React Testing Library.
- `npm run lint`: kiểm tra lỗi lint.
- `npm run build`: đảm bảo frontend build được bản production.

### Docker Compose config check

```bash
docker compose config --quiet
```

Lệnh này không start container. Nó chỉ validate file Compose để phát hiện lỗi cú pháp/config sớm.

## 4. CD deploy lên VPS như thế nào?

File:

```text
.github/workflows/deploy.yml
```

CD chạy khi:

- CI trên branch `main` pass; hoặc
- chạy thủ công bằng `workflow_dispatch`.

CD dùng các GitHub Secrets:

| Secret | Ý nghĩa |
|---|---|
| `VPS_HOST` | IP/domain VPS. |
| `VPS_USER` | User SSH. |
| `VPS_PORT` | Port SSH. |
| `VPS_APP_DIR` | Thư mục project trên VPS. |
| `VPS_SSH_KEY` | Private key để GitHub Actions SSH vào VPS. |

Các bước chính:

```text
Validate secrets
        ↓
Configure SSH key
        ↓
SSH vào VPS
        ↓
cd VPS_APP_DIR
        ↓
git fetch + git reset --hard origin/main
        ↓
docker compose config --quiet
        ↓
docker compose up -d --build
```

CD giữ lại một số file production quan trọng khi `git clean`, ví dụ:

```text
.env
frontend/.env
generated-data/
```

Lý do: các file này chứa config/runtime data trên VPS, không nên bị xóa khi deploy.

### Rebuild/restart container có làm mất dữ liệu không?

Không mất dữ liệu nếu dữ liệu được lưu trong **Docker volume**.

Trong CD, lệnh chính là:

```bash
docker compose up -d --build
```

Ý nghĩa:

- `--build`: build lại image nếu source/Dockerfile thay đổi.
- `up -d`: tạo/start lại container ở background.
- Container cũ có thể bị thay bằng container mới.
- Nhưng dữ liệu trong volume vẫn được giữ lại.

Vì vậy PostgreSQL, Elasticsearch và Keycloak vẫn giữ được dữ liệu nếu chúng được mount vào volume trong Docker Compose.

Nói dễ hiểu:

```text
Image/container = phần chạy ứng dụng, có thể thay khi deploy code mới
Volume = nơi lưu dữ liệu bền vững, không bị xóa khi restart/recreate container
```

Ví dụ:

| Thành phần | Dữ liệu cần giữ | Vì sao không mất khi deploy? |
|---|---|---|
| PostgreSQL | history/audit, migration state | Dữ liệu nằm trong volume PostgreSQL. |
| Elasticsearch | event index, documents | Index data nằm trong volume Elasticsearch. |
| Keycloak | realm, user, role, client config | Database/storage của Keycloak nằm trong volume hoặc database được mount. |

Lưu ý: nếu chạy lệnh xóa volume như `docker compose down -v` thì dữ liệu có thể mất. CD hiện tại dùng `up -d --build`, không dùng `down -v`, nên dữ liệu runtime được giữ lại.

## 5. Health check và smoke test là gì?

Sau khi restart container, CD kiểm tra nội bộ trên VPS:

```bash
curl -fsS http://127.0.0.1:8081/api/v1/health/live
curl -fsS http://127.0.0.1:3000/
```

Ý nghĩa:

- backend container phải trả health `UP`;
- frontend container phải phục vụ được trang web.

Sau đó CD chạy public smoke test:

```powershell
./scripts/smoke-test-day-11-domain.ps1 -VpsIp "$env:VPS_HOST"
```

Smoke test là kiểm tra nhanh bản deploy qua public domain, ví dụ frontend/API/auth domain còn truy cập được không.

Nếu health check hoặc smoke test fail, CD job fail. Nhờ vậy mình phát hiện lỗi deploy sớm thay vì chỉ biết khi demo.

## 6. Vì sao CI/CD có ý nghĩa trong đồ án?

CI/CD giúp chứng minh hệ thống không chỉ chạy local mà có quy trình triển khai thực tế:

- Code mới phải qua backend test và coverage gate.
- Frontend phải test/lint/build thành công.
- Docker Compose phải hợp lệ.
- Deploy lên VPS tự động bằng GitHub Actions.
- Sau deploy có health check và smoke test.
- Giảm lỗi thao tác tay khi deploy bằng SSH thủ công.
- Đảm bảo mỗi lần deploy đều theo cùng một quy trình lặp lại được.
- Container có thể được rebuild/restart để chạy version mới, còn dữ liệu bền vững vẫn nằm trong Docker volume.

Nói ngắn gọn:

> Em dùng GitHub Actions để tự động hóa kiểm thử và triển khai. CI đảm bảo backend, frontend và Docker Compose pass trước. CD chỉ chạy khi CI pass trên `main`, sau đó SSH vào VPS, cập nhật source, rebuild image nếu cần, restart container bằng Docker Compose và chạy smoke test public domain. Container có thể được tạo lại để chạy code mới, nhưng dữ liệu như PostgreSQL, Elasticsearch và Keycloak vẫn được giữ trong Docker volume. Nếu một bước fail thì pipeline fail, giúp giảm rủi ro khi demo/deploy.
