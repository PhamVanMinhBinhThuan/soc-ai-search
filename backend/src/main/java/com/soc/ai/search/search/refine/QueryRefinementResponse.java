package com.soc.ai.search.search.refine;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record QueryRefinementResponse(
        String rewrittenQuestion,
        String source,
        long latencyMs) {
}
