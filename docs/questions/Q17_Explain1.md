# Q17 Explain 1 - Deployment, Caddy, DNS và Keycloak Client

File này giải thích thêm các khái niệm hay bị hỏi khi bảo vệ phần deployment của SOC AI Search.

## 1. Reverse proxy là gì? Vì sao Caddy đứng ngoài còn Nginx nằm trong frontend container?

**Reverse proxy** là lớp đứng trước hệ thống server. Người dùng từ Internet không gọi trực tiếp backend, frontend container hay Keycloak. Họ chỉ gọi vào domain public qua HTTPS, sau đó reverse proxy chuyển tiếp request vào đúng service nội bộ.

Trong project này:

- **Caddy** là reverse proxy ngoài Internet.
- **Nginx** chỉ nằm bên trong container frontend để serve file React build tĩnh.

Luồng đơn giản:

```text
Browser
  |
  v
Caddy public 80/443
  |
  |-- soc-ai-search.app      -> frontend:80
  |-- api.soc-ai-search.app  -> backend:8080
  |-- auth.soc-ai-search.app -> keycloak:8080
```

Cách nói khi bảo vệ:

> Caddy là cửa public của hệ thống, phụ trách HTTPS và điều hướng domain. Nginx trong frontend chỉ serve static file React, không phải reverse proxy host-level.

Code liên quan:

- `Caddyfile`
- `docker-compose.deploy.yml`
- `docker-compose.yml`

## 2. Reverse proxy khác forward proxy như thế nào?

| Loại proxy | Đại diện cho ai? | Ví dụ dễ hiểu |
| --- | --- | --- |
| Forward proxy | Client/người dùng | VPN, proxy để client đi ra Internet |
| Reverse proxy | Server/hệ thống | Caddy/Nginx đứng trước backend/frontend |

**Forward proxy** che giấu client.  
**Reverse proxy** che giấu hệ thống server bên trong.

Trong đồ án này, Caddy là **reverse proxy**, vì nó bảo vệ và điều hướng request vào các service nội bộ.

## 3. Caddy khác Nginx + Certbot ở điểm nào?

Nginx thường cần cấu hình thêm Certbot để xin và gia hạn HTTPS certificate.

Caddy có HTTPS tự động:

- tự xin certificate từ Let's Encrypt;
- tự renew certificate;
- cấu hình reverse proxy ngắn;
- phù hợp MVP vì ít bước vận hành.

Câu trả lời ngắn:

> Em dùng Caddy vì MVP cần deploy nhanh, ổn định, có HTTPS tự động. Nếu dùng Nginx thì phải cấu hình thêm Certbot và renew certificate thủ công hơn.

## 4. HTTP khác HTTPS thế nào? Vì sao SOC AI Search cần HTTPS?

**HTTP** truyền dữ liệu dạng không mã hóa. Token, cookie, password hoặc request có thể bị đọc nếu bị nghe lén.

**HTTPS** dùng TLS để mã hóa dữ liệu giữa browser và server.

SOC AI Search cần HTTPS vì:

- bảo vệ access token của Keycloak;
- tránh nghe lén request/response;
- tránh bị sửa file JavaScript trên đường truyền;
- OAuth2/OIDC production gần như luôn yêu cầu HTTPS;
- domain `.app` có HSTS preload nên browser bắt buộc dùng HTTPS.

## 5. SSL certificate và Certbot là gì?

**SSL/TLS certificate** giống giấy chứng nhận danh tính của website. Nó giúp browser biết domain đang truy cập là domain thật và có thể mã hóa kết nối.

**Certbot** là công cụ thường dùng với Nginx/Apache để xin certificate từ Let's Encrypt.

Trong project này **không dùng Certbot**, vì Caddy đã tích hợp sẵn việc xin và renew certificate.

## 6. Ý nghĩa sơ đồ request production

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

Ý nghĩa bảo mật:

- User chỉ truy cập qua HTTPS.
- Caddy là lớp public duy nhất mở cổng `80/443`.
- Backend, PostgreSQL, Elasticsearch, Keycloak nằm trong Docker network.
- PostgreSQL và Elasticsearch không public trực tiếp ra Internet.
- Backend là lớp kiểm soát authentication, RBAC, validation và audit trước khi truy cập dữ liệu.

## 7. Vì sao cần 3 A record trên Name.com?

Trên Name.com, cả 3 domain đều trỏ về cùng IP VPS:

```text
soc-ai-search.app       A  <VPS_IP>
api.soc-ai-search.app   A  <VPS_IP>
auth.soc-ai-search.app  A  <VPS_IP>
```

Lý do: cùng một VPS nhưng có 3 trách nhiệm khác nhau.

| Domain | Mục đích |
| --- | --- |
| `soc-ai-search.app` | Frontend React |
| `api.soc-ai-search.app` | Backend API |
| `auth.soc-ai-search.app` | Keycloak authentication |

Name.com chỉ làm nhiệm vụ DNS: chuyển domain thành IP. Sau khi request đến VPS, Caddy nhìn hostname để route vào đúng container.

## 8. Biến `.env` domain dùng để làm gì?

Trong production `.env` có các biến:

```env
APP_DOMAIN=soc-ai-search.app
API_DOMAIN=api.soc-ai-search.app
AUTH_DOMAIN=auth.soc-ai-search.app
```

Các biến này được Docker Compose truyền vào Caddy:

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

Nếu thiếu `AUTH_DOMAIN`, `API_DOMAIN` hoặc `APP_DOMAIN`, compose sẽ fail vì Caddy không biết domain nào để proxy.

## 9. Keycloak client `soc-ai-search-frontend` dùng để làm gì?

`soc-ai-search-frontend` là **OIDC client đại diện cho ứng dụng React SPA** trong Keycloak.

Nói dễ hiểu:

- Realm `soc-ai-search` là khu vực quản lý auth của toàn hệ thống.
- Client `soc-ai-search-frontend` là “ứng dụng frontend” đã được đăng ký trong realm đó.
- Khi user bấm login, React redirect sang Keycloak với `client_id=soc-ai-search-frontend`.
- Keycloak kiểm tra client này có hợp lệ không, redirect URI có được phép không.
- Nếu login thành công, Keycloak trả user về frontend kèm authorization code.
- Frontend dùng OIDC flow để lấy access token.
- Khi gọi backend API, frontend gửi token trong header `Authorization: Bearer <token>`.
- Backend verify token bằng issuer/JWKS của Keycloak rồi map role `SOC_VIEWER`, `SOC_ANALYST`, `SOC_ADMIN`.

Trong `infra/keycloak/realm-export/soc-ai-search-realm.json`, client này có các điểm quan trọng:

- `clientId`: `soc-ai-search-frontend`
- `publicClient: true`: phù hợp React SPA, không giữ client secret trong browser.
- `standardFlowEnabled: true`: dùng Authorization Code Flow.
- `pkce.code.challenge.method: S256`: bật PKCE để SPA login an toàn hơn.
- `redirectUris`: danh sách URL frontend được phép nhận callback sau login.
- `webOrigins`: danh sách origin frontend được phép dùng CORS/OIDC.
- `post.logout.redirect.uris`: danh sách URL được phép quay về sau logout.

Câu trả lời ngắn khi bảo vệ:

> `soc-ai-search-frontend` là client OIDC của React app trong Keycloak. Nó định nghĩa frontend nào được phép login, callback về URL nào, origin nào được phép, và dùng PKCE để lấy token an toàn cho SPA.

Code liên quan:

- `infra/keycloak/realm-export/soc-ai-search-realm.json`
- `frontend/src/auth/auth-config.ts`
- `frontend/src/services/api-client.ts`
- `backend/src/main/java/com/soc/ai/search/security/SecurityConfig.java`
- `backend/src/main/java/com/soc/ai/search/security/KeycloakJwtGrantedAuthoritiesConverter.java`

## 10. Realm là gì? Một realm có nhiều client không?

**Realm** trong Keycloak là một vùng quản lý authentication/authorization độc lập.

Một realm có thể hiểu như một “không gian bảo mật” riêng, chứa:

- users;
- roles;
- groups;
- clients;
- login settings;
- token settings;
- email/SMTP settings;
- redirect URI và web origin rules.

Trong project này, realm chính là:

```text
soc-ai-search
```

Đúng, **một realm có thể có nhiều client**.

Ví dụ trong một hệ thống thật:

| Client | Đại diện cho |
| --- | --- |
| `soc-ai-search-frontend` | React web app |
| `soc-ai-search-mobile` | Mobile app nếu sau này có |
| `soc-ai-search-cli` | CLI tool nếu sau này có |
| `soc-ai-search-admin` | Admin portal riêng nếu tách app |

Với MVP hiện tại, mình chỉ cần client `soc-ai-search-frontend` vì frontend React là ứng dụng chính gọi luồng đăng nhập OIDC.

Câu trả lời ngắn khi bảo vệ:

> Realm là vùng quản lý bảo mật độc lập trong Keycloak. Realm `soc-ai-search` chứa user, role và client của hệ thống. Một realm có thể có nhiều client; trong MVP này client quan trọng nhất là `soc-ai-search-frontend`, đại diện cho React SPA.

## 11. Vì sao từng bị lỗi `Invalid redirect uri`?

Keycloak chỉ cho redirect về những URL đã khai báo trong client.

Nếu frontend gửi callback/logout URL không nằm trong:

- `redirectUris`
- `post.logout.redirect.uris`
- `webOrigins`

thì Keycloak sẽ báo `Invalid redirect uri`.

Cách xử lý:

- production phải có `https://soc-ai-search.app/auth/callback`;
- logout redirect phải có `https://soc-ai-search.app`;
- local dev phải có `http://localhost:3000/*` hoặc `http://localhost:5173/*` nếu dùng Vite dev server.

## 12. Câu trả lời tổng kết phần deployment

> Hệ thống deploy trên DigitalOcean VPS. Name.com quản lý DNS và trỏ 3 domain về VPS. Caddy là reverse proxy public, tự cấp HTTPS và route request vào frontend, backend, Keycloak trong Docker network. Backend mới được truy cập PostgreSQL và Elasticsearch. Keycloak quản lý login/RBAC qua OIDC client `soc-ai-search-frontend`. Cách này đủ gọn cho MVP, dễ demo, nhưng vẫn có HTTPS, auth, RBAC và CI/CD.
