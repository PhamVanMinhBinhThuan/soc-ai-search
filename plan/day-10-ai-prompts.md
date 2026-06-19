# Prompt triển khai Ngày 10 - SOC AI Search MVP

## 1. Review kế hoạch Day 10

Day 10 là ngày ổn định MVP sau khi đã có auth/RBAC. Trọng tâm là test suite, coverage, regression và CI cơ bản.

Phạm vi đúng của Day 10:

- Không thêm tính năng nghiệp vụ mới.
- Không triển khai deploy VPS trong ngày 10.
- Không gọi Gemini thật trong test tự động hoặc CI.
- Dùng `LLM_PROVIDER=mock` cho test/CI để không tốn tiền, không cần API key và không phụ thuộc mạng.
- Ưu tiên test các luồng có rủi ro cao: SearchPlan, compiler, executor, natural language orchestration, aggregation, summary fallback, audit/history, CSV export và RBAC.

Day 10 được chia thành 3 prompt:

1. Backend regression, JaCoCo coverage và coverage gate.
2. Frontend regression cho auth/RBAC, search result UI và export/history UX.
3. CI/smoke regression, README và review cuối ngày.

Chỉ chuyển sang prompt tiếp theo khi prompt trước đã chạy verify thành công.

---

## Prompt 1 - Backend Regression, Coverage Và Coverage Gate

```text
Tiếp tục triển khai ngày 10 cho SOC AI Search MVP.

Hãy bổ sung backend regression test và coverage gate cho MVP sau khi đã có auth/RBAC.

Đọc trước:
- docs/requirement.md
- docs/architecture.md
- docs/sequence-flow.md
- plan/14-day-mvp-plan.md
- plan/day-07-ai-prompts.md
- plan/day-08-ai-prompts.md
- plan/day-09-ai-prompts.md
- backend/pom.xml
- backend/src/main/java/com/soc/ai/search
- backend/src/test/java/com/soc/ai/search

Yêu cầu:
1. Kiểm tra trạng thái repository trước khi sửa. Không ghi đè thay đổi hiện có.
2. Không triển khai feature mới. Ngày 10 chỉ ổn định test/coverage/regression.
3. Cấu hình JaCoCo cho backend Maven:
   - tạo coverage report khi chạy test;
   - đặt coverage gate tối thiểu 50%;
   - hướng tới 60% nếu dễ đạt bằng test có giá trị;
   - exclude hợp lý các class DTO, Entity, Configuration, bootstrap/generated code và code do Lombok sinh ra nếu có;
   - nếu dự án có Lombok thì có thể dùng `lombok.config` với `lombok.addLombokGeneratedAnnotation = true`; không thêm Lombok chỉ để phục vụ coverage;
   - test phải tập trung vào business logic như compiler, validator, executor, service, orchestration, mapper quan trọng;
   - không viết test vô bổ cho getter/setter hoặc constructor của DTO/entity chỉ để tăng coverage ảo;
   - chỉ exclude code khi có lý do rõ ràng, không exclude service/logic chỉ để né coverage;
   - không hạ coverage gate để né test.
4. Test phải chạy bằng mock/stub, không gọi Gemini thật:
   - đảm bảo test/CI dùng `LLM_PROVIDER=mock`;
   - không yêu cầu `LLM_API_KEY`;
   - không phụ thuộc mạng ngoài.
5. Bổ sung hoặc hoàn thiện backend test cho các vùng rủi ro:
   - SearchPlan DTO/Jackson contract;
   - SearchPlanValidator search và aggregation;
   - SearchPlanCompiler search DSL;
   - aggregation compiler DSL: COUNT, GROUP_BY, TOP_N, DATE_HISTOGRAM;
   - search executor response mapping;
   - natural language orchestration với mock LLM;
   - repair/retry output invalid tối đa một lần;
   - summary payload builder;
   - summary fallback khi LLM timeout/invalid/error;
   - audit persistence/history paging;
   - CSV export limit 10.000 dòng, source filtering, filename safe;
   - RBAC endpoint guard: viewer/analyst/admin;
   - event detail raw redaction cho viewer.
6. Không thêm Testcontainers nếu chưa cần. Nếu test cần Elasticsearch/PostgreSQL thật thì ưu tiên smoke script local thay vì mở rộng unit test quá nặng.
7. Test error handling:
   - 400 validation;
   - 401 unauthenticated;
   - 403 insufficient role;
   - 404 event/query not found;
   - 503 dependency unavailable;
   - không lộ stack trace/token/secret.
8. Nếu phát hiện test hiện tại đang phụ thuộc thứ tự chạy, thời gian hệ thống hoặc dataset lớn, sửa để deterministic.
9. Cập nhật README ngắn gọn nếu thêm lệnh coverage mới.
10. Chạy verify:
    - `cd backend`
    - `.\mvnw.cmd test`
    - lệnh coverage/check JaCoCo tương ứng, ví dụ `.\mvnw.cmd verify`
11. Báo:
    - file đã tạo/sửa;
    - coverage đạt bao nhiêu;
    - test nào bổ sung;
    - lệnh verify và kết quả.

Không triển khai deploy VPS, frontend UI mới, Keycloak Admin API, summary feature mới hoặc LLM provider mới trong prompt này.
```

### Checkpoint Prompt 1

```powershell
cd backend
.\mvnw.cmd test
.\mvnw.cmd verify
cd ..
```

---

## Prompt 2 - Frontend Regression Cho Auth/RBAC Và Search UI

```text
Tiếp tục triển khai ngày 10 cho SOC AI Search MVP.

Hãy bổ sung frontend regression test cho UI sau Day 6-9, tập trung vào auth/RBAC, search/aggregation result và các trạng thái lỗi.

Đọc trước:
- frontend/package.json
- frontend/vite.config.ts
- frontend/src/auth
- frontend/src/services
- frontend/src/components/soc
- frontend/src/App.tsx
- plan/day-08-ai-prompts.md
- plan/day-09-ai-prompts.md

Yêu cầu:
1. Kiểm tra trạng thái repository trước khi sửa.
2. Không đổi layout lớn và không thêm feature mới. Chỉ bổ sung test hoặc sửa bug nhỏ phát hiện qua test.
3. Frontend test phải dùng mock API/fetch, không cần backend đang chạy.
4. Bổ sung test cho auth/RBAC:
   - auth disabled render demo analyst behavior;
   - auth enabled chưa login hiển thị Sign in with Keycloak;
   - sau login, UI lấy role từ backend `/api/v1/auth/me` nếu đã có logic này;
   - viewer không thấy/export được CSV;
   - viewer không thấy History Sheet;
   - viewer event detail raw locked khi `raw = null` hoặc `raw_visible = false`;
   - analyst thấy export/raw/history;
   - admin thấy Admin Console/Audit entry;
   - auth loading không render action nhạy cảm gây flicker.
5. Bổ sung test cho API error UX:
   - 401 hiển thị session expired/login again;
   - 403 hiển thị không đủ quyền;
   - backend unavailable hiển thị alert rõ và không crash;
   - không retry vô hạn.
6. Bổ sung test cho result polymorphism:
   - mode `search` active Raw Events tab;
   - mode `aggregation` active Analytics View tab;
   - `generated_dsl` và `search_plan` render dạng object, không phải string escaped;
   - empty result render empty state;
   - loading render skeleton/spinner.
7. Bổ sung test cho CSV/export/history UX:
   - export disabled khi search loading;
   - export disabled khi thiếu `query_id`;
   - export 403 hiển thị alert;
   - History chỉ fetch khi sheet mở và role đủ quyền;
   - click history item run lại query.
8. Sử dụng stack test frontend hiện có và phù hợp với Vite:
   - ưu tiên Vitest + React Testing Library + jsdom;
   - nếu thư viện đã có trong `package.json` thì tái sử dụng, không cài thêm Jest;
   - không cài Jest vì dễ nặng và xung đột cấu hình Vite;
   - không kéo E2E framework mới như Playwright/Cypress trong ngày 10 trừ khi thật sự cần;
   - nếu cần thêm helper test, giữ nhỏ gọn và đặt trong `src` hoặc test utility rõ ràng.
9. Cập nhật script npm nếu hữu ích:
   - `test`;
   - `lint`;
   - `build`;
   - có thể thêm `test:coverage` nếu dùng Vitest coverage và không làm pipeline phức tạp.
10. Chạy verify:
    - `cd frontend`
    - `npm test`
    - `npm run lint`
    - `npm run build`
11. Báo file đã tạo/sửa và kết quả verify.

Không triển khai deploy, backend RBAC mới, Keycloak Admin API, hoặc gọi API thật trong frontend test.
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

## Prompt 3 - CI, Smoke Regression, README Và Review Cuối Ngày 10

```text
Tiếp tục triển khai ngày 10 cho SOC AI Search MVP.

Hãy hoàn thiện CI/test workflow cơ bản, smoke regression runner và README test guide cho ngày 10.

Đọc trước:
- README.md
- docker-compose.yml
- backend/pom.xml
- frontend/package.json
- scripts/smoke-test-day-02.ps1
- scripts/smoke-test-day-03.ps1
- scripts/smoke-test-day-04.ps1
- scripts/smoke-test-day-05.ps1
- scripts/smoke-test-day-07.ps1
- scripts/smoke-test-day-08.ps1
- scripts/smoke-test-day-09-rbac.ps1
- plan/day-10-ai-prompts.md

Yêu cầu:
1. Kiểm tra trạng thái repository trước khi sửa.
2. Tạo hoặc cập nhật GitHub Actions CI cơ bản trong `.github/workflows/`, ví dụ `ci.yml`.
3. CI phải chạy tối thiểu:
   - backend test/coverage check;
   - frontend `npm ci`;
   - frontend `npm test`;
   - frontend `npm run lint`;
   - frontend `npm run build`;
   - `docker compose config --quiet`.
4. CI dùng mock LLM:
   - set `LLM_PROVIDER=mock`;
   - không cần `LLM_API_KEY`;
   - không gọi Gemini thật;
   - không log secret.
5. CI không bắt buộc chạy Elasticsearch/PostgreSQL/Keycloak full stack nếu quá nặng. Trước khi viết CI phải kiểm tra backend test hiện tại có cần PostgreSQL/Elasticsearch thật không. Nếu có, chọn một trong hai hướng rõ ràng:
   - hướng 1: cấu hình test profile dùng in-memory DB phù hợp và mock/disable dependency check Elasticsearch trong test;
   - hướng 2: trong `ci.yml`, thêm bước `docker compose up -d postgres elasticsearch` hoặc service container tương đương, đợi healthcheck ready rồi mới chạy backend test;
   - không để CI fail vì thiếu database/search engine;
   - không bắt Keycloak thật trong CI trừ khi có test thật sự cần;
   - nếu chạy Docker service trong CI thì phải giữ scope nhẹ và timeout hợp lý.
6. Tạo smoke regression runner PowerShell nếu hữu ích, ví dụ `scripts/smoke-test-day-10-regression.ps1`:
   - nhận `BackendUrl`, `FrontendUrl`, `ElasticsearchUrl`, `Index`;
   - giả định local Docker Compose đang chạy;
   - gọi các smoke test chính theo thứ tự hợp lý:
     - day 02 dataset pattern;
     - day 03 search/detail;
     - day 04 natural language search;
     - day 05 aggregation;
     - day 07 summary/history/export;
     - day 08 auth foundation;
     - day 09 RBAC smoke không token;
   - nếu một smoke script yêu cầu dữ liệu/stack chưa sẵn sàng, fail rõ hoặc skip có lý do rõ;
   - không tự bịa token hoặc credential.
7. Cập nhật README.md:
   - lệnh chạy backend test và coverage;
   - lệnh chạy frontend test/lint/build;
   - lệnh chạy docker compose config;
   - lệnh chạy smoke regression ngày 10;
   - ghi rõ CI dùng mock LLM;
   - ghi rõ token-based RBAC smoke chạy manual/local nếu có token thật.
8. Review cuối ngày 10:
   - backend test pass;
   - backend coverage >= 50%;
   - frontend test/lint/build pass;
   - docker compose config hợp lệ;
   - smoke regression local pass hoặc ghi rõ phần skip;
   - không có API key thật, token thật hoặc dataset lớn trong Git-tracked files;
   - không triển khai deploy trong ngày 10.
9. Chạy verify phù hợp và báo checklist PASS/FAIL.

Không triển khai deploy VPS, Caddy HTTPS, GitHub CD qua SSH, report/slide hoặc feature mới trong prompt này. Deploy để ngày 11.
```

### Checkpoint Prompt 3

```powershell
cd backend
.\mvnw.cmd verify
cd ..

cd frontend
npm test
npm run lint
npm run build
cd ..

docker compose config --quiet
.\scripts\smoke-test-day-10-regression.ps1
```

---

## Prompt Review Cuối Ngày 10

```text
Hãy review và verify toàn bộ kết quả triển khai ngày 10 cho SOC AI Search MVP.

Đọc lại:
- docs/requirement.md
- docs/architecture.md
- docs/sequence-flow.md
- plan/14-day-mvp-plan.md
- plan/day-10-ai-prompts.md
- README.md

Kiểm tra:
1. Backend test pass.
2. Backend coverage report được tạo.
3. Backend coverage gate tối thiểu 50% pass.
4. Test validator search/aggregation có coverage.
5. Test compiler search/aggregation có coverage.
6. Test natural language orchestration dùng mock LLM, không gọi Gemini thật.
7. Test summary best-effort/fallback có coverage.
8. Test audit/history có coverage.
9. Test CSV export limit và source filtering có coverage.
10. Test RBAC viewer/analyst/admin có coverage.
11. Frontend test pass.
12. Frontend lint/build pass.
13. Frontend regression cover auth/RBAC, 401/403, raw lock, export/history.
14. CI workflow tồn tại và dùng mock LLM.
15. `docker compose config --quiet` pass.
16. Smoke regression local pass hoặc skip có lý do rõ.
17. Không có secret thật/API key/token thật trong Git-tracked files.
18. Không có generated dataset lớn trong Git-tracked files.
19. Không triển khai deploy VPS trong ngày 10.

Sau đó:
1. Sửa lỗi nhỏ nếu phát hiện.
2. Cập nhật README nếu thiếu lệnh test/coverage/CI.
3. Báo checklist PASS/FAIL.
4. Liệt kê việc còn cần làm ở ngày 11 nhưng không triển khai chúng.
```

