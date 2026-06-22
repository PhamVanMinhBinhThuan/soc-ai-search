# 🌊 System Sequence Flows - SOC AI Search MVP

<details>
  <summary><b>📖 Table of Contents</b></summary>

  - [📝 1. Executive Summary](#1-executive-summary)
  - [🔐 2. Authentication and RBAC Pipeline](#2-authentication-and-rbac-pipeline)
  - [🔍 3. Natural Language Search Pipeline](#3-natural-language-search-pipeline)
  - [🛠️ 4. LLM Fault Tolerance: Repair-Once Flow](#4-llm-fault-tolerance-repair-once-flow)
  - [📊 5. Natural Language Aggregation Pipeline](#5-natural-language-aggregation-pipeline)
  - [⚙️ 6. Technical SearchPlan Execution Pipeline](#6-technical-searchplan-execution-pipeline)
  - [🔬 7. Forensic Event Drilldown Pipeline](#7-forensic-event-drilldown-pipeline)
  - [🤖 8. Best-Effort AI Summarization Logic](#8-best-effort-ai-summarization-logic)
  - [📜 9. Immutable Audit and Query Telemetry Pipeline](#9-immutable-audit-and-query-telemetry-pipeline)
  - [💾 10. Secure CSV Extraction Pipeline (Replay Mode)](#10-secure-csv-extraction-pipeline-replay-mode)
  - [🛡️ 11. Core Error Handling Philosophy](#11-core-error-handling-philosophy)
</details>

## 📝 1. Executive Summary

This document delineates the primary runtime execution flows comprising the SOC AI Search MVP:

1. 🔐 Identity Authentication and Role-Based Access Control (RBAC).
2. 🔍 Natural Language Search Execution.
3. 📊 Natural Language Analytical Aggregation.
4. ⚙️ Technical SearchPlan Execution.
5. 🔬 Forensic Event Detail Extraction.
6. 🤖 Best-Effort AI Summarization.
7. 📜 System Audit and Query History Logging.
8. 💾 Secure CSV Data Extraction (Replay Pipeline).

All API contracts rigidly adhere to a `snake_case` JSON standard (e.g., `query_id`, `original_question`, `generated_dsl`, `search_plan`, `aggregation_results`, `chart_metadata`).

## 🔐 2. Authentication and RBAC Pipeline

![Keycloak](https://img.shields.io/badge/Keycloak-EE0000?style=for-the-badge&logo=keycloak&logoColor=white) ![Spring Boot](https://img.shields.io/badge/spring_boot-%236DB33F.svg?style=for-the-badge&logo=spring-boot&logoColor=white)

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant FE as React Frontend
    participant KC as Keycloak
    participant BE as Spring Boot Backend

    User->>FE: Access SOC Investigation Console
    FE->>KC: Redirect via OIDC Authorization Flow
    KC-->>FE: Authorization Code Callback
    FE->>KC: Cryptographic Code Exchange
    KC-->>FE: Transmit ID Token + Access Token (JWT)
    FE->>BE: GET /api/v1/auth/me (Bearer Token injected)
    BE->>KC: Validate JWT Issuer and JWKS Signatures
    BE-->>FE: Return Principal Identity, Roles, and Permissions
    FE-->>User: Render Role-Gated User Interface
```

*Architectural Principle:* Backend authorization policies maintain absolute authority over the transaction lifecycle, irrespective of the UI elements rendered or disabled by the frontend.

## 🔍 3. Natural Language Search Pipeline

![React](https://img.shields.io/badge/react-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![Spring Boot](https://img.shields.io/badge/spring_boot-%236DB33F.svg?style=for-the-badge&logo=spring-boot&logoColor=white) ![Gemini](https://img.shields.io/badge/Google_Gemini-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white) ![Elasticsearch](https://img.shields.io/badge/elasticsearch-%23005571.svg?style=for-the-badge&logo=elasticsearch&logoColor=white)

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

    User->>FE: Submit NLP query, pagination directives
    FE->>API: POST /api/v1/search
    API->>NL: Invokes search(request, identity)
    NL->>LLM: Dispatches System Prompt + User Query + Schema Allowlist
    LLM-->>NL: Returns Raw SearchPlan JSON
    NL->>Parser: Executes strict parse(raw JSON)
    Parser->>Guard: Enforces Bean Validation against SearchPlan
    Guard-->>Parser: Validation Succeeded
    Parser-->>NL: Structured SearchPlan Object
    NL->>NL: Overrides pagination with strict API limits
    NL->>Compiler: Compiles SearchPlan into DSL
    Compiler-->>NL: Returns Compiled Query alongside generated_dsl
    NL->>ES: Executes Elasticsearch query (Timeout + track_total_hits applied)
    ES-->>NL: Returns Document Hits + Total Count
    NL->>Summary: Triggers asynchronous bounded summary generation
    Summary-->>NL: Returns summary payload + summary_source
    NL->>Audit: Records successful transaction
    Audit->>PG: Commits telemetry to search_query_logs
    PG-->>Audit: Returns immutable query_id
    NL-->>API: Constructs NaturalLanguageSearchResponse
    API-->>FE: HTTP 200 OK
```

**Standardized Search Response Schema:**

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

## 🛠️ 4. LLM Fault Tolerance: Repair-Once Flow

```mermaid
sequenceDiagram
    autonumber
    participant NL as NaturalLanguageSearchService
    participant LLM as LlmClient
    participant Parser as Parser/Validator

    NL->>LLM: Dispatch Initial Prompt
    LLM-->>NL: Return Malformed/Invalid Output
    NL->>Parser: Execute Parse + Validate
    Parser-->>NL: Return Structural Error Details
    NL->>LLM: Dispatch Repair Prompt (Injecting Original Query, Malformed Output, and Error Trace)
    LLM-->>NL: Return Repaired Raw JSON
    NL->>Parser: Execute Parse + Validate

    alt Validation Succeeds Post-Repair
        Parser-->>NL: Return Structured SearchPlan
    else Validation Fails Post-Repair
        NL-->>NL: Trigger Controlled HTTP 502/503 Exception
    end
```

*Constraint:* The system strictly limits self-healing operations to a maximum of one attempt to prevent recursive loop degradation.

## 📊 5. Natural Language Aggregation Pipeline

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

    User->>FE: Submit Analytical Aggregation Query
    FE->>API: POST /api/v1/search
    API->>NL: Invokes search(request, identity)
    NL->>LLM: Dispatches Prompt integrating Aggregation Schema
    LLM-->>NL: Returns SearchPlan (mode=aggregation)
    NL->>Guard: Validates Aggregation Operations
    NL->>Compiler: Compiles Aggregation DSL
    Compiler-->>NL: Returns generated_dsl
    NL->>ES: Executes Aggregation Pipeline
    ES-->>NL: Returns hits.total + aggregation buckets
    NL->>Summary: Summarizes existing aggregation_results without querying ES
    Summary-->>NL: Returns contextual summary or deterministic fallback
    NL->>Audit: Records transaction telemetry
    NL-->>API: Constructs Aggregation Response
    API-->>FE: HTTP 200 OK
```

**Standardized Aggregation Response Schema:**

```json
{
  "query_id": "uuid",
  "original_question": "Show the top 10 IP addresses with the most alerts this month",
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

## ⚙️ 6. Technical SearchPlan Execution Pipeline

**System Endpoint:**

```text
POST /api/v1/search/plan
```

This endpoint is structurally designed to validate the core SearchPlan architecture, bypassing the LLM integration entirely.

```mermaid
sequenceDiagram
    autonumber
    participant Client as Swagger/Automation Tester
    participant API as SearchPlan Controller
    participant Guard as SearchPlanValidator
    participant Compiler as SearchPlanCompiler
    participant ES as Elasticsearch

    Client->>API: POST Structural SearchPlan JSON
    API->>Guard: Enforces Validation
    Guard-->>API: Validation Succeeded
    API->>Compiler: Compiles DSL
    Compiler-->>API: Returns generated_dsl
    API->>ES: Executes Search or Aggregation operation
    ES-->>API: Returns Cluster Response
    API-->>Client: Returns Normalized Response Payload
```

## 🔬 7. Forensic Event Drilldown Pipeline

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant API as Event Controller
    participant ES as Elasticsearch

    FE->>API: GET /api/v1/events/{event_id}
    API->>API: Trims and sanitizes event_id parameter
    API->>ES: Executes Direct Document Lookup via _id

    alt Document Located
        ES-->>API: Returns _id, _index, and _source payload
        API-->>FE: Returns EventDetailResponse containing raw log data
    else Document Not Found
        API-->>FE: HTTP 404 { "message": "Event not found: ..." }
    else Infrastructure Dependency Failure
        API-->>FE: Controlled HTTP 503 Exception
    end
```

## 🤖 8. Best-Effort AI Summarization Logic

```mermaid
sequenceDiagram
    autonumber
    participant Search as Search Service
    participant Summary as Summary Service
    participant ES as Elasticsearch
    participant LLM as LlmClient

    Search->>Summary: Submits Search/Aggregation response payload

    alt mode == search AND total_hits > 0
        Summary->>ES: Executes a maximum of one bounded contextual query
        ES-->>Summary: Returns compact statistical telemetry
        Summary->>LLM: Dispatches heavily sanitized, size-constrained payload
    else mode == aggregation AND buckets exist
        Summary->>LLM: Dispatches top-tier aggregation_results exclusively
    else Dataset is Empty
        Summary-->>Search: Injects deterministic fallback string (No LLM invocation)
    end

    alt LLM returns valid analytical prose (3-5 sentences)
        LLM-->>Summary: Valid Summary payload
        Summary-->>Search: summary_source=llm
    else LLM Timeout / Invalid JSON / Upstream Error
        Summary-->>Search: Injects deterministic fallback (summary_source=fallback)
    end
```

## 📜 9. Immutable Audit and Query Telemetry Pipeline

![PostgreSQL](https://img.shields.io/badge/postgresql-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)

```mermaid
sequenceDiagram
    autonumber
    participant Search as Search Execution Flow
    participant Audit as AuditPersistenceService
    participant PG as PostgreSQL

    alt Transaction Success
        Search->>Audit: Executes saveSuccess(query_id, plan, dsl, result_count, latency)
    else Transaction Failure
        Search->>Audit: Executes saveFailure(query_id, status, failure_stage, sanitized_error)
    end

    Audit->>PG: Commits payload via short-lived transactional insert
    PG-->>Audit: Acknowledges Persistence
```

**History Retrieval Endpoint:**

```text
GET /api/v1/search/history?page=0&size=20
```

**Administrative Audit Endpoint:**

```text
GET /api/v1/audit-logs?page=0&size=50
```

*Both endpoints yield standard paginated payloads containing: `items`, `page`, `size`, `total`, and `total_pages`.*

## 💾 10. Secure CSV Extraction Pipeline (Replay Mode)

![Spring Boot](https://img.shields.io/badge/spring_boot-%236DB33F.svg?style=for-the-badge&logo=spring-boot&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/postgresql-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)

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

    User->>FE: Invokes CSV Export Action
    FE->>API: GET /api/v1/search/{query_id}/export.csv
    API->>PG: Retrieves persisted SearchPlan snapshot mapped to query_id
    PG-->>API: Returns SearchPlan Snapshot
    API->>Guard: Enforces structural validation on SearchPlan
    API->>Compiler: Re-compiles executable DSL
    API->>ES: Executes Live Replay Query (Hard-capped at 10,000 document limit)
    ES-->>API: Returns truncated result set
    API-->>FE: Streams text/csv payload + Security Headers
```

**Browser-Exposed Security Headers:**

- 📑 `Content-Disposition` (Dictates safe file download handling).
- ⚠️ `X-Export-Truncated` (Signals to the UI whether the 10,000 document limit was breached).

## 🛡️ 11. Core Error Handling Philosophy

- ❌ **Malformed Client Requests:** HTTP 400 accompanied by a sanitized string explaining the breach.
- 🚫 **Unauthenticated Access:** HTTP 401.
- 👮 **RBAC Entitlement Violation:** HTTP 403.
- 🕳️ **Resource Resolution Failure:** HTTP 404.
- 🤖 **LLM Outage or Unrecoverable Repair:** Controlled HTTP 502/503.
- 📉 **Elasticsearch Outage:** Controlled HTTP 503.
- ⚠️ **Critical Security Mandate:** Raw stack traces, internal exception classes, or unhandled null pointers must **never** leak into external API payloads.