# Prompt triển khai Ngày 12 - SOC AI Search MVP

## 1. Review kế hoạch Day 12

Day 12 là ngày hardening và tài liệu bàn giao. Sau Day 11, hệ thống đã có deploy public bằng DigitalOcean + Name.com + Caddy, CI/CD GitHub Actions, Keycloak/RBAC, frontend thật và backend API đầy đủ. Vì vậy Day 12 không nên thêm tính năng nghiệp vụ mới.

Trọng tâm đúng của Day 12:

- Kiểm tra bản demo public đủ ổn định cho mentor/hội đồng dùng thử.
- Kiểm tra security hygiene: secret, port exposure, CORS, CSV exposed headers, volume persistence.
- Viết lại `README.md` theo chuẩn chuyên nghiệp, dễ đọc, không còn dạng nhật ký dài theo từng ngày.
- Cập nhật toàn bộ `docs/` để phản ánh đúng project hiện tại, vì một số file được tạo từ lúc khởi tạo project đã lỗi encoding hoặc còn mô tả kiến trúc/contract cũ.
- Chuẩn bị bộ câu hỏi demo, tài khoản demo, checklist vận hành và troubleshooting cho những ngày tiếp theo làm report/slide.
- Bổ sung sơ đồ kiến trúc dễ nhìn cho README/docs bằng Mermaid và một demo script 5 phút để Day 13 làm slide/report nhanh hơn.

Không làm trong Day 12:

- Không thêm feature search/aggregation mới.
- Không đổi kiến trúc deploy lớn.
- Không thêm Kubernetes, Jenkins, ArgoCD, Prometheus hoặc Grafana.
- Không commit credential thật, API key, password demo hoặc access token vào README/docs.
- Không seed dataset vài triệu document nếu VPS chưa được benchmark riêng; chỉ ghi hướng dẫn và checkpoint.

Day 12 được chia thành 3 prompt:

1. Hardening, secret/port/domain/restart verification.
2. Rewrite README và đồng bộ `docs/` theo hệ thống hiện tại.
3. Demo package, smoke checklist và review cuối ngày 12.

Chỉ chuyển sang prompt tiếp theo khi prompt trước đã chạy verify phù hợp và không còn lỗi chặn demo.

---

## Prompt 1 - Hardening Public Demo, Secret Và Runtime Verification

```text
Tiếp tục triển khai ngày 12 cho SOC AI Search MVP.

Hãy harden và verify bản demo local/domain sau khi đã deploy bằng DigitalOcean + Name.com + Caddy.

Đọc trước:
- README.md
- plan/14-day-mvp-plan.md
- plan/mentor-2-week-mvp-timeline.md
- plan/day-11-implements.md
- docker-compose.yml
- docker-compose.deploy.yml
- Caddyfile
- .github/workflows/ci.yml
- .github/workflows/deploy.yml
- scripts/smoke-test-day-10-regression.ps1
- scripts/smoke-test-day-11-domain.ps1
- backend/src/main/resources/application.properties
- frontend/.env.example
- .env.example

Yêu cầu:
1. Kiểm tra trạng thái repository trước khi sửa. Không ghi đè thay đổi hiện có.
2. Không thêm feature mới. Prompt này chỉ hardening, verification và sửa lỗi cấu hình nhỏ nếu phát hiện.
3. Kiểm tra secret hygiene:
   - dùng `git status` và `git ls-files` để xác nhận `.env`, token, private key, API key thật không bị track;
   - dùng `git grep` để tìm pattern secret phổ biến như `AIza`, `sk-`, `ghp_`, `BEGIN PRIVATE KEY`, password thật;
   - nếu phát hiện secret thật trong Git-tracked files, dừng lại và báo rõ file cần rotate/sửa, không in lại secret trong response.
4. Kiểm tra tài liệu không chứa credential thật:
   - README.md;
   - docs/*.md;
   - plan/day-11-implements.md;
   - chỉ được dùng placeholder như `<your-gemini-api-key>`, `<VPS_PUBLIC_IP>`, `<demo-password-sent-separately>`.
5. Kiểm tra Docker Compose config:
   - `docker compose config --quiet`;
   - nếu có deploy profile, kiểm tra config với `docker-compose.deploy.yml` nếu local env đủ biến domain;
   - không hardcode domain/IP nhạy cảm không cần thiết ngoài tài liệu demo.
6. Kiểm tra Caddy/domain contract hiện tại:
   - frontend: `https://soc-ai-search.app`;
   - backend API: `https://api.soc-ai-search.app`;
   - Keycloak: `https://auth.soc-ai-search.app`;
   - không còn mô tả AWS/Nginx/Certbot/Route53 trong docs chính nếu project thực tế dùng DigitalOcean/Caddy/Name.com.
7. Kiểm tra port exposure policy trong tài liệu và config:
   - public chỉ nên là `22`, `80`, `443`;
   - Elasticsearch `9200` không public;
   - PostgreSQL `5432/5433` không public;
   - Keycloak internal port không public trực tiếp, chỉ đi qua Caddy;
   - backend/frontend container ports không public trực tiếp trong production;
   - Kibana `5601` không public.
8. Kiểm tra CORS và CSV exposed headers:
   - origin frontend production được allow;
   - `Content-Disposition` và `X-Export-Truncated` được expose để frontend đọc được filename/truncated warning;
   - preflight `OPTIONS` không bị Spring Security chặn 401.
9. Kiểm tra persistence expectation:
   - PostgreSQL, Elasticsearch, Keycloak, Caddy dùng named volumes;
   - restart container không xóa dataset, realm, audit/history;
   - README/docs phải cảnh báo không dùng `docker compose down -v` trừ khi muốn xóa dữ liệu.
10. Chạy verify phù hợp:
    - backend `mvn verify` nếu chưa chạy gần đây;
    - frontend `npm test`, `npm run lint`, `npm run build` nếu chưa chạy gần đây;
    - `docker compose config --quiet`;
    - `scripts/smoke-test-day-10-regression.ps1` local nếu stack đang chạy;
    - `scripts/smoke-test-day-11-domain.ps1` nếu domain public đang sẵn sàng.
11. Nếu smoke domain không chạy được do mạng/domain không sẵn sàng trong môi trường hiện tại, ghi rõ SKIP reason và lệnh cần chạy trên máy/VPS.
12. Báo kết quả dạng checklist PASS/FAIL/SKIP, kèm lỗi nhỏ đã sửa nếu có.

Không rewrite README/docs trong prompt này, trừ khi cần sửa lỗi hardening rất nhỏ. README/docs rewrite để Prompt 2.
```

### Checkpoint Prompt 1

```powershell
git status --short
git ls-files

git grep -n -E "AIza|sk-[A-Za-z0-9]|ghp_[A-Za-z0-9]|BEGIN (RSA|OPENSSH|PRIVATE) KEY"

docker compose config --quiet

cd backend
.\mvnw.cmd verify
cd ..

cd frontend
npm test -- --run
npm run lint
npm run build
cd ..

.\scripts\smoke-test-day-10-regression.ps1
.\scripts\smoke-test-day-11-domain.ps1
```

---

## Prompt 2 - Rewrite README Và Đồng Bộ Toàn Bộ Docs

```text
Tiếp tục triển khai ngày 12 cho SOC AI Search MVP.

Hãy viết lại README.md chuyên nghiệp và cập nhật toàn bộ tài liệu trong `docs/` để đúng với project hiện tại sau Day 11.

Đọc trước:
- README.md
- docs/requirement.md
- docs/tech-stack.md
- docs/architecture.md
- docs/sequence-flow.md
- docs/search-engine-decision.md
- plan/14-day-mvp-plan.md
- plan/mentor-2-week-mvp-timeline.md
- plan/day-11-implements.md
- docker-compose.yml
- docker-compose.deploy.yml
- Caddyfile
- .github/workflows/ci.yml
- .github/workflows/deploy.yml
- backend/src/main/java/com/soc/ai/search
- frontend/src
- infra/elasticsearch/soc-events-v1-index.json
- infra/keycloak/realm-export/soc-ai-search-realm.json

Yêu cầu chung:
1. Kiểm tra trạng thái repository trước khi sửa.
2. Không thêm feature mới, không sửa business logic nếu không thật sự cần.
3. README và docs phải viết bằng tiếng Việt có dấu, rõ ràng, chuyên nghiệp, dễ dùng cho mentor/hội đồng.
4. Sửa lỗi encoding tiếng Việt nếu có. Không để tài liệu hiển thị mojibake như `Äá» tÃ i`.
5. Không đưa secret thật, password thật, token, API key, private key hoặc credential demo vào Git-tracked docs.
6. Nếu cần nhắc credential demo, ghi: `credential demo gửi riêng`, không ghi trực tiếp mật khẩu.
7. Tài liệu phải phản ánh đúng hệ thống hiện tại:
   - React + TypeScript + Vite + Tailwind CSS + shadcn/ui + Recharts;
   - Java 21 + Spring Boot 3;
   - Elasticsearch `9.4.2`;
   - PostgreSQL + Flyway;
   - Gemini provider + mock LLM;
   - SearchPlan validator/compiler, không cho LLM sinh DSL trực tiếp;
   - summary best-effort/fallback;
   - audit/history/CSV export;
   - Keycloak OIDC/RBAC với `SOC_VIEWER`, `SOC_ANALYST`, `SOC_ADMIN`;
   - Docker Compose local/production;
   - DigitalOcean Droplet + Name.com DNS + Caddy HTTPS;
   - GitHub Actions CI/CD qua SSH;
   - không dùng AWS/Nginx/Certbot/ArgoCD/Jenkins trong deployment hiện tại.

README.md yêu cầu:
8. Viết lại README theo cấu trúc gọn và chuyên nghiệp, không còn là nhật ký tích lũy từng ngày quá dài.
9. README tối thiểu có các phần:
   - Project title và elevator pitch;
   - Demo links: dùng placeholder hoặc domain public nếu không chứa secret;
   - Architecture overview ngắn gọn;
   - Architecture diagram bằng Mermaid, hiển thị rõ luồng Browser -> Caddy -> Frontend/Backend -> Elasticsearch/PostgreSQL/Keycloak/LLM; Mermaid là chuẩn chính trong README/docs vì GitHub render trực tiếp; chỉ xuất thêm PNG/SVG nếu project/tooling hiện có hỗ trợ, không thêm tool nặng chỉ để render ảnh;
   - Feature list MVP;
   - Tech stack;
   - Repository structure;
   - Local prerequisites;
   - Quick start local bằng Docker Compose;
   - Seed dataset;
   - Auth/Keycloak local và cách tạo user demo;
   - Environment variables quan trọng, chỉ dùng placeholder;
   - Demo credentials section riêng, ghi rõ credential demo được gửi riêng và không lưu trong repository;
   - API overview và Swagger;
   - SearchPlan/DSL transparency explanation;
   - RBAC role matrix;
   - Test/coverage/smoke commands;
   - Deployment DigitalOcean + Name.com + Caddy;
   - GitHub Actions CI/CD;
   - Rollback;
   - Troubleshooting;
   - Security notes;
   - Roadmap/Out of scope.
10. README phải ưu tiên command chạy được:
    - Windows PowerShell local;
    - Linux VPS deploy;
    - phân biệt rõ local `.env` và production `.env` trên VPS.
11. README không được yêu cầu mở trực tiếp public port `3000`, `8081`, `8082`, `9200`, `5433`, `5601` trong production.
12. README phải ghi rõ `VITE_API_BASE_URL` production nên là `https://api.soc-ai-search.app` và auth authority là `https://auth.soc-ai-search.app/realms/soc-ai-search`.
13. README phải ghi rõ khi đổi biến `VITE_*` cần rebuild frontend.
14. README phải ghi rõ `LLM_PROVIDER=mock` dùng cho dev/test/CI; Gemini dùng cho integration/demo thật nếu có API key.
15. README phải ghi rõ summary là best-effort và không gửi raw log vào LLM.
16. README phải ghi rõ CSV export là live replay theo `query_id`, giới hạn 10.000 dòng, không nhận DSL từ client.

Docs yêu cầu:
17. `docs/requirement.md`:
    - viết lại đúng tiếng Việt có dấu;
    - tách MVP bắt buộc và mở rộng;
    - cập nhật những gì đã triển khai trong MVP;
    - không mô tả sai rằng LLM sinh DSL trực tiếp để execute;
    - ghi rõ backend dùng SearchPlan validate/compile.
18. `docs/tech-stack.md`:
    - cập nhật stack đã chốt, không còn “Auth chưa chốt” nếu đã dùng Keycloak;
    - ghi rõ DigitalOcean/Caddy/Name.com/GitHub Actions;
    - ghi rõ mock/Gemini provider.
19. `docs/architecture.md`:
    - cập nhật diagram/flow theo modular monolith hiện tại;
    - mô tả Caddy routing domain/subdomain;
    - mô tả Keycloak/RBAC;
    - mô tả PostgreSQL chỉ lưu audit/history, không lưu event;
    - mô tả Elasticsearch event store;
    - mô tả CI/CD hiện tại.
20. `docs/sequence-flow.md`:
    - sửa encoding;
    - cập nhật đúng request/response contract thực tế: snake_case như `query_id`, `original_question`, `generated_dsl`, `search_plan`, `aggregation_results`, `chart_metadata`;
    - cập nhật flow search, aggregation, summary, audit, CSV export, auth/RBAC;
    - không để example SearchPlan cũ như `mode = aggregate` nếu code hiện dùng `aggregation`.
21. `docs/search-engine-decision.md`:
    - kiểm tra còn đúng với Elasticsearch `9.4.2` Basic self-managed;
    - cập nhật nếu có nhắc OpenSearch/ClickHouse theo hướng đã quyết định.
22. Tạo hoặc cập nhật sơ đồ kiến trúc bằng Mermaid:
    - README hoặc `docs/architecture.md` phải có sơ đồ tổng quan dễ nhìn;
    - sơ đồ tối thiểu thể hiện Browser -> Caddy -> Frontend/Backend, Backend -> Elasticsearch/PostgreSQL/Keycloak/LLM;
    - bắt buộc dùng Mermaid làm source chính để GitHub render trực tiếp được;
    - nếu repo/tooling hiện có hỗ trợ render ảnh, có thể xuất thêm PNG/SVG vào vị trí hợp lý như `docs/assets/architecture-overview.png`; nếu không có tooling sẵn thì không thêm dependency nặng, chỉ dùng Mermaid là đủ.
23. Nếu tài liệu có Mermaid, giữ diagram đơn giản và renderable. Không thêm diagram quá phức tạp.
24. Sau khi sửa, chạy kiểm tra text nhanh:
    - tìm mojibake phổ biến: `Ä`, `Ã`, `á»`, `Æ`;
    - tìm công nghệ cũ không dùng nữa: AWS, Nginx, Certbot, Jenkins, ArgoCD, Route53, Supabase nếu không còn phù hợp;
    - tìm secret pattern.
25. Chạy verify tối thiểu:
    - `git diff --check`;
    - `git grep` secret pattern;
    - nếu không sửa code thì không bắt buộc chạy full test, nhưng nên chạy `docker compose config --quiet` nếu có sửa deployment docs/env example.
26. Báo file đã sửa và tóm tắt cấu trúc README/docs mới.

Không triển khai report/slide trong prompt này. Report/slide để Day 13.
```

### Checkpoint Prompt 2

```powershell
rg -n "Ä|Ã|á»|Æ" README.md docs plan/day-12-ai-prompts.md
rg -n "AWS|Nginx|Certbot|Jenkins|ArgoCD|Route53|Supabase" README.md docs

git diff --check
git grep -n -E "AIza|sk-[A-Za-z0-9]|ghp_[A-Za-z0-9]|BEGIN (RSA|OPENSSH|PRIVATE) KEY"
docker compose config --quiet
```

---

## Prompt 3 - Demo Package, Mentor Checklist Và Review Cuối Ngày 12

```text
Tiếp tục triển khai ngày 12 cho SOC AI Search MVP.

Hãy chuẩn bị bộ demo package/checklist cho mentor và review toàn bộ Day 12 sau khi README/docs đã được rewrite.

Đọc trước:
- README.md
- docs/requirement.md
- docs/tech-stack.md
- docs/architecture.md
- docs/sequence-flow.md
- docs/search-engine-decision.md
- plan/14-day-mvp-plan.md
- plan/day-12-ai-prompts.md
- plan/day-11-implements.md
- scripts/smoke-test-day-10-regression.ps1
- scripts/smoke-test-day-11-domain.ps1

Yêu cầu:
1. Kiểm tra trạng thái repository trước khi sửa.
2. Tạo hoặc cập nhật tài liệu phục vụ demo/review:
   - `plan/day-12-demo-checklist.md` cho checklist mentor;
   - `docs/demo-script.md` cho demo script 5 phút dùng lại ở Day 13 report/slide.
3. Demo checklist phải gồm:
   - URL public frontend/API/auth;
   - lưu ý credential demo gửi riêng;
   - role demo cần chuẩn bị: `SOC_VIEWER`, `SOC_ANALYST`, `SOC_ADMIN`;
   - dataset tối thiểu `10.000` event;
   - câu hỏi search tiếng Anh;
   - câu hỏi search tiếng Việt;
   - câu hỏi aggregation group_by;
   - câu hỏi aggregation top_n;
   - câu hỏi aggregation date_histogram;
   - kiểm tra SearchPlan/Generated DSL transparency;
   - mở event detail/raw log bằng analyst/admin;
   - kiểm tra viewer bị khóa raw/export/history;
   - kiểm tra analyst export CSV;
   - kiểm tra admin audit log;
   - kiểm tra history run again;
   - kiểm tra summary best-effort/fallback;
   - kiểm tra Swagger/OpenAPI nếu cần demo.
4. `docs/demo-script.md` phải viết thành kịch bản demo 5 phút, ngắn gọn và có thứ tự thao tác rõ:
   - login bằng analyst;
   - chạy search tiếng Anh hoặc tiếng Việt;
   - chỉ SearchPlan/Generated DSL;
   - chạy aggregation;
   - export CSV;
   - login viewer hoặc mô tả viewer để chứng minh không export/raw/history;
   - login admin hoặc mô tả admin để xem audit;
   - kết thúc bằng CI/CD/domain HTTPS.
5. Demo checklist phải có phần fallback nếu Gemini lỗi:
   - chuyển `LLM_PROVIDER=mock` cho local/dev;
   - giải thích summary fallback deterministic;
   - không làm hỏng search result.
6. Demo checklist phải có phần vận hành nhanh trên VPS:
   - xem container status;
   - xem logs backend/caddy/keycloak;
   - deploy lại bằng GitHub Actions hoặc command SSH;
   - rollback bằng `git reflog`/commit SHA và `docker compose up -d --build`;
   - không dùng `down -v`.
7. Review lại README/docs sau khi rewrite:
   - không còn lỗi encoding tiếng Việt;
   - không còn mô tả công nghệ cũ sai với project hiện tại;
   - không có secret thật;
   - command local/deploy/test rõ ràng;
   - docs đủ làm nền cho Day 13 report/slide.
8. Chạy verify phù hợp:
   - `git diff --check`;
   - secret grep;
   - `docker compose config --quiet`;
   - backend/frontend tests nếu có sửa code;
   - smoke Day 10 hoặc Day 11 nếu stack/domain đang sẵn sàng.
9. Báo checklist PASS/FAIL theo từng nhóm:
   - hardening;
   - README;
   - docs;
   - demo data/account;
   - local smoke;
   - domain smoke;
   - secret hygiene.
10. Liệt kê việc còn cần làm ở Day 13:
   - report;
   - slide;
   - screenshot;
   - video dự phòng;
   - demo script 7-10 phút.

Không triển khai feature mới, không thay đổi RBAC/auth behavior và không làm report/slide trong prompt này.
```

### Checkpoint Prompt 3

```powershell
git diff --check
git grep -n -E "AIza|sk-[A-Za-z0-9]|ghp_[A-Za-z0-9]|BEGIN (RSA|OPENSSH|PRIVATE) KEY"
rg -n "Ä|Ã|á»|Æ" README.md docs plan/day-12-demo-checklist.md docs/demo-script.md

docker compose config --quiet
.\scripts\smoke-test-day-10-regression.ps1
.\scripts\smoke-test-day-11-domain.ps1
```

---

## Prompt Review Cuối Ngày 12

```text
Hãy review và verify toàn bộ kết quả triển khai ngày 12 cho SOC AI Search MVP.

Đọc lại:
- README.md
- docs/requirement.md
- docs/tech-stack.md
- docs/architecture.md
- docs/sequence-flow.md
- docs/search-engine-decision.md
- plan/14-day-mvp-plan.md
- plan/day-12-ai-prompts.md
- plan/day-11-implements.md

Kiểm tra:
1. README đã được viết lại chuyên nghiệp, không còn dạng nhật ký rời rạc theo từng ngày.
2. README có đủ quick start local, seed data, Keycloak, test, coverage, smoke, deploy, rollback và troubleshooting.
3. README phân biệt rõ local Docker Compose và production DigitalOcean/Caddy.
4. README không chứa secret thật, password demo thật hoặc API key.
5. `docs/requirement.md` đúng tiếng Việt có dấu và đúng scope MVP hiện tại.
6. `docs/tech-stack.md` đúng stack hiện tại, gồm Keycloak, Caddy, DigitalOcean, Name.com và GitHub Actions.
7. `docs/architecture.md` đúng kiến trúc modular monolith và deployment hiện tại.
8. `docs/sequence-flow.md` đúng flow SearchPlan -> Validator -> Compiler -> Elasticsearch, summary, audit, CSV, auth/RBAC.
9. `docs/search-engine-decision.md` vẫn nhất quán với Elasticsearch `9.4.2` Basic self-managed.
10. Không còn lỗi encoding kiểu `Ä`, `Ã`, `á»`, `Æ` trong README/docs chính.
11. Không còn mô tả sai rằng deployment dùng AWS/Nginx/Certbot/Route53/Jenkins/ArgoCD nếu project hiện dùng DigitalOcean/Caddy/Name.com/GitHub Actions.
12. Secret grep pass.
13. `docker compose config --quiet` pass.
14. Backend test/coverage pass nếu có sửa code backend.
15. Frontend test/lint/build pass nếu có sửa code frontend.
16. Smoke Day 10 hoặc Day 11 pass, hoặc skip có lý do rõ nếu domain/network không sẵn sàng.
17. Port exposure policy được tài liệu hóa rõ: production chỉ public 22/80/443.
18. Volume persistence và cảnh báo không dùng `down -v` đã được tài liệu hóa.
19. CORS và CSV exposed headers đã được tài liệu hóa.
20. Demo checklist có đủ câu hỏi search/aggregation, role demo, fallback LLM và rollback.
21. README/docs có sơ đồ kiến trúc tổng quan bằng Mermaid renderable; PNG/SVG chỉ là phụ nếu có sẵn tooling.
22. `docs/demo-script.md` tồn tại và có kịch bản demo 5 phút gồm analyst search, aggregation, export, viewer restriction và admin audit.

Sau đó:
1. Sửa lỗi nhỏ nếu phát hiện.
2. Báo checklist PASS/FAIL.
3. Liệt kê việc còn cần làm ở Day 13 nhưng không triển khai chúng.
```
