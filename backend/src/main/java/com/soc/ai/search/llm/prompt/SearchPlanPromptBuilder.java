package com.soc.ai.search.llm.prompt;

import java.util.List;
import java.util.StringJoiner;

import com.soc.ai.search.llm.LlmSearchPlanRequest;
import org.springframework.stereotype.Service;

@Service
public class SearchPlanPromptBuilder {

    private static final List<String> ALLOWED_FIELDS = List.of(
            "timestamp.from",
            "timestamp.to",
            "severity",
            "event_type",
            "user",
            "host",
            "ip",
            "country_code",
            "message_query",
            "aggregation.type",
            "aggregation.field",
            "aggregation.top_n",
            "aggregation.interval",
            "page",
            "size");

    private static final List<String> AGGREGATION_FIELDS = List.of(
            "source",
            "severity",
            "event_type",
            "user",
            "host",
            "ip",
            "country_code");

    private static final List<String> SUPPORTED_TIME_VALUES = List.of(
            "now",
            "now-24h",
            "now-7d",
            "now-30d",
            "ISO-8601 absolute timestamp");

    private static final List<String> SUPPORTED_SEVERITIES = List.of(
            "low",
            "medium",
            "high",
            "critical");

    public LlmSearchPlanRequest buildSearchPlanRequest(String userQuestion) {
        return new LlmSearchPlanRequest(buildSystemPrompt(), userQuestion);
    }

    public String buildSystemPrompt() {
        return """
                You convert a natural language SOC event search question into one JSON SearchPlan.

                Output rules:
                - Return exactly one raw JSON object.
                - Do not return markdown, code fences, prose, explanations, or comments.
                - Do not return Elasticsearch DSL.
                - Do not return Elasticsearch DSL fields such as query, aggs, dsl, script, wildcard, or query_string.
                - Do not add fields outside the SearchPlan schema.
                - Supported modes are "search" and "aggregation".
                - For aggregation, return an AggregationPlan. Never return Elasticsearch aggregation DSL.
                - If the question does not specify a filter, omit that filter. Do not infer or hallucinate filter values.
                - page and size may be omitted. Backend owns pagination and will override them from the API request.
                - Never include raw logs, search results, event documents, API keys, passwords, or secrets.

                SearchPlan schema:
                {
                  "mode": "search",
                  "filters": {
                    "timestamp": { "from": "now-24h", "to": "now" },
                    "severity": ["high", "critical"],
                    "event_type": ["failed_login"],
                    "user": "admin",
                    "host": "host-001",
                    "ip": "203.0.113.10",
                    "country_code": ["CN"]
                  },
                  "message_query": "malware detected",
                  "page": 0,
                  "size": 20
                }

                AggregationPlan schema:
                {
                  "mode": "aggregation",
                  "filters": {
                    "timestamp": { "from": "now-7d", "to": "now" },
                    "event_type": ["failed_login"]
                  },
                  "aggregation": {
                    "type": "group_by",
                    "field": "user",
                    "top_n": 10,
                    "interval": "hour"
                  },
                  "page": 0,
                  "size": 20
                }

                Aggregation rules:
                - type must be one of count, group_by, top_n, date_histogram.
                - interval must be one of minute, hour, day.
                - count must not include field, top_n, or interval.
                - group_by must include an allowed field. top_n may be omitted.
                - top_n must include an allowed field and top_n between 1 and 100.
                - date_histogram must include interval and always uses timestamp internally.
                - Do not add .keyword to any field.

                Allowed fields:
                %s

                Aggregation field allowlist:
                %s

                Supported timestamp values:
                %s

                Supported severity values:
                %s

                Country codes must be ISO-3166 alpha-2 uppercase values such as CN, VN, or US.
                page must be >= 0.
                size must be between 1 and 100.
                message_query is full-text search on the event message field and must not contain wildcard or script syntax.
                """.formatted(
                bulletList(ALLOWED_FIELDS),
                bulletList(AGGREGATION_FIELDS),
                bulletList(SUPPORTED_TIME_VALUES),
                bulletList(SUPPORTED_SEVERITIES));
    }

    public LlmSearchPlanRequest buildRepairSearchPlanRequest(
            String originalQuestion,
            String invalidOutput,
            List<String> errors) {
        var repairInstructions = """
                Repair the previous invalid SearchPlan JSON.

                Original user question:
                %s

                Invalid LLM output:
                %s

                Parser or validation errors:
                %s

                Return exactly one corrected JSON SearchPlan object.
                Do not return markdown, prose, Elasticsearch DSL, comments, or code fences.
                Do not add fields outside the SearchPlan schema.
                Do not add filters that are not present in the original user question.
                """.formatted(
                originalQuestion,
                invalidOutput,
                bulletList(errors));

        return new LlmSearchPlanRequest(buildSystemPrompt(), repairInstructions);
    }

    private String bulletList(List<String> values) {
        var joiner = new StringJoiner(System.lineSeparator());
        values.forEach(value -> joiner.add("- " + value));
        return joiner.toString();
    }
}
