package com.soc.ai.search.llm.mock;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.llm.LlmProperties;
import com.soc.ai.search.llm.LlmProvider;
import com.soc.ai.search.llm.LlmSearchPlanRequest;
import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.search.plan.SearchPlan;
import org.junit.jupiter.api.Test;

class MockLlmClientTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final MockLlmClient client = new MockLlmClient(new LlmProperties(
            LlmProvider.MOCK,
            null,
            null,
            null,
            10_000,
            2));

    @Test
    void returnsLlmResponseWithPureJsonContent() throws Exception {
        var response = client.generateSearchPlan(request("show failed login from china last 24 hours"));

        assertThat(response.model()).isEqualTo("mock-search-plan");
        assertThat(response.latencyMs()).isGreaterThanOrEqualTo(0);
        assertThat(response.content().trim()).startsWith("{").endsWith("}");
        assertThat(response.content()).doesNotContain("```", "Sure", "SearchPlan:");

        var plan = objectMapper.readValue(response.content(), SearchPlan.class);

        assertThat(plan.mode()).isEqualTo(SearchMode.SEARCH);
        assertThat(plan.filters().eventType()).containsExactly("failed_login");
        assertThat(plan.filters().countryCode()).containsExactly("CN");
        assertThat(plan.filters().timestamp().from()).isEqualTo("now-24h");
        assertThat(plan.filters().timestamp().to()).isEqualTo("now");
    }

    @Test
    void mapsCriticalSevenDaysByKeywordInsteadOfExactString() throws Exception {
        var response = client.generateSearchPlan(request("Tìm các alert critical trong 7 ngày gần đây"));
        var plan = objectMapper.readValue(response.content(), SearchPlan.class);

        assertThat(plan.filters().severity()).containsExactly("critical");
        assertThat(plan.filters().timestamp().from()).isEqualTo("now-7d");
        assertThat(plan.filters().timestamp().to()).isEqualTo("now");
    }

    @Test
    void mapsMalwareQuestionByKeywordInsteadOfExactString() throws Exception {
        var response = client.generateSearchPlan(request("Find malware on endpoint hosts this week"));
        var plan = objectMapper.readValue(response.content(), SearchPlan.class);

        assertThat(plan.messageQuery()).isEqualTo("malware detected");
        assertThat(plan.filters().timestamp().from()).isEqualTo("now-7d");
    }

    private LlmSearchPlanRequest request(String question) {
        return new LlmSearchPlanRequest("system prompt placeholder", question);
    }
}
