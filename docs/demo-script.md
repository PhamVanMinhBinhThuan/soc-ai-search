# Demo Script - SOC AI Search

Target duration: 5-7 minutes.

## 1. Opening

Open:

```text
https://soc-ai-search.app
```

Say:

> This project helps SOC analysts search and investigate security events using natural language. The key point is that AI does not query Elasticsearch directly. AI only proposes a SearchPlan; the backend validates and compiles it into safe Elasticsearch DSL.

## 2. Login as Analyst

Use an analyst account.

Show:

- role badge
- dark SOC console
- Event Search page

## 3. Run a Search Query

Query:

```text
Show me failed login attempts from China in the last 24h
```

Show:

- total events
- AI Summary
- Query Result table
- Event logs pagination
- result filter/sort panel

Say:

> The user writes a question, but the backend controls how it becomes a query.

## 4. Explain Query Transparency

Open Query Transparency.

Show:

1. Query Breakdown
2. Validated SearchPlan
3. Compiled DSL

Say:

> Query Breakdown is for analysts who do not want to read JSON. SearchPlan and DSL are still available for audit and technical review.

## 5. Event Detail

Click an event row.

Show:

- formatted fields
- raw log tab

Say:

> The table is optimized for scanning. Full forensic detail is loaded only when needed.

## 6. Correct or Refine Query

Use feedback such as:

```text
Change the time range to last 7 days and include vpn.user
```

Show that the system reruns the query.

Say:

> This is a human-in-the-loop correction flow. The AI rewrites the natural language question, then the backend runs the same safe SearchPlan pipeline.

## 7. Aggregation Demo

Query:

```text
Show the top 5 source IPs with the most events in the last 30 days
```

Show:

- bar chart
- aggregation table
- Query Breakdown showing aggregation intent

Alternative line chart:

```text
Show failed login trend by hour in the last 24 hours
```

Say:

> The system supports both raw event search and analytical aggregation.

## 8. Query Library

Open:

```text
/query-library
```

Show:

- category filters
- search input
- copy button
- use query button
- 5-query pagination

Say:

> Query Library is static and deterministic. It gives analysts demo-safe starting points based on the synthetic dataset.

## 9. Next Investigation Steps

After a successful search, show AI follow-up suggestions if available.

Say:

> These are AI-generated next investigation steps. If the configured live LLM provider is unavailable or mock mode is used, this section simply does not appear.

## 10. Investigations

Open All Investigations.

Show:

- server-side search/filter
- pinned queries
- detail panel
- SearchPlan and DSL
- run again
- export CSV

Say:

> Every meaningful query is stored for audit and replay. Pinning helps analysts keep useful investigations.

## 11. CSV Export

Click Export CSV from a successful query/investigation.

Say:

> Export does not accept raw DSL from the browser. The backend loads the stored SearchPlan by query_id, validates it again, compiles it again, and replays it with a 10,000-row safety limit.

## 12. Admin Audit

If time allows, log in as admin or open System Audit Logs.

Show:

- server-side search/filter
- audit details
- audit CSV export

Say:

> Admins can trace who asked what, which SearchPlan and DSL were generated, result count, status, and errors.

## 13. Viewer RBAC

If time allows, log in as viewer.

Show:

- can search
- cannot edit SearchPlan
- cannot export CSV
- cannot access audit logs

Say:

> The frontend hides actions, but backend Spring Security is the real enforcement layer.

## 14. Closing

Say:

> The system demonstrates the full investigation lifecycle: natural language search, backend guardrails, transparent DSL, analytics, AI summary, AI follow-up, audit history, secure export, RBAC, and public HTTPS deployment.

## Demo Query Set

Search:

```text
Show me failed login attempts from China in the last 24h
```

Multi-filter:

```text
Find failed login events for admin or vpn.user in the last 24 hours
```

Aggregation:

```text
Show the top 5 source IPs with the most events in the last 30 days
```

Line chart:

```text
Show failed login trend by hour in the last 24 hours
```

Count:

```text
Count critical events in the last 24 hours
```

Vietnamese:

```text
Tìm account lockout trong 7 ngày qua
```

```text
Số event theo giờ trong 24h qua
```