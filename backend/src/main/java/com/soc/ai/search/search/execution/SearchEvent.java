package com.soc.ai.search.search.execution;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SearchEvent(
        String eventId,
        String timestamp,
        String source,
        String severity,
        String eventType,
        String user,
        String host,
        String ip,
        String countryCode,
        String message) {
}
