package com.soc.ai.search.search.plan;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotNull;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record AggregationPlan(
        @NotNull AggregationType type,
        String field,
        Integer topN,
        HistogramInterval interval,
        AggregationOrderBy orderBy,
        SortOrder order) {

    public AggregationPlan(AggregationType type, String field, Integer topN, HistogramInterval interval) {
        this(type, field, topN, interval, null, null);
    }
}
