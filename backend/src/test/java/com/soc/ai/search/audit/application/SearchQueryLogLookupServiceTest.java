package com.soc.ai.search.audit.application;


import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.search.domain.plan.SearchMode;
import com.soc.ai.search.security.CurrentUserService;
import org.junit.jupiter.api.Test;

import com.soc.ai.search.audit.domain.AuditStatus;
import com.soc.ai.search.audit.domain.StoredSearchQuery;
import com.soc.ai.search.audit.infrastructure.jpa.SearchQueryLog;
import com.soc.ai.search.audit.infrastructure.jpa.SearchQueryLogRepository;
class SearchQueryLogLookupServiceTest {

    private final SearchQueryLogRepository repository =
            org.mockito.Mockito.mock(SearchQueryLogRepository.class);
    private final CurrentUserService currentUserService =
            org.mockito.Mockito.mock(CurrentUserService.class);
    private final SearchQueryLogLookupService service =
            new SearchQueryLogLookupService(repository, currentUserService);

    @Test
    void lookupUsesQueryIdAndCurrentIdentityWithoutExposingEntity() {
        var queryId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        var searchPlan = new ObjectMapper().createObjectNode().put("mode", "search");
        var log = new SearchQueryLog(
                queryId,
                "demo-analyst",
                "failed login china",
                searchPlan,
                null,
                SearchMode.SEARCH,
                3L,
                20L,
                AuditStatus.SUCCESS,
                null,
                null,
                Instant.parse("2026-06-14T00:00:00Z"));
        when(currentUserService.currentIdentity()).thenReturn("demo-analyst");
        when(repository.findByIdAndUserIdentity(queryId, "demo-analyst"))
                .thenReturn(Optional.of(log));

        var result = service.findForExport(queryId);

        assertThat(result).contains(new StoredSearchQuery(
                queryId,
                "demo-analyst",
                AuditStatus.SUCCESS,
                SearchMode.SEARCH,
                searchPlan));
        verify(repository).findByIdAndUserIdentity(queryId, "demo-analyst");
    }
}
