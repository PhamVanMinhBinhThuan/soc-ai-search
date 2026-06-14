package com.soc.ai.search.audit;

import java.time.Instant;
import java.util.UUID;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.soc.ai.search.search.plan.SearchMode;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record AuditLogItem(
        UUID queryId,
        String userIdentity,
        String question,
        SearchMode mode,
        Long resultCount,
        Long latencyMs,
        AuditStatus status,
        String errorMessage,
        Instant createdAt) {
}
