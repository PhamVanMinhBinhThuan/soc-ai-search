package com.soc.ai.search.search.domain.result;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.soc.ai.search.search.domain.plan.SearchMode;

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
