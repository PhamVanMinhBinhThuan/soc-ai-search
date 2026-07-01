package com.soc.ai.search.suggestions;

import java.util.List;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.search.plan.SearchPlan;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record FollowUpSuggestionRequest(
        @NotBlank @Size(max = 500) String question,
        @NotNull @Valid SearchPlan searchPlan,
        @NotNull @Min(0) Integer resultCount,
        @NotNull SearchMode mode,
        @Size(max = 5) List<@Valid SampleEvent> sampleEvents,
        @Size(max = 5) List<@Valid AggregationBucket> aggregationBuckets) {

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record SampleEvent(
            @Size(max = 80) String eventType,
            @Size(max = 20) String severity,
            @Size(max = 80) String user,
            @Size(max = 80) String host,
            @Size(max = 80) String ip,
            @Size(max = 2) String countryCode) {
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record AggregationBucket(
            @Size(max = 120) String key,
            @Min(0) @Max(1_000_000) Long value) {
    }
}
