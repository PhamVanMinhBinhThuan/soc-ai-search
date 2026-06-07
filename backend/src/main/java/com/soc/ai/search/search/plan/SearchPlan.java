package com.soc.ai.search.search.plan;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SearchPlan(
        @NotNull SearchMode mode,
        @Valid SearchFilters filters,
        @Size(max = 200, message = "must be at most 200 characters")
        @Pattern(regexp = ".*\\S.*", message = "must not be blank") String messageQuery,
        @NotNull @Min(0) Integer page,
        @NotNull @Min(1) @Max(100) Integer size) {

    public SearchPlan(SearchMode mode, SearchFilters filters, Integer page, Integer size) {
        this(mode, filters, null, page, size);
    }
}
