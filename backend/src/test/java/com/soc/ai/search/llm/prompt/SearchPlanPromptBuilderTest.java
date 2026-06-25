package com.soc.ai.search.llm.prompt;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SearchPlanPromptBuilderTest {

    private final SearchPlanPromptBuilder promptBuilder = new SearchPlanPromptBuilder();

    @Test
    void buildsRequestWithSystemPromptAndOriginalQuestion() {
        var request = promptBuilder.buildSearchPlanRequest("Show failed login from China");

        assertThat(request.systemPrompt()).contains("SearchPlan schema");
        assertThat(request.userQuestion()).isEqualTo("Show failed login from China");
    }

    @Test
    void systemPromptContainsSchemaAndAllowlist() {
        var prompt = promptBuilder.buildSystemPrompt();

        assertThat(prompt)
                .contains("timestamp.from")
                .contains("timestamp.to")
                .contains("severity")
                .contains("event_type")
                .contains("user")
                .contains("host")
                .contains("ip")
                .contains("country_code")
                .contains("message_query")
                .contains("aggregation.type")
                .contains("aggregation.field")
                .contains("aggregation.top_n")
                .contains("aggregation.interval")
                .contains("page")
                .contains("size");
    }

    @Test
    void systemPromptForbidsDslProseMarkdownAndUnsafeData() {
        var prompt = promptBuilder.buildSystemPrompt();

        assertThat(prompt)
                .contains("Do not return markdown")
                .contains("code fences")
                .contains("prose")
                .contains("Do not return Elasticsearch DSL")
                .contains("query, aggs, dsl")
                .contains("Never include raw logs")
                .contains("API keys")
                .contains("passwords");
    }

    @Test
    void systemPromptSupportsAggregationAndForbidsHallucinatedFilters() {
        var prompt = promptBuilder.buildSystemPrompt();

        assertThat(prompt)
                .contains("Do not infer or hallucinate filter values")
                .contains("Supported modes are \"search\" and \"aggregation\"")
                .contains("\"mode\": \"search\"")
                .contains("\"mode\": \"aggregation\"")
                .contains("AggregationPlan schema")
                .contains("count, group_by, top_n, date_histogram")
                .contains("Do not add .keyword");
    }

    @Test
    void systemPromptContainsSeedVocabularyAndStructuredMappingGuidance() {
        var prompt = promptBuilder.buildSystemPrompt();

        assertThat(prompt)
                .contains("Prefer structured filters over message_query")
                .contains("Use message_query only for free-text phrases")
                .contains("SearchPlan has no filters.source field")
                .contains("Use source only as aggregation.field")
                .contains("Supported event_type values")
                .contains("failed_login")
                .contains("account_lockout")
                .contains("firewall_block")
                .contains("malware_detected")
                .contains("privilege_escalation")
                .contains("suspicious_outbound")
                .contains("data_exfiltration")
                .contains("large_transfer")
                .contains("successful_login")
                .contains("dns_query")
                .contains("process_start")
                .contains("file_access")
                .contains("\"privilege escalation\", \"leo thang đặc quyền\" -> event_type [\"privilege_escalation\"]")
                .contains("\"malware\", \"malware detected\", \"mã độc\" -> event_type [\"malware_detected\"]")
                .contains("Known source values for aggregation.field = \"source\"")
                .contains("windows-auth")
                .contains("vpn")
                .contains("firewall")
                .contains("edr")
                .contains("proxy")
                .contains("dns")
                .contains("Known demo hosts")
                .contains("vpn-gw-01")
                .contains("finance-ws-07")
                .contains("dc-01")
                .contains("Known demo country_code values")
                .contains("CN")
                .contains("VN")
                .contains("Known demo IP values")
                .contains("203.0.113.45")
                .contains("198.51.100.200");
    }

    @Test
    void buildsRepairPromptWithOriginalQuestionInvalidOutputAndErrors() {
        var request = promptBuilder.buildRepairSearchPlanRequest(
                "failed login china",
                "{\"hack_field\":true}",
                java.util.List.of("Unrecognized field hack_field"));

        assertThat(request.systemPrompt())
                .contains("SearchPlan schema")
                .contains("Do not return Elasticsearch DSL");
        assertThat(request.userQuestion())
                .contains("failed login china")
                .contains("{\"hack_field\":true}")
                .contains("Unrecognized field hack_field")
                .contains("Return exactly one corrected JSON SearchPlan object")
                .doesNotContain("api_key", "raw event", "search result", "secret");
    }
}
