# Tech Stack - SOC AI Search MVP

## 1. Tổng quan

SOC AI Search MVP là một modular monolith gồm frontend React và backend Spring Boot. Hệ thống dùng Elasticsearch làm event store, PostgreSQL lưu audit/history, Keycloak làm OIDC provider, Caddy làm reverse proxy HTTPS và GitHub Actions để CI/CD.

## 2. Stack chính

| Thành phần | Công nghệ | Vai trò |
| --- | --- | --- |
| Frontend | React + TypeScript + Vite | SOC investigation console |
| UI | Tailwind CSS + shadcn/ui + lucide-react | Dark theme, components, icons |
| Chart | Recharts | Aggregation visualization |
| Backend | Java 21 + Spring Boot 3 | REST API, orchestration, validation, compiler |
| Security | Spring Security Resource Server | Verify Keycloak JWT and enforce RBAC |
| Auth Provider | Keycloak | OIDC login, realm roles, user management |
| Search Engine | Elasticsearch `9.4.2` Basic | Event storage, search, aggregation |
| Database | PostgreSQL 17 + Flyway | Audit/history/export replay metadata |
| AI Provider | Mock LLM + Gemini | SearchPlan generation and summary |
| API Docs | Springdoc OpenAPI / Swagger | API testing and documentation |
| Testing | JUnit 5, Mockito, MockMvc, Vitest, React Testing Library | Backend/frontend verification |
| Packaging | Docker Compose | Local and VPS runtime |
| Reverse Proxy | Caddy | HTTPS, routing, certificates |
| Hosting | DigitalOcean Droplet | Public demo server |
| DNS | Name.com | `soc-ai-search.app` and subdomains |
| CI/CD | GitHub Actions | Verify, build and deploy via SSH |

## 3. Frontend

Frontend responsibilities:

- Natural language search input.
- Display `search_plan` and `generated_dsl` as pretty JSON.
- Render raw event table, event detail drawer and raw log.
- Render aggregation charts and summary table.
- Show summary, latency, mode, result count and history.
- Enforce UI-level RBAC visibility while backend remains source of truth.

Important notes:

- `VITE_*` variables are build-time variables. Rebuild frontend after changing them.
- `VITE_USE_MOCK=true` can be used for isolated mock UI work.
- Production `VITE_API_BASE_URL` should be `https://api.soc-ai-search.app`.
- Production `VITE_KEYCLOAK_AUTHORITY` should be `https://auth.soc-ai-search.app/realms/soc-ai-search`.

## 4. Backend

Backend responsibilities:

- REST API and Swagger.
- Event ingest and detail lookup.
- LLM prompt building and response parsing.
- SearchPlan validation/guardrail.
- SearchPlan compiler to Elasticsearch Query DSL.
- Search and aggregation execution.
- Best-effort summary.
- Audit/history persistence.
- CSV export replay.
- Keycloak JWT role mapping and authorization.

Backend packages are organized by capability, not by microservice. Calls between modules are Java method calls inside one Spring Boot application.

## 5. Elasticsearch

Elasticsearch `9.4.2` Basic is used as the only event store in MVP.

Mapping summary:

| Field | Type |
| --- | --- |
| `timestamp` | `date` |
| `source` | `keyword` |
| `severity` | `keyword` |
| `event_type` | `keyword` |
| `user` | `keyword` |
| `host` | `keyword` |
| `ip` | `ip` |
| `country_code` | `keyword` |
| `message` | `text` |
| `raw` | `text`, `index: false` |

The compiler does not add `.keyword` because MVP mapping already defines aggregatable fields as `keyword` or `ip` directly.

## 6. PostgreSQL

PostgreSQL stores application metadata only:

- Query history.
- Audit log.
- SearchPlan and generated DSL snapshots.
- Summary and summary source.
- Result count and latency.
- Data needed for CSV export replay.

PostgreSQL does not store SOC event documents.

## 7. LLM

Providers:

- `mock`: deterministic provider for local/dev/test/CI; no API key required.
- `gemini`: hosted provider for integration or public demo with runtime API key.

LLM constraints:

- LLM returns JSON `SearchPlan`, not Elasticsearch DSL.
- Parser rejects markdown, prose, unknown fields and non-object JSON.
- Repair/retry is limited to one attempt.
- Summary is best-effort and has fallback.
- Raw log and full event documents are not sent to LLM.

## 8. Auth/RBAC

Keycloak realm: `soc-ai-search`.

Frontend client: `soc-ai-search-frontend`.

Roles:

- `SOC_VIEWER`
- `SOC_ANALYST`
- `SOC_ADMIN`

Spring Security maps `realm_access.roles` to `ROLE_*` authorities and applies role hierarchy so admin inherits analyst/viewer capabilities.

## 9. Deployment

Production deployment uses:

- DigitalOcean Droplet Ubuntu.
- Name.com DNS.
- Caddy reverse proxy and automatic HTTPS.
- Docker Compose with `auth` and `proxy` profiles.
- GitHub Actions CD over SSH.

Production public ports:

| Port | Public | Purpose |
| --- | --- | --- |
| `22` | Yes | SSH |
| `80` | Yes | Caddy HTTP challenge/redirect |
| `443` | Yes | HTTPS |
| `3000` | No | Frontend internal/local only |
| `8081` | No | Backend internal/local only |
| `8082` | No | Keycloak internal/local only |
| `9200` | No | Elasticsearch internal/local only |
| `5433` | No | PostgreSQL host-local only |
| `5601` | No | Kibana optional local tool |

## 10. Tools not used in current deployment

Deployment MVP hiện tại không dùng AWS, Route53, Nginx làm reverse proxy ở edge, Certbot, Jenkins, ArgoCD hoặc Kubernetes. Nginx chỉ có thể xuất hiện như static server bên trong frontend container; reverse proxy production ở edge là Caddy.