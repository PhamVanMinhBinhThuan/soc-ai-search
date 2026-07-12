# Technology Stack - SOC AI Search

## 1. Overview

SOC AI Search uses a React SPA, a Spring Boot modular monolith, Elasticsearch for SOC events, PostgreSQL for metadata, Keycloak for authentication, and Docker Compose for local and production deployment.

## 2. Stack Matrix

| Area | Technology | Responsibility |
| --- | --- | --- |
| Frontend | React | SPA UI |
| Frontend | TypeScript | Type-safe UI code |
| Frontend | Vite | Build tool and dev server |
| Frontend | Tailwind CSS | Dark SOC/SIEM styling |
| Frontend | Radix UI / shadcn-style primitives | Accessible UI primitives |
| Frontend | lucide-react | Icons |
| Frontend | Recharts | Bar/line/count visualizations |
| Frontend | CodeMirror | SearchPlan editor |
| Backend | Java 21 | Runtime |
| Backend | Spring Boot 3 | REST API and application runtime |
| Backend | Spring Security | JWT and RBAC enforcement |
| Backend | Jackson | Strict JSON parsing |
| Backend | Bean Validation | DTO validation |
| Search | Elasticsearch 9.4.2 | Event search and aggregation |
| Metadata | PostgreSQL | Audit, history, pins, summaries, export replay |
| Migration | Flyway | PostgreSQL schema migrations |
| Identity | Keycloak | OIDC, JWT, realm roles |
| AI | Mock LLM provider | Deterministic local/CI behavior |
| AI | Google Gemini | Live SearchPlan, summary, refine, and suggestions |
| AI | Anthropic Claude | Alternative live LLM provider |
| DevOps | Docker Compose | Local and production runtime |
| Edge | Caddy | HTTPS reverse proxy |
| CI/CD | GitHub Actions | Test, build, deploy, smoke tests |

## 3. Frontend Responsibilities

The frontend provides:

- Landing/auth gateway.
- Dashboard.
- Event Search.
- Query Transparency.
- Query Result filtering/sorting.
- Event Detail modal.
- Query Library.
- Recent Queries and All Investigations.
- System Audit Logs.
- CSV export actions.
- Keycloak login/logout integration.

Frontend constraints:

- `VITE_*` values are build-time variables.
- The frontend does not call Elasticsearch, PostgreSQL, or LLM providers directly.
- Frontend role checks are for UX only; backend RBAC is authoritative.

## 4. Backend Responsibilities

The backend provides:

- Natural language search orchestration.
- SearchPlan prompt building.
- Strict SearchPlan parsing.
- SearchPlan validation.
- SearchPlan to Elasticsearch DSL compilation.
- Search and aggregation execution.
- Result summary generation with fallback.
- AI query refinement.
- AI follow-up suggestions.
- Audit/history persistence.
- Pin/unpin investigations.
- CSV export replay.
- Keycloak JWT validation and role checks.

## 5. Elasticsearch

Elasticsearch stores SOC events in `soc-events-v1`.

Supported workloads:

- time range filtering
- exact keyword filtering
- IP filtering
- message text matching
- timestamp sorting
- severity sorting
- terms aggregation
- top-N aggregation
- date histogram aggregation
- event detail lookup by document id

The compiler does not append `.keyword` because aggregatable fields are mapped as `keyword` or `ip`.

## 6. PostgreSQL

PostgreSQL stores metadata only:

- query history
- audit logs
- stored SearchPlan
- generated DSL snapshot
- summaries
- query status and errors
- pinned investigation state
- export replay source data

It does not store SOC events.

## 7. LLM Integration

Supported providers:

- `mock`
- `gemini`
- `anthropic`

LLM-backed features:

- SearchPlan generation from natural language.
- Best-effort summary.
- Correct or Refine Query.
- Follow-up investigation suggestions.

Safety constraints:

- LLM cannot execute queries.
- LLM cannot directly generate executable DSL for Elasticsearch.
- Parser rejects markdown/prose/trailing tokens.
- Validator rejects unknown fields and unsafe values.
- Summary payload is bounded and sanitized.

## 8. Identity and Authorization

Keycloak realm: `soc-ai-search`

Frontend client: `soc-ai-search-frontend`

Roles:

- `SOC_VIEWER`
- `SOC_ANALYST`
- `SOC_ADMIN`

Spring Security maps JWT realm roles to backend authorities.

## 9. Testing Tools

Backend:

- JUnit 5
- Mockito
- MockMvc
- JaCoCo

Frontend:

- Vitest
- React Testing Library
- ESLint
- TypeScript build

CI checks:

- backend verification and coverage gate
- frontend lint/test/build
- Docker Compose config validation
- deployment smoke tests

## 10. Deployment

Production uses:

- DigitalOcean VPS
- Name.com DNS
- Docker Compose
- Caddy HTTPS
- GitHub Actions SSH deployment

Current production domains:

- `https://soc-ai-search.app`
- `https://api.soc-ai-search.app`
- `https://auth.soc-ai-search.app`

The public edge exposes only ports `22`, `80`, and `443`.
