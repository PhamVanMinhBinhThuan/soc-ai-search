package com.soc.ai.search.audit.domain;

import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
import com.soc.ai.search.search.domain.plan.SearchMode;

public record StoredSearchQuery(
        UUID queryId,
        String userIdentity,
        AuditStatus status,
        SearchMode mode,
        JsonNode searchPlan) {
}
