package com.soc.ai.search.search.execution;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.soc.ai.search.search.plan.SearchMode;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SearchPlanSearchResponse(
        SearchMode mode,
        Map<String, Object> generatedDsl,
        long total,
        int page,
        int size,
        long totalPages,
        long latencyMs,
        List<SearchEvent> events) {
}
