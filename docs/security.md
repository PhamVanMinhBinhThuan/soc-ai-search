# Security Model - SOC AI Search

## 1. Security Principle

SOC AI Search treats browser input and LLM output as untrusted. The backend is the trusted boundary for authorization, SearchPlan validation, Elasticsearch DSL compilation, audit persistence, and CSV export.

## 2. Identity and RBAC

Authentication uses Keycloak with OpenID Connect. The frontend completes the login flow and sends access tokens to the backend as Bearer tokens.

The backend uses Spring Security to verify:

- JWT signature
- issuer
- expiration
- realm/client roles

Role hierarchy:

```text
SOC_ADMIN > SOC_ANALYST > SOC_VIEWER
```

| Capability group | Viewer | Analyst | Admin |
| --- | :---: | :---: | :---: |
| Search and view metadata | Yes | Yes | Yes |
| View raw event detail | No | Yes | Yes |
| AI query refinement | Yes | Yes | Yes |
| Manual SearchPlan editing | No | Yes | Yes |
| Export search CSV | No | Yes | Yes |
| Pin and manage personal investigations | No | Yes | Yes |
| View system audit logs | No | No | Yes |
| Export audit CSV | No | No | Yes |

Frontend permission checks improve UX, but backend method security is authoritative.

## 3. SearchPlan Guardrails

The LLM never sends executable Elasticsearch DSL directly to Elasticsearch.

Natural-language search follows this trust boundary:

```text
Question -> LLM SearchPlan -> parser -> validator -> compiler -> Elasticsearch DSL
```

Guardrails include:

- pure JSON object requirement
- rejection of markdown/prose/trailing tokens
- unknown-field rejection
- allowlisted filters, sort fields, and aggregation fields
- bounded time expressions
- bounded page size and export size
- bounded event ID filter list
- rejection of unsafe DSL concepts such as `script`, wildcard, query string, and unsupported runtime expressions

## 4. LLM Data Boundary

LLM providers can be:

- `mock`
- `gemini`
- `anthropic`

The backend sends bounded prompts and compact context only. Raw forensic logs are not sent to the LLM for summaries or follow-up suggestions.

LLM failures must degrade gracefully:

- SearchPlan generation can fail with a controlled error.
- Summary generation can fall back to deterministic text.
- Follow-up suggestions can be hidden instead of showing a static fallback.

## 5. CSV Export Controls

Search result export accepts `query_id`, not client-supplied DSL.

The backend:

1. Loads the stored SearchPlan from PostgreSQL.
2. Checks user scope and role permissions.
3. Validates the SearchPlan again.
4. Compiles DSL again.
5. Replays the query against Elasticsearch.
6. Streams CSV with a 10,000-row limit.

Search and audit exports expose `X-Export-Truncated: true` when the result set exceeds the export limit.

CSV formula injection protection neutralizes spreadsheet formulas by escaping values that start with dangerous prefixes such as `=`, `+`, `-`, or `@`.

## 6. Data Exposure Controls

- Elasticsearch is not exposed directly to the public internet.
- PostgreSQL is not exposed directly to the public internet.
- Caddy is the public HTTPS edge for frontend, backend, and Keycloak routes.
- Secrets are configured through environment variables and must not be committed.
- API errors should avoid stack trace leakage.
- Request logging records request metadata, user identity, roles, status, latency, and request id, but not tokens or raw security event payloads.

## 7. Auditability

PostgreSQL stores query history and audit records:

- `query_id`
- user identity
- display question
- mode and status
- validated SearchPlan
- generated DSL snapshot
- result count
- latency
- summary source
- error message when failed
- pinned status

This supports investigations, replay-based export, and admin audit review.
