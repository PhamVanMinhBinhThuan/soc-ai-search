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
        String raw,
        boolean rawVisible) {

    public EventDetailResponse(
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
        this(
                eventId,
                indexName,
                timestamp,
                source,
                severity,
                eventType,
                user,
                host,
                ip,
                countryCode,
                message,
                raw,
                raw != null);
    }

    public EventDetailResponse withoutRaw() {
        return new EventDetailResponse(
                eventId,
                indexName,
                timestamp,
                source,
                severity,
                eventType,
                user,
                host,
                ip,
                countryCode,
                message,
                null,
                false);
    }
}
