package com.soc.ai.search.audit;

import java.time.Instant;

import com.soc.ai.search.search.plan.SearchMode;

public record AuditLogFilters(
        String question,
        AuditStatus status,
        SearchMode mode,
        Boolean pinned,
        String identity,
        Instant from,
        Instant to,
        String sort) {
}
