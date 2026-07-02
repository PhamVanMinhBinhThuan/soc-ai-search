# ADR: Search Engine Selection

## Decision

SOC AI Search uses Elasticsearch `9.4.2` as the primary search engine for the MVP and demo deployment.

Target index:

```text
soc-events-v1
```

The backend compiles validated SearchPlans into Elasticsearch Query DSL.

## Why Elasticsearch

Elasticsearch fits the project because it supports:

- full-text search on event messages
- exact filtering on keyword fields
- IP filtering
- timestamp range queries
- sorting by timestamp/severity
- terms aggregations
- top-N aggregations
- date histogram time-series charts
- document lookup for event detail
- Docker-based local and VPS deployment

## Mapping

| Field | Type | Used for |
| --- | --- | --- |
| `timestamp` | `date` | range, sort, date histogram |
| `source` | `keyword` | filter, group_by, top_n |
| `severity` | `keyword` | filter, sort, group_by, top_n |
| `event_type` | `keyword` | filter, group_by, top_n |
| `user` | `keyword` | filter, group_by, top_n |
| `host` | `keyword` | filter, group_by, top_n |
| `ip` | `ip` | filter, group_by, top_n |
| `country_code` | `keyword` | filter, group_by, top_n |
| `message` | `text` | message search |
| `raw` | `text`, not indexed | raw forensic payload |

The compiler does not append `.keyword` because aggregatable fields are already mapped as `keyword` or `ip`.

## SearchPlan Contract

The LLM does not generate executable DSL. It generates a SearchPlan.

```mermaid
flowchart LR
    User["User question"]
    LLM["LLM"]
    Plan["SearchPlan"]
    Validator["Validator"]
    Compiler["Compiler"]
    DSL["Elasticsearch DSL"]
    ES["Elasticsearch"]

    User --> LLM --> Plan --> Validator --> Compiler --> DSL --> ES
```

Benefits:

- easier to validate than arbitrary DSL
- safer for prompt injection
- easier to explain to SOC analysts
- enables Query Breakdown UI
- keeps DSL generation deterministic and testable

## Supported Query Shapes

### Search

Search mode compiles to:

- `bool.filter`
- `range` for timestamp
- `term` or `terms` for exact filters
- `match` for `message_query`
- default sort by timestamp descending
- optional severity sort

### Count

Count aggregation uses:

- `size = 0`
- no aggregation field
- total hits as the count result

### Group By

Group-by uses a terms aggregation.

If no bucket limit is provided, the compiler defaults to a safe bucket size.

### Top N

Top-N uses a terms aggregation with a required `top_n` value.

### Date Histogram

Date histogram uses `timestamp` internally.

Supported intervals:

- minute
- hour
- day

For dashboard/time-series stability, the compiler can use `extended_bounds` and `min_doc_count = 0` so empty time buckets remain visible.

## Alternatives Considered

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
| Elasticsearch | Strong search + aggregation support, mature docs, Docker-friendly | JVM memory footprint | Selected |
| OpenSearch | Similar to Elasticsearch, open-source distribution | No major benefit for this MVP over Elasticsearch | Deferred |
| ClickHouse | Very strong analytics performance | More work for full-text search and event detail UX | Deferred |
| PostgreSQL only | Simple stack | Weak for SOC-scale search/aggregation | Rejected |

## Operational Notes

Bootstrap index:

```powershell
.\scripts\bootstrap-elasticsearch.ps1
```

Seed dataset:

```powershell
.\scripts\seed-events.ps1 -Count 10000
```

Linux/VPS bootstrap requirement:

```bash
sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" > /etc/sysctl.d/99-elasticsearch.conf
sysctl --system
```

Elasticsearch must not be exposed directly to the public internet.

## Re-evaluation Triggers

Revisit this decision if:

- dataset grows to hundreds of millions of events
- heavy analytics become more important than search
- semantic/vector search becomes a core requirement
- enterprise infrastructure standardizes on OpenSearch/ClickHouse
- strict multi-tenant document-level security is required
