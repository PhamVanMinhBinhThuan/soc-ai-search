package com.soc.ai.search.search.execution;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ChartMetadata(
        ChartType chartType,
        String xAxisLabel,
        String yAxisLabel) {
}
