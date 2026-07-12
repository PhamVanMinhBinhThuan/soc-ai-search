# Sequence Flows - SOC AI Search

## 1. Authentication and RBAC

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as React frontend
    participant KC as Keycloak
    participant BE as Backend

    User->>FE: Open SOC AI Search
    FE->>KC: Redirect to login
    KC-->>FE: Authorization code callback
    FE->>KC: Exchange code for tokens
    FE->>BE: GET /api/v1/auth/me with Bearer token
    BE->>KC: Load/cache issuer metadata and JWKS when needed
    BE->>BE: Verify JWT signature, issuer, expiry, and roles
    BE-->>FE: Current user, roles, permissions
    FE-->>User: Render role-gated UI
```

Backend role checks remain authoritative. UI gating is for user experience only.

## 2. Natural Language Search

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as Frontend
    participant API as NaturalLanguageSearchController
    participant Service as NaturalLanguageSearchService
    participant LLM as LlmClient
    participant Parser as SearchPlanJsonParser
    participant Validator as SearchPlanValidator
    participant Compiler as SearchPlanCompiler
    participant ES as Elasticsearch
    participant Summary as ResultSummaryService
    participant Audit as SearchAuditService

    User->>FE: Submit question, page, size
    FE->>API: POST /api/v1/search
    API->>Service: search(request)
    Service->>LLM: Generate SearchPlan from prompt
    LLM-->>Service: Raw SearchPlan JSON text
    Service->>Parser: Parse strict JSON
    Parser-->>Service: SearchPlan object
    Service->>Validator: Validate business rules
    Service->>Service: Override page/size from request
    Service->>Compiler: Compile DSL
    Service->>ES: Execute search/aggregation
    ES-->>Service: Results
    Service->>Summary: Generate bounded summary
    Service->>Audit: Save audit/history
    Service-->>API: Response with query_id, SearchPlan, DSL, results
    API-->>FE: Render UI
```

Important outputs:

- `query_id`
- `search_plan`
- `generated_dsl`
- `summary`
- `events` or `aggregation_results`
- `chart_metadata`

## 3. LLM Repair-Once Flow

```mermaid
sequenceDiagram
    autonumber
    participant Service as Search service
    participant LLM as LlmClient
    participant Parser as Parser/Validator

    Service->>LLM: Initial SearchPlan prompt
    LLM-->>Service: Invalid JSON/SearchPlan
    Service->>Parser: Parse + validate
    Parser-->>Service: Error list
    Service->>LLM: One repair prompt
    LLM-->>Service: Repaired JSON
    Service->>Parser: Parse + validate again

    alt valid
        Parser-->>Service: SearchPlan object
    else invalid
        Service-->>Service: Controlled error response
    end
```

The repair flow is capped to avoid infinite retry loops.

## 4. Direct SearchPlan Execution

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant API as SearchController
    participant Validator as SearchPlanValidator
    participant Compiler as SearchPlanCompiler
    participant ES as Elasticsearch
    participant Summary as ResultSummaryService
    participant Audit as Audit service

    FE->>API: POST /api/v1/search/plan
    API->>Validator: Validate submitted SearchPlan
    API->>Compiler: Compile DSL
    API->>ES: Execute query
    API->>Summary: Optional summary if include_summary=true
    API->>Audit: Save edited/filtered query if required
    API-->>FE: Updated result, SearchPlan, DSL, query_id
```

This endpoint is used for:

- Editable SearchPlan reruns.
- Result filter/sort reruns.
- Technical testing of the validator/compiler/executor without LLM SearchPlan generation.

Pagination-only changes do not need to create a new audit record.

## 5. Correct or Refine Query

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as Frontend
    participant API as QueryRefinementController
    participant LLM as LlmClient
    participant Search as Natural language search flow

    User->>FE: Add correction/refinement note
    FE->>API: POST /api/v1/search/refine
    API->>LLM: Rewrite current question using feedback + SearchPlan context
    LLM-->>API: Rewritten question
    API-->>FE: rewritten_question
    FE->>Search: Run rewritten question through normal /search flow
```

The refinement feature does not edit DSL directly. It produces a clearer natural language query and then reruns the normal guarded pipeline.

Audit display format:

```text
[AI Corrected] Original question: <original> | Feedback: <feedback>
```

## 6. AI Summary

```mermaid
sequenceDiagram
    autonumber
    participant Search as Search response builder
    participant Summary as Summary service
    participant ES as Elasticsearch
    participant LLM as LlmClient

    Search->>Summary: SearchPlan + result metadata

    alt search mode
        Summary->>ES: Bounded contextual aggregation
        ES-->>Summary: Top users/IPs/severity counts
    else aggregation mode
        Summary->>Summary: Use aggregation_results directly
    end

    Summary->>LLM: Sanitized summary payload

    alt LLM success
        LLM-->>Summary: Summary text
    else LLM failure
        Summary-->>Search: Deterministic fallback summary
    end
```

Raw forensic logs are not sent to the LLM.

## 7. AI Follow-up Suggestions

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant API as FollowUpSuggestionController
    participant Service as FollowUpSuggestionService
    participant LLM as LlmClient

    FE->>API: POST /api/v1/suggestions/follow-up
    API->>Service: Build compact context
    Service->>LLM: Ask for exactly 3 title/question suggestions
    LLM-->>Service: JSON array
    Service-->>API: Validated suggestions
    API-->>FE: source=llm, suggestions=[]
```

If the provider is mock or the configured live LLM provider fails, the UI hides this section. There is no static fallback for this feature.

## 8. Query Library

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Query Library page
    participant SearchBox as Search page input

    User->>UI: Browse curated static query library
    User->>UI: Filter by category/search text
    User->>UI: Click copy or use query
    UI->>SearchBox: Fill and focus query input
    User->>SearchBox: Click Search when ready
```

Query Library is static and deterministic. It does not call the LLM by itself.

## 9. History and Audit

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant API as History/Audit API
    participant PG as PostgreSQL

    FE->>API: GET history/audit with page, size, filters, search
    API->>PG: Server-side filtering and pagination
    PG-->>API: Items + total + total_pages
    API-->>FE: Paginated response
```

Supported UI filters include:

- status: success/failed
- mode: search/aggregation
- pinned, for investigations
- text search over query/history fields

Both Investigations and Audit use server-side pagination.

## 10. CSV Export

### Result CSV export

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant API as CsvExportController
    participant PG as PostgreSQL
    participant Validator as SearchPlanValidator
    participant Compiler as SearchPlanCompiler
    participant ES as Elasticsearch

    FE->>API: GET /api/v1/search/{query_id}/export.csv
    API->>PG: Load stored SearchPlan
    API->>Validator: Validate again
    API->>Compiler: Compile again
    API->>ES: Replay query with export limit
    API-->>FE: Stream CSV
```

### Audit CSV export

```mermaid
sequenceDiagram
    autonumber
    participant Admin as Admin UI
    participant API as Audit API
    participant PG as PostgreSQL

    Admin->>API: GET /api/v1/audit-logs/export with current filters
    API->>PG: Query matching audit rows
    API-->>Admin: Stream audit CSV
```

Export is not limited by the current UI page; it exports the filtered result set.

## 11. Event Detail

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant API as EventController
    participant ES as Elasticsearch

    FE->>API: GET /api/v1/events/{event_id}
    API->>ES: Lookup document by _id
    ES-->>API: _source and raw log
    API-->>FE: Event detail response
```

The event table is optimized for scanning; the centered event detail modal retrieves the full raw log on demand.
