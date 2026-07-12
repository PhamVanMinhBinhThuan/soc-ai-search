package com.soc.ai.search.audit.application;


import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.search.domain.plan.SearchFilters;
import com.soc.ai.search.search.domain.plan.SearchMode;
import com.soc.ai.search.search.domain.plan.SearchPlan;
import com.soc.ai.search.search.domain.plan.TimeRange;
import com.soc.ai.search.security.CurrentUserService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.soc.ai.search.audit.domain.AuditStatus;
import com.soc.ai.search.audit.infrastructure.jpa.SearchQueryLog;
class SearchAuditServiceTest {

    private final AuditPersistenceService persistenceService =
            org.mockito.Mockito.mock(AuditPersistenceService.class);
    private final CurrentUserService currentUserService =
            org.mockito.Mockito.mock(CurrentUserService.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SearchAuditService service = new SearchAuditService(
            persistenceService,
            currentUserService,
            new AuditErrorSanitizer(),
            objectMapper);

    @Test
    void savesSuccessWithSameQueryIdAndStructuredJson() throws Exception {
        org.mockito.Mockito.when(currentUserService.currentIdentity()).thenReturn("demo-analyst");
        var queryId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        var plan = searchPlan();
        var dsl = Map.<String, Object>of("query", Map.of("match_all", Map.of()), "size", 5);

        service.saveSuccess(queryId, "failed login china", plan, dsl, 12, 30, "Three sentence summary.");

        var captor = ArgumentCaptor.forClass(SearchQueryLog.class);
        verify(persistenceService).save(captor.capture());
        var log = captor.getValue();

        assertThat(log.getId()).isEqualTo(queryId);
        assertThat(log.getUserIdentity()).isEqualTo("demo-analyst");
        assertThat(log.getStatus()).isEqualTo(AuditStatus.SUCCESS);
        assertThat(log.getMode()).isEqualTo(SearchMode.SEARCH);
        assertThat(log.getResultCount()).isEqualTo(12);
        assertThat(log.getSearchPlan()).isNotNull();
        assertThat(objectMapper.treeToValue(log.getSearchPlan(), SearchPlan.class)).isEqualTo(plan);
        assertThat(log.getGeneratedDsl().path("size").asInt()).isEqualTo(5);
        assertThat(log.getSummary()).isEqualTo("Three sentence summary.");
        assertThat(log.getLatencyMs()).isEqualTo(30);
    }

    @Test
    void omitsGeneratedDslThatExceedsUtf8ByteLimit() {
        org.mockito.Mockito.when(currentUserService.currentIdentity()).thenReturn("demo-analyst");
        var oversizedDsl = Map.<String, Object>of("query", "Ã¡".repeat(60_000));

        service.saveSuccess(
                UUID.randomUUID(),
                "question",
                searchPlan(),
                oversizedDsl,
                1,
                10,
                "Summary.");

        var captor = ArgumentCaptor.forClass(SearchQueryLog.class);
        verify(persistenceService).save(captor.capture());
        assertThat(captor.getValue().getGeneratedDsl()).isNull();
    }

    @Test
    void savesSanitizedFailureWithoutSearchPlan() {
        org.mockito.Mockito.when(currentUserService.currentIdentity()).thenReturn("demo-analyst");
        service.saveFailure(
                UUID.randomUUID(),
                "question",
                null,
                null,
                12,
                new RuntimeException("Provider failed api_key=secret-value"));

        var captor = ArgumentCaptor.forClass(SearchQueryLog.class);
        verify(persistenceService).save(captor.capture());
        var log = captor.getValue();

        assertThat(log.getStatus()).isEqualTo(AuditStatus.FAILED);
        assertThat(log.getSearchPlan()).isNull();
        assertThat(log.getMode()).isNull();
        assertThat(log.getErrorMessage())
                .contains("api_key=[REDACTED]")
                .doesNotContain("secret-value");
    }

    private SearchPlan searchPlan() {
        return new SearchPlan(
                SearchMode.SEARCH,
                new SearchFilters(
                        new TimeRange("now-24h", "now"),
                        null,
                        List.of("failed_login"),
                        null,
                        null,
                        null,
                        List.of("CN")),
                0,
                5);
    }
}
