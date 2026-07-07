package com.soc.ai.search.search.nl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.audit.AuditPersistenceException;
import com.soc.ai.search.audit.QueryIdGenerator;
import com.soc.ai.search.audit.SearchAuditService;
import com.soc.ai.search.llm.LlmClient;
import com.soc.ai.search.llm.LlmProperties;
import com.soc.ai.search.llm.LlmProvider;
import com.soc.ai.search.llm.LlmResponse;
import com.soc.ai.search.llm.LlmSearchPlanRequest;
import com.soc.ai.search.llm.mock.MockLlmClient;
import com.soc.ai.search.llm.prompt.SearchPlanJsonParser;
import com.soc.ai.search.llm.prompt.SearchPlanPromptBuilder;
import com.soc.ai.search.search.execution.AggregationResultItem;
import com.soc.ai.search.search.execution.AggregationSearchResponse;
import com.soc.ai.search.search.execution.ChartMetadata;
import com.soc.ai.search.search.execution.ChartType;
import com.soc.ai.search.search.execution.SearchEvent;
import com.soc.ai.search.search.execution.SearchPlanExecutor;
import com.soc.ai.search.search.execution.SearchPlanSearchResponse;
import com.soc.ai.search.search.plan.AggregationType;
import com.soc.ai.search.search.plan.HistogramInterval;
import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.search.plan.SearchPlan;
import com.soc.ai.search.search.validation.SearchPlanValidator;
import com.soc.ai.search.summary.ResultSummaryService;
import com.soc.ai.search.summary.SummaryResult;
import com.soc.ai.search.summary.SummarySource;
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
    private final SearchAuditService searchAuditService = org.mockito.Mockito.mock(SearchAuditService.class);
    private final UUID queryId = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private final QueryIdGenerator queryIdGenerator = () -> queryId;
    private final ResultSummaryService resultSummaryService =
            org.mockito.Mockito.mock(ResultSummaryService.class);

    @Test
    void mockProviderSearchesFailedLoginChinaWithoutApiKey() {
        var executor = org.mockito.Mockito.mock(SearchPlanExecutor.class);
        when(executor.search(any(SearchPlan.class))).thenReturn(searchResponse(0, 5, 30));
        var service = service(new MockLlmClient(mockProperties()), executor);

        var response = service.search(new NaturalLanguageSearchRequest("failed login china", null, 0, 5));

        assertThat(response.queryId()).isEqualTo(queryId);
        assertThat(response.originalQuestion()).isEqualTo("failed login china");
        assertThat(response.searchPlan().page()).isZero();
        assertThat(response.searchPlan().size()).isEqualTo(5);
        assertThat(response.searchPlan().filters().eventType()).containsExactly("failed_login");
        assertThat(response.searchPlan().filters().countryCode()).containsExactly("CN");
        assertThat(response.generatedDsl()).isInstanceOf(Map.class);
        assertThat(response.llmLatencyMs()).isGreaterThanOrEqualTo(0);
        assertThat(response.searchLatencyMs()).isEqualTo(30);
        assertThat(response.summaryLatencyMs()).isEqualTo(4);
        assertThat(response.summarySource()).isEqualTo(SummarySource.LLM);
        assertThat(response.summary()).contains("First summary sentence");
        assertThat(response.latencyMs()).isGreaterThanOrEqualTo(
                response.llmLatencyMs() + response.searchLatencyMs() + response.summaryLatencyMs());

        verify(searchAuditService, times(1)).saveSuccess(
                eq(queryId),
                eq("failed login china"),
                eq(response.searchPlan()),
                eq(response.generatedDsl()),
                eq(response.total()),
                eq(response.latencyMs()),
                eq(response.summary()));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("demoQuestions")
    void mockProviderSupportsMainDemoQuestionsThroughService(String question, ExpectedPlan expected) {
        var executor = org.mockito.Mockito.mock(SearchPlanExecutor.class);
        when(executor.search(any(SearchPlan.class))).thenReturn(searchResponse(0, 5, 30));
        var service = service(new MockLlmClient(mockProperties()), executor);

        var response = service.search(new NaturalLanguageSearchRequest(question, null, 0, 5));

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

    @ParameterizedTest(name = "{0}")
    @MethodSource("aggregationDemoQuestions")
    void mockProviderSupportsAggregationQuestionsThroughService(String question, ExpectedAggregationPlan expected) {
        var executor = org.mockito.Mockito.mock(SearchPlanExecutor.class);
        when(executor.aggregate(any(SearchPlan.class))).thenReturn(aggregationResponse(expected.type()));
        var service = service(new MockLlmClient(mockProperties()), executor);

        var response = service.search(new NaturalLanguageSearchRequest(question, null, 0, 5));

        assertThat(response.originalQuestion()).isEqualTo(question);
        assertThat(response.mode()).isEqualTo(SearchMode.AGGREGATION);
        assertThat(response.searchPlan().mode()).isEqualTo(SearchMode.AGGREGATION);
        assertThat(response.searchPlan().aggregation().type()).isEqualTo(expected.type());
        assertThat(response.searchPlan().aggregation().field()).isEqualTo(expected.field());
        assertThat(response.searchPlan().aggregation().topN()).isEqualTo(expected.topN());
        assertThat(response.searchPlan().aggregation().interval()).isEqualTo(expected.interval());
        assertThat(response.searchPlan().filters().timestamp().from()).isEqualTo(expected.from());
        assertThat(response.searchPlan().filters().timestamp().to()).isEqualTo(expected.to());
        assertList(response.searchPlan().filters().eventType(), expected.eventType());
        assertThat(response.generatedDsl()).isInstanceOf(Map.class);
        assertThat(response.aggregationType()).isEqualTo(expected.type());
        assertThat(response.aggregationResults()).isNotEmpty();
        assertThat(response.chartMetadata()).isNotNull();
        assertThat(response.events()).isEmpty();
        assertThat(response.searchLatencyMs()).isEqualTo(30);

        verify(executor).aggregate(any(SearchPlan.class));
        verify(executor, never()).search(any(SearchPlan.class));
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
        var service = service(llmClient, executor);

        var response = service.search(new NaturalLanguageSearchRequest("failed login", null, 0, 5));

        var planCaptor = ArgumentCaptor.forClass(SearchPlan.class);
        verify(executor).search(planCaptor.capture());
        assertThat(planCaptor.getValue().page()).isZero();
        assertThat(planCaptor.getValue().size()).isEqualTo(5);
        assertThat(response.searchPlan().size()).isEqualTo(5);
        assertThat(response.size()).isEqualTo(5);
    }

    @Test
    void optionalAuditQuestionOverridesStoredAndReturnedQuestionOnly() {
        var llmClient = org.mockito.Mockito.mock(LlmClient.class);
        var executor = org.mockito.Mockito.mock(SearchPlanExecutor.class);
        when(llmClient.generateSearchPlan(any(LlmSearchPlanRequest.class))).thenReturn(new LlmResponse("""
                {
                  "mode": "search",
                  "filters": {
                    "event_type": ["failed_login"]
                  },
                  "page": 0,
                  "size": 5
                }
                """, "mock", 7));
        when(executor.search(any(SearchPlan.class))).thenReturn(searchResponse(0, 5, 11));
        var service = service(llmClient, executor);
        var auditQuestion = "[AI Corrected] Original question: failed login | Feedback: make it 7 days | Rewritten question: failed login in the last 7 days";

        var response = service.search(new NaturalLanguageSearchRequest(
                "failed login in the last 7 days",
                auditQuestion,
                0,
                5));

        assertThat(response.originalQuestion()).isEqualTo(auditQuestion);

        var llmRequestCaptor = ArgumentCaptor.forClass(LlmSearchPlanRequest.class);
        verify(llmClient).generateSearchPlan(llmRequestCaptor.capture());
        assertThat(llmRequestCaptor.getValue().userQuestion())
                .contains("failed login in the last 7 days")
                .doesNotContain("[AI Corrected]");

        verify(searchAuditService).saveSuccess(
                eq(queryId),
                eq(auditQuestion),
                eq(response.searchPlan()),
                eq(response.generatedDsl()),
                eq(response.total()),
                eq(response.latencyMs()),
                eq(response.summary()));
    }

    @Test
    void aggregationTopNOverLimitReturnsControlledErrorAfterRepairFails() {
        var llmClient = org.mockito.Mockito.mock(LlmClient.class);
        var executor = org.mockito.Mockito.mock(SearchPlanExecutor.class);
        var invalidAggregation = """
                {
                  "mode": "aggregation",
                  "aggregation": {
                    "type": "top_n",
                    "field": "ip",
                    "top_n": 101
                  }
                }
                """;
        when(llmClient.generateSearchPlan(any(LlmSearchPlanRequest.class)))
                .thenReturn(new LlmResponse(invalidAggregation, "mock", 1))
                .thenReturn(new LlmResponse(invalidAggregation, "mock", 1));
        var service = service(llmClient, executor);

        assertThatThrownBy(() -> service.search(new NaturalLanguageSearchRequest("top ip", null, 0, 5)))
                .isInstanceOf(NaturalLanguageSearchException.class)
                .hasMessage("LLM output is invalid");

        verify(executor, never()).aggregate(any(SearchPlan.class));
        verify(executor, never()).search(any(SearchPlan.class));
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
        var service = service(llmClient, executor);

        service.search(new NaturalLanguageSearchRequest("failed login china", null, 0, 5));

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
        var service = service(llmClient, executor);

        assertThatThrownBy(() -> service.search(new NaturalLanguageSearchRequest("failed login china", null, 0, 5)))
                .isInstanceOf(NaturalLanguageSearchException.class)
                .hasMessage("LLM output is invalid")
                .hasMessageNotContaining("Exception");

        verify(searchAuditService).saveFailure(
                org.mockito.ArgumentMatchers.eq(queryId),
                org.mockito.ArgumentMatchers.eq("failed login china"),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.anyLong(),
                any(NaturalLanguageSearchException.class));
    }

    @Test
    void successfulSearchReturnsControlledErrorWhenSuccessAuditCannotBeSaved() {
        var executor = org.mockito.Mockito.mock(SearchPlanExecutor.class);
        when(executor.search(any(SearchPlan.class))).thenReturn(searchResponse(0, 5, 11));
        doThrow(new AuditPersistenceException("Audit persistence failed", new RuntimeException()))
                .when(searchAuditService)
                .saveSuccess(
                        any(UUID.class),
                        any(String.class),
                        any(SearchPlan.class),
                        org.mockito.ArgumentMatchers.<Map<String, Object>>any(),
                        org.mockito.ArgumentMatchers.anyLong(),
                        org.mockito.ArgumentMatchers.anyLong(),
                        any(String.class));
        var service = service(new MockLlmClient(mockProperties()), executor);

        assertThatThrownBy(() -> service.search(new NaturalLanguageSearchRequest("failed login china", null, 0, 5)))
                .isInstanceOf(AuditPersistenceException.class)
                .hasMessage("Search completed but audit persistence failed");

        verify(searchAuditService, never()).saveFailure(
                any(UUID.class),
                any(String.class),
                any(),
                any(),
                org.mockito.ArgumentMatchers.anyLong(),
                any());
    }

    @Test
    void failureAuditErrorDoesNotHideOriginalLlmError() {
        var llmClient = org.mockito.Mockito.mock(LlmClient.class);
        var executor = org.mockito.Mockito.mock(SearchPlanExecutor.class);
        when(llmClient.generateSearchPlan(any(LlmSearchPlanRequest.class)))
                .thenThrow(new RuntimeException("provider unavailable"));
        doThrow(new AuditPersistenceException("Audit persistence failed", new RuntimeException()))
                .when(searchAuditService)
                .saveFailure(
                        any(UUID.class),
                        any(String.class),
                        any(),
                        any(),
                        org.mockito.ArgumentMatchers.anyLong(),
                        any());
        var service = service(llmClient, executor);

        assertThatThrownBy(() -> service.search(new NaturalLanguageSearchRequest("failed login china", null, 0, 5)))
                .isInstanceOf(NaturalLanguageSearchException.class)
                .hasMessage("LLM provider is unavailable");
    }

    private NaturalLanguageSearchService service(LlmClient llmClient, SearchPlanExecutor executor) {
        when(resultSummaryService.summarizeSearch(
                any(String.class),
                any(SearchPlan.class),
                any(SearchPlanSearchResponse.class)))
                .thenReturn(new SummaryResult(
                        "First summary sentence. Second summary sentence. Third summary sentence.",
                        SummarySource.LLM,
                        4));
        when(resultSummaryService.summarizeAggregation(
                any(String.class),
                any(SearchPlan.class),
                any(AggregationSearchResponse.class)))
                .thenReturn(new SummaryResult(
                        "First aggregation sentence. Second aggregation sentence. Third aggregation sentence.",
                        SummarySource.LLM,
                        4));
        return new NaturalLanguageSearchService(
                promptBuilder,
                llmClient,
                parser,
                executor,
                searchAuditService,
                queryIdGenerator,
                resultSummaryService);
    }

    private LlmProperties mockProperties() {
        return new LlmProperties(
                LlmProvider.MOCK,
                null,
                null,
                null,
                10_000,
                5_000,
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

    private AggregationSearchResponse aggregationResponse(AggregationType aggregationType) {
        var chartType = switch (aggregationType) {
            case COUNT -> ChartType.NUMBER;
            case GROUP_BY, TOP_N -> ChartType.BAR;
            case DATE_HISTOGRAM -> ChartType.LINE;
        };

        return new AggregationSearchResponse(
                SearchMode.AGGREGATION,
                aggregationType,
                Map.of(
                        "query", Map.of("bool", Map.of("filter", List.of())),
                        "size", 0),
                10,
                30,
                List.of(new AggregationResultItem("admin", 10)),
                new ChartMetadata(chartType, "x", "count"));
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

    private static Stream<Arguments> aggregationDemoQuestions() {
        return Stream.of(
                Arguments.of(
                        "Đếm số lần login thất bại theo từng user trong 7 ngày qua",
                        new ExpectedAggregationPlan(
                                AggregationType.GROUP_BY,
                                "user",
                                10,
                                null,
                                List.of("failed_login"),
                                "now-7d",
                                "now")),
                Arguments.of(
                        "Top 10 IP có nhiều alert nhất tháng này",
                        new ExpectedAggregationPlan(
                                AggregationType.TOP_N,
                                "ip",
                                10,
                                null,
                                null,
                                "now-30d",
                                "now")),
                Arguments.of(
                        "Số event theo giờ trong 24h qua",
                        new ExpectedAggregationPlan(
                                AggregationType.DATE_HISTOGRAM,
                                null,
                                null,
                                HistogramInterval.HOUR,
                                null,
                                "now-24h",
                                "now")));
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

    private record ExpectedAggregationPlan(
            AggregationType type,
            String field,
            Integer topN,
            HistogramInterval interval,
            List<String> eventType,
            String from,
            String to) {
    }
}
