# Q18 Explain 1 - CI, Coverage, Docker Compose Config

File này dùng để ôn phần CI trong GitHub Actions: backend coverage, frontend test/lint/build và kiểm tra Docker Compose config trước khi deploy.

## 1. `ci.yml` đang kiểm tra những gì?

File chính:

- `.github/workflows/ci.yml`

CI chạy khi:

- push lên `main` hoặc `master`;
- tạo pull request.

CI có 3 job chính:

| Job | Lệnh chính | Mục đích |
| --- | --- | --- |
| Backend tests and coverage | `./mvnw verify` | Chạy test backend và JaCoCo coverage gate |
| Frontend tests, lint and build | `npm ci`, `npm test`, `npm run lint`, `npm run build` | Kiểm tra frontend test, coding style và build Vite |
| Docker Compose config | `docker compose config --quiet` | Kiểm tra file Compose có hợp lệ không |

Câu trả lời ngắn:

> CI là quality gate tự động. Nếu backend test fail, frontend build fail hoặc Docker Compose config sai thì workflow fail, code không nên được deploy lên VPS.

## 2. Coverage trong CI lấy ở đâu? Bao nhiêu thì pass?

Coverage backend trong CI được lấy từ **JaCoCo Maven Plugin** cấu hình trong:

- `backend/pom.xml`

Trong CI, backend job chạy:

```bash
cd backend
./mvnw verify
```

Khi chạy `verify`, JaCoCo thực hiện:

1. gắn coverage agent vào quá trình chạy test;
2. tạo report;
3. chạy coverage gate ở phase `verify`.

Report coverage nằm ở:

```text
backend/target/site/jacoco/index.html
```

Ngưỡng pass hiện tại:

```xml
<counter>INSTRUCTION</counter>
<value>COVEREDRATIO</value>
<minimum>0.50</minimum>
```

Nghĩa là backend phải đạt tối thiểu **50% instruction coverage** thì job backend mới pass.

Nếu coverage dưới `0.50`, Maven `verify` fail và CI fail.

## 3. Vì sao coverage exclude nhiều class?

Trong `backend/pom.xml`, JaCoCo exclude nhiều class ít giá trị test như:

- `*Config*`
- `*Properties*`
- `*Request*`
- `*Response*`
- `*Exception*`
- DTO/entity/result payload;
- một số class model đơn giản.

Mục đích:

- không viết test vô nghĩa cho getter/setter/DTO;
- coverage tập trung vào business logic;
- tránh “coverage ảo”.

Các phần nên được test nhiều hơn:

- parser;
- validator;
- compiler;
- executor;
- audit/history;
- RBAC;
- CSV export;
- service logic.

Câu trả lời ngắn:

> Em exclude DTO/config/entity để coverage phản ánh logic thật, không tăng số bằng test getter/setter. Coverage gate 50% áp dụng cho phần code còn lại sau exclude.

## 4. `docker compose config --quiet` quét những file nào?

Trong CI hiện tại, lệnh là:

```bash
docker compose config --quiet
```

Vì không truyền `-f`, Docker Compose mặc định đọc file compose chuẩn trong thư mục hiện tại:

```text
docker-compose.yml
```

Nó **không tự đọc** `docker-compose.deploy.yml`.

Muốn kiểm tra production compose đầy đủ thì phải chạy:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy config --quiet
```

Trong project hiện tại:

- CI kiểm tra base compose: `docker-compose.yml`.
- CD kiểm tra production compose: `docker-compose.yml` + `docker-compose.deploy.yml` với profile `auth` và `proxy`.

## 5. `docker compose config --quiet` kiểm tra gì?

Lệnh này không chạy container. Nó chỉ validate cấu hình Compose.

Nó kiểm tra:

- YAML có đúng cú pháp không;
- indentation có lỗi không;
- service/volume/network khai báo hợp lệ không;
- biến môi trường bắt buộc có thiếu không;
- cấu hình sau khi merge/expand có hợp lệ không.

Nếu config hợp lệ, lệnh không in gì và exit code `0`.

Nếu config sai, nó in lỗi và exit code khác `0`, làm CI/CD fail.

Câu trả lời ngắn:

> `docker compose config --quiet` giống bước compile cấu hình hạ tầng. Nó không chạy container, chỉ kiểm tra Compose file có parse và resolve được không.

## 6. Vì sao CI dùng mock LLM và tắt auth?

Trong `.github/workflows/ci.yml` có:

```yaml
env:
  LLM_PROVIDER: mock
  LLM_API_KEY: ""
  APP_AUTH_ENABLED: "false"
```

Ý nghĩa:

- `LLM_PROVIDER=mock`: test không gọi Gemini thật, không tốn tiền, không phụ thuộc mạng/quota.
- `LLM_API_KEY=""`: CI không cần API key thật.
- `APP_AUTH_ENABLED=false`: backend test có thể chạy không cần Keycloak thật.

Câu trả lời ngắn:

> CI ưu tiên test logic ổn định. Vì vậy em dùng mock LLM và tắt auth để test không phụ thuộc dịch vụ ngoài như Gemini hoặc Keycloak.

## 7. `npm test` khác `npm run lint` thế nào?

| Lệnh | Kiểm tra gì? | Có chạy code không? |
| --- | --- | --- |
| `npm test` | Logic/component behavior bằng Vitest/React Testing Library | Có |
| `npm run lint` | Coding style, rule TypeScript/ESLint, unused variables... | Không chạy app thật |

Nói dễ hiểu:

- `npm test` kiểm tra code **đúng hành vi** không.
- `npm run lint` kiểm tra code **sạch và đúng chuẩn** không.

## 8. Câu trả lời mẫu khi hội đồng hỏi CI/CD

> CI của em gồm ba lớp: backend verify với JaCoCo coverage gate, frontend test/lint/build, và Docker Compose config validation. Backend coverage lấy từ JaCoCo trong `backend/pom.xml`, ngưỡng pass hiện tại là 50% instruction coverage sau khi exclude DTO/config/entity. `docker compose config --quiet` trong CI kiểm tra base `docker-compose.yml`; còn CD kiểm tra production compose bằng cả `docker-compose.yml` và `docker-compose.deploy.yml` với profile `auth`, `proxy`. Mục tiêu là phát hiện lỗi trước khi deploy thật lên VPS.

