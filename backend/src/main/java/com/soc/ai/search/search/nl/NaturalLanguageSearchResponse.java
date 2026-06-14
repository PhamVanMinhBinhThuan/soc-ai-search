package com.soc.ai.search.search.nl;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.soc.ai.search.search.execution.AggregationResultItem;
import com.soc.ai.search.search.execution.ChartMetadata;
import com.soc.ai.search.search.execution.SearchEvent;
import com.soc.ai.search.search.plan.AggregationType;
import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.search.plan.SearchPlan;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record NaturalLanguageSearchResponse(
        UUID queryId,
        String originalQuestion,
        SearchMode mode,
        SearchPlan searchPlan,
        Map<String, Object> generatedDsl,
        long total,
        int page,
        int size,
        long totalPages,
        long llmLatencyMs,
        long searchLatencyMs,
        long latencyMs,
        AggregationType aggregationType,
        List<AggregationResultItem> aggregationResults,
        ChartMetadata chartMetadata,
        List<SearchEvent> events) {
}
