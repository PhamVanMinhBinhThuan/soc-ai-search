package com.soc.ai.search.search.domain.plan;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.Pattern;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record TimeRange(
        @Pattern(regexp = ".*\\S.*", message = "must not be blank") String from,
        @Pattern(regexp = ".*\\S.*", message = "must not be blank") String to) {
}
