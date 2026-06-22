# 🎤 5-Minute Executive Demonstration Script - SOC AI Search MVP

<details>
  <summary><b>📖 Table of Contents</b></summary>

  - [⏱️ 0:00 - 0:30 | Executive Overview](#000---030-executive-overview)
  - [⏱️ 0:30 - 1:30 | Analyst Authentication & Search Execution](#030---130-analyst-authentication-search-execution)
  - [⏱️ 1:30 - 2:10 | SearchPlan & DSL Transparency Audit](#130---210-searchplan-dsl-transparency-audit)
  - [⏱️ 2:10 - 2:50 | Event Drilldown & Raw Log Inspection](#210---250-event-drilldown-raw-log-inspection)
  - [⏱️ 2:50 - 3:30 | Analytical Aggregations & Visualizations](#250---330-analytical-aggregations-visualizations)
  - [⏱️ 3:30 - 4:00 | Secure CSV Extraction & Query History](#330---400-secure-csv-extraction-query-history)
  - [⏱️ 4:00 - 4:35 | RBAC Verification & System Auditing](#400---435-rbac-verification-system-auditing)
  - [⏱️ 4:35 - 5:00 | Production Infrastructure & Resilience](#435---500-production-infrastructure-resilience)
  - [📚 Appendix: Contingency Queries](#appendix-contingency-queries)
</details>

**Objective:** Execute a concise, high-impact demonstration showcasing the AI Search pipeline, SearchPlan architecture, DSL transparency, Analytical Results, Role-Based Access Control (RBAC), System Audit Logging, and the CI/CD deployment pipeline. 

*Security Directive: Demonstration credentials must be transmitted via secure out-of-band channels and must never be recorded within the repository.*

## ⏱️ 0:00 - 0:30 | Executive Overview

1. 🌐 Navigate to `https://soc-ai-search.app`.
2. 🗣️ Deliver the opening statement:
   - "Welcome to the SOC Investigation Console."
   - "This platform empowers security analysts to query complex event datasets using natural language (English or Vietnamese)."
   - "Crucially, the Large Language Model (LLM) is strictly confined to generating a structured `SearchPlan`. The backend system enforces hard guardrails, validates the plan, and compiles it into actionable Elasticsearch DSL."
   - "Elasticsearch functions as our primary event store, while PostgreSQL maintains the immutable audit trail and query history."

## ⏱️ 0:30 - 1:30 | Analyst Authentication & Search Execution

1. 🔐 Authenticate utilizing an identity provisioned with the `SOC_ANALYST` role.
2. 🔍 Execute the primary search query:

```text
Show me failed login attempts from China in the last 24h
```

3. 👁️ Highlight the following UI elements:
   - ⚙️ **Mode:** `search`.
   - 🔢 **Total Events:** Real-time document hit count.
   - 🤖 **AI Summary Block:** Contextual analysis of the result set.
   - 📊 **Raw Events Table:** Paginated log data view.
   - ⏱️ **Operational Telemetry:** Query latencies (if displayed).

**Core Messaging Point:**

> "Analysts are no longer required to possess deep expertise in Elasticsearch DSL. The system intelligently architects a controlled query plan while explicitly exposing the underlying DSL to guarantee absolute operational transparency."

## ⏱️ 1:30 - 2:10 | SearchPlan & DSL Transparency Audit

1. 📂 Expand the **SearchPlan** inspection panel.
2. 📂 Expand the **Generated DSL** inspection panel.
3. 🛡️ Highlight the architectural safety mechanisms:
   - 📄 The `search_plan` is transmitted as a natively structured JSON object.
   - 📄 The `generated_dsl` is transmitted as a structured JSON object, completely bypassing string escaping.
   - 🎯 Point out the active filters: `event_type`, `country_code`, and `timestamp`.
   - 📉 Highlight the enforced sorting mechanism (Timestamp Descending).

**Core Messaging Point:**

> "This is our primary architectural guardrail: The LLM is structurally prohibited from injecting arbitrary or unvalidated DSL directly into the Elasticsearch cluster."

## ⏱️ 2:10 - 2:50 | Event Drilldown & Raw Log Inspection

1. 🖱️ Interact with a specific event row or click the **View** action.
2. 🖥️ Launch the **Event Detail Drawer**.
3. 🔬 Highlight the forensic capabilities:
   - 📑 The **Formatted Fields** tab.
   - 📜 The **Raw Log** payload.
   - 🔗 Emphasize that the `event_id` maps perfectly to the underlying Elasticsearch document `_id`.

**Core Messaging Point:**

> "The search list intentionally returns a streamlined response to optimize payload size, whereas the detail endpoint fetches the comprehensive raw log to facilitate deep forensic investigations."

## ⏱️ 2:50 - 3:30 | Analytical Aggregations & Visualizations

1. 📈 Execute an aggregation query:

```text
Show the top 10 IP addresses with the most alerts this month
```

Or an alternative structural query:

```text
Count failed login events grouped by user over the last 7 days
```

2. 👁️ Highlight the analytical UI elements:
   - ⚙️ **Mode:** `aggregation`.
   - 📊 The automated deployment of the **Analytics View**.
   - 📈 The interactive **Recharts** visualization.
   - 📋 The **Summary Data Table**.
   - 🗄️ The underlying `aggregation_results` and `chart_metadata` JSON payloads.

**Core Messaging Point:**

> "The backend standardizes the aggregation response geometry. This intentionally decouples the frontend architecture from the underlying Elasticsearch response shape, enabling UI stability."

## ⏱️ 3:30 - 4:00 | Secure CSV Extraction & Query History

1. 📤 While authenticated as an Analyst, click the **Export CSV** action.
2. 📜 Navigate to the **Recent Investigations** history sheet.
3. 🔄 Highlight the **Run Again** functionality.

**Core Messaging Point:**

> "Our export mechanism strictly refuses client-supplied DSL. The backend forcefully replays the stored query utilizing its cryptographic `query_id`, re-validates the SearchPlan, re-compiles the DSL, and executes the extraction with a hard safety limit of 10,000 rows."

## ⏱️ 4:00 - 4:35 | RBAC Verification & System Auditing

*(If time permits for dynamic credential swapping):*

1. 🚪 Terminate the Analyst session.
2. 👁️ Authenticate as a Viewer. Demonstrate that the **Export CSV** and **Audit Logs** actions are structurally locked in the UI and actively rejected (HTTP 403) by the backend.
3. 👮 Authenticate as an Admin. Launch the **System Audit Logs** interface.

*(If operating under strict time constraints):*

- 🗣️ Verbally outline the RBAC Entitlement Matrix:
  - 👤 `SOC_VIEWER`: Read-only access to dashboard and search operations.
  - 🕵️ `SOC_ANALYST`: Inherits Viewer rights + Authorized for CSV data extraction.
  - 👑 `SOC_ADMIN`: Inherits Analyst rights + Authorized to inspect system audit logs.

**Core Messaging Point:**

> "The React frontend operates solely as a UX gating layer; the true perimeter defense is enforced deep within the backend utilizing Spring Security and Keycloak RBAC policies."

## ⏱️ 4:35 - 5:00 | Production Infrastructure & Resilience

1. 🌐 Briefly highlight the live production domains:
   - `https://soc-ai-search.app`
   - `https://api.soc-ai-search.app`
   - `https://auth.soc-ai-search.app`
2. 🏗️ Summarize the deployment and CI/CD topology:
   - ☁️ "The platform is actively deployed across DigitalOcean infrastructure, utilizing Name.com for DNS and Caddy for edge termination."
   - 🤖 "GitHub Actions powers the CI pipeline, enforcing Backend verification, Frontend linting/testing, and configuration validation."
   - 🚀 "The CD pipeline automates secure deployments to the VPS via SSH upon passing all CI gates."
   - 🛡️ "Architectural resilience: Should the Gemini LLM provider experience an outage, the search pipeline automatically executes a deterministic fallback summary, guaranteeing an uninterrupted user experience."

**Closing Statement:**

> "This Minimum Viable Product successfully operationalizes the complete investigative lifecycle: Natural language ingestion, DSL transparency, high-speed aggregation, forensic log inspection, AI-driven summarization, immutable auditing, secure data extraction, enterprise RBAC, and automated HTTPS deployments."

## 📚 Appendix: Contingency Queries

**Standard Search Execution:**

```text
Find critical alerts over the past 7 days
```

**Aggregation Execution (`group_by` operation):**

```text
Count failed login events grouped by user over the last 7 days
```

**Aggregation Execution (`date_histogram` operation):**

```text
Show the number of events per hour over the last 24 hours
```

**LLM Instability Mitigation:**

If the external Gemini provider exhibits instability during the demonstration, immediately toggle the local environment to utilize the mock provider:

```env
LLM_PROVIDER=mock
```

*Architectural Note:* Summary fallback mechanisms are an intentional architectural design. LLM failures are deliberately engineered to gracefully degrade without compromising the core search execution.