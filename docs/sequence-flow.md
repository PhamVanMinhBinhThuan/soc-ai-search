# Sequence Flow - SOC AI Search MVP

## 1. Tổng quan

Tài liệu này mô tả các flow runtime chính của SOC AI Search MVP:

1. Login và RBAC.
2. Natural language search.
3. Natural language aggregation.
4. Technical SearchPlan endpoint.
5. Event detail.
6. Summary best-effort.
7. Audit/history.
8. CSV export.

Contract API dùng JSON snake_case như `query_id`, `original_question`, `generated_dsl`, `search_plan`, `aggregation_results`, `chart_metadata`.

## 2. Login và RBAC

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant FE as React Frontend
    participant KC as Keycloak
    participant BE as Spring Boot Backend

    User->>FE: Open SOC console
    FE->>KC: Redirect to OIDC login
    KC-->>FE: Authorization code callback
    FE->>KC: Exchange code for tokens
    KC-->>FE: ID token + access token
    FE->>BE: GET /api/v1/auth/me with Bearer token
    BE->>KC: Validate JWT issuer/JWKS
    BE-->>FE: identity + roles + permissions
    FE-->>User: Render role-aware UI
```

Backend authorization remains authoritative even if frontend hides or disables UI actions.

## 3. Natural language search

```mermaid
sequenceDiagram
    autonumber
    actor User as SOC Analyst
    participant FE as Frontend
    participant API as Search Controller
    participant NL as NaturalLanguageSearchService
    participant LLM as LlmClient
    participant Parser as SearchPlanJsonParser
    participant Guard as SearchPlanValidator
    participant Compiler as SearchPlanCompiler
    participant ES as Elasticsearch
    participant Summary as SummaryService
    participant Audit as AuditService
    participant PG as PostgreSQL

    User->>FE: Submit question, page, size
    FE->>API: POST /api/v1/search
    API->>NL: search(request, identity)
    NL->>LLM: System prompt + question + schema/allowlist
    LLM-->>NL: Raw SearchPlan JSON
    NL->>Parser: parse(raw JSON)
    Parser->>Guard: validate SearchPlan
    Guard-->>Parser: valid
    Parser-->>NL: SearchPlan
    NL->>NL: Override page/size from request
    NL->>Compiler: compile SearchPlan
    Compiler-->>NL: Compiled query with generated_dsl
    NL->>ES: Execute search with timeout + track_total_hits
    ES-->>NL: Hits + total
    NL->>Summary: Build bounded summary
    Summary-->>NL: summary + summary_source
    NL->>Audit: save success
    Audit->>PG: insert search_query_logs
    PG-->>Audit: query_id
    NL-->>API: NaturalLanguageSearchResponse
    API-->>FE: 200 OK
```

Search response shape:

```json
{
  "query_id": "uuid",
  "original_question": "Show me failed login attempts from China in the last 24h",
  "mode": "search",
  "search_plan": {},
  "generated_dsl": {},
  "summary": "...",
  "summary_source": "llm",
  "total": 123,
  "page": 0,
  "size": 20,
  "total_pages": 7,
  "llm_latency_ms": 50,
  "search_latency_ms": 30,
  "latency_ms": 100,
  "events": []
}
```

## 4. Repair once flow

```mermaid
sequenceDiagram
    autonumber
    participant NL as NaturalLanguageSearchService
    participant LLM as LlmClient
    participant Parser as Parser/Validator

    NL->>LLM: Initial prompt
    LLM-->>NL: Invalid output
    NL->>Parser: parse + validate
    Parser-->>NL: Error details
    NL->>LLM: Repair prompt with question, bad output, errors
    LLM-->>NL: Repaired raw JSON
    NL->>Parser: parse + validate

    alt valid after repair
        Parser-->>NL: SearchPlan
    else still invalid
        NL-->>NL: Controlled 502/503 error
    end
```

Repair is limited to one attempt.

## 5. Natural language aggregation

```mermaid
sequenceDiagram
    autonumber
    actor User as SOC Analyst
    participant FE as Frontend
    participant API as Search Controller
    participant NL as NaturalLanguageSearchService
    participant LLM as LlmClient
    participant Guard as Validator
    participant Compiler as Compiler
    participant ES as Elasticsearch
    participant Summary as SummaryService
    participant Audit as AuditService

    User->>FE: Ask aggregation question
    FE->>API: POST /api/v1/search
    API->>NL: search(request, identity)
    NL->>LLM: Prompt with aggregation schema
    LLM-->>NL: SearchPlan mode=aggregation
    NL->>Guard: validate aggregation plan
    NL->>Compiler: compile aggregation DSL
    Compiler-->>NL: generated_dsl
    NL->>ES: Execute aggregation
    ES-->>NL: hits.total + buckets
    NL->>Summary: Summarize aggregation_results directly
    Summary-->>NL: summary or fallback
    NL->>Audit: save success/failure
    NL-->>API: Aggregation response
    API-->>FE: 200 OK
```

Aggregation response shape:

```json
{
  "query_id": "uuid",
  "original_question": "Top 10 IP có nhiều alert nhất tháng này",
  "mode": "aggregation",
  "search_plan": {},
  "generated_dsl": {},
  "summary": "...",
  "summary_source": "fallback",
  "total": 438,
  "aggregation_type": "top_n",
  "aggregation_results": [
    { "key": "10.0.0.5", "value": 124 }
  ],
  "chart_metadata": {
    "chart_type": "BAR",
    "x_axis_label": "ip",
    "y_axis_label": "count"
  },
  "events": []
}
```

## 6. Technical SearchPlan endpoint

Endpoint:

```text
POST /api/v1/search/plan
```

This endpoint is for validating the SearchPlan core without LLM.

```mermaid
sequenceDiagram
    autonumber
    participant Client as Swagger/Tester
    participant API as SearchPlan Controller
    participant Guard as SearchPlanValidator
    participant Compiler as SearchPlanCompiler
    participant ES as Elasticsearch

    Client->>API: POST SearchPlan JSON
    API->>Guard: validate
    Guard-->>API: ok
    API->>Compiler: compile
    Compiler-->>API: generated_dsl
    API->>ES: execute search or aggregation
    ES-->>API: response
    API-->>Client: normalized response
```

## 7. Event detail

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant API as Event Controller
    participant ES as Elasticsearch

    FE->>API: GET /api/v1/events/{event_id}
    API->>API: trim and validate event_id
    API->>ES: Get document by _id

    alt found
        ES-->>API: _id, _index, _source
        API-->>FE: EventDetailResponse including raw
    else not found
        API-->>FE: 404 { "message": "Event not found: ..." }
    else search dependency error
        API-->>FE: 503 controlled error
    end
```

## 8. Summary best-effort

```mermaid
sequenceDiagram
    autonumber
    participant Search as Search Service
    participant Summary as Summary Service
    participant ES as Elasticsearch
    participant LLM as LlmClient

    Search->>Summary: Search/aggregation response data

    alt mode search and total > 0
        Summary->>ES: At most one bounded summary query
        ES-->>Summary: compact statistics
        Summary->>LLM: sanitized payload max size
    else mode aggregation and buckets exist
        Summary->>LLM: top aggregation_results only
    else no result
        Summary-->>Search: deterministic fallback, no LLM call
    end

    alt LLM valid 3-5 plain text sentences
        LLM-->>Summary: summary
        Summary-->>Search: summary_source=llm
    else timeout/invalid/error
        Summary-->>Search: fallback summary_source=fallback
    end
```

## 9. Audit and history

```mermaid
sequenceDiagram
    autonumber
    participant Search as Search Flow
    participant Audit as AuditPersistenceService
    participant PG as PostgreSQL

    alt success
        Search->>Audit: saveSuccess(query_id, plan, dsl, result_count, latency)
    else failure
        Search->>Audit: saveFailure(query_id, status, failure_stage, sanitized_error)
    end

    Audit->>PG: short transaction insert
    PG-->>Audit: persisted
```

History endpoint:

```text
GET /api/v1/search/history?page=0&size=20
```

Audit endpoint:

```text
GET /api/v1/audit-logs?page=0&size=50
```

Both return paged response with `items`, `page`, `size`, `total`, `total_pages`.

## 10. CSV export

```mermaid
sequenceDiagram
    autonumber
    actor User as Analyst/Admin
    participant FE as Frontend
    participant API as CSV Controller
    participant PG as PostgreSQL
    participant Guard as Validator
    participant Compiler as Compiler
    participant ES as Elasticsearch

    User->>FE: Click Export CSV
    FE->>API: GET /api/v1/search/{query_id}/export.csv
    API->>PG: Load stored query by query_id
    PG-->>API: SearchPlan snapshot
    API->>Guard: validate SearchPlan
    API->>Compiler: compile DSL
    API->>ES: Replay live query with max 10000 rows
    ES-->>API: Current result set
    API-->>FE: CSV stream + headers
```

CSV headers exposed to browser:

- `Content-Disposition`
- `X-Export-Truncated`

## 11. Error handling principles

- Bad request: 400 with clear message.
- Unauthorized: 401.
- Forbidden by role: 403.
- Event not found: 404.
- LLM unavailable or invalid after repair: controlled 502/503.
- Elasticsearch dependency error: controlled 503.
- No stack trace or internal exception class in API response.