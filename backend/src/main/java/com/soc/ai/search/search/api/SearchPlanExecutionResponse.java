package com.soc.ai.search.search.api;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.soc.ai.search.search.domain.plan.AggregationType;
import com.soc.ai.search.search.domain.plan.SearchMode;
import com.soc.ai.search.search.domain.result.AggregationResultItem;
import com.soc.ai.search.search.domain.result.AggregationSearchResponse;
import com.soc.ai.search.search.domain.result.ChartMetadata;
import com.soc.ai.search.search.domain.result.SearchEvent;
import com.soc.ai.search.search.domain.result.SearchPlanSearchResponse;
import com.soc.ai.search.summary.domain.SummarySource;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SearchPlanExecutionResponse(
        UUID queryId,
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
            UUID queryId,
            SearchPlanSearchResponse response) {
        return fromSearch(queryId, response, 0, null, null);
    }

    public static SearchPlanExecutionResponse fromSearch(
            UUID queryId,
            SearchPlanSearchResponse response,
            long summaryLatencyMs,
            String summary,
            SummarySource summarySource) {
        return new SearchPlanExecutionResponse(
                queryId,
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
            UUID queryId,
            AggregationSearchResponse response,
            int page,
            int size) {
        return fromAggregation(queryId, response, page, size, 0, null, null);
    }

    public static SearchPlanExecutionResponse fromAggregation(
            UUID queryId,
            AggregationSearchResponse response,
            int page,
            int size,
            long summaryLatencyMs,
            String summary,
            SummarySource summarySource) {
        return new SearchPlanExecutionResponse(
                queryId,
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
