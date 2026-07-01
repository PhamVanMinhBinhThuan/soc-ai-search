# Prompt: AI Follow-up Suggestions

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

Current suggested queries are static. This task adds optional AI-generated follow-up suggestions based on the current successful search result.

## Goal

Implement **AI Follow-up Suggestions**:

After a successful search or aggregation, the system may ask Gemini to generate exactly 3 useful next investigation questions based on the current query/result context.

Important product decision:

- This feature is **AI-only**.
- If Gemini is disabled, fails, times out, hits quota, or returns invalid output, **hide the AI Follow-up Suggestions section**.
- Do **not** implement static fallback for this feature.
- Static Query Library / Playbooks already exist elsewhere and should stay separate.

## UX Decision

When the user clicks a follow-up suggestion:

```text
Click suggestion
  -> fill the main search input with suggestion.question
  -> focus the search input
  -> do NOT execute search automatically
```

The user must press the existing Search button manually.

Reason:

- AI only suggests next questions.
- User remains in control.
- No hidden token/API/search cost.
- The user can edit the suggested question before running it.

Do not add a `Run` button for follow-up suggestions in this task.

## Functional Requirements

### 1. Backend API

Add an endpoint, for example:

```http
POST /api/v1/suggestions/follow-up
```

Requires the same permission as search:

```text
SOC_VIEWER or auth disabled
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
      "question": "Show the top 5 source IPs for failed_login events in the last 24 hours"
    },
    {
      "title": "Affected users",
      "question": "Group failed_login events by user in the last 24 hours"
    },
    {
      "title": "Failed login trend",
      "question": "Show failed_login trend by hour in the last 24 hours"
    }
  ]
}
```

No `category`, no `result_type`, no `reason`, no `confidence`.

The LLM and backend should only return:

- `title`
- `question`

### 2. No Static Fallback

If any of these happens:

- Gemini provider is disabled;
- LLM provider is mock;
- Gemini quota/rate limit is hit;
- Gemini returns invalid JSON;
- Gemini returns unsafe content;
- Gemini returns fewer/more than 3 suggestions;
- backend validation fails;

then return either:

```json
{
  "source": "none",
  "suggestions": []
}
```

or a controlled 204/empty response, whichever matches the existing API style better.

Frontend must hide the whole AI Follow-up Suggestions section when there are no suggestions.

Do not show:

- static fallback;
- playbook fallback;
- error banner;
- scary failure UI.

Optional: log server-side warning for debugging, but do not expose noisy errors to the user.

### 3. Backend Classes

Add classes similar to:

- `FollowUpSuggestionController`
- `FollowUpSuggestionService`
- `FollowUpSuggestionPromptBuilder`
- `FollowUpSuggestionRequest`
- `FollowUpSuggestionResponse`
- `FollowUpSuggestion`
- `FollowUpSuggestionException` if needed

Reuse existing `LlmClient` if appropriate. If the current abstraction is too specific, extend carefully with a small method such as:

```java
LlmResponse generateFollowUpSuggestions(FollowUpSuggestionLlmRequest request);
```

Do not mix this feature with:

- Query Library;
- static investigation playbooks;
- AI Query Correction;
- result summary generation.

### 4. Prompt Requirements

Prompt must be strict:

```text
You generate next-step SOC investigation questions.
Return JSON only.
Return exactly 3 suggestions.
Each suggestion must contain only title and question.
Each question must be a natural-language search question.
Do not return Elasticsearch DSL.
Do not return SearchPlan JSON.
Do not execute anything.
Do not include explanations, markdown, confidence, category, or result_type.
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

### 5. Language Rule

Suggestions should follow the language of the original user question.

Rule:

- If the original question contains more than one Vietnamese word, generate Vietnamese suggestions.
- If the original question is fully English, generate English suggestions.

However, even when writing Vietnamese, keep SOC schema values and mock dataset terms in English/canonical form to improve SearchPlan accuracy.

Examples of terms that should stay canonical:

```text
failed_login
account_lockout
firewall_block
malware_detected
privilege_escalation
suspicious_outbound
large_transfer
successful_login
dns_query
process_start
file_access
critical
high
medium
low
windows-auth
vpn
firewall
edr
proxy
dns
admin
vpn.user
finance.user
jdoe
svc.backup
vpn-gw-01
dc-01
endpoint-014
endpoint-023
finance-ws-07
CN
VN
US
DE
SG
```

Good Vietnamese examples:

```json
[
  {
    "title": "Top IP failed_login",
    "question": "Thống kê top 5 IP có nhiều failed_login nhất trong 24h qua"
  },
  {
    "title": "User bị ảnh hưởng",
    "question": "Group failed_login theo user trong 24h qua"
  },
  {
    "title": "Xu hướng theo giờ",
    "question": "Hiển thị failed_login theo giờ trong 24h qua"
  }
]
```

Avoid translating canonical values into vague Vietnamese terms if it makes search less accurate.

Bad:

```text
Thống kê đăng nhập thất bại theo người dùng
```

Better:

```text
Group failed_login theo user trong 24h qua
```

### 6. Example Output

English:

```json
[
  {
    "title": "Top source IPs",
    "question": "Show the top 5 source IPs for failed_login events in the last 24 hours"
  },
  {
    "title": "Affected users",
    "question": "Group failed_login events by user in the last 24 hours"
  },
  {
    "title": "Failed login trend",
    "question": "Show failed_login trend by hour in the last 24 hours"
  }
]
```

Vietnamese:

```json
[
  {
    "title": "Top IP failed_login",
    "question": "Thống kê top 5 IP có nhiều failed_login nhất trong 24h qua"
  },
  {
    "title": "User bị ảnh hưởng",
    "question": "Group failed_login theo user trong 24h qua"
  },
  {
    "title": "Xu hướng theo giờ",
    "question": "Hiển thị failed_login theo giờ trong 24h qua"
  }
]
```

### 7. Output Validation

The backend must validate LLM suggestions before returning them:

- Must parse JSON array.
- Must contain exactly 3 items.
- Each item must have only `title` and `question`.
- `title` must be nonblank and max 60 characters.
- `question` must be nonblank and max 240 characters.
- Reject markdown.
- Reject Elasticsearch DSL.
- Reject SearchPlan JSON.
- Reject dangerous words like delete, update, drop index, script, query_string, password dump.
- Deduplicate similar titles/questions.

If validation fails, return empty suggestions and hide the frontend section.

### 8. Frontend UI

Add a compact section near the search result area, preferably below AI Summary or near Query Result:

```text
AI Follow-up Suggestions
[badge: AI]

1. Top source IPs
   Show the top 5 source IPs for failed_login events in the last 24 hours

2. Affected users
   Group failed_login events by user in the last 24 hours

3. Failed login trend
   Show failed_login trend by hour in the last 24 hours
```

UI requirements:

- Dark SOC/SIEM style consistent with current app.
- Compact and not noisy.
- Show a subtle loading skeleton while suggestions are being generated.
- Hide the section if suggestions are empty or invalid.
- Do not show fallback badge.
- Do not show error banner.
- Do not show `Run` button.
- Clicking a suggestion card:
  - fills the main search box with `suggestion.question`;
  - focuses the search input;
  - does not execute search.

### 9. Search Input Focus

If the search input is currently a textarea/input in `SearchSection`, expose a ref/callback cleanly:

- avoid direct DOM query selectors if possible;
- prefer React refs or an `onFocusSearchInput` callback;
- keep existing search behavior unchanged.

Expected UX:

```text
User clicks follow-up suggestion
  -> search box value changes
  -> cursor/focus moves to search box
  -> user can edit
  -> user presses Search manually
```

### 10. When to Call Suggestions

Call follow-up suggestions only after:

- a successful natural-language search;
- a successful edited SearchPlan execution if it still has enough context;
- a successful AI-corrected/refined query execution if it still has enough context.

Do **not** call suggestions for:

- Dashboard auto-refresh.
- Pagination-only changes.
- Result filter/sort reruns.
- Failed search requests.
- Empty results if there is not enough context.

### 11. Audit Behavior

Do not create audit history just because suggestions are generated.

Audit/history should only be created when the user manually presses Search and the suggested question goes through the existing search pipeline.

### 12. RBAC

Any authenticated user who can search may see follow-up suggestions.

Do not grant export/edit/admin permissions.

### 13. Tests

Backend tests:

- LLM success returns exactly 3 suggestions with only title/question.
- LLM returns markdown -> empty suggestions.
- LLM returns invalid JSON -> empty suggestions.
- LLM returns unsafe question -> empty suggestions.
- Gemini failure -> empty suggestions.
- Mock provider / disabled provider -> empty suggestions.
- Suggestions endpoint does not create audit records.
- Vietnamese input with more than one Vietnamese word asks for Vietnamese suggestions while preserving canonical SOC terms.

Frontend tests:

- Loading state renders.
- LLM suggestions render.
- Empty suggestions hide the section.
- Clicking a suggestion fills the search box and focuses it.
- Clicking a suggestion does not call the search submit handler.
- Suggestions are not requested on pagination-only changes.

### 14. Verification Commands

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
Show the top 5 source IPs for failed_login events in the last 24 hours
```

5. Show that the search box is filled and focused.
6. Press Search manually.
7. Explain:

> The suggestions are only natural-language questions. They are not executed automatically and still go through SearchPlan validation and DSL compilation after the user confirms by pressing Search.

## Acceptance Criteria

- System can generate 3 useful follow-up questions after a successful search.
- LLM response includes only `title` and `question`.
- If Gemini fails or returns invalid output, no suggestions are shown.
- No static fallback is implemented for this feature.
- Suggestions do not create audit records until the user manually searches.
- Clicking a suggestion fills and focuses the search input, but does not auto-search.
- UI is polished, compact, and consistent with the SOC dark theme.
