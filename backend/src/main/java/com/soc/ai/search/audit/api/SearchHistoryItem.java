package com.soc.ai.search.audit.api;


import java.time.Instant;
import java.util.UUID;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.soc.ai.search.search.domain.plan.SearchMode;

import com.soc.ai.search.audit.domain.AuditStatus;
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SearchHistoryItem(
        UUID queryId,
        String question,
        SearchMode mode,
        Long resultCount,
        Long latencyMs,
        AuditStatus status,
        Instant createdAt,
        boolean pinned,
        Instant pinnedAt) {
}
