package com.soc.ai.search.summary.domain;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SummarySampleEvent(
        String timestamp,
        String severity,
        String eventType,
        String user,
        String host,
        String ip,
        String countryCode,
        String message) {
}
