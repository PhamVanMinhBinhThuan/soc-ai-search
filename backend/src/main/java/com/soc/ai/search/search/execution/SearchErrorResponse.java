package com.soc.ai.search.search.execution;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

public record SearchErrorResponse(
        String message,
        List<String> errors,
        String request_id,
        OffsetDateTime timestamp) {

    public SearchErrorResponse(String message, List<String> errors) {
        this(message, errors, UUID.randomUUID().toString(), OffsetDateTime.now(ZoneOffset.UTC));
    }
}
