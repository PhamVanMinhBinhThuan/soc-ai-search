# Day 11 Missing Tasks Prompt - Deployment Hardening, Domain Smoke, Rollback

Tiếp tục hoàn thiện Day 11 cho SOC AI Search MVP.

Hiện trạng đã có:

- VPS DigitalOcean Ubuntu chạy Docker Compose.
- Domain mua tại Name.com:
  - `https://soc-ai-search.app` -> frontend.
  - `https://api.soc-ai-search.app` -> backend API.
  - `https://auth.soc-ai-search.app` -> Keycloak.
- Caddy reverse proxy cấp HTTPS tự động bằng Let's Encrypt.
- GitHub Actions CI và CD qua SSH đã có.
- Elasticsearch đã seed `10000` documents.
- Backend/API health domain đang trả `200`.
- Keycloak login domain hoạt động.
- Stack deploy hiện dùng `docker-compose.yml` + `docker-compose.deploy.yml`, không dùng AWS, Nginx host-level hoặc Certbot.

Trước khi sửa, hãy đọc lại các file sau:

- `docs/tech-stack.md`
- `docs/architecture.md`
- `docs/sequence-flow.md`
- `plan/14-day-mvp-plan.md`
- `plan/mentor-2-week-mvp-timeline.md`
- `plan/day-11-implements.md`
- `README.md`
- `docker-compose.yml`
- `docker-compose.deploy.yml`
- `Caddyfile`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`

Nhiệm vụ còn thiếu của Day 11:

0. Chuẩn hóa docs/plan theo deployment thực tế hiện tại:
   - Rà soát và cập nhật các tài liệu hiện còn mô tả sai deployment cũ:
     - AWS/EC2;
     - Route 53;
     - Elastic IP;
     - Nginx làm reverse proxy host-level;
     - Certbot;
     - security group kiểu AWS.
   - Thay bằng mô hình đang dùng:
     - DigitalOcean Droplet Ubuntu;
     - Name.com DNS A records trỏ về public IPv4 của Droplet;
     - Caddy reverse proxy public `80/443`;
     - Caddy tự cấp và gia hạn HTTPS certificate;
     - Docker Compose deployment bằng `docker-compose.yml` + `docker-compose.deploy.yml`;
     - firewall/UFW hoặc DigitalOcean Firewall chỉ public `22`, `80`, `443`.
   - Cập nhật architecture/README/plan để dùng đúng domain production:
     - `https://soc-ai-search.app`;
     - `https://api.soc-ai-search.app`;
     - `https://auth.soc-ai-search.app`.
   - Cập nhật các bảng tech stack/architecture nếu còn ghi `Nginx :80/:443` thành `Caddy :80/:443`.
   - Không claim đang dùng AWS, Route 53, Elastic IP, host Nginx hoặc Certbot cho deployment hiện tại.
   - Không claim GitHub Container Registry là bắt buộc nếu CD hiện tại đang dùng SSH vào VPS, `git pull` và rebuild Docker Compose.
   - Giữ lại các reference tới Nginx nếu đúng ngữ cảnh:
     - `frontend/nginx.conf` trong container frontend dùng để serve React static assets hoặc proxy nội bộ;
     - không gọi đây là reverse proxy host-level thay thế Caddy.
   - Không sửa các prompt lịch sử cũ chỉ để đổi wording, trừ khi chúng đang được dùng như tài liệu kế hoạch hiện tại. Nếu còn match trong prompt lịch sử, ghi rõ đó là historical prompt.
   - Không thêm secret thật, API key thật, password thật hoặc nội dung `.env` thật vào docs.

1. Hardening public ports trên VPS:
   - Chỉ public:
     - `22/tcp` cho SSH;
     - `80/tcp` cho HTTP challenge/redirect;
     - `443/tcp` cho HTTPS.
   - Gỡ UFW rules public không cần thiết:
     - `3000`;
     - `8081`;
     - `8082`.
   - Không public Elasticsearch `9200`, PostgreSQL `5433/5432`, Kibana `5601`.
   - Sau khi sửa, verify từ máy ngoài:
     - `178.128.111.251:3000` không connect được;
     - `178.128.111.251:8081` không connect được;
     - `178.128.111.251:8082` không connect được;
     - `https://soc-ai-search.app` vẫn vào được;
     - `https://api.soc-ai-search.app/api/v1/health/live` vẫn trả `200`;
     - `https://auth.soc-ai-search.app/realms/soc-ai-search/.well-known/openid-configuration` vẫn trả `200`.

2. Tạo smoke test domain cho Day 11, ví dụ:
   - `scripts/smoke-test-day-11-domain.ps1`.
   - Script nhận tham số:
     - `AppUrl`, mặc định `https://soc-ai-search.app`;
     - `ApiUrl`, mặc định `https://api.soc-ai-search.app`;
     - `AuthUrl`, mặc định `https://auth.soc-ai-search.app`;
     - `VpsIp`, mặc định `178.128.111.251`.
   - Check:
     - frontend HTTPS trả `200`;
     - backend health HTTPS trả `200`;
     - Keycloak OIDC config HTTPS trả `200`;
     - CORS preflight từ origin `https://soc-ai-search.app` tới `POST /api/v1/search` trả `200` và có `Access-Control-Allow-Origin`;
     - public ports `3000`, `8081`, `8082`, `9200`, `5433`, `5601` không mở từ internet;
     - nếu cần, check dataset count qua SSH hoặc skip phần count nếu không có SSH.

3. Cập nhật CD workflow:
   - Sau khi deploy, chạy thêm smoke domain hoặc các curl tương đương:
     - frontend domain;
     - API health domain;
     - Keycloak OIDC config domain;
     - CORS preflight.
   - Nếu smoke fail, workflow phải fail rõ ràng.
   - Không echo secret hoặc `.env` vào log.

4. Ghi rollback command rõ trong README:
   - Rollback bằng Git commit:
     ```bash
     cd /root/soc-ai-search
     git fetch origin
     git reset --hard <previous_commit_sha>
     docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy up -d --build
     ```
   - Hoặc rollback bằng `git reflog` nếu deploy mới vừa lỗi.
   - Ghi rõ rollback không xóa Docker volumes nên PostgreSQL/Elasticsearch data vẫn còn.

5. Verify:
   - Chạy rà soát docs:
     ```bash
     rg "AWS|EC2|Route 53|Elastic IP|Nginx|nginx|Certbot|security group" docs plan README.md
     ```
   - Với các match còn lại, phân loại rõ:
     - hợp lệ nếu là prompt lịch sử hoặc `frontend/nginx.conf` trong container frontend;
     - không hợp lệ nếu docs/plan hiện tại vẫn nói deployment production dùng AWS/Nginx/Certbot.
   - `docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy config --quiet`.
   - `scripts/smoke-test-day-11-domain.ps1` pass.
   - GitHub Actions CD vẫn pass sau khi thêm domain smoke.

Không triển khai thêm chức năng sản phẩm mới trong prompt này. Chỉ hardening deploy, smoke domain, rollback docs và đồng bộ tài liệu theo deployment thực tế DigitalOcean + Caddy.
