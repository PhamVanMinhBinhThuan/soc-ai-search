package com.soc.ai.search.search.execution;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.soc.ai.search.search.plan.AggregationType;
import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.summary.SummarySource;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SearchPlanExecutionResponse(
        SearchMode mode,
        AggregationType aggregationType,
        Map<String, Object> generatedDsl,
        long total,
        int page,
        int size,
        long totalPages,
        long searchLatencyMs,
        long summaryLatencyMs,
        long latencyMs,
        String summary,
        SummarySource summarySource,
        List<AggregationResultItem> aggregationResults,
        ChartMetadata chartMetadata,
        List<SearchEvent> events) {

    public static SearchPlanExecutionResponse fromSearch(
            SearchPlanSearchResponse response) {
        return fromSearch(response, 0, null, null);
    }

    public static SearchPlanExecutionResponse fromSearch(
            SearchPlanSearchResponse response,
            long summaryLatencyMs,
            String summary,
            SummarySource summarySource) {
        return new SearchPlanExecutionResponse(
                response.mode(),
                null,
                response.generatedDsl(),
                response.total(),
                response.page(),
                response.size(),
                response.totalPages(),
                response.latencyMs(),
                summaryLatencyMs,
                response.latencyMs() + summaryLatencyMs,
                summary,
                summarySource,
                List.of(),
                null,
                response.events());
    }

    public static SearchPlanExecutionResponse fromAggregation(
            AggregationSearchResponse response,
            int page,
            int size) {
        return fromAggregation(response, page, size, 0, null, null);
    }

    public static SearchPlanExecutionResponse fromAggregation(
            AggregationSearchResponse response,
            int page,
            int size,
            long summaryLatencyMs,
            String summary,
            SummarySource summarySource) {
        return new SearchPlanExecutionResponse(
                response.mode(),
                response.aggregationType(),
                response.generatedDsl(),
                response.total(),
                page,
                size,
                0,
                response.latencyMs(),
                summaryLatencyMs,
                response.latencyMs() + summaryLatencyMs,
                summary,
                summarySource,
                response.aggregationResults(),
                response.chartMetadata(),
                List.of());
    }
}
