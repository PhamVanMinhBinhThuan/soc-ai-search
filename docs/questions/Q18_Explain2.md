# Q18 Explain 2 - Giải thích `deploy.yml` và lệnh Docker Compose production

File này giải thích workflow CD trong `.github/workflows/deploy.yml`: khi nào deploy chạy, nó SSH vào VPS như thế nào, cập nhật code ra sao, chạy Docker Compose production ra sao và smoke test sau deploy để làm gì.

## 1. `deploy.yml` dùng để làm gì?

File chính:

- `.github/workflows/deploy.yml`

Mục đích:

- deploy code mới lên DigitalOcean VPS;
- build/restart container production;
- kiểm tra backend/frontend local health trên VPS;
- chạy smoke test public domain sau deploy.

Câu trả lời ngắn:

> `deploy.yml` là workflow CD. Sau khi CI pass trên nhánh `main`, GitHub Actions SSH vào VPS, kéo code mới, build lại Docker images, restart containers và chạy smoke test domain để đảm bảo bản public hoạt động.

## 2. Khi nào CD chạy?

Trong `deploy.yml`:

```yaml
on:
  workflow_run:
    workflows:
      - CI
    types:
      - completed
    branches:
      - main
  workflow_dispatch:
```

Nghĩa là CD chạy trong 2 trường hợp:

1. Workflow `CI` hoàn tất trên nhánh `main`.
2. Mình bấm chạy thủ công bằng `workflow_dispatch`.

Nhưng job deploy chỉ chạy nếu:

```yaml
github.event_name == 'workflow_dispatch'
||
(
  github.event.workflow_run.conclusion == 'success'
  &&
  github.event.workflow_run.head_branch == 'main'
)
```

Nói dễ hiểu:

- Nếu chạy tự động: chỉ deploy khi CI pass trên `main`.
- Nếu chạy thủ công: cho phép deploy bằng nút manual.

## 3. `concurrency` dùng để làm gì?

Trong workflow:

```yaml
concurrency:
  group: production-vps
  cancel-in-progress: false
```

Ý nghĩa:

- Chỉ cho một deploy production chạy tại một thời điểm.
- Nếu có nhiều commit liên tiếp, workflow không để nhiều job cùng SSH vào VPS và restart container cùng lúc.
- `cancel-in-progress: false` nghĩa là không hủy deploy đang chạy dở; job sau sẽ chờ.

Câu trả lời ngắn:

> Concurrency tránh việc hai workflow deploy cùng lúc làm VPS bị race condition hoặc container restart chồng nhau.

## 4. Các secret deploy dùng để làm gì?

Trong `deploy.yml`:

```yaml
env:
  VPS_HOST: ${{ secrets.VPS_HOST }}
  VPS_USER: ${{ secrets.VPS_USER }}
  VPS_PORT: ${{ secrets.VPS_PORT || '22' }}
  VPS_APP_DIR: ${{ secrets.VPS_APP_DIR }}
  VPS_SSH_KEY: ${{ secrets.VPS_SSH_KEY }}
  DEPLOY_BRANCH: main
```

| Secret | Ý nghĩa |
| --- | --- |
| `VPS_HOST` | IP/domain của VPS |
| `VPS_USER` | user SSH, ví dụ `root` hoặc deploy user |
| `VPS_PORT` | port SSH, mặc định `22` |
| `VPS_APP_DIR` | thư mục project trên VPS, ví dụ `~/soc-ai-search` |
| `VPS_SSH_KEY` | private key để GitHub Actions SSH vào VPS |

Workflow có bước validate:

```bash
test -n "$VPS_HOST" || exit 1
test -n "$VPS_USER" || exit 1
test -n "$VPS_APP_DIR" || exit 1
test -n "$VPS_SSH_KEY" || exit 1
```

Nếu thiếu secret, deploy fail sớm trước khi SSH.

## 5. Vì sao workflow checkout code ở GitHub trước?

Bước:

```yaml
- name: Checkout smoke scripts
  uses: actions/checkout@v4
```

Mục đích chính là lấy script smoke test trong repository về GitHub runner, đặc biệt:

- `scripts/smoke-test-day-11-domain.ps1`

Lưu ý:

- Code production thật được pull trên VPS.
- Checkout ở GitHub runner chủ yếu để chạy smoke script sau deploy.

## 6. Workflow SSH vào VPS như thế nào?

Bước `Configure SSH`:

```bash
install -m 700 -d ~/.ssh
printf '%s\n' "$VPS_SSH_KEY" > ~/.ssh/deploy_key
chmod 600 ~/.ssh/deploy_key
ssh-keyscan -p "$VPS_PORT" "$VPS_HOST" >> ~/.ssh/known_hosts
```

Ý nghĩa:

- tạo thư mục SSH;
- ghi private key từ GitHub Secret ra file `deploy_key`;
- set permission `600` để SSH chấp nhận key;
- thêm host key VPS vào `known_hosts` để tránh prompt interactive.

Sau đó workflow chạy:

```bash
ssh -i ~/.ssh/deploy_key -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" ...
```

Nghĩa là GitHub Actions mở SSH session vào VPS và chạy script deploy ở đó.

## 7. Trên VPS workflow kiểm tra gì trước khi deploy?

Trong remote script:

```bash
cd "$VPS_APP_DIR"

if [ ! -d .git ]; then exit 1; fi
if [ ! -f .env ]; then exit 1; fi
if [ ! -f frontend/.env ]; then exit 1; fi
```

Ý nghĩa:

- `VPS_APP_DIR` phải là git checkout hợp lệ;
- `.env` production phải tồn tại;
- `frontend/.env` production phải tồn tại.

Vì sao cần kiểm tra `.env`?

- `.env` chứa config production như domain, Gemini/mock, Keycloak, database.
- `frontend/.env` chứa Vite build-time env như `VITE_API_BASE_URL`, Keycloak authority, redirect URI.
- Nếu thiếu env, container có thể build sai hoặc chạy sai domain.

## 8. Vì sao có `vm.max_map_count=262144`?

Trong workflow:

```bash
sudo sysctl -w vm.max_map_count=262144
```

Elasticsearch trên Linux cần `vm.max_map_count` đủ cao để chạy ổn định. Nếu không set, Elasticsearch có thể fail khi start.

Câu trả lời ngắn:

> Đây là kernel setting cần thiết cho Elasticsearch trên Linux. Workflow set lại mỗi lần deploy để tránh ES chết do thiếu `vm.max_map_count`.

## 9. Code được cập nhật trên VPS như thế nào?

Workflow chạy:

```bash
git fetch --prune origin "$DEPLOY_BRANCH"
git clean -fd \
  -e .env \
  -e frontend/.env \
  -e generated-data/ \
  -e 'generated-data/**' \
  -e '*.bak'
git reset --hard "origin/$DEPLOY_BRANCH"
```

Ý nghĩa:

- `git fetch`: lấy code mới từ GitHub.
- `git clean -fd`: xóa file untracked để workspace sạch.
- `-e .env`: giữ lại `.env` production trên VPS.
- `-e frontend/.env`: giữ lại env frontend production.
- `git reset --hard origin/main`: đưa code VPS về đúng version mới nhất của `main`.

Câu trả lời ngắn:

> VPS không sửa code thủ công lâu dài. CD luôn reset code về `origin/main`, nhưng giữ lại các file env production không commit lên Git.

## 10. Lệnh Docker Compose production có ý nghĩa gì?

Lệnh:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy up -d --build
```

Giải thích từng phần:

| Thành phần | Ý nghĩa |
| --- | --- |
| `docker compose` | Dùng Docker Compose v2 |
| `-f docker-compose.yml` | Đọc compose base: PostgreSQL, Elasticsearch, backend, frontend, Keycloak |
| `-f docker-compose.deploy.yml` | Đọc thêm compose override production: Caddy, hostname Keycloak, proxy config |
| `--profile auth` | Bật các service thuộc profile auth, đặc biệt Keycloak |
| `--profile proxy` | Bật Caddy reverse proxy public |
| `up` | Tạo/chạy containers theo compose |
| `-d` | Chạy detached/background |
| `--build` | Build lại image trước khi chạy nếu Dockerfile/source thay đổi |

Nói dễ hiểu:

> Lệnh này chạy toàn bộ stack production: backend, frontend, PostgreSQL, Elasticsearch, Keycloak và Caddy. Nó dùng cả file compose base và file deploy override, bật profile auth/proxy, build image mới rồi chạy container ở background.

## 11. Vì sao có bước `config --quiet` trước `up -d --build`?

Workflow tạo biến:

```bash
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy)
```

Sau đó chạy:

```bash
"${COMPOSE[@]}" config --quiet
"${COMPOSE[@]}" up -d --build
```

`config --quiet` kiểm tra compose production có hợp lệ không trước khi restart container.

Nếu `.env` thiếu:

```env
APP_DOMAIN=
API_DOMAIN=
AUTH_DOMAIN=
```

thì config có thể fail sớm, tránh restart hệ thống với cấu hình sai.

## 12. Sau khi restart, workflow kiểm tra health như thế nào?

Backend health:

```bash
curl -fsS http://127.0.0.1:8081/api/v1/health/live
```

Frontend health:

```bash
curl -fsS http://127.0.0.1:3000/
```

Workflow retry nhiều lần. Nếu hết số lần retry mà vẫn không healthy, nó in:

```bash
docker compose ps
docker compose logs --tail=120 backend caddy
```

Ý nghĩa:

- Kiểm tra service đã chạy trong VPS chưa.
- Nếu fail, show log để debug ngay trong GitHub Actions.

## 13. Smoke test public domain chạy khi nào?

Sau khi deploy xong, GitHub runner chạy:

```powershell
./scripts/smoke-test-day-11-domain.ps1 -VpsIp "$env:VPS_HOST"
```

Script này chạy từ bên ngoài VPS, nên nó kiểm tra góc nhìn giống user thật hơn.

Nó kiểm tra:

- `https://soc-ai-search.app`
- `https://api.soc-ai-search.app/api/v1/health/live`
- `https://auth.soc-ai-search.app/realms/soc-ai-search/.well-known/openid-configuration`
- CORS preflight từ frontend sang API;
- các port nội bộ không bị public lộ ra ngoài.

Câu trả lời ngắn:

> Health check trên VPS chỉ chứng minh container nội bộ sống. Smoke test public domain chứng minh người dùng thật có thể truy cập qua HTTPS/domain.

## 14. Vì sao có SMTP warning nhưng không fail deploy?

Trong workflow:

```bash
if ! grep -q 'KEYCLOAK_SMTP_HOST=.' .env; then
  echo "KEYCLOAK_SMTP_HOST is not configured..."
fi
```

Đây là cảnh báo không chặn deploy.

Lý do:

- SMTP chỉ cần cho email onboarding;
- core app vẫn chạy được nếu chưa cấu hình SMTP;
- deploy không nên fail chỉ vì tính năng email optional chưa bật.

## 15. Những lỗi CD thường gặp

| Lỗi | Nguyên nhân | Cách kiểm tra |
| --- | --- | --- |
| Missing secret | GitHub chưa cấu hình đủ VPS secrets | GitHub repository Settings -> Secrets |
| SSH fail | Sai key/user/port hoặc VPS chưa add public key | Thử SSH local |
| Missing `.env` | VPS chưa có env production | `ls -la .env frontend/.env` |
| Compose config fail | Thiếu domain/env hoặc YAML sai | Chạy compose `config --quiet` trên VPS |
| Backend không healthy | App lỗi, DB/ES chưa sẵn sàng, env sai | `docker compose logs backend` |
| Frontend không gọi API được | `VITE_API_BASE_URL` sai hoặc chưa rebuild | kiểm tra `frontend/.env` và rebuild |
| Smoke domain fail | DNS/Caddy/HTTPS/CORS lỗi | xem `caddy` logs và script smoke |

## 16. Câu trả lời mẫu khi hội đồng hỏi CD

> CD của em chạy sau khi CI pass trên nhánh main. GitHub Actions dùng SSH key trong GitHub Secrets để vào DigitalOcean VPS. Trên VPS, workflow kiểm tra `.env`, set `vm.max_map_count` cho Elasticsearch, pull code mới, reset workspace về `origin/main`, giữ lại env production, validate Docker Compose production rồi chạy `docker compose ... up -d --build`. Sau đó workflow kiểm tra backend/frontend health local và chạy smoke test public domain cho app/API/auth. Nhờ vậy em kiểm tra được cả code, container và domain public sau deploy.

