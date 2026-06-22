# 💻 Technology Stack Matrix - SOC AI Search MVP

<details open>
  <summary><b>📖 Table of Contents</b></summary>

  - [🚀 1. Executive Summary](#1-executive-summary)
  - [🛠️ 2. Core Technology Matrix](#2-core-technology-matrix)
  - [🖥️ 3. Frontend Architecture](#3-frontend-architecture)
  - [⚙️ 4. Backend Engine Architecture](#4-backend-engine-architecture)
  - [🔍 5. Elasticsearch Topography](#5-elasticsearch-topography)
  - [🗄️ 6. PostgreSQL Topography](#6-postgresql-topography)
  - [🤖 7. Large Language Model (LLM) Integration](#7-large-language-model-llm-integration)
  - [🔑 8. Identity & Authorization (RBAC)](#8-identity-authorization-rbac)
  - [🚀 9. Production Deployment Topology](#9-production-deployment-topology)
  - [🚫 10. Explicitly Excluded Technologies (MVP Scope)](#10-explicitly-excluded-technologies-mvp-scope)
</details>

## 🚀 1. Executive Summary

The SOC AI Search MVP is engineered as a robust modular monolith, coupling a React-based frontend SPA with a Spring Boot backend engine. The infrastructure leverages Elasticsearch as the primary event store, PostgreSQL for immutable audit/history logging, Keycloak for enterprise-grade OIDC authentication, Caddy as the edge HTTPS reverse proxy, and GitHub Actions to orchestrate continuous integration and continuous deployment (CI/CD) pipelines.

## 🛠️ 2. Core Technology Matrix

| Category | Technologies | Architectural Responsibility |
| --- | --- | --- |
| **🖥️ Frontend** | ![Next.js](https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white) ![React](https://img.shields.io/badge/react-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white) | SOC investigation and visualization console. Standardized dark theme, atomic components, charting. |
| **⚙️ Backend** | ![Java](https://img.shields.io/badge/java-%23ED8B00.svg?style=for-the-badge&logo=openjdk&logoColor=white) ![Spring Boot](https://img.shields.io/badge/spring_boot-%236DB33F.svg?style=for-the-badge&logo=spring-boot&logoColor=white) | REST API provisioning, pipeline orchestration, JSON validation, DSL compilation, JWT verification. |
| **💾 Data & Search** | ![Elasticsearch](https://img.shields.io/badge/elasticsearch-%23005571.svg?style=for-the-badge&logo=elasticsearch&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/postgresql-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white) | High-velocity event storage, text search, bucket aggregation, immutable audit logging, and query history. |
| **🛡️ DevOps & Security & AI** | ![Keycloak](https://img.shields.io/badge/Keycloak-EE0000?style=for-the-badge&logo=keycloak&logoColor=white) ![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white) ![DigitalOcean](https://img.shields.io/badge/DigitalOcean-%230080FF.svg?style=for-the-badge&logo=DigitalOcean&logoColor=white) ![GitHub Actions](https://img.shields.io/badge/github%20actions-%232671E5.svg?style=for-the-badge&logo=githubactions&logoColor=white) ![Gemini](https://img.shields.io/badge/Google_Gemini-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white) | IAM, OIDC lifecycle, Containerization, Public-facing hosting, CI/CD, NLP SearchPlan generation. |

## 🖥️ 3. Frontend Architecture

**Frontend Operational Responsibilities:**

- 🔍 Ingesting raw natural language search queries.
- 📄 Rendering the `search_plan` and `generated_dsl` artifacts as strictly formatted JSON structures to ensure transparency.
- 📊 Displaying paginated raw event data tables, detailed forensic inspection drawers, and raw log payloads.
- 📈 Plotting analytical aggregation charts paired with supplementary statistical tables.
- 🤖 Exposing contextual AI summaries, query execution latencies, current operational modes, result counts, and historical logs.
- 🛡️ Enforcing superficial, UI-level RBAC (hiding unauthorized buttons) while acknowledging the backend as the ultimate security authority.

**Crucial Implementation Directives:**

- ⚙️ `VITE_*` environmental variables are explicitly injected at build-time. Modifying these variables structurally requires a full rebuild of the frontend container.
- 🔧 Setting `VITE_USE_MOCK=true` enforces an air-gapped mock UI environment, accelerating frontend development without backend dependencies.
- 🌐 Production Target `VITE_API_BASE_URL` strictly maps to `https://api.soc-ai-search.app`.
- 🔑 Production Target `VITE_KEYCLOAK_AUTHORITY` strictly maps to `https://auth.soc-ai-search.app/realms/soc-ai-search`.

## ⚙️ 4. Backend Engine Architecture

**Backend Operational Responsibilities:**

- 🌐 Provisioning REST APIs mapped via Swagger OpenAPI.
- 📥 Orchestrating single and bulk event ingestion alongside forensic detail lookups.
- 🧠 Constructing context-aware LLM prompts and executing strict parsing of JSON responses.
- 🛡️ Enforcing aggressive SearchPlan validation guardrails.
- 🔨 Operating the SearchPlan compiler to safely generate Elasticsearch Query DSL.
- ⚡ Executing multi-threaded search and aggregation cluster queries.
- 📝 Managing asynchronous, best-effort LLM summarization.
- 💾 Persisting immutable audit logs and historical query data into PostgreSQL.
- 🔐 Governing secure CSV export replays decoupled from client DSL injection.
- 🛂 Mapping Keycloak JWT claims to internal Spring Security realm roles for definitive authorization.

*Structural Note:* Backend modules are structurally organized by capability domain, not physically segregated into microservices. Inter-module communication relies on high-speed internal Java method invocations within a unified Spring Boot application context.

## 🔍 5. Elasticsearch Topography

Elasticsearch `9.4.2` Basic functions as the exclusive SOC event store for the MVP.

**Core Schema Mapping:**

| Field Name | Elasticsearch Data Type |
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

*Compiler Constraint:* The compiler algorithm deliberately omits appending `.keyword` modifiers, as the MVP mapping statically defines all aggregatable fields as native `keyword` or `ip` types at the cluster level.

## 🗄️ 6. PostgreSQL Topography

PostgreSQL functions exclusively as the metadata and application state repository:

- 📜 Maintains comprehensive historical query logs.
- 🛡️ Stores the immutable administrative audit log.
- 📸 Snapshots point-in-time SearchPlans and generated DSL payloads.
- 💾 Caches AI-generated summaries and identifies their origin (LLM vs. Fallback).
- ⏱️ Tracks execution latencies and total hit counts.
- 📤 Serves as the authoritative data source required for authenticated CSV export replays.

*Hard Constraint:* PostgreSQL is strictly prohibited from storing or indexing SOC event documents.

## 🤖 7. Large Language Model (LLM) Integration

**Supported Providers:**

- `mock`: A highly deterministic, air-gapped provider utilized for local development, automated testing, and CI environments; inherently bypasses external API key requirements.
- `gemini`: The hosted Google Gemini provider deployed for live integration testing and public demonstrations, configured securely via runtime API keys.

**LLM Security Constraints:**

- 🛡️ The LLM is restricted to generating pure JSON `SearchPlan` documents; it must never output Elasticsearch DSL.
- 🚫 The system parser aggressively rejects markdown formatting, conversational prose, unknown keys, and non-object JSON payloads.
- 🔄 The backend bounds LLM repair/retry logic to a maximum of one cycle to prevent cascading failures.
- ⚡ Summarization is executed as a non-blocking, best-effort task with deterministic fallbacks to guarantee search reliability.
- 🔒 Under no circumstances are raw forensic logs or comprehensive event documents transmitted externally to the LLM.

## 🔑 8. Identity & Authorization (RBAC)

- **Target Keycloak Realm:** `soc-ai-search`.
- **Target Frontend Client:** `soc-ai-search-frontend`.
- **Authorized Enterprise Roles:**
  - `SOC_VIEWER`
  - `SOC_ANALYST`
  - `SOC_ADMIN`

Spring Security extracts `realm_access.roles` to instantiate `ROLE_*` authorities, applying a hierarchical evaluation model ensuring administrators natively inherit all analyst and viewer capabilities.

## 🚀 9. Production Deployment Topology

The production architecture mandates:

- ☁️ DigitalOcean Droplets running hardened Ubuntu environments.
- 🌐 Name.com functioning as the primary DNS routing authority.
- 🔒 Caddy acting as the reverse proxy managing automatic TLS/HTTPS termination.
- 🐳 Docker Compose executing explicit `auth` and `proxy` configuration profiles.
- 🚢 GitHub Actions orchestrating continuous delivery over secured SSH connections.

**Production Port Exposure Matrix:**

| Port | Public Edge Exposure | Infrastructure Purpose |
| --- | --- | --- |
| `22` | **Yes** | Authorized SSH Management |
| `80` | **Yes** | Caddy HTTP ACME Challenge & Redirects |
| `443` | **Yes** | Secure HTTPS Traffic |
| `3000` | No | Frontend container (Local loopback only) |
| `8081` | No | Backend API container (Local loopback only) |
| `8082` | No | Keycloak IdP container (Local loopback only) |
| `9200` | No | Elasticsearch node (Local loopback only) |
| `5433` | No | PostgreSQL instance (Host loopback only) |
| `5601` | No | Kibana diagnostics (Optional local tool) |

## 🚫 10. Explicitly Excluded Technologies (MVP Scope)

To minimize deployment complexity while maximizing demonstration velocity, the following technologies are explicitly excluded from the current MVP deployment architecture: AWS managed services, Route53, Nginx Edge Proxies, Certbot, Jenkins, ArgoCD, and Kubernetes. Nginx is solely authorized to serve static assets internally within the frontend container boundaries; the public edge reverse proxy remains exclusively Caddy.