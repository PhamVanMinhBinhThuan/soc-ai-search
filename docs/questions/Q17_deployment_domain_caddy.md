# Q17 - Deployment, Domain và Caddy

## Câu trả lời ngắn

Hệ thống đang deploy thật trên **DigitalOcean VPS**. Domain mua ở **Name.com**. **Caddy** làm reverse proxy public và tự cấp HTTPS. Các service chạy bằng **Docker Compose** gồm frontend, backend, PostgreSQL, Elasticsearch, Keycloak và Caddy.

Deployment hiện tại **không dùng AWS, Nginx host-level hoặc Certbot**. Nginx chỉ còn nằm bên trong container frontend để serve React build, còn reverse proxy ngoài internet là Caddy.

## Public endpoints cần nhớ

| Thành phần | URL |
| --- | --- |
| Frontend | `https://soc-ai-search.app` |
| Backend API | `https://api.soc-ai-search.app` |
| Keycloak/Auth | `https://auth.soc-ai-search.app` |

## Luồng request khi chạy production

```text
Browser
  |
  v
Caddy HTTPS reverse proxy
  |-- soc-ai-search.app      -> frontend:80
  |-- api.soc-ai-search.app  -> backend:8080
  |-- auth.soc-ai-search.app -> keycloak:8080

Backend
  |-- Elasticsearch
  |-- PostgreSQL
  |-- Keycloak JWKS
```

Ý nghĩa:

- User chỉ truy cập qua HTTPS domain.
- Caddy nhận request public ở cổng `80/443`.
- Backend, PostgreSQL, Elasticsearch và Keycloak chạy trong Docker network.
- PostgreSQL và Elasticsearch không mở trực tiếp ra internet; backend là nơi kiểm soát truy cập dữ liệu.

## DNS ở Name.com

Trên Name.com tạo A record trỏ về IPv4 của VPS:

```text
soc-ai-search.app       A  <VPS_IP>
api.soc-ai-search.app   A  <VPS_IP>
auth.soc-ai-search.app  A  <VPS_IP>
```

Các biến domain tương ứng trong `.env` production:

```env
APP_DOMAIN=soc-ai-search.app
API_DOMAIN=api.soc-ai-search.app
AUTH_DOMAIN=auth.soc-ai-search.app
```

## Docker Compose production

Base compose định nghĩa các service chính:

- `postgres`
- `elasticsearch`
- `backend`
- `frontend`
- `keycloak`

Deploy compose bổ sung Caddy và cấu hình hostname production:

- `docker-compose.yml`
- `docker-compose.deploy.yml`
- `Caddyfile`

Lệnh chạy production trên VPS:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy up -d --build
```

`--profile auth` bật Keycloak.  
`--profile proxy` bật Caddy.

## Vì sao dùng Caddy?

Caddy phù hợp MVP vì:

- tự động xin và renew HTTPS certificate bằng Let's Encrypt;
- cấu hình reverse proxy ngắn hơn Nginx + Certbot;
- giảm số bước vận hành khi demo;
- dễ đọc, dễ giải thích trước hội đồng.

Caddyfile hiện có 3 route chính:

```text
{$APP_DOMAIN}  -> frontend:80
{$API_DOMAIN}  -> backend:8080
{$AUTH_DOMAIN} -> keycloak:8080
```

## CI/CD deploy như thế nào?

GitHub Actions dùng `.github/workflows/deploy.yml`.

Luồng chính:

```text
Push main / CI pass
  |
  v
GitHub Actions deploy workflow
  |
  v
SSH vào VPS
  |
  v
git fetch/reset latest main
  |
  v
docker compose up -d --build
  |
  v
Public domain smoke test
```

Các secret quan trọng trong GitHub:

- `VPS_HOST`
- `VPS_USER`
- `VPS_PORT`
- `VPS_APP_DIR`
- `VPS_SSH_KEY`

Secrets và production `.env` không commit vào Git. Repository chỉ lưu `.env.example`.

## Lệnh kiểm tra nhanh trên VPS

```bash
cd ~/soc-ai-search

docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy ps

curl -I https://soc-ai-search.app
curl -I https://api.soc-ai-search.app/api/v1/health/live
curl -I https://auth.soc-ai-search.app/realms/soc-ai-search/.well-known/openid-configuration
```

Nếu cần xem log:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy logs -f caddy backend keycloak
```

Smoke test domain:

```powershell
pwsh ./scripts/smoke-test-day-11-domain.ps1 -VpsIp "<VPS_IP>"
```

## Code và tài liệu cần đọc

- `docker-compose.yml`: định nghĩa PostgreSQL, Elasticsearch, backend, frontend, Keycloak.
- `docker-compose.deploy.yml`: thêm Caddy, production hostname, proxy profile.
- `Caddyfile`: route domain public vào service nội bộ.
- `.github/workflows/deploy.yml`: GitHub Actions CD qua SSH.
- `.env.example`: các biến môi trường mẫu cho local và deploy.
- `plan/day-11-implements.md`: ghi lại quá trình thuê VPS, mua domain, DNS, Caddy, CI/CD và lỗi đã gặp.

Lưu ý: nếu thấy tài liệu cũ nhắc AWS/Nginx/Certbot thì đó không còn là deployment hiện tại. Deployment production hiện tại là **DigitalOcean + Docker Compose + Caddy**.

## Câu hỏi hội đồng dễ hỏi

### 1. Vì sao không dùng AWS/Nginx/Certbot?

Vì mục tiêu MVP là deploy nhanh, ổn định và dễ vận hành. DigitalOcean VPS đủ cho demo, còn Caddy tự xử lý HTTPS nên ít cấu hình hơn Nginx + Certbot. Nếu mở rộng production lớn hơn, hệ thống có thể chuyển sang cloud managed service sau.

### 2. HTTPS được cấp như thế nào?

Caddy tự xin certificate từ Let's Encrypt khi DNS đã trỏ đúng về VPS và cổng `80/443` mở. Sau đó Caddy tự renew certificate, mình không cần chạy Certbot thủ công.

### 3. Vì sao tách 3 domain?

Tách domain giúp rõ trách nhiệm:

- `soc-ai-search.app`: giao diện React.
- `api.soc-ai-search.app`: backend API.
- `auth.soc-ai-search.app`: Keycloak/OIDC.

Cách này cũng giúp cấu hình CORS, redirect URI và logout redirect rõ ràng hơn.

### 4. Elasticsearch và PostgreSQL có public ra internet không?

Không. Chúng chỉ phục vụ backend trong Docker network hoặc bind localhost trên VPS. Người dùng public chỉ đi qua Caddy vào frontend/API/auth.

### 5. Nếu frontend báo không kết nối được backend thì kiểm tra gì?

Kiểm tra 3 điểm:

1. `frontend/.env` production có `VITE_API_BASE_URL=https://api.soc-ai-search.app`.
2. Backend CORS có allow `https://soc-ai-search.app`.
3. Sau khi đổi env frontend phải rebuild container vì Vite đọc env ở build time.

### 6. Nếu Keycloak báo `Invalid redirect uri` thì sao?

Kiểm tra Keycloak client `soc-ai-search-frontend` có đúng:

- Valid Redirect URIs: `https://soc-ai-search.app/auth/callback`, `https://soc-ai-search.app/*`
- Web Origins: `https://soc-ai-search.app`
- Post logout redirect về `https://soc-ai-search.app`

### 7. Nếu Docker Compose báo thiếu `AUTH_DOMAIN` thì sao?

Nghĩa là `.env` production trên VPS thiếu biến domain cho Caddy. Cần thêm:

```env
APP_DOMAIN=soc-ai-search.app
API_DOMAIN=api.soc-ai-search.app
AUTH_DOMAIN=auth.soc-ai-search.app
```

Sau đó chạy lại compose production.

