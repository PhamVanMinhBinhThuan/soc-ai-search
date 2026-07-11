# P2 - Deploy, Dataset, Testing & Q&A

P2 không nhất thiết phải nói hết trong slide. Nhưng nếu hội đồng hỏi sâu, bạn có thể dùng các ý này để trả lời chắc hơn.

## 1. Elasticsearch Mapping Và Dataset

### Bạn cần nói được

- SOC events được lưu trong Elasticsearch index `soc-events-v1`.
- Có synthetic dataset để demo.
- Field search/aggregation được allowlist.
- Aggregation dùng mapping hiện tại, không tự thêm `.keyword` bừa bãi.

### Code/tài liệu cần đọc

- `infra/elasticsearch/soc-events-v1-index.json`
- `scripts/bootstrap-elasticsearch.ps1`
- `scripts/seed-events.ps1`
- `docs/questions/Q2.md`
- `docs/search-engine-decision.md`

### Lệnh seed dữ liệu

```powershell
.\scripts\bootstrap-elasticsearch.ps1
.\scripts\seed-events.ps1 -Count 10000
```

Trên VPS Linux:

```bash
pwsh ./scripts/bootstrap-elasticsearch.ps1
pwsh ./scripts/seed-events.ps1 -Count 10000
```

---

## 2. Deployment, Domain, Caddy

### Bạn cần nói được

- Deploy bằng DigitalOcean VPS.
- DNS ở Name.com.
- Caddy làm reverse proxy HTTPS.
- Docker Compose chạy frontend/backend/postgres/elasticsearch/keycloak.
- Không dùng AWS/Nginx/Certbot trong deployment hiện tại.

### Code/tài liệu cần đọc

- `docker-compose.yml`
- `docker-compose.deploy.yml`
- `Caddyfile`
- `.github/workflows/deploy.yml`
- `docs/deployment.md`
- `docs/plan/day-11-implements.md`

### Public endpoints cần nhớ

- Frontend: `https://soc-ai-search.app`
- API: `https://api.soc-ai-search.app`
- Auth: `https://auth.soc-ai-search.app`

### Câu trả lời mẫu

> Caddy đơn giản cho MVP, tự động HTTPS, cấu hình reverse proxy gọn hơn Nginx + Certbot.

---

## 3. CI/CD Và Smoke Test

### Bạn cần nói được

- CI kiểm tra backend/frontend/test/build/docker compose config.
- CD SSH vào VPS, pull/build/restart containers.
- Smoke test domain kiểm tra public app/API/auth.

### File cần đọc

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `scripts/smoke-test-day-11-domain.ps1`
- `scripts/smoke-test-day-10-regression.ps1`
- `scripts/smoke-test-day-09-rbac.ps1`

### Câu trả lời mẫu

> CI/CD giúp phát hiện lỗi trước khi demo: test fail, build fail, Docker config sai hoặc domain public không phản hồi.

---

## 4. Testing Và Coverage

### Bạn cần nói được

- Backend có test cho parser, validator, compiler, executor, RBAC, audit, CSV.
- Frontend có test cho API client, permissions, UI flows.
- JaCoCo dùng để xem coverage backend.
- Test tập trung business logic, không chỉ getter/setter.

### File nên xem

- `backend/target/site/jacoco/index.html`
- `backend/pom.xml`
- `frontend/package.json`
- `backend/src/test/java/com/soc/ai/search/search/validation/SearchPlanValidatorTest.java`
- `backend/src/test/java/com/soc/ai/search/search/compiler/SearchPlanCompilerTest.java`
- `backend/src/test/java/com/soc/ai/search/security/RbacEndpointGuardTest.java`
- `frontend/src/auth/permissions.test.ts`
- `frontend/src/services/search-api.test.ts`

### Lệnh verify

```powershell
cd backend
.\mvnw.cmd test
cd ..

cd frontend
npm test
npm run build
cd ..
```

---

# Kế Hoạch Ôn Theo Thời Gian

## Nếu còn 3 ngày

### Ngày 1 - Core Backend + AI Guardrails

- Đọc `P0-core-flow.md`.
- Mở code `NaturalLanguageSearchService`, `SearchPlanValidator`, `SearchPlanCompiler`.
- Tự vẽ lại luồng Natural Language -> SearchPlan -> DSL.
- Trả lời thử: “Nếu AI sinh sai thì sao?”.

### Ngày 2 - UI + RBAC + Audit/Export

- Đọc `P1-security-audit-ui.md`.
- Chạy demo search/aggregation/dashboard/investigations.
- Ôn role Viewer/Analyst/Admin.
- Ôn CSV export bằng query_id.

### Ngày 3 - Deploy + Demo Rehearsal

- Đọc `P2-deploy-testing-qa.md`.
- Chạy thử demo 3 lần.
- Chuẩn bị backup screenshots/video.
- Kiểm tra tài khoản demo, Gemini/mock mode, data seed.

## Nếu chỉ còn 1 ngày

Ưu tiên theo thứ tự:

1. Core flow Natural Language -> SearchPlan -> DSL.
2. AI Guardrails.
3. Demo search + aggregation + investigations.
4. RBAC role matrix.
5. Audit/export an toàn.
6. Deploy/CI/CD nói ngắn.
7. Future work.

---

# Checklist Trước Khi Bảo Vệ

## Kỹ thuật

- [ ] App public mở được.
- [ ] Login analyst được.
- [ ] Search query demo chạy được.
- [ ] Aggregation bar chạy được.
- [ ] Aggregation line chạy được.
- [ ] Dashboard có data.
- [ ] All Investigations có history.
- [ ] Export CSV hoạt động hoặc có ảnh backup.
- [ ] Viewer không export/edit/pin.
- [ ] Admin audit logs hoạt động nếu demo RBAC.
- [ ] Có backup screenshots/video.

## Thuyết trình

- [ ] Nói được bài toán trong 30 giây.
- [ ] Nói được core idea trong 30 giây.
- [ ] Giải thích được SearchPlan.
- [ ] Giải thích được vì sao không cho LLM sinh DSL.
- [ ] Giải thích được RBAC.
- [ ] Giải thích được audit/export an toàn.
- [ ] Demo dưới 5 phút.

---

# Câu Hỏi Khó Và Câu Trả Lời Mẫu

## 1. Nếu AI sinh sai thì sao?

LLM không được chạy query trực tiếp. Output của LLM phải là SearchPlan JSON. Backend parser chỉ nhận JSON object thuần, reject markdown/prose/unknown field. Sau đó validator kiểm tra rule nghiệp vụ. Nếu sai, hệ thống repair tối đa một lần hoặc trả lỗi có kiểm soát, không sinh DSL.

## 2. Vì sao không cho LLM sinh Elasticsearch DSL trực tiếp?

DSL có thể chứa query không mong muốn hoặc field ngoài allowlist. Nếu để LLM sinh DSL trực tiếp thì bypass validator và compiler. SearchPlan là contract trung gian giúp backend kiểm soát field, mode, pagination, aggregation, RBAC và audit.

## 3. Người dùng sửa SearchPlan độc hại thì sao?

SearchPlan do user sửa vẫn đi qua cùng parser/validator/compiler. DSL không cho edit trực tiếp. Vì vậy user không thể bypass guardrail bằng cách sửa UI.

## 4. Viewer có thể làm gì?

Viewer được search và xem kết quả cơ bản theo policy hiện tại. Viewer không được edit SearchPlan, export CSV, pin/unpin investigation hoặc xem audit logs. Backend vẫn chặn bằng RBAC, không chỉ ẩn button trên frontend.

## 5. CSV export có rủi ro không?

Export không nhận DSL từ client. Client chỉ gửi query_id. Backend lấy SearchPlan đã lưu, validate/compile lại, query ES và export tối đa 10,000 rows. CsvRowWriter cũng xử lý escaping/formula injection.

## 6. Dashboard có dùng LLM không?

Không. Dashboard dùng các SearchPlan aggregation cố định để lấy KPI/chart. Điều này giúp dashboard nhanh, ổn định và không tốn thêm chi phí LLM.

## 7. Nếu Gemini bị lỗi hoặc hết quota thì sao?

Hệ thống có provider mock cho local/demo/test. Với Gemini thật, lỗi được trả có kiểm soát. Summary là best-effort nên summary lỗi không làm search result fail.

## 8. Dữ liệu demo từ đâu?

Dữ liệu demo là synthetic SOC events được seed vào Elasticsearch bằng script. PostgreSQL chủ yếu lưu metadata như audit/history/SearchPlan/DSL/summary, không lưu raw event chính.

## 9. Tại sao dùng PostgreSQL và Elasticsearch cùng lúc?

Elasticsearch phù hợp search/filter/aggregation trên log. PostgreSQL phù hợp lưu metadata có cấu trúc như audit logs, query history, pin, summary, export replay.

## 10. Vì sao dùng Caddy?

Caddy đơn giản cho MVP, tự động HTTPS, cấu hình reverse proxy gọn, phù hợp deploy nhanh trên DigitalOcean VPS.

---

# Một Trang Tóm Tắt Để Học Thuộc

SOC AI Search là hệ thống giúp SOC analyst tìm kiếm và thống kê log bảo mật bằng ngôn ngữ tự nhiên. Người dùng hỏi bằng tiếng Anh hoặc tiếng Việt. LLM chỉ sinh SearchPlan JSON, không được sinh DSL chạy trực tiếp. Backend parse, validate, enforce guardrails, compile thành Elasticsearch DSL rồi execute. Kết quả trả về gồm events/aggregation, SearchPlan, generated DSL, latency, summary và được audit vào PostgreSQL. Frontend có dashboard, event search, query transparency, editable SearchPlan, investigations, CSV export. RBAC dùng Keycloak với Viewer, Analyst, Admin. Hệ thống deploy public bằng DigitalOcean, Docker Compose, Caddy HTTPS và CI/CD GitHub Actions.
