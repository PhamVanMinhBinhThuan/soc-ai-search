package com.soc.ai.search.search.nl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.llm.LlmClient;
import com.soc.ai.search.llm.LlmProperties;
import com.soc.ai.search.llm.LlmProvider;
import com.soc.ai.search.llm.LlmResponse;
import com.soc.ai.search.llm.LlmSearchPlanRequest;
import com.soc.ai.search.llm.mock.MockLlmClient;
import com.soc.ai.search.llm.prompt.SearchPlanJsonParser;
import com.soc.ai.search.llm.prompt.SearchPlanPromptBuilder;
import com.soc.ai.search.search.execution.SearchEvent;
import com.soc.ai.search.search.execution.SearchPlanExecutor;
import com.soc.ai.search.search.execution.SearchPlanSearchResponse;
import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.search.plan.SearchPlan;
import com.soc.ai.search.search.validation.SearchPlanValidator;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;

class NaturalLanguageSearchServiceTest {

    private final SearchPlanPromptBuilder promptBuilder = new SearchPlanPromptBuilder();
    private final SearchPlanJsonParser parser = new SearchPlanJsonParser(
            new ObjectMapper(),
            new SearchPlanValidator(Validation.buildDefaultValidatorFactory().getValidator()));

    @Test
    void mockProviderSearchesFailedLoginChinaWithoutApiKey() {
        var executor = org.mockito.Mockito.mock(SearchPlanExecutor.class);
        when(executor.search(any(SearchPlan.class))).thenReturn(searchResponse(0, 5, 30));
        var service = new NaturalLanguageSearchService(
                promptBuilder,
                new MockLlmClient(mockProperties()),
                parser,
                executor);

        var response = service.search(new NaturalLanguageSearchRequest("failed login china", 0, 5));

        assertThat(response.originalQuestion()).isEqualTo("failed login china");
        assertThat(response.searchPlan().page()).isZero();
        assertThat(response.searchPlan().size()).isEqualTo(5);
        assertThat(response.searchPlan().filters().eventType()).containsExactly("failed_login");
        assertThat(response.searchPlan().filters().countryCode()).containsExactly("CN");
        assertThat(response.generatedDsl()).isInstanceOf(Map.class);
        assertThat(response.llmLatencyMs()).isGreaterThanOrEqualTo(0);
        assertThat(response.searchLatencyMs()).isEqualTo(30);
        assertThat(response.latencyMs()).isGreaterThanOrEqualTo(response.llmLatencyMs() + response.searchLatencyMs());
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("demoQuestions")
    void mockProviderSupportsMainDemoQuestionsThroughService(String question, ExpectedPlan expected) {
        var executor = org.mockito.Mockito.mock(SearchPlanExecutor.class);
        when(executor.search(any(SearchPlan.class))).thenReturn(searchResponse(0, 5, 30));
        var service = new NaturalLanguageSearchService(
                promptBuilder,
                new MockLlmClient(mockProperties()),
                parser,
                executor);

        var response = service.search(new NaturalLanguageSearchRequest(question, 0, 5));

        assertThat(response.originalQuestion()).isEqualTo(question);
        assertThat(response.searchPlan().mode()).isEqualTo(SearchMode.SEARCH);
        assertThat(response.searchPlan().page()).isZero();
        assertThat(response.searchPlan().size()).isEqualTo(5);
        assertThat(response.size()).isEqualTo(5);
        assertThat(response.generatedDsl()).isInstanceOf(Map.class);
        assertThat(response.events()).isNotEmpty();

        assertList(response.searchPlan().filters().eventType(), expected.eventType());
        assertList(response.searchPlan().filters().countryCode(), expected.countryCode());
        assertList(response.searchPlan().filters().severity(), expected.severity());
        assertThat(response.searchPlan().messageQuery()).isEqualTo(expected.messageQuery());
        assertThat(response.searchPlan().filters().timestamp().from()).isEqualTo(expected.from());
        assertThat(response.searchPlan().filters().timestamp().to()).isEqualTo(expected.to());
    }

    @Test
    void requestPaginationOverridesLlmPagination() {
        var llmClient = org.mockito.Mockito.mock(LlmClient.class);
        var executor = org.mockito.Mockito.mock(SearchPlanExecutor.class);
        when(llmClient.generateSearchPlan(any(LlmSearchPlanRequest.class))).thenReturn(new LlmResponse("""
                {
                  "mode": "search",
                  "filters": {
                    "event_type": ["failed_login"]
                  },
                  "page": 9,
                  "size": 100
                }
                """, "mock", 7));
        when(executor.search(any(SearchPlan.class))).thenReturn(searchResponse(0, 5, 11));
        var service = new NaturalLanguageSearchService(promptBuilder, llmClient, parser, executor);

        var response = service.search(new NaturalLanguageSearchRequest("failed login", 0, 5));

        var planCaptor = ArgumentCaptor.forClass(SearchPlan.class);
        verify(executor).search(planCaptor.capture());
        assertThat(planCaptor.getValue().page()).isZero();
        assertThat(planCaptor.getValue().size()).isEqualTo(5);
        assertThat(response.searchPlan().size()).isEqualTo(5);
        assertThat(response.size()).isEqualTo(5);
    }

    @Test
    void repairPromptIncludesOriginalQuestionInvalidOutputAndValidationErrors() {
        var llmClient = org.mockito.Mockito.mock(LlmClient.class);
        var executor = org.mockito.Mockito.mock(SearchPlanExecutor.class);
        var invalidOutput = """
                {
                  "mode": "search",
                  "hack_field": true,
                  "page": 0,
                  "size": 20
                }
                """;
        when(llmClient.generateSearchPlan(any(LlmSearchPlanRequest.class)))
                .thenReturn(new LlmResponse(invalidOutput, "mock", 5))
                .thenReturn(new LlmResponse("""
                        {
                          "mode": "search",
                          "filters": {
                            "event_type": ["failed_login"]
                          }
                        }
                        """, "mock", 8));
        when(executor.search(any(SearchPlan.class))).thenReturn(searchResponse(0, 5, 9));
        var service = new NaturalLanguageSearchService(promptBuilder, llmClient, parser, executor);

        service.search(new NaturalLanguageSearchRequest("failed login china", 0, 5));

        var requestCaptor = ArgumentCaptor.forClass(LlmSearchPlanRequest.class);
        verify(llmClient, times(2)).generateSearchPlan(requestCaptor.capture());
        var repairRequest = requestCaptor.getAllValues().get(1);

        assertThat(repairRequest.userQuestion())
                .contains("failed login china")
                .contains("\"hack_field\": true")
                .contains("Unrecognized field")
                .doesNotContain("api_key", "raw event", "search result", "secret");
    }

    @Test
    void invalidOutputAfterRepairReturnsControlledError() {
        var llmClient = org.mockito.Mockito.mock(LlmClient.class);
        var executor = org.mockito.Mockito.mock(SearchPlanExecutor.class);
        when(llmClient.generateSearchPlan(any(LlmSearchPlanRequest.class)))
                .thenReturn(new LlmResponse("{\"mode\":\"search\",\"hack_field\":true}", "mock", 1))
                .thenReturn(new LlmResponse("{\"mode\":\"search\",\"hack_field\":true}", "mock", 1));
        var service = new NaturalLanguageSearchService(promptBuilder, llmClient, parser, executor);

        assertThatThrownBy(() -> service.search(new NaturalLanguageSearchRequest("failed login china", 0, 5)))
                .isInstanceOf(NaturalLanguageSearchException.class)
                .hasMessage("LLM output is invalid")
                .hasMessageNotContaining("Exception");
    }

    private LlmProperties mockProperties() {
        return new LlmProperties(
                LlmProvider.MOCK,
                null,
                null,
                null,
                10_000,
                2);
    }

    private SearchPlanSearchResponse searchResponse(int page, int size, long latencyMs) {
        return new SearchPlanSearchResponse(
                SearchMode.SEARCH,
                generatedDsl(size),
                1,
                page,
                size,
                1,
                latencyMs,
                List.of(new SearchEvent(
                        "seed-42-1",
                        "2026-06-06T10:00:00Z",
                        "windows-auth",
                        "high",
                        "failed_login",
                        "admin",
                        "host-001",
                        "203.0.113.10",
                        "CN",
                        "Failed login attempt from CN")));
    }

    private Map<String, Object> generatedDsl(int size) {
        return Map.of(
                "query", Map.of(
                        "bool", Map.of(
                                "filter", List.of(Map.of(
                                        "terms", Map.of("event_type", List.of("failed_login")))))),
                "from", 0,
                "size", size,
                "sort", List.of(Map.of("timestamp", Map.of("order", "desc"))));
    }

    private static Stream<Arguments> demoQuestions() {
        return Stream.of(
                Arguments.of(
                        "Show me failed login attempts from China in the last 24h",
                        new ExpectedPlan(List.of("failed_login"), List.of("CN"), null, null, "now-24h", "now")),
                Arguments.of(
                        "Tìm alert critical trong 7 ngày qua",
                        new ExpectedPlan(null, null, List.of("critical"), null, "now-7d", "now")),
                Arguments.of(
                        "Tìm malware detected trong 7 ngày qua",
                        new ExpectedPlan(null, null, null, "malware detected", "now-7d", "now")));
    }

    private void assertList(List<String> actual, List<String> expected) {
        if (expected == null) {
            assertThat(actual).isNull();
            return;
        }

        assertThat(actual).containsExactlyElementsOf(expected);
    }

    private record ExpectedPlan(
            List<String> eventType,
            List<String> countryCode,
            List<String> severity,
            String messageQuery,
            String from,
            String to) {
    }
}
