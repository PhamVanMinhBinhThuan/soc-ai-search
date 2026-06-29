package com.soc.ai.search.summary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.llm.LlmClient;
import com.soc.ai.search.llm.LlmResponse;
import com.soc.ai.search.llm.LlmSummaryRequest;
import com.soc.ai.search.search.execution.AggregationResultItem;
import com.soc.ai.search.search.execution.AggregationSearchResponse;
import com.soc.ai.search.search.execution.ChartMetadata;
import com.soc.ai.search.search.execution.ChartType;
import com.soc.ai.search.search.execution.SearchEvent;
import com.soc.ai.search.search.execution.SearchPlanSearchResponse;
import com.soc.ai.search.search.plan.AggregationType;
import com.soc.ai.search.search.plan.SearchFilters;
import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.search.plan.SearchPlan;
import com.soc.ai.search.search.plan.TimeRange;
import org.junit.jupiter.api.Test;

class ResultSummaryServiceTest {

    private final ElasticsearchSummaryQueryService queryService =
            org.mockito.Mockito.mock(ElasticsearchSummaryQueryService.class);
    private final LlmClient llmClient = org.mockito.Mockito.mock(LlmClient.class);
    private final SummaryPayloadBuilder payloadBuilder = new SummaryPayloadBuilder(new ObjectMapper());

    @Test
    void searchUsesOneSummaryQueryAndOneLlmCall() {
        when(queryService.load(any(SearchPlan.class))).thenReturn(summaryData());
        when(llmClient.generateSummary(any(LlmSummaryRequest.class))).thenReturn(new LlmResponse(
                "The query matched five events. Admin is the leading user. High severity is most common.",
                "gemini-test",
                5));

        var result = service().summarizeSearch("failed login china", plan(), searchResponse(5));

        assertThat(result.source()).isEqualTo(SummarySource.LLM);
        verify(queryService, times(1)).load(any(SearchPlan.class));
        verify(llmClient, times(1)).generateSummary(any(LlmSummaryRequest.class));
    }

    @Test
    void summaryQueryFailureUsesFallbackWithoutCallingLlm() {
        when(queryService.load(any(SearchPlan.class))).thenThrow(new SummaryQueryException(
                "summary query failed",
                new RuntimeException()));

        var result = service().summarizeSearch("failed login china", plan(), searchResponse(5));

        assertThat(result.source()).isEqualTo(SummarySource.FALLBACK);
        assertThat(result.summary()).contains("5 SOC events");
        verify(llmClient, never()).generateSummary(any());
    }

    @Test
    void vietnameseQuestionUsesVietnameseFallbackWhenSummaryQueryFails() {
        when(queryService.load(any(SearchPlan.class))).thenThrow(new SummaryQueryException(
                "summary query failed",
                new RuntimeException()));

        var result = service().summarizeSearch("Tim critical event trong 7 ngay qua \u0111i", plan(), searchResponse(5));

        assertThat(result.source()).isEqualTo(SummarySource.FALLBACK);
        assertThat(result.summary()).contains("Truy vấn đã xác thực khớp 5 sự kiện SOC");
        verify(llmClient, never()).generateSummary(any());
    }

    @Test
    void aggregationUsesExistingResultsWithoutSecondElasticsearchQuery() {
        when(llmClient.generateSummary(any(LlmSummaryRequest.class))).thenReturn(new LlmResponse(
                "The top IP aggregation matched ten events. It returned one bucket. The leading IP is shown.",
                "gemini-test",
                3));

        var result = service().summarizeAggregation("top ip", aggregationResponse(true));

        assertThat(result.source()).isEqualTo(SummarySource.LLM);
        verify(queryService, never()).load(any());
        verify(llmClient, times(1)).generateSummary(any());
    }

    @Test
    void emptyAggregationUsesFallbackWithoutCallingLlm() {
        var result = service().summarizeAggregation("top ip", aggregationResponse(false));

        assertThat(result.source()).isEqualTo(SummarySource.FALLBACK);
        assertThat(result.summary()).contains("No aggregation buckets");
        verify(queryService, never()).load(any());
        verify(llmClient, never()).generateSummary(any());
    }

    @Test
    void invalidLlmOutputFallsBackWithoutRepairOrRetry() {
        when(queryService.load(any(SearchPlan.class))).thenReturn(summaryData());
        when(llmClient.generateSummary(any(LlmSummaryRequest.class)))
                .thenReturn(new LlmResponse("<ul><li>invalid</li></ul>", "gemini-test", 2));

        var result = service().summarizeSearch("failed login china", plan(), searchResponse(5));

        assertThat(result.source()).isEqualTo(SummarySource.FALLBACK);
        verify(llmClient, times(1)).generateSummary(any());
    }

    @Test
    void llmTimeoutUsesFallbackWithoutRetrying() {
        when(queryService.load(any(SearchPlan.class))).thenReturn(summaryData());
        when(llmClient.generateSummary(any(LlmSummaryRequest.class)))
                .thenThrow(new RuntimeException("summary timeout"));

        var result = service().summarizeSearch("failed login china", plan(), searchResponse(5));

        assertThat(result.source()).isEqualTo(SummarySource.FALLBACK);
        assertThat(result.summary()).isNotBlank();
        verify(llmClient, times(1)).generateSummary(any());
    }

    @Test
    void noResultSearchSkipsSummaryQueryAndLlm() {
        var result = service().summarizeSearch("no results", plan(), searchResponse(0));

        assertThat(result.source()).isEqualTo(SummarySource.FALLBACK);
        verify(queryService, never()).load(any());
        verify(llmClient, never()).generateSummary(any());
    }

    private ResultSummaryService service() {
        return new ResultSummaryService(
                queryService,
                payloadBuilder,
                new SummaryPromptBuilder(),
                new SummaryTextValidator(),
                new DeterministicSummaryGenerator(),
                llmClient);
    }

    private SearchSummaryData summaryData() {
        return new SearchSummaryData(
                List.of(new SummaryBucket("admin", 5)),
                List.of(new SummaryBucket("host-001", 5)),
                List.of(new SummaryBucket("203.0.113.10", 5)),
                List.of(new SummaryBucket("high", 5)),
                List.of(event()));
    }

    private SearchPlanSearchResponse searchResponse(long total) {
        return new SearchPlanSearchResponse(
                SearchMode.SEARCH,
                Map.of(),
                total,
                0,
                5,
                total == 0 ? 0 : 1,
                10,
                total == 0 ? List.of() : List.of(event()));
    }

    private AggregationSearchResponse aggregationResponse(boolean withResult) {
        return new AggregationSearchResponse(
                SearchMode.AGGREGATION,
                AggregationType.TOP_N,
                Map.of(),
                withResult ? 10 : 0,
                10,
                withResult ? List.of(new AggregationResultItem("203.0.113.10", 10)) : List.of(),
                new ChartMetadata(ChartType.BAR, "ip", "Count"));
    }

    private SearchPlan plan() {
        return new SearchPlan(
                SearchMode.SEARCH,
                new SearchFilters(new TimeRange("now-24h", "now"), null, null, null, null, null, null),
                0,
                5);
    }

    private SearchEvent event() {
        return new SearchEvent(
                "event-1",
                "2026-06-14T10:00:00Z",
                "windows-auth",
                "high",
                "failed_login",
                "admin",
                "host-001",
                "203.0.113.10",
                "CN",
                "Failed login attempt");
    }
}
