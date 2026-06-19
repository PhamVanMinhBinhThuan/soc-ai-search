# Day 11 Implements - Deploy VPS, Domain HTTPS, CI/CD

File này ghi lại quá trình triển khai Day 11 để review kiến thức và dùng làm nguồn cập nhật README/report.

## 1. Mục tiêu Day 11

Day 11 tập trung đưa SOC AI Search MVP lên môi trường public:

- Có website demo chạy qua HTTPS.
- Có Keycloak login trên domain.
- Có backend API public qua HTTPS.
- Có Elasticsearch/PostgreSQL chạy trong Docker nhưng không public trực tiếp.
- Có dataset demo đã seed.
- Có CI/CD GitHub Actions cơ bản.

## 2. Hạ tầng đã chọn

### VPS

- Provider: DigitalOcean.
- Droplet: Ubuntu.
- Cấu hình thực tế: `2 vCPU / 8 GiB RAM / 160 GiB SSD`.
- Public IPv4: `178.128.111.251`.
- Lý do chọn: đủ RAM cho Elasticsearch + PostgreSQL + Keycloak + backend + frontend trong một Docker Compose MVP.

### Domain

- Nhà cung cấp domain: Name.com.
- Domain chính: `soc-ai-search.app`.
- `.app` bắt buộc HTTPS ở trình duyệt, nên chọn hướng Caddy reverse proxy thay vì HTTP qua IP.

DNS record đã dùng:

```text
soc-ai-search.app      A  178.128.111.251
api.soc-ai-search.app  A  178.128.111.251
auth.soc-ai-search.app A  178.128.111.251
```

## 3. Cài đặt VPS

SSH vào VPS:

```bash
ssh root@178.128.111.251
```

Cài tool cơ bản:

```bash
apt update && apt upgrade -y
apt install -y git curl ufw nano wget apt-transport-https software-properties-common
```

Cài Docker:

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
docker --version
docker compose version
```

Cấu hình Elasticsearch Linux kernel requirement:

```bash
sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" | tee /etc/sysctl.d/99-elasticsearch.conf
sysctl --system
```

## 4. Clone source code

Repo public nên clone bằng HTTPS:

```bash
git clone https://github.com/PhamVanMinhBinhThuan/soc-ai-search.git
cd soc-ai-search
```

Tạo env production:

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

## 5. Cấu hình production env

Root `.env` trên VPS cần dùng domain HTTPS:

```env
APP_AUTH_ENABLED=true

APP_DOMAIN=soc-ai-search.app
API_DOMAIN=api.soc-ai-search.app
AUTH_DOMAIN=auth.soc-ai-search.app

KEYCLOAK_ISSUER_URI=https://auth.soc-ai-search.app/realms/soc-ai-search
KEYCLOAK_JWK_SET_URI=http://keycloak:8080/realms/soc-ai-search/protocol/openid-connect/certs

APP_CORS_ALLOWED_ORIGIN_PATTERNS=http://localhost:*,http://127.0.0.1:*,https://soc-ai-search.app

LLM_PROVIDER=gemini
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta
LLM_API_KEY=<secret-on-vps-only>
LLM_MODEL=gemini-2.5-flash
```

`frontend/.env` trên VPS:

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=https://api.soc-ai-search.app

VITE_AUTH_ENABLED=true
VITE_KEYCLOAK_AUTHORITY=https://auth.soc-ai-search.app/realms/soc-ai-search
VITE_KEYCLOAK_CLIENT_ID=soc-ai-search-frontend
VITE_KEYCLOAK_ADMIN_URL=https://auth.soc-ai-search.app/admin/master/console/#/soc-ai-search
VITE_KEYCLOAK_REDIRECT_URI=https://soc-ai-search.app/auth/callback
VITE_KEYCLOAK_POST_LOGOUT_REDIRECT_URI=https://soc-ai-search.app
VITE_KEYCLOAK_SCOPE=openid profile email
```

Lưu ý:

- Không commit `.env` hoặc API key.
- Vite đọc `frontend/.env` tại thời điểm build, nên sửa file xong phải rebuild frontend.

## 6. Reverse proxy HTTPS bằng Caddy

Repository đã thêm:

```text
Caddyfile
docker-compose.deploy.yml
```

Caddyfile:

```caddyfile
{$APP_DOMAIN} {
    reverse_proxy frontend:80
}

{$API_DOMAIN} {
    reverse_proxy backend:8080
}

{$AUTH_DOMAIN} {
    reverse_proxy keycloak:8080
}
```

Chạy production stack:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy up -d --build
```

Kiểm tra:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy ps
```

## 7. Keycloak domain setup

Keycloak cần chạy sau reverse proxy HTTPS với hostname:

```text
auth.soc-ai-search.app
```

Trong `docker-compose.deploy.yml`, Keycloak được cấu hình:

```yaml
--http-enabled=true
--hostname=${AUTH_DOMAIN}
--proxy-headers=xforwarded
```

Realm:

```text
soc-ai-search
```

Frontend client:

```text
soc-ai-search-frontend
```

Redirect/web origins cần có:

```text
Valid redirect URIs:
https://soc-ai-search.app/auth/callback
https://soc-ai-search.app/*

Web origins:
https://soc-ai-search.app

Valid post logout redirect URIs:
https://soc-ai-search.app
https://soc-ai-search.app/*
```

Nếu Keycloak volume đã tồn tại trước khi realm export được cập nhật, cần sửa client bằng Admin Console một lần, vì import không ghi đè realm đã có.

## 8. Seed dataset demo

Bootstrap Elasticsearch index:

```bash
pwsh ./scripts/bootstrap-elasticsearch.ps1
```

Seed 10.000 event:

```bash
pwsh ./scripts/seed-events.ps1 -Count 10000
```

Verify count:

```bash
curl http://127.0.0.1:9200/soc-events-v1/_count
```

Kết quả đã kiểm tra:

```json
{"count":10000}
```

## 9. CI/CD GitHub Actions

### CI

File:

```text
.github/workflows/ci.yml
```

CI đang chạy:

- Backend `mvn verify`.
- Frontend `npm test`, `npm run lint`, `npm run build`.
- Docker Compose config validation.
- CI ép `LLM_PROVIDER=mock`, không cần Gemini API key.

### CD

File:

```text
.github/workflows/deploy.yml
```

CD chạy sau khi CI pass trên branch `main`, hoặc chạy tay bằng `workflow_dispatch`.

GitHub Secrets cần có:

```text
VPS_HOST=178.128.111.251
VPS_USER=root
VPS_PORT=22
VPS_APP_DIR=/root/soc-ai-search
VPS_SSH_KEY=<private SSH key for VPS login>
```

CD thực hiện:

1. SSH vào VPS.
2. Kiểm tra `.env` và `frontend/.env` tồn tại.
3. Set `vm.max_map_count`.
4. `git fetch` và reset về `origin/main`.
5. Giữ lại `.env`, `frontend/.env`, `generated-data/`, `*.bak`.
6. Chạy Docker Compose production.
7. Check backend/frontend health local trên VPS.

## 10. Lỗi đã gặp và cách xử lý

### Keycloak báo `HTTPS required`

Nguyên nhân: dùng public IP HTTP với `.app`/Keycloak external context.

Cách xử lý: chuyển sang domain HTTPS bằng Caddy.

### Keycloak báo `Invalid parameter: redirect_uri`

Nguyên nhân: client `soc-ai-search-frontend` chưa whitelist:

```text
https://soc-ai-search.app/auth/callback
```

Cách xử lý: thêm redirect URI và web origin trong Keycloak client.

### Frontend báo không kết nối được backend

Nguyên nhân 1: `frontend/.env` còn trỏ về:

```text
http://178.128.111.251:8081
```

Trong khi app chạy HTTPS.

Cách xử lý:

```env
VITE_API_BASE_URL=https://api.soc-ai-search.app
```

và rebuild frontend.

Nguyên nhân 2: backend CORS chỉ allow localhost, làm preflight từ `https://soc-ai-search.app` bị `403`.

Cách xử lý:

```env
APP_CORS_ALLOWED_ORIGIN_PATTERNS=http://localhost:*,http://127.0.0.1:*,https://soc-ai-search.app
```

và cập nhật backend CORS config đọc từ env.

## 11. Verify Day 11 hiện tại

Đã kiểm tra:

```text
https://soc-ai-search.app                                      200
https://api.soc-ai-search.app/api/v1/health/live               200
https://auth.soc-ai-search.app/realms/soc-ai-search/.well-known/openid-configuration 200
Elasticsearch count                                            10000
```

Container binding hiện tại:

```text
backend        127.0.0.1:8081 -> 8080
frontend       127.0.0.1:3000 -> 80
keycloak       127.0.0.1:8082 -> 8080
elasticsearch  127.0.0.1:9200 -> 9200
postgres       127.0.0.1:5433 -> 5432
caddy          0.0.0.0:80, 0.0.0.0:443
```

Điểm còn cần hoàn thiện:

- UFW trên VPS vẫn đang allow `3000`, `8081`, `8082`. Dù container đã bind localhost nên public connect fail, theo checklist deploy vẫn nên remove các UFW rules này.
- Chưa có `scripts/smoke-test-day-11-domain.ps1` chính thức.
- CD mới check local health trên VPS, chưa check public domain/CORS sau deploy.
- README có deploy docs nhưng rollback section cần viết rõ hơn.

## 12. Lệnh vận hành thường dùng

Deploy/rebuild production:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy up -d --build
```

Xem trạng thái:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy ps
```

Xem log:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy logs --tail=100 backend
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy logs --tail=100 caddy
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy logs --tail=100 keycloak
```

Hard refresh browser sau deploy frontend:

```text
Ctrl + F5
```
## 13. Hoàn thiện missing tasks Day 11

Sau khi chuyển deployment thực tế sang DigitalOcean + Caddy, các tài liệu hiện hành cần được đồng bộ lại để không còn mô tả nhầm AWS/Nginx/Certbot là kiến trúc production.

Đã bổ sung/cập nhật trong repo:

- Chuẩn hóa docs/plan hiện hành theo mô hình:
  - DigitalOcean Droplet Ubuntu;
  - Name.com DNS A records;
  - Caddy reverse proxy public `80/443`;
  - Caddy automatic HTTPS bằng Let's Encrypt;
  - GitHub Actions CD qua SSH, `git fetch/reset` và rebuild Docker Compose.
- Thêm smoke test domain:
  - `scripts/smoke-test-day-11-domain.ps1`.
- Cập nhật CD workflow để chạy public domain smoke sau deploy.
- Cập nhật README với lệnh hardening UFW và rollback bằng Git commit/reflog.

Các reference còn lại tới Nginx trong docs chỉ hợp lệ khi nói về `frontend/nginx.conf` bên trong container frontend. Đây không phải reverse proxy host-level của production; production edge hiện là Caddy.

Lưu ý vận hành còn cần làm trực tiếp trên VPS nếu chưa làm:

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw delete allow 3000/tcp || true
ufw delete allow 8081/tcp || true
ufw delete allow 8082/tcp || true
ufw delete allow 9200/tcp || true
ufw delete allow 5433/tcp || true
ufw delete allow 5601/tcp || true
ufw status verbose
```

Sau khi hardening, chạy:

```powershell
.\scripts\smoke-test-day-11-domain.ps1
```

