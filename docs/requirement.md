# Requirements - SOC AI Search

## 1. Objective

Build a SOC investigation console where users can search, aggregate, inspect, and export security events using natural language while preserving backend-controlled security guardrails.

The system must make the AI pipeline transparent:

- original question
- Query Breakdown
- validated SearchPlan
- compiled Elasticsearch DSL
- result set
- audit/history record

## 2. Event Storage

The system must store SOC events in Elasticsearch index `soc-events-v1`.

Required fields:

- `timestamp`
- `event_id`
- `source`
- `severity`
- `event_type`
- `user`
- `host`
- `ip`
- `country_code`
- `message`
- `raw`

The system must provide scripts to bootstrap the index and seed synthetic demo data.

## 3. Natural Language Search

The system must expose `POST /api/v1/search`.

Request fields:

- `question`
- `page`
- `size`

The backend must:

1. Build a constrained LLM prompt.
2. Ask the LLM for a SearchPlan.
3. Parse only pure JSON.
4. Validate the SearchPlan.
5. Override pagination from the request.
6. Compile Elasticsearch DSL.
7. Execute Elasticsearch.
8. Return SearchPlan, generated DSL, results, summary, and query id.
9. Store an audit/history record.

## 4. SearchPlan Validation

The system must reject:

- unknown fields
- unsupported modes
- unsupported aggregation types
- unsupported fields
- unsafe script/wildcard/query string expressions
- invalid IP values
- invalid country codes
- invalid or excessive event ID filters
- invalid pagination
- invalid time expressions
- unsupported aggregation field combinations

Relative time support:

- `now`
- `now-<number>h`, maximum 720h
- `now-<number>d`, maximum 90d
- ISO-8601 timestamps

## 5. Search Mode

Search mode must support filters:

- timestamp
- event_id
- source
- severity
- event_type
- user
- host
- ip
- country_code
- event_id
- message_query

The following fields support multi-value filters:

- source
- severity
- event_type
- user
- host
- ip
- country_code

The UI must support result filtering/sorting and rerun a validated SearchPlan without asking the LLM for a new SearchPlan.

## 6. Aggregation Mode

Aggregation mode must support:

- `count`
- `group_by`
- `top_n`
- `date_histogram`

Aggregation fields:

- source
- severity
- event_type
- user
- host
- ip
- country_code

Chart mapping:

- `count` -> number result
- `group_by` -> bar chart
- `top_n` -> bar chart
- `date_histogram` -> line chart

Date histogram must use timestamp internally and must preserve chronological ordering.

## 7. Query Transparency

The UI must display:

- Query Breakdown
- Validated SearchPlan
- Compiled DSL

Query Breakdown must be human-readable and must hide null/empty fields.

SearchPlan editing rules:

- Viewer cannot edit.
- Analyst and Admin can edit SearchPlan.
- DSL is read-only.
- Edited SearchPlan must be revalidated and recompiled by the backend.

## 8. AI Features

### SearchPlan generation

The LLM can generate a SearchPlan, but the backend must validate before execution.

### Summary

The system must generate a bounded AI summary when appropriate. If the LLM fails, the system must return a deterministic fallback and keep the search response successful.

### Correct or Refine Query

Users can submit feedback to correct or refine the current query. The system rewrites the natural language question, then reruns the normal safe pipeline.

### Follow-up Suggestions

The system can ask the LLM for next investigation steps. Requirements:

- exactly 3 suggestions when available
- each suggestion has `title` and `question`
- click fills and focuses the search box
- click does not auto-run search
- no static fallback if LLM/mock returns no suggestions

## 9. Query Library

The system must provide a static Query Library page with curated SOC questions based on the synthetic dataset.

Requirements:

- route: `/query-library`
- search/filter by category and text
- categories include search, aggregation, top N, count, time series, line chart, bar chart, multi-filter, playbook
- copy query
- use query by filling and focusing the search input
- do not auto-run the query
- pagination with 5 questions per page

## 10. Dashboard

The dashboard must use fixed SearchPlan/API calls and must not call the LLM.

Requirements:

- Total events
- Critical/high alerts
- Failed logins
- Severity distribution
- Top source IPs
- Events over time
- Auto-refresh every 3 minutes
- Partial failure isolation: one broken card must not break the whole dashboard

## 11. History, Investigations, and Audit

Every executed search or SearchPlan rerun that changes the query should be stored in PostgreSQL.

History/Audit records must include:

- query id
- user identity
- question/display question
- mode
- status
- SearchPlan
- generated DSL
- total result count
- latency
- summary if available
- error if failed

All Investigations:

- server-side pagination
- server-side search/filter
- pin/unpin
- run again
- export result CSV for allowed roles

System Audit Logs:

- admin only
- server-side pagination
- server-side search/filter
- audit CSV export

## 12. CSV Export

Result CSV export must:

- accept only `query_id`
- load stored SearchPlan from PostgreSQL
- validate and compile again
- replay against Elasticsearch
- cap export at 10,000 rows
- prevent CSV formula injection
- avoid stack trace leakage

Audit CSV export must:

- be admin-only
- export all matching rows for current filters, not just the current UI page

## 13. Event Detail

The event detail modal must:

- load event detail by id
- show formatted fields
- show raw log
- avoid unnecessary internal fields in the main formatted view
- format timestamps for readability

## 14. Authentication and RBAC

The system must use Keycloak OIDC.

Roles:

- `SOC_VIEWER`
- `SOC_ANALYST`
- `SOC_ADMIN`

Backend must enforce:

- Viewer: search/read-only.
- Analyst: search, edit SearchPlan, pin, export, investigations.
- Admin: all Analyst capabilities plus audit logs and Keycloak admin access.

## 15. Deployment and Operations

The system must support:

- local Docker Compose
- production Docker Compose override
- Caddy HTTPS reverse proxy
- DigitalOcean VPS deployment
- GitHub Actions CI/CD
- smoke tests after deployment

## 16. Non-Functional Requirements

- No production secrets in git.
- No raw stack traces in client responses.
- Backend must be the security authority.
- Elasticsearch must not be exposed publicly.
- LLM failures must degrade gracefully.
- CI must run backend tests, frontend lint/test/build, and compose validation.
- Demo data must be reproducible with seed scripts.
