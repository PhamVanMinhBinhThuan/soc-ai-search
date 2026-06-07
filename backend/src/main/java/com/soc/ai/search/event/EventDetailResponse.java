package com.soc.ai.search.event;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record EventDetailResponse(
        String eventId,
        String indexName,
        String timestamp,
        String source,
        String severity,
        String eventType,
        String user,
        String host,
        String ip,
        String countryCode,
        String message,
        String raw) {
}
