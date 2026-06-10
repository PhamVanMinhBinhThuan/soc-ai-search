package com.soc.ai.search.search.execution;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.soc.ai.search.search.plan.AggregationType;
import com.soc.ai.search.search.plan.SearchMode;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record AggregationSearchResponse(
        SearchMode mode,
        AggregationType aggregationType,
        Map<String, Object> generatedDsl,
        long total,
        long latencyMs,
        List<AggregationResultItem> aggregationResults,
        ChartMetadata chartMetadata) {
}
