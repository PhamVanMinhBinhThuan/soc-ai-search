package com.soc.ai.search.search.api;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import com.soc.ai.search.common.logging.LogFields;
import org.slf4j.MDC;

public record SearchErrorResponse(
        String message,
        List<String> errors,
        String request_id,
        OffsetDateTime timestamp) {

    public SearchErrorResponse(String message, List<String> errors) {
        this(message, errors, requestId(), OffsetDateTime.now(ZoneOffset.UTC));
    }

    private static String requestId() {
        var requestId = MDC.get(LogFields.REQUEST_ID);
        if (requestId == null || requestId.isBlank()) {
            return UUID.randomUUID().toString();
        }
        return requestId;
    }
}
