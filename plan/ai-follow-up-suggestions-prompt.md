# Prompt: AI Follow-up Suggestions With Static Playbook Fallback

## Role

You are a Senior Full-Stack Engineer specializing in React, TypeScript, Spring Boot, Elasticsearch, SOC/SIEM workflows, and safe LLM integrations.

## Context

Project: **SOC AI Search**

The application already supports:

- Natural-language event search.
- SearchPlan validation and DSL compilation.
- Query Breakdown / SearchPlan / DSL transparency.
- Static Query Library / Investigation Playbooks.
- Dashboard and Investigations pages.
- Gemini or Mock LLM provider.
- RBAC and audit/history.

Current suggestions are static playbook-style questions. They are stable and good for demo, but not personalized to the current result.

## Goal

Implement **AI Follow-up Suggestions**:

After a successful search or aggregation, the system optionally asks Gemini to generate 3 useful next investigation questions based on the current query/result context.

If Gemini fails, returns invalid output, or is disabled, the UI falls back to deterministic static playbook suggestions.

Important:

- Suggestions are only natural-language questions.
- Suggestions are **not executed automatically**.
- When a user clicks a suggestion, it goes through the existing normal pipeline:

```text
Suggested question
  -> NL Search API
  -> LLM SearchPlan
  -> Parser/Validator
  -> Compiler
  -> Elasticsearch
```

## Functional Requirements

### 1. Backend API

Add an endpoint, for example:

```http
POST /api/v1/suggestions/follow-up
```

Request shape:

```json
{
  "question": "Show failed login attempts from China in the last 24h",
  "search_plan": {
    "mode": "search",
    "filters": {
      "timestamp": { "from": "now-24h", "to": "now" },
      "event_type": ["failed_login"],
      "country_code": ["CN"]
    },
    "page": 0,
    "size": 10
  },
  "result_count": 188,
  "mode": "search",
  "sample_events": [
    {
      "event_type": "failed_login",
      "severity": "high",
      "user": "admin",
      "host": "vpn-gw-01",
      "ip": "203.0.113.45",
      "country_code": "CN"
    }
  ],
  "aggregation_buckets": []
}
```

Response shape:

```json
{
  "source": "llm",
  "suggestions": [
    {
      "title": "Top source IPs",
      "question": "Show the top 5 source IPs for failed login events in the last 24 hours",
      "category": "BRUTE_FORCE",
      "result_type": "TOP_N"
    }
  ]
}
```

Fallback response:

```json
{
  "source": "static_fallback",
  "suggestions": [
    {
      "title": "Top source IPs",
      "question": "Show the top 5 source IPs with the most events in the last 30 days",
      "category": "GENERAL",
      "result_type": "TOP_N"
    }
  ]
}
```

### 2. Backend Classes

Add classes similar to:

- `FollowUpSuggestionController`
- `FollowUpSuggestionService`
- `FollowUpSuggestionPromptBuilder`
- `FollowUpSuggestionRequest`
- `FollowUpSuggestionResponse`
- `FollowUpSuggestion`
- `StaticFollowUpSuggestionProvider`

Reuse existing `LlmClient` if appropriate. If the current abstraction is too specific, extend carefully with a small method such as:

```java
LlmResponse generateFollowUpSuggestions(FollowUpSuggestionLlmRequest request);
```

### 3. Prompt Requirements

Prompt must be strict:

```text
You generate next-step SOC investigation questions.
Return JSON only.
Return exactly 3 suggestions.
Each suggestion must be a natural-language question.
Do not return Elasticsearch DSL.
Do not return SearchPlan JSON.
Do not execute anything.
Use only known SOC fields, event types, severities, sources, users, hosts, IPs, and country codes when possible.
Prefer questions that are likely to return results in the current synthetic dataset.
```

Known dataset values:

- `severity`: critical, high, medium, low
- `event_type`: failed_login, account_lockout, firewall_block, malware_detected, privilege_escalation, suspicious_outbound, large_transfer, successful_login, dns_query, process_start, file_access
- `source`: windows-auth, vpn, firewall, edr, proxy, dns
- users: admin, vpn.user, finance.user, jdoe, svc.backup
- hosts: vpn-gw-01, dc-01, endpoint-014, endpoint-023, finance-ws-07
- countries: CN, VN, US, DE, SG
- IP examples: 203.0.113.45, 203.0.113.77, 198.51.100.200, 10.10.1.15

Example output:

```json
[
  {
    "title": "Top source IPs",
    "question": "Show the top 5 source IPs for failed login events in the last 24 hours",
    "category": "BRUTE_FORCE",
    "result_type": "TOP_N"
  },
  {
    "title": "Affected users",
    "question": "Group failed login events by user in the last 24 hours",
    "category": "BRUTE_FORCE",
    "result_type": "GROUP_BY"
  },
  {
    "title": "Failed login trend",
    "question": "Show failed login trend by hour in the last 24 hours",
    "category": "BRUTE_FORCE",
    "result_type": "LINE_CHART"
  }
]
```

### 4. Output Validation

The backend must validate LLM suggestions before returning them:

- Must parse JSON array.
- Must contain exactly 3 items.
- Each item must have nonblank `title` and `question`.
- Question length must be reasonable, for example max 240 characters.
- Reject suggestions containing dangerous words like delete, update, drop index, script, query_string, password dump.
- Deduplicate similar questions.

If validation fails, return static fallback suggestions.

### 5. Static Fallback

Fallback suggestions should be deterministic and dataset-safe.

Examples:

For failed login / brute force:

```text
Show the top 5 source IPs for failed login events in the last 24 hours
Group failed login events by user in the last 24 hours
Show failed login trend by hour in the last 24 hours
```

For malware:

```text
Group malware detected events by host in the last 30 days
Show EDR events in the last 7 days
Count critical malware detected events in the last 30 days
```

For privilege escalation:

```text
Show privilege escalation events by admin in the last 30 days
Group privilege escalation events by host in the last 30 days
Show critical events by hour in the last 24 hours
```

For generic:

```text
Group events by severity in the last 24 hours
Show the top 5 source IPs with the most events in the last 30 days
Show events by hour in the last 24 hours
```

### 6. Frontend UI

Add a compact section near the search result area, preferably below AI Summary or near Suggested Queries:

```text
AI Follow-up Suggestions
[badge: AI] or [badge: Playbook fallback]

1. Top source IPs
   Show the top 5 source IPs for failed login events in the last 24 hours
   [Run]

2. Affected users
   Group failed login events by user in the last 24 hours
   [Run]

3. Failed login trend
   Show failed login trend by hour in the last 24 hours
   [Run]
```

UI requirements:

- Dark SOC/SIEM style consistent with current app.
- Do not make the page noisy.
- Show skeleton/loading while suggestions are generated.
- If LLM fails and fallback is used, show a subtle badge: `Playbook fallback`.
- If suggestions fail completely, hide the section or show a small controlled error.
- Clicking a suggestion should either:
  - fill the search box and focus it, or
  - run the query immediately.

Recommended behavior:

- Click card body: fill search box.
- Click `Run`: execute immediately.

### 7. When to Call Suggestions

Call follow-up suggestions only after:

- A successful natural-language search.
- A successful edited/refined query execution if there is enough context.

Do **not** call suggestions for:

- Dashboard auto-refresh.
- Pagination-only changes.
- Result filter/sort reruns if this would cause too much noise.
- Failed search requests.

### 8. Audit Behavior

Do not create audit history just because suggestions are generated.

Audit/history should only be created when the user actually runs one of the suggested questions through the existing search pipeline.

### 9. RBAC

Any authenticated user who can search may see follow-up suggestions.

Do not grant export/edit/admin permissions.

### 10. Tests

Backend tests:

- LLM success returns 3 suggestions.
- LLM returns markdown -> fallback static.
- LLM returns invalid JSON -> fallback static.
- LLM returns unsafe question -> fallback static.
- Gemini failure -> fallback static.
- Suggestions endpoint does not create audit records.

Frontend tests:

- Loading state renders.
- LLM suggestions render.
- Fallback badge renders when source is `static_fallback`.
- Clicking Run calls existing search handler with suggestion question.
- Suggestions are not requested on pagination-only changes.

### 11. Verification Commands

Backend:

```bash
cd backend
./mvnw test
```

Windows:

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

CI/CD should still pass.

## Expected Demo Script

1. Run:

```text
Show failed login attempts from China in the last 24h
```

2. Show results and AI Summary.
3. Show `AI Follow-up Suggestions`.
4. Click:

```text
Show the top 5 source IPs for failed login events in the last 24 hours
```

5. Show bar chart/top IP result.
6. Explain:

> The suggestions are only natural-language questions. They are not executed directly and still go through SearchPlan validation and DSL compilation.

## Acceptance Criteria

- System can generate 3 useful follow-up questions after a successful search.
- If Gemini fails, static fallback suggestions appear.
- Suggestions are natural-language only.
- Suggestions do not create audit records until executed.
- Clicking a suggestion runs the existing safe search pipeline.
- UI is polished, compact, and consistent with the SOC dark theme.
