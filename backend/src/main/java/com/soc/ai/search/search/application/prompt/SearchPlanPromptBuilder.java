package com.soc.ai.search.search.application.prompt;

import java.util.List;
import java.util.StringJoiner;

import com.soc.ai.search.llm.application.LlmSearchPlanRequest;
import com.soc.ai.search.search.domain.plan.SearchPlanContract;
import org.springframework.stereotype.Service;

@Service
public class SearchPlanPromptBuilder {

    private static final List<String> KNOWN_USERS = List.of(
            "admin",
            "vpn.user",
            "finance.user",
            "svc.backup",
            "alice",
            "bob",
            "analyst1",
            "guest01",
            "jdoe",
            "unknown");

    private static final List<String> KNOWN_HOSTS = List.of(
            "dc-01",
            "vpn-gw-01",
            "finance-ws-07",
            "endpoint-014",
            "endpoint-023",
            "proxy-01",
            "dns-01",
            "srv-app-02",
            "firewall-edge-01");

    private static final List<String> KNOWN_COUNTRY_CODES = List.of(
            "VN",
            "CN",
            "US",
            "RU",
            "SG",
            "DE");

    private static final List<String> KNOWN_IPS = List.of(
            "203.0.113.45",
            "203.0.113.77",
            "198.51.100.200",
            "192.0.2.88",
            "10.10.1.15",
            "10.10.2.24",
            "10.20.5.33",
            "172.16.10.42",
            "192.168.20.55");

    private static final List<String> EVENT_TYPE_MAPPING_EXAMPLES = List.of(
            "\"failed login\", \"login tháº¥t báº¡i\", \"Ä‘Äƒng nháº­p tháº¥t báº¡i\" -> event_type [\"failed_login\"]",
            "\"account lockout\", \"khÃ³a tÃ i khoáº£n\" -> event_type [\"account_lockout\"]",
            "\"firewall block\", \"blocked by firewall\", \"tÆ°á»ng lá»­a cháº·n\" -> event_type [\"firewall_block\"]",
            "\"malware\", \"malware detected\", \"mÃ£ Ä‘á»™c\" -> event_type [\"malware_detected\"]",
            "\"privilege escalation\", \"leo thang Ä‘áº·c quyá»n\" -> event_type [\"privilege_escalation\"]",
            "\"suspicious outbound\", \"outbound Ä‘Ã¡ng ngá»\" -> event_type [\"suspicious_outbound\"]",
            "\"data exfiltration\", \"rÃ² rá»‰ dá»¯ liá»‡u\" -> event_type [\"data_exfiltration\"]",
            "\"large transfer\" -> event_type [\"large_transfer\"]",
            "\"successful login\" -> event_type [\"successful_login\"]",
            "\"dns query\" -> event_type [\"dns_query\"]",
            "\"process start\" -> event_type [\"process_start\"]",
            "\"file access\" -> event_type [\"file_access\"]");

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
                - Prefer structured filters over message_query when the intent matches a supported source, event_type, severity, user, host, ip, or country_code.
                - Use message_query only for free-text phrases that cannot be represented by structured fields.
                - Use filters.source for source/vendor/log-origin filters such as windows-auth, vpn, firewall, edr, proxy, or dns.
                - Use filters.event_id only when the user explicitly provides one or more full UUID event IDs. Do not invent event IDs. Do not use partial IDs, wildcard IDs, or non-UUID values.
                - Use aggregation.field = "source" only when the user asks to group/top/count by source.
                - filters.event_id, filters.source, filters.user, filters.host, and filters.ip may be a string or an array of strings.
                - If the user asks for multiple event IDs/sources/users/hosts/IPs, use an array. Values inside one field mean OR.
                - Different filter fields still mean AND.
                - message_query remains one string, never an array.
                - For relative time, preserve the user's requested amount:
                  last 12 hours -> "now-12h";
                  last 10 days -> "now-10d";
                  last 11 days -> "now-11d";
                  last 12 days -> "now-12d".

                SearchPlan schema:
                {
                  "mode": "search",
                  "filters": {
                    "timestamp": { "from": "now-24h", "to": "now" },
                    "event_id": ["6f1d4c8e-1d93-4a27-9e87-9b7a9e9d8a12"],
                    "source": ["windows-auth"],
                    "severity": ["high", "critical"],
                    "event_type": ["failed_login"],
                    "user": ["admin", "vpn.user"],
                    "host": ["host-001"],
                    "ip": ["203.0.113.10"],
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

                Multi-value filter example:
                User asks: Find failed login events for admin or vpn.user in the last 24 hours
                Return filters.event_type = ["failed_login"], filters.user = ["admin", "vpn.user"], and filters.timestamp = { "from": "now-24h", "to": "now" }.

                Allowed fields:
                %s

                Aggregation field allowlist:
                %s

                Supported timestamp values:
                %s

                Supported severity values:
                %s

                Supported source filter values:
                %s

                Supported event_type values:
                %s

                Event type mapping examples:
                %s

                Known demo users:
                %s

                Known demo hosts:
                %s

                Known demo country_code values:
                %s

                Known demo IP values:
                %s

                Country codes must be ISO-3166 alpha-2 uppercase values such as CN, VN, or US.
                page must be >= 0.
                size must be between 1 and 100.
                message_query is full-text search on the event message field and must not contain wildcard or script syntax.
                """.formatted(
                bulletList(SearchPlanContract.SEARCH_PLAN_SCHEMA_FIELDS),
                bulletList(SearchPlanContract.AGGREGATION_FIELD_ALLOWLIST.stream().sorted().toList()),
                bulletList(SearchPlanContract.SUPPORTED_TIME_VALUES),
                bulletList(SearchPlanContract.SUPPORTED_SEVERITIES),
                bulletList(SearchPlanContract.SUPPORTED_SOURCES),
                bulletList(SearchPlanContract.SUPPORTED_EVENT_TYPES),
                bulletList(EVENT_TYPE_MAPPING_EXAMPLES),
                bulletList(KNOWN_USERS),
                bulletList(KNOWN_HOSTS),
                bulletList(KNOWN_COUNTRY_CODES),
                bulletList(KNOWN_IPS));
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
