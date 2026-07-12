package com.soc.ai.search.search.domain.result;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.soc.ai.search.search.domain.plan.AggregationType;
import com.soc.ai.search.search.domain.plan.SearchMode;

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
