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
                .contains("Never include raw logs")
                .contains("API keys")
                .contains("passwords");
    }

    @Test
    void systemPromptForbidsHallucinatedFiltersAndAggregationMode() {
        var prompt = promptBuilder.buildSystemPrompt();

        assertThat(prompt)
                .contains("Do not infer or hallucinate filter values")
                .contains("Aggregation, statistics, top-N")
                .contains("Do not invent another mode")
                .contains("\"mode\": \"search\"");
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
