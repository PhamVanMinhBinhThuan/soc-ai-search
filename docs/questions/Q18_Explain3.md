# Q18 Explain 3 - Docker Compose và Dockerfile

File này giải thích vì sao project có cả `docker-compose.yml`, `docker-compose.deploy.yml`, `backend/Dockerfile` và `frontend/Dockerfile`.

## 1. Dockerfile và Docker Compose khác nhau thế nào?

| Thành phần | Dùng để làm gì? |
| --- | --- |
| `Dockerfile` | Mô tả cách build **một image** cho một ứng dụng/service |
| `docker-compose.yml` | Mô tả cách chạy **nhiều container** cùng nhau |

Nói dễ hiểu:

- `backend/Dockerfile` tạo image backend.
- `frontend/Dockerfile` tạo image frontend.
- `docker-compose.yml` lấy các image đó và chạy cùng PostgreSQL, Elasticsearch, Keycloak...

Câu trả lời ngắn:

> Dockerfile trả lời câu hỏi “build một app thành image như thế nào?”. Docker Compose trả lời câu hỏi “chạy toàn bộ hệ thống nhiều container như thế nào?”.

## 2. Vì sao cần cả `docker-compose.yml` và `docker-compose.deploy.yml`?

Project tách 2 file để phân biệt:

- cấu hình base/local;
- cấu hình production deploy public.

### `docker-compose.yml`

Đây là file compose chính, dùng cho cả local và làm nền cho deploy.

Nó định nghĩa các service cốt lõi:

| Service | Vai trò |
| --- | --- |
| `postgres` | Lưu audit/history/pin/query log |
| `elasticsearch` | Lưu và search SOC events |
| `backend` | Spring Boot API |
| `frontend` | React build được serve bằng Nginx |
| `keycloak` | Auth/RBAC, bật qua profile `auth` |
| `kibana` | Tool phụ để debug Elasticsearch, bật qua profile `tools` |

Nó cũng định nghĩa:

- environment variables;
- healthcheck;
- volumes;
- depends_on;
- port binding localhost.

Ví dụ các port trong base compose bind về localhost:

```yaml
127.0.0.1:${BACKEND_PORT:-8081}:8080
127.0.0.1:${FRONTEND_PORT:-3000}:80
127.0.0.1:${ELASTICSEARCH_PORT:-9200}:9200
```

Ý nghĩa:

- service chạy được trên VPS/local;
- nhưng không public trực tiếp ra Internet;
- Caddy mới là lớp public.

### `docker-compose.deploy.yml`

Đây là file override cho production deploy.

Nó thêm:

- service `caddy`;
- profile `proxy`;
- public ports `80:80` và `443:443`;
- production hostname cho Keycloak;
- proxy headers để Keycloak hiểu request đi qua Caddy/HTTPS.

Ví dụ:

```yaml
caddy:
  image: caddy:2-alpine
  profiles:
    - proxy
  ports:
    - "80:80"
    - "443:443"
```

Và override Keycloak:

```yaml
keycloak:
  command:
    - start-dev
    - --import-realm
    - --http-enabled=true
    - --hostname=${AUTH_DOMAIN}
    - --proxy-headers=xforwarded
```

Ý nghĩa:

- local không bắt buộc chạy Caddy;
- production mới bật Caddy và domain thật;
- không làm `docker-compose.yml` bị phình to bởi cấu hình deploy public.

Câu trả lời ngắn:

> `docker-compose.yml` là cấu hình nền để chạy toàn bộ stack. `docker-compose.deploy.yml` là phần production override, thêm Caddy HTTPS và cấu hình Keycloak chạy sau reverse proxy. Tách hai file giúp local đơn giản, production vẫn đầy đủ domain/HTTPS.

## 3. Khi dùng cả 2 file compose, Docker merge như thế nào?

Lệnh production:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy up -d --build
```

Docker Compose đọc file theo thứ tự:

1. `docker-compose.yml`
2. `docker-compose.deploy.yml`

File sau có thể:

- thêm service mới;
- override service đã có;
- thêm environment/command/volumes;
- thêm volumes mới.

Trong project này:

- `docker-compose.yml` đã có service `keycloak`.
- `docker-compose.deploy.yml` override thêm command/environment production cho `keycloak`.
- `docker-compose.deploy.yml` thêm service mới là `caddy`.

## 4. Profile `auth`, `proxy`, `tools` là gì?

Docker Compose profile cho phép chỉ bật một số service khi cần.

| Profile | Service | Khi nào dùng |
| --- | --- | --- |
| `auth` | `keycloak` | Khi cần login/RBAC thật |
| `proxy` | `caddy` | Khi deploy public domain HTTPS |
| `tools` | `kibana` | Khi cần debug Elasticsearch |

Ví dụ:

```bash
docker compose --profile auth up -d
```

chạy Keycloak.

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy up -d --build
```

chạy production gồm Keycloak + Caddy.

## 5. Backend Dockerfile làm gì?

File:

- `backend/Dockerfile`

Nó là multi-stage build gồm 2 stage.

### Stage 1 - Build bằng Maven

```dockerfile
FROM maven:3.9.11-eclipse-temurin-21-alpine AS build

WORKDIR /workspace

COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline

COPY src src
RUN mvn -q -DskipTests package
```

Ý nghĩa:

- dùng image Maven + Java 21 để build Spring Boot;
- copy `pom.xml` trước để cache dependencies;
- tải dependency offline;
- copy source code;
- package thành file `.jar`;
- skip test trong Docker build vì test đã chạy ở CI.

### Stage 2 - Runtime bằng JRE

```dockerfile
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY --from=build /workspace/target/soc-ai-search-backend-*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

Ý nghĩa:

- runtime image chỉ cần JRE, không cần Maven/source code;
- image nhỏ hơn và sạch hơn;
- chạy app bằng `java -jar /app/app.jar`;
- container expose port `8080`.

Câu trả lời ngắn:

> Backend Dockerfile dùng multi-stage build: stage Maven build ra Spring Boot jar, stage runtime dùng Java 21 JRE Alpine để chạy jar. Cách này làm image gọn hơn vì runtime không chứa Maven và source code.

## 6. Frontend Dockerfile làm gì?

File:

- `frontend/Dockerfile`

Nó cũng là multi-stage build gồm 2 stage.

### Stage 1 - Build React/Vite bằng Node

```dockerfile
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
```

Ý nghĩa:

- dùng Node để cài dependency;
- `npm ci` cài đúng version theo `package-lock.json`;
- build React/Vite ra thư mục `dist`;
- env `VITE_*` được nhúng vào lúc build.

### Stage 2 - Serve static file bằng Nginx

```dockerfile
FROM nginx:1.28-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
```

Ý nghĩa:

- runtime không cần Node;
- Nginx serve file tĩnh HTML/CSS/JS;
- copy `dist` vào thư mục web root của Nginx;
- container expose port `80`.

Câu trả lời ngắn:

> Frontend Dockerfile dùng Node để build React/Vite thành static files, sau đó dùng Nginx Alpine để serve static files. Runtime frontend không chạy Node, chỉ serve HTML/CSS/JS bằng Nginx.

## 7. Vì sao frontend env cần rebuild?

Vite đọc biến `VITE_*` ở build time.

Ví dụ:

```env
VITE_API_BASE_URL=https://api.soc-ai-search.app
VITE_KEYCLOAK_AUTHORITY=https://auth.soc-ai-search.app/realms/soc-ai-search
```

Các giá trị này được nhúng vào bundle JavaScript khi chạy:

```bash
npm run build
```

Vì vậy nếu đổi `frontend/.env` trên VPS thì phải rebuild frontend image:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy up -d --build frontend
```

hoặc rebuild toàn stack production.

## 8. Vì sao không cần Docker Hub?

Hiện tại CD build image trực tiếp trên VPS:

```text
GitHub Actions
  -> SSH vào VPS
  -> git fetch/reset code
  -> docker compose up -d --build
  -> build image local trên VPS
  -> chạy container local
```

Vì vậy không cần Docker Hub/GHCR.

Docker Hub chỉ cần nếu sau này muốn flow:

```text
CI build image
  -> push image lên registry
  -> VPS pull image về chạy
```

Câu trả lời ngắn:

> Với MVP một VPS, build image trực tiếp trên VPS là đủ đơn giản và dễ debug. Docker Hub/GHCR có thể thêm sau nếu muốn production chuyên nghiệp hơn.

## 9. Vì sao database bind `127.0.0.1`?

Trong compose base:

```yaml
postgres:
  ports:
    - "127.0.0.1:${POSTGRES_PORT:-5433}:5432"

elasticsearch:
  ports:
    - "127.0.0.1:${ELASTICSEARCH_PORT:-9200}:9200"
```

Ý nghĩa:

- chỉ cho máy VPS/local truy cập qua localhost;
- không public database trực tiếp ra Internet;
- backend trong Docker network vẫn gọi bằng service name `postgres`, `elasticsearch`.

Câu trả lời ngắn:

> PostgreSQL và Elasticsearch không public trực tiếp. Chúng chỉ bind localhost hoặc chạy trong Docker network. User bên ngoài phải đi qua Caddy và backend API.

## 10. Healthcheck trong Compose để làm gì?

Ví dụ backend:

```yaml
healthcheck:
  test:
    [
      "CMD-SHELL",
      "wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/api/v1/health/live || exit 1",
    ]
```

Ý nghĩa:

- Compose biết service đã sẵn sàng chưa;
- `depends_on.condition: service_healthy` giúp backend chờ PostgreSQL/Elasticsearch healthy;
- frontend chờ backend healthy;
- Caddy chờ frontend/backend healthy khi chạy deploy profile.

## 11. Câu trả lời mẫu khi hội đồng hỏi Docker

> Project có hai Dockerfile để build backend và frontend image. Backend Dockerfile build Spring Boot jar bằng Maven rồi chạy bằng Java 21 JRE. Frontend Dockerfile build React/Vite bằng Node rồi serve static files bằng Nginx. `docker-compose.yml` định nghĩa toàn bộ stack nền như PostgreSQL, Elasticsearch, backend, frontend, Keycloak. `docker-compose.deploy.yml` là production override, thêm Caddy HTTPS và cấu hình Keycloak sau reverse proxy. Khi deploy, CD chạy cả hai compose file với profile `auth` và `proxy` để bật Keycloak và Caddy public domain.

