# 📐 Architectural Decision Record: Search Engine Selection - SOC AI Search MVP

<details open>
  <summary><b>📖 Table of Contents</b></summary>

  - [🎯 1. Executive Conclusion](#1-executive-conclusion)
  - [⚖️ 2. Technical Justification for Elasticsearch](#2-technical-justification-for-elasticsearch)
  - [🗺️ 3. Data Mapping Architecture (MVP)](#3-data-mapping-architecture-mvp)
  - [🛡️ 4. Architectural Guardrail: The SearchPlan Contract](#4-architectural-guardrail-the-searchplan-contract)
  - [🧩 5. Defined DSL Topologies](#5-defined-dsl-topologies)
  - [📊 6. Strategic Technology Comparison](#6-strategic-technology-comparison)
  - [⚙️ 7. Operational Guidelines](#7-operational-guidelines)
  - [🔄 8. Strategic Re-evaluation Triggers](#8-strategic-re-evaluation-triggers)
</details>

## 🎯 1. Executive Conclusion

For the Minimum Viable Product (MVP) phase, the architectural board has selected ![Elasticsearch](https://img.shields.io/badge/elasticsearch-%23005571.svg?style=for-the-badge&logo=elasticsearch&logoColor=white) **Elasticsearch `9.4.2` (Basic, self-managed)** as the singular, authoritative search engine. The platform standardizes on **Elasticsearch Query DSL** as the query runtime, which is dynamically compiled by the backend engine after validating the AI-generated `SearchPlan`.

We deliberately reject the concurrent deployment of multiple indexing engines (e.g., Elasticsearch alongside OpenSearch or ClickHouse) for the MVP. A unified search engine satisfies all current requirements regarding high-velocity searching, filtering, statistical aggregation, forensic event drilldowns, and CSV replay mechanisms. Integrating secondary engines at this maturity stage would exponentially increase the complexity of data ingestion, testing pipelines, and deployment topologies without delivering proportional business value.

## ⚖️ 2. Technical Justification for Elasticsearch

Elasticsearch was strategically chosen because its native capability matrix closely aligns with Security Operations Center (SOC) event telemetry requirements. It provides highly optimized support for:

- 🔍 Broad-spectrum full-text search capabilities across the `message` field.
- ⚡ High-performance exact-match filtering against highly cardinal fields (keywords and IP addresses).
- ⏱️ Precision time-range querying against `timestamp` indices.
- 📊 Efficient `terms` aggregations supporting critical `group_by` and `top_n` analytical operations.
- 📈 Robust `date_histogram` aggregations essential for temporal event plotting.
- 🔎 Comprehensive Search APIs, deep pagination, sorting algorithms, and direct `_source` extraction for granular event forensics.
- 🐳 Industry-standard Docker imagery supported by extensive enterprise documentation.

The self-managed Basic tier of Elasticsearch is functionally complete for the MVP scope. Advanced, commercial-tier capabilities (such as Elastic Machine Learning anomaly detection, native cluster-level audit logging, Document-Level Security (DLS), or native Reciprocal Rank Fusion) are deemed out-of-scope for the current implementation phase.

## 🗺️ 3. Data Mapping Architecture (MVP)

Target Index: `soc-events-v1`.

| Telemetry Field | Elasticsearch Type | Operational Purpose |
| --- | --- | --- |
| `timestamp` | `date` | Range filtering, chronological sorting, date histograms |
| `source` | `keyword` | Exact filtering, grouping, top-N calculations |
| `severity` | `keyword` | Exact filtering, grouping, top-N calculations |
| `event_type` | `keyword` | Exact filtering, grouping, top-N calculations |
| `user` | `keyword` | Exact filtering, grouping, top-N calculations |
| `host` | `keyword` | Exact filtering, grouping, top-N calculations |
| `ip` | `ip` | Exact IP filtering, highly cardinal Top IP analytics |
| `country_code` | `keyword` | Exact filtering, grouping, top-N calculations |
| `message` | `text` | Full-text `match` queries and tokenization |
| `raw` | `text`, `index: false` | Forensic log storage (unindexed payload) |

*Compiler Constraint:* The backend query compiler intentionally does not append `.keyword` modifiers, as the foundational MVP mapping already strictly defines aggregatable fields natively as `keyword` or `ip` data types.

## 🛡️ 4. Architectural Guardrail: The SearchPlan Contract

The MVP strictly prohibits the Large Language Model (LLM) from directly generating executable Elasticsearch Query DSL. The mandated execution pipeline is:

```mermaid
flowchart LR
    Q["Natural language question"]
    LLM["LLM"]
    Plan["SearchPlan JSON"]
    Guard["Validator / Guardrail"]
    Compiler["SearchPlanCompiler"]
    DSL["Elasticsearch DSL"]
    ES["Elasticsearch"]

    Q --> LLM --> Plan --> Guard --> Compiler --> DSL --> ES
```

**Security and Engineering Rationale:**

- 🛑 Establishes a rigid, deterministic boundary to reject fields or operational directives outside the MVP scope.
- 🧪 Facilitates comprehensive unit testing of the DSL structural shape.
- 💉 Actively mitigates prompt injection vulnerabilities preventing the LLM from synthesizing computationally expensive wildcard queries, unconstrained query strings, or destructive inline `script` execution.
- 👁️ Ensures system transparency by continuously exposing the safely compiled `generated_dsl` back to the User Interface for human auditing.

## 🧩 5. Defined DSL Topologies

**Search Execution Mode:**

- `bool.filter` enforces precise, non-scoring exact matches.
- `term` queries execute against singular fields (`user`, `host`, `ip`).
- `terms` queries execute against enumerable list fields (`severity`, `event_type`, `country_code`).
- `range` queries strictly bound the `timestamp` axis.
- `match` queries execute tokenized analysis against the `message` field exclusively when `message_query` is invoked.
- `sort` enforces a deterministic `timestamp desc` default sequence.

**Aggregation Execution Mode:**

- `count`: Enforces `size = 0` to suppress payload bloat, bypassing empty `aggs` generation, and directly extracts the `hits.total` metric.
- `group_by`: Utilizes `terms` aggregation mechanisms. If a `top_n` parameter is absent, the compiler hardcodes a default bucket threshold of 20 to preserve memory.
- `top_n`: Utilizes `terms` aggregation mechanisms, mandating a strict `top_n` validation boundary of 1 to 100.
- `date_histogram`: Anchored to the `timestamp` field, restricted to standardized `fixed_interval` mappings (`1m`, `1h`, `1d`).

## 📊 6. Strategic Technology Comparison

| Search Engine | Core Strengths | Technical Trade-offs | MVP Decision |
| --- | --- | --- | --- |
| **Elasticsearch Basic** | Search-first architecture, superior full-text capabilities, comprehensive aggregation framework, ubiquitous industry documentation, official Docker support. | High JVM heap footprint; advanced security/ML features locked behind commercial subscriptions. | **✅ Selected** |
| **OpenSearch** | Functionally identical to ES Basic, Apache 2.0 open-source licensing, optimal if integrating deeply into an existing AWS OpenSearch ecosystem. | Fails to provide a disruptive technical advantage sufficient to pivot away from the industry standard for this MVP. | **⏸️ Deferred** (Post-MVP Reserve) |
| **ClickHouse** | Unrivaled aggregation and log analytics performance over massive datasets; intuitive SQL dialect. | Search relevance scoring and raw event detail retrieval require intensive architectural redesign; misaligned with our search-first MVP priorities. | **⏸️ Deferred** (Slated for Post-MVP benchmarking at extreme scale) |

## ⚙️ 7. Operational Guidelines

The local development environment is configured to bootstrap 10,000 synthetic events to minimize resource starvation. Prior to formal demonstrations, this dataset can be expanded via the provided batch ingestion scripts.

When deploying Elasticsearch within Linux environments, virtual memory allocation must be explicitly tuned:

```bash
sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" > /etc/sysctl.d/99-elasticsearch.conf
sysctl --system
```

*Security Posture:* Elasticsearch must never be exposed directly to the public internet. Production traffic is strictly routed through the backend API and Caddy edge proxy. Elasticsearch bindings are restricted to internal Docker overlay networks or loopback interfaces during debugging.

## 🔄 8. Strategic Re-evaluation Triggers

The architectural board will revisit this decision if any of the following operational thresholds are breached:

- 🚀 The active dataset scales into the hundreds of millions of events, shifting the primary workload bottleneck from full-text search to complex statistical aggregations (triggering a potential ClickHouse migration).
- 🧠 Functional requirements mandate the integration of native Vector/Hybrid semantic search modalities or advanced internal Machine Learning heuristics.
- 🏢 The overarching enterprise standardizes on a managed OpenSearch or ClickHouse cluster infrastructure.
- 🔒 Production compliance mandates the immediate implementation of granular Multi-Tenant logically isolated namespaces or Document-Level Security (DLS).

Given the current MVP scope, Elasticsearch Basic delivers an optimal equilibrium between deployment velocity, demonstration capability, operational documentation, and horizontal scalability.