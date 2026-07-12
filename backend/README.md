# SOC AI Search Backend

Spring Boot modular monolith for SOC AI Search. The backend owns the safety boundary: LLMs only propose structured intent, while backend code parses, validates, compiles, executes, audits, and authorizes every request.

## Module Map

| Module | Purpose |
| --- | --- |
| `search` | Natural-language search APIs, SearchPlan contract, parser, validator, compiler, and Elasticsearch execution. |
| `search/refinement` | AI-assisted query correction/refinement. |
| `summary` | AI summary payload building, deterministic fallback, and summary validation. |
| `suggestions` | AI follow-up investigation suggestions. |
| `audit` | Query history, system audit logs, pin/unpin, audit persistence, and audit CSV export preparation. |
| `event` | Event ingest and event detail lookup. |
| `export` | Search-result CSV export by replaying stored SearchPlan from `query_id`. |
| `llm` | Provider-neutral LLM port plus Gemini, Anthropic, and mock adapters. |
| `security` | Keycloak/OIDC JWT validation, current user lookup, and RBAC helpers. |
| `config` | OpenAPI, Elasticsearch, and LLM typed configuration. |
| `common` | Cross-cutting error handling and request correlation logging. |

Most feature modules follow this layout:

```text
api/             REST controllers and request/response DTOs
application/     use cases and orchestration services
domain/          contracts, value objects, validation and business rules
infrastructure/  Elasticsearch/JPA/CSV/HTTP adapters
```

## Request Flow

1. `POST /api/v1/search` receives a natural-language question.
2. `SearchPlanPromptBuilder` asks the configured LLM to return only SearchPlan JSON.
3. `SearchPlanJsonParser` rejects prose, markdown, malformed JSON, and unknown fields.
4. `SearchPlanValidator` checks business guardrails such as allowlisted fields, time ranges, modes, and aggregation rules.
5. `SearchPlanCompiler` generates the final Elasticsearch DSL.
6. `SearchPlanExecutor` queries Elasticsearch and maps results into search/aggregation responses.
7. `SearchAuditService` persists query history and audit metadata into PostgreSQL.

The LLM never executes Elasticsearch DSL directly.

## Security Model

- Keycloak issues JWT access tokens.
- Spring Security validates the token with the configured issuer/JWK endpoint.
- `RbacPermissionService` enforces role behavior in controllers and services.
- Main roles: `SOC_VIEWER`, `SOC_ANALYST`, `SOC_ADMIN`.
- UI permission checks are helpful, but backend RBAC is the source of truth.

## CSV Export

Search export does not accept DSL from the client. The frontend sends `query_id`; the backend looks up the stored SearchPlan, checks RBAC/user scope, validates/compiles again, queries Elasticsearch, and streams CSV with `StreamingResponseBody`.

Export protections:

- maximum 10,000 rows for search and audit export
- `X-Export-Truncated=true` when more data matched than exported
- CSV formula injection defense
- no client-supplied Elasticsearch DSL

## Observability

`CorrelationIdFilter` handles `X-Request-Id`:

- reuses a client-provided request id when valid
- generates a UUID when missing
- echoes the id in the response header
- stores it in MDC for logs

`RequestLoggingFilter` logs method, path, status, latency, request id, query id when present, user identity, and roles. It does not log access tokens, request bodies, raw logs, or sensitive event payloads.

## Important Configuration

| Property | Environment Variable | Purpose |
| --- | --- | --- |
| `app.auth.enabled` | `APP_AUTH_ENABLED` | Enable Keycloak-backed auth/RBAC. |
| `spring.security.oauth2.resourceserver.jwt.issuer-uri` | `KEYCLOAK_ISSUER_URI` | JWT issuer. |
| `spring.security.oauth2.resourceserver.jwt.jwk-set-uri` | `KEYCLOAK_JWK_SET_URI` | JWK endpoint used to verify JWT signatures. |
| `app.elasticsearch.url` | `ELASTICSEARCH_URL` | Elasticsearch HTTP endpoint. |
| `app.elasticsearch.index-events` | `ELASTICSEARCH_INDEX_EVENTS` | Event index name. |
| `app.llm.provider` | `LLM_PROVIDER` | `mock`, `gemini`, or `anthropic`. |
| `app.llm.api-key` | `LLM_API_KEY` | Provider API key. |
| `app.llm.model` | `LLM_MODEL` | Provider model id. |
| `app.llm.timeout-ms` | `LLM_TIMEOUT_MS` | SearchPlan/refine/suggestion LLM timeout. |
| `app.llm.summary-timeout-ms` | `LLM_SUMMARY_TIMEOUT_MS` | Summary timeout. |
| `app.export.es-timeout-ms` | `EXPORT_ES_TIMEOUT_MS` | Elasticsearch export timeout. |

## Local Commands

```powershell
cd backend
.\mvnw.cmd test
.\mvnw.cmd test jacoco:report
```

JaCoCo report:

```text
backend/target/site/jacoco/index.html
```

## OpenAPI

Swagger UI is served by Springdoc:

```text
/swagger-ui/index.html
```

Important endpoints:

- `POST /api/v1/search`
- `POST /api/v1/search/plan`
- `POST /api/v1/search/refine`
- `POST /api/v1/search/suggestions`
- `GET /api/v1/search/history`
- `GET /api/v1/audit-logs`
- `GET /api/v1/search/{queryId}/export.csv`
- `GET /api/v1/health/live`
