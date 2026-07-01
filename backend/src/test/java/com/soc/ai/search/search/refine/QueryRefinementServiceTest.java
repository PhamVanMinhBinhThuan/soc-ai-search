package com.soc.ai.search.search.refine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.llm.LlmClient;
import com.soc.ai.search.llm.LlmQuestionRefinementRequest;
import com.soc.ai.search.llm.LlmResponse;
import com.soc.ai.search.llm.LlmSearchPlanRequest;
import com.soc.ai.search.llm.LlmSummaryRequest;
import com.soc.ai.search.search.plan.SearchFilters;
import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.search.plan.SearchPlan;
import com.soc.ai.search.search.plan.TimeRange;
import org.junit.jupiter.api.Test;

class QueryRefinementServiceTest {

    @Test
    void returnsValidatedRewrittenQuestion() {
        var llm = new StubLlmClient("Show failed login events from China for admin or vpn.user in the last 7 days");
        var service = service(llm);

        var response = service.refine(request("Add admin or vpn.user and change the time range to 7 days"));

        assertThat(response.rewrittenQuestion())
                .isEqualTo("Show failed login events from China for admin or vpn.user in the last 7 days");
        assertThat(response.source()).isEqualTo("stub-model");
        assertThat(response.latencyMs()).isEqualTo(12);
    }

    @Test
    void rejectsMarkdownOutput() {
        var service = service(new StubLlmClient("```text\nShow failed login events\n```"));

        assertThatThrownBy(() -> service.refine(request("make it 7 days")))
                .isInstanceOf(QueryRefinementException.class)
                .hasMessage("Unable to refine query right now. Please edit the question manually.");
    }

    @Test
    void rejectsJsonOutput() {
        var service = service(new StubLlmClient("{\"mode\":\"search\"}"));

        assertThatThrownBy(() -> service.refine(request("make it 7 days")))
                .isInstanceOf(QueryRefinementException.class);
    }

    private QueryRefinementService service(LlmClient llmClient) {
        return new QueryRefinementService(new QueryRefinementPromptBuilder(new ObjectMapper()), llmClient);
    }

    private QueryRefinementRequest request(String refinement) {
        return new QueryRefinementRequest(
                "Show failed login events from China in the last 24h",
                "Show failed login events from China in the last 24h",
                new SearchPlan(
                        SearchMode.SEARCH,
                        new SearchFilters(
                                new TimeRange("now-24h", "now"),
                                null,
                                java.util.List.of("failed_login"),
                                null,
                                null,
                                null,
                                java.util.List.of("CN")),
                        0,
                        10),
                refinement);
    }

    private static final class StubLlmClient implements LlmClient {

        private final String content;

        private StubLlmClient(String content) {
            this.content = content;
        }

        @Override
        public LlmResponse generateSearchPlan(LlmSearchPlanRequest request) {
            throw new UnsupportedOperationException();
        }

        @Override
        public LlmResponse generateSummary(LlmSummaryRequest request) {
            throw new UnsupportedOperationException();
        }

        @Override
        public LlmResponse generateRefinedQuestion(LlmQuestionRefinementRequest request) {
            return new LlmResponse(content, "stub-model", 12);
        }
    }
}
