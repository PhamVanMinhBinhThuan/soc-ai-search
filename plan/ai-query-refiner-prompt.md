# Prompt: AI Query Refiner - Rewrite User Refinement Into a Safer Natural-Language Query

## Role

You are a Senior Full-Stack Engineer specializing in React, TypeScript, Spring Boot, Elasticsearch, Keycloak RBAC, and LLM guardrails for SOC/SIEM products.

## Context

Project: **SOC AI Search**

Current core flow:

```text
User natural-language question
  -> Backend builds prompt for LLM
  -> LLM returns SearchPlan JSON
  -> Backend parses/validates SearchPlan
  -> Backend compiles Elasticsearch DSL
  -> Backend executes search/aggregation
  -> UI shows Query Breakdown, SearchPlan, DSL, results, summary
```

The project already supports:

- Natural-language search.
- Editable SearchPlan.
- Query Breakdown tab.
- SearchPlan validator/compiler.
- Result filters/sort by rerunning a validated SearchPlan.
- Gemini and Mock LLM providers.
- RBAC with Viewer/Analyst/Admin.

## Goal

Implement an **AI Query Refiner** feature.

Instead of asking the LLM to directly patch SearchPlan JSON, the user writes a short refinement/comment, and the system asks the LLM to rewrite the original/current query into one complete natural-language query.

Then the user can confirm and run the rewritten query through the existing safe pipeline:

```text
Original question + user refinement
  -> LLM rewrites into complete natural-language query
  -> UI previews rewritten query
  -> User clicks Run Refined Query
  -> Existing /api/v1/search pipeline generates SearchPlan, validates, compiles, executes
```

Important: the LLM must **not** generate DSL and must **not** execute anything directly.

## Why This Design

This is safer and simpler than asking AI to modify SearchPlan directly:

- It reuses the existing NL -> SearchPlan -> Validator -> Compiler guardrail.
- It avoids giving LLM authority over raw DSL.
- The user can preview the rewritten question before running.
- If Gemini fails, the UI can show a controlled error without affecting current results.

## Functional Requirements

### 1. Backend API

Add a new endpoint, for example:

```http
POST /api/v1/search/refine
```

Request shape:

```json
{
  "original_question": "Show failed login events from China in the last 24h",
  "current_question": "Show failed login events from China in the last 24h",
  "current_search_plan": {
    "mode": "search",
    "filters": {
      "timestamp": { "from": "now-24h", "to": "now" },
      "event_type": ["failed_login"],
      "country_code": ["CN"]
    },
    "page": 0,
    "size": 10
  },
  "refinement": "Add admin or vpn.user and change the time range to 7 days"
}
```

Response shape:

```json
{
  "rewritten_question": "Show failed login events from China for admin or vpn.user in the last 7 days",
  "source": "gemini",
  "latency_ms": 842
}
```

Fallback/error response should be controlled:

```json
{
  "message": "Unable to refine query right now. Please edit the question manually."
}
```

### 2. Backend Service

Add classes similar to:

- `QueryRefinementController`
- `QueryRefinementService`
- `QueryRefinementPromptBuilder`
- `QueryRefinementRequest`
- `QueryRefinementResponse`

Use the existing `LlmClient` abstraction if appropriate.

If `LlmClient` currently only supports SearchPlan/summary methods, extend it carefully or add a small dedicated LLM method with minimal blast radius.

### 3. Prompt Requirements

The prompt must be strict and concise.

System prompt should say:

```text
You rewrite SOC search questions.
Return one complete natural-language question only.
Do not return JSON.
Do not return Elasticsearch DSL.
Do not explain.
Preserve the user's intent.
Apply the refinement to the current/original question.
Use only known SOC fields and values when possible.
If the refinement is unsafe or asks to delete/update data, rewrite it as a read-only search question or refuse with a short safe message.
```

The prompt should include:

- Original question.
- Current question.
- Current SearchPlan as context.
- User refinement.
- Known schema/allowed values:
  - `severity`: critical, high, medium, low
  - `event_type`: failed_login, account_lockout, firewall_block, malware_detected, privilege_escalation, suspicious_outbound, large_transfer, successful_login, dns_query, process_start, file_access
  - `source`: windows-auth, vpn, firewall, edr, proxy, dns
  - known demo users: admin, vpn.user, finance.user, jdoe, svc.backup
  - known demo hosts: vpn-gw-01, dc-01, endpoint-014, endpoint-023, finance-ws-07
  - known demo country codes: CN, VN, US, DE, SG
  - known IP examples: 203.0.113.45, 203.0.113.77, 198.51.100.200, 10.10.1.15

Examples:

```text
Original: Show failed login events from China in the last 24h
Refinement: add admin or vpn.user and make it 7 days
Output: Show failed login events from China for admin or vpn.user in the last 7 days
```

```text
Original: Show events by hour in the last 24h
Refinement: only critical and high severity
Output: Show critical or high severity events by hour in the last 24 hours
```

### 4. Guardrails

The refine endpoint must:

- Reject blank original question.
- Reject blank refinement.
- Limit refinement length, for example max 500 characters.
- Timeout LLM call reasonably.
- Never execute the rewritten question automatically.
- Never create audit/search history until the user actually runs the rewritten query through `/api/v1/search`.
- Never expose stack traces.

If LLM returns markdown, multiline explanation, JSON, or DSL:

- Strip only if safe and deterministic, or reject.
- Prefer rejecting with a controlled error rather than guessing.

### 5. Frontend UI

Add a small panel near `Query Breakdown` in `frontend/src/components/soc/query-transparency.tsx` or a small child component.

Suggested UI:

```text
Refine with AI
Ask AI to rewrite your current query before generating a new SearchPlan.

[ textarea: "Add vpn.user and change time range to 7 days" ]
[ Refine Query ]

AI Rewritten Query:
"Show failed login events from China for admin or vpn.user in the last 7 days"

[Run Refined Query] [Copy] [Reset]
```

UI requirements:

- Dark SOC/SIEM style consistent with Query Breakdown.
- Small, compact, not noisy.
- Do not hide SearchPlan/DSL tabs.
- Show loading state while refining.
- Show controlled error state.
- Preview rewritten query before running.
- Running the refined query should call the existing natural-language search flow, not `/api/v1/search/plan`.
- After running, Query Breakdown/SearchPlan/DSL/results should update normally.

### 6. RBAC

Recommended:

- Viewer can use query refiner only if Viewer can search.
- Analyst/Admin can use it.
- No export/edit permission should be granted by this feature.
- Backend endpoint should require authentication.

If the project already has permission helpers, reuse them.

### 7. Audit Behavior

Do **not** write audit history when the user only clicks `Refine Query`.

Only write audit/history when the user clicks `Run Refined Query` and the normal search pipeline executes.

The question saved in audit should be the rewritten question.

Optionally include a visible UI hint:

```text
This refined query will be audited only after you run it.
```

### 8. Tests

Backend tests:

- Valid request returns rewritten question.
- Blank refinement returns 400.
- Unsafe/malformed LLM output returns controlled error.
- LLM failure returns controlled error.
- No audit record is created by refine-only call.

Frontend tests:

- Refine panel renders.
- User types refinement and clicks Refine Query.
- Loading state appears.
- Rewritten query preview appears.
- Run Refined Query calls existing search handler.
- Error state appears when API fails.

### 9. Verification Commands

Run:

```bash
cd backend
./mvnw test
```

On Windows:

```powershell
cd backend
.\mvnw.cmd test
```

Frontend:

```bash
cd frontend
npm run lint
npm run test
npm run build
```

Also ensure existing CI/CD commands still pass.

## Expected Demo Script

1. Search:

```text
Show failed login events from China in the last 24h
```

2. Open Query Breakdown.
3. In `Refine with AI`, type:

```text
Add admin or vpn.user and change the time range to 7 days
```

4. AI previews:

```text
Show failed login events from China for admin or vpn.user in the last 7 days
```

5. Click `Run Refined Query`.
6. Show that new SearchPlan is generated, validated, compiled, and executed.

## Acceptance Criteria

- User can refine a query using natural language.
- LLM only rewrites the question, not SearchPlan/DSL.
- User must confirm before running.
- Existing SearchPlan guardrail remains the source of truth.
- No audit record is created until the refined query is executed.
- UI is polished and consistent with the existing Query Breakdown/Query Transparency design.
