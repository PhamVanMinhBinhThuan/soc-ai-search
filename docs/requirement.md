# 📋 System Requirements Specification - SOC AI Search MVP

<details>
  <summary><b>📖 Table of Contents</b></summary>

  - [🎯 1. Executive Objective](#1-executive-objective)
  - [🚀 2. Mandatory MVP Scope (MoSCoW - Must Have)](#2-mandatory-mvp-scope-moscow---must-have)
    - [🗄️ 2.1. Event Storage and Indexing Architecture](#21-event-storage-and-indexing-architecture)
    - [🧠 2.2. Natural Language Parsing Pipeline](#22-natural-language-parsing-pipeline)
    - [🔍 2.3. Search Mode Specifications](#23-search-mode-specifications)
    - [📊 2.4. Analytical Aggregation Specifications](#24-analytical-aggregation-specifications)
    - [🔬 2.5. Forensic Event Detail Retrieval](#25-forensic-event-detail-retrieval)
    - [🤖 2.6. AI Summarization Architecture](#26-ai-summarization-architecture)
    - [📜 2.7. Auditing, History, and Data Extraction](#27-auditing-history-and-data-extraction)
    - [🔐 2.8. Identity and Role-Based Access Control (RBAC)](#28-identity-and-role-based-access-control-rbac)
    - [🖥️ 2.9. Frontend Architecture](#29-frontend-architecture)
    - [🚢 2.10. Infrastructure, Deployment, and Operations](#210-infrastructure-deployment-and-operations)
  - [🛣️ 3. Post-MVP Strategic Roadmap (Out of Scope)](#3-post-mvp-strategic-roadmap-out-of-scope)
  - [⚖️ 4. Non-Functional Requirements (NFRs)](#4-non-functional-requirements-nfrs)
</details>

## 🎯 1. Executive Objective

The SOC AI Search MVP aims to construct an advanced analytical platform enabling Security Operations Center (SOC) analysts to search, aggregate, and forensically investigate security events utilizing natural language queries in both English and Vietnamese. The platform leverages a Large Language Model (LLM) to synthesize structured `SearchPlan` documents, which are subsequently validated, compiled into Elasticsearch Query DSL by the backend engine, and executed against an Elasticsearch cluster.

The paramount objective of this system is to enforce **Absolute Transparency and Security**: Analysts must have unhindered visibility into the original prompt, the validated `SearchPlan`, and the final executable DSL. The LLM is strictly prohibited from interacting directly with the Elasticsearch cluster or generating raw executable code.

## 🚀 2. Mandatory MVP Scope (MoSCoW - Must Have)

### 🗄️ 2.1. Event Storage and Indexing Architecture

- 💾 **Primary Data Store:** Implement Elasticsearch `9.4.2` (Basic self-managed) as the exclusive event repository.
- 📈 **Dataset Scale:** Support a minimum synthetic dataset of 10,000 SOC events for localized demonstrations.
- 🌱 **Seeding Mechanisms:** Provide PowerShell scripts and leverage the Elasticsearch Bulk API for rapid dataset seeding.
- 📜 **Enforced Event Schema:**
  - `timestamp`
  - `source`
  - `severity`
  - `event_type`
  - `user`
  - `host`
  - `ip`
  - `country_code`
  - `message`
  - `raw` (Forensic log payload)
- 📥 **Ingestion APIs:** Support both single-document and bulk-ingestion REST endpoints.
- 🛡️ **Data Segregation Rule:** PostgreSQL must strictly act as the metadata repository (audit logs, histories, export references) and must never store SOC event data.

### 🧠 2.2. Natural Language Parsing Pipeline

- 🌐 **Primary Endpoint:** Expose `POST /api/v1/search` for natural language processing.
- 📦 **Ingress Payload Structure:**
  - `question` (String)
  - `page` (Integer)
  - `size` (Integer)
- 🗣️ **Linguistic Support:** Bilingual support for English and Vietnamese query ingestion.
- 🚫 **LLM Output Constraints:** The LLM must output purely structured JSON mapping to the `SearchPlan` schema. Markdown, conversational prose, and raw DSL generation are strictly rejected.
- 🛡️ **Parsing Security:** The backend must employ Jackson for strict JSON deserialization, violently rejecting unknown properties. Validation is subsequently enforced via the Bean Validation framework and a custom `SearchPlanValidator`.
- 🔄 **Fault Tolerance:** If the LLM produces a malformed payload, the backend is permitted a maximum of *one* automated repair/retry cycle.
- 🔒 **Failure Obfuscation:** Unrecoverable parsing failures must return controlled, sanitized HTTP responses without exposing underlying stack traces.

### 🔍 2.3. Search Mode Specifications

The Search execution mode must technically support:

- ⏱️ **Temporal Filtering:** Dynamic evaluation of `now`, `now-24h`, `now-7d`, `now-30d`, and strict ISO-8601 timestamps.
- 🎯 **Exact & List Matching:**
  - `severity`
  - `event_type`
  - `user`
  - `host`
  - `ip`
  - `country_code`
- 📖 **Lexical Analysis:** Full-text evaluation utilizing the `message_query` parameter executed against the Elasticsearch `message` field.
- 🛑 **Pagination Constraints:** `page` and `size` parameters must enforce a hard upper limit where `size <= 100`.
- 📉 **Sorting Mechanisms:** Default sort behavior is forced to `timestamp desc`.
- 📄 **Standardized Response Schema:**
  - `query_id`
  - `original_question`
  - `mode`
  - `search_plan`
  - `generated_dsl`
  - `summary`
  - `summary_source`
  - `total`
  - `page`
  - `size`
  - `total_pages`
  - `events`

### 📊 2.4. Analytical Aggregation Specifications

The Aggregation execution mode must technically support:

- `count`
- `group_by`
- `top_n`
- `date_histogram`

**Aggregation Field Allowlists:**

- `source`
- `severity`
- `event_type`
- `user`
- `host`
- `ip`
- `country_code`

**Architectural Guardrails:**

- 🚫 Hard rejection of any field not explicitly defined within the allowlist.
- 🚫 Rejection of `.keyword` modifiers injected by the user or the LLM.
- 🚫 The `COUNT` operation must structurally reject `field`, `top_n`, or `interval` parameters.
- ✅ The `TOP_N` operation mandates the presence of a `top_n` parameter constrained between 1 and 100.
- ✅ The `GROUP_BY` operation, if lacking an explicit `top_n` parameter, defaults to a bucket limit of 20 at compile-time.
- ✅ The `DATE_HISTOGRAM` must operate exclusively on the `timestamp` field utilizing `fixed_interval` mappings (`minute -> 1m`, `hour -> 1h`, `day -> 1d`).

**Standardized Aggregation Response Schema:**

- `mode = aggregation`
- `aggregation_type`
- `generated_dsl`
- `total`
- `aggregation_results`
- `chart_metadata`
- `events = []` (Returns an empty array for aggregation endpoints).

### 🔬 2.5. Forensic Event Detail Retrieval

- 🌐 **Endpoint:** Expose `GET /api/v1/events/{event_id}`.
- 🔑 **ID Resolution:** The `{event_id}` must mathematically map to the underlying Elasticsearch document `_id`.
- 📄 **Payload Requirement:** The response must serialize the `raw` forensic log payload.
- ❌ **Error Handling:** Null or blank identifiers return HTTP 400. Unresolved identifiers return an explicit HTTP 404.

### 🤖 2.6. AI Summarization Architecture

- ⚙️ **Execution Philosophy:** Summarization operates as an asynchronous, best-effort enhancement.
- 🚀 **Precedence Rule:** Search and aggregation datasets must prioritize delivery; summary processing must not block result rendering.
- 🛡️ **Resiliency:** Should the LLM experience a timeout or generate an invalid response, the backend must inject a deterministic fallback string while maintaining an HTTP 200 OK status.
- 📝 **Output Constraints:** The summary must be returned as plain text, constrained to 3-5 analytical sentences.
- 🔒 **Data Protection:** Raw forensic logs must never be transmitted to the LLM.
- 🗜️ **Payload Compression:** The outbound prompt must strictly bound the number of sample events and the overall payload character length.
- ⚡ **Aggregation Optimization:** Aggregation summaries must utilize pre-computed `aggregation_results` directly; initiating secondary Elasticsearch queries for summarization is prohibited.

### 📜 2.7. Auditing, History, and Data Extraction

- 💾 **Metadata Persistence:** The PostgreSQL `search_query_logs` table must immutably record:
  - `query_id`
  - User identity (Principal)
  - Original question
  - Execution mode
  - Execution status
  - Failure stage tracking
  - Validated `SearchPlan` payload
  - `generated_dsl` snapshot
  - Result hit count
  - Execution latencies
  - Generated summary
  - Sanitized error messages
  - Creation timestamp
- 🔄 **History Retrieval:** Expose paginated endpoints for historical query retrieval.
- 📤 **CSV Extraction Pipeline:** Bounded via `query_id`:
  - 🚫 **Hard Constraint:** The system must actively reject raw DSL supplied by the client.
  - 🔄 **Execution Flow:** Load the persisted SearchPlan, re-validate, re-compile, and execute a live replay against Elasticsearch.
  - 🛑 **Volume Threshold:** Force a hard truncation limit of 10,000 rows per export.
  - 📑 **Header Directives:** If data is truncated, inject the `X-Export-Truncated: true` HTTP response header.

### 🔐 2.8. Identity and Role-Based Access Control (RBAC)

- 🔑 **Identity Provider (IdP):** Implement Keycloak OpenID Connect (OIDC).
- 🧑‍💼 **Enterprise Roles:**
  - `SOC_VIEWER`
  - `SOC_ANALYST`
  - `SOC_ADMIN`
- 🛡️ **Security Enforcement:** The backend must independently verify JSON Web Tokens (JWTs) utilizing Spring Security Resource Server modules.
- ⚖️ **Role Hierarchy Implementation:**
  - `SOC_ADMIN > SOC_ANALYST > SOC_VIEWER`
  - `SOC_ANALYST > SOC_VIEWER`
- 📋 **Entitlement Matrix:**
  - Viewers maintain read-only analytical access and are restricted from CSV exports.
  - Analysts possess operational access and data extraction (CSV) capabilities.
  - Administrators inherit all Analyst capabilities alongside exclusive access to system audit logs.

### 🖥️ 2.9. Frontend Architecture

- ⚛️ **Technology Core:** React, TypeScript, and Vite.
- 🎨 **Styling & Components:** Tailwind CSS, shadcn/ui, and lucide-react.
- 📊 **Analytical Rendering:** Integrate Recharts for high-fidelity aggregation visualizations.
- 🖼️ **Required UI Topologies:**
  - Centralized Natural Language Search Input.
  - Dynamic Suggested Query carousels.
  - Collapsible Pipeline/Inspection panels.
  - Read-only viewers for SearchPlan JSON and generated DSL structures.
  - Paginated raw event data tables.
  - Integrated Analytics charting with supplementary summary tables.
  - Slide-out Event Detail Inspection drawers.
  - AI-generated contextual summary blocks.
  - Recent Investigation history matrices.
  - Role-gated CSV Export action triggers.

### 🚢 2.10. Infrastructure, Deployment, and Operations

- 🐳 **Orchestration:** Local and target production environments standardized on Docker Compose.
- ☁️ **Target Topology:** DigitalOcean Droplet + Name.com DNS routing + Caddy HTTPS Reverse Proxy.
- 🧱 **Edge Security:** The public firewall must be aggressively configured to allow ingress exclusively on ports `22`, `80`, and `443`.
- 🔏 **Internal Segmentation:** Ports `3000`, `8081`, `8082`, `9200`, `5433`, and `5601` must not be directly routable from the public internet.
- 🚀 **Delivery Pipeline:** GitHub Actions executing CI testing gates and SSH-based CD deployments.
- ✅ **Validation Gates:** Smoke tests must programmatically verify HTTPS termination, CORS policies, and port isolation at deployment.

## 🛣️ 3. Post-MVP Strategic Roadmap (Out of Scope)

The following architectural expansions are explicitly excluded from the current MVP boundary:

- ❌ Multi-turn, stateful investigative conversational chat interfaces.
- ❌ Implementation of Semantic/Vector similarity search capabilities.
- ❌ Persistence mechanisms for custom-built visual dashboards.
- ❌ Machine Learning-powered advanced anomaly detection models.
- ❌ Enterprise multi-tenant logical data isolation.
- ❌ Integration of high-throughput, production-grade SIEM ingestion pipelines.
- ❌ Telemetry instrumentation utilizing Prometheus and Grafana.
- ❌ Migration to Kubernetes/Helm deployment topologies.

## ⚖️ 4. Non-Functional Requirements (NFRs)

- 📄 **API Documentation:** Comprehensive OpenAPI/Swagger specification required for all backend endpoints.
- 🧪 **Test Coverage - Backend:** Unit, Integration (Service), and Controller-tier testing via JUnit 5, Mockito, and MockMvc.
- 🧪 **Test Coverage - Frontend:** Component testing utilizing Vitest and React Testing Library.
- ✅ **Quality Gates:** Enforcement of a minimum 50% code coverage threshold (JaCoCo) across core business logic boundaries.
- 🔒 **Credential Security:** Absolute prohibition against committing production secrets, tokens, or private keys to version control.
- 🛡️ **Data Privacy:** Hard constraint preventing the leakage of API keys, raw event payloads, or internal stack traces into client responses.
- 💾 **Data Persistence:** Implementation of Docker Named Volumes to guarantee application state resilience across container lifecycles.
- ⚠️ **Operational Safety:** Procedural mandate prohibiting the execution of `docker compose down -v` outside of controlled data purging events.