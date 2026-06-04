package com.soc.ai.search.search.plan;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SearchPlan(
        @NotNull SearchMode mode,
        @Valid SearchFilters filters,
        @NotNull @Min(0) Integer page,
        @NotNull @Min(1) @Max(100) Integer size) {
}
