package com.soc.ai.search.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.search.plan.SearchFilters;
import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.search.plan.SearchPlan;
import com.soc.ai.search.search.plan.TimeRange;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class SearchAuditServiceTest {

    private final AuditPersistenceService persistenceService =
            org.mockito.Mockito.mock(AuditPersistenceService.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SearchAuditService service = new SearchAuditService(
            persistenceService,
            new AuditProperties("demo-analyst"),
            new AuditErrorSanitizer(),
            objectMapper);

    @Test
    void savesSuccessWithSameQueryIdAndStructuredJson() throws Exception {
        var queryId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        var plan = searchPlan();
        var dsl = Map.<String, Object>of("query", Map.of("match_all", Map.of()), "size", 5);

        service.saveSuccess(queryId, "failed login china", plan, dsl, 12, 30);

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
    }

    @Test
    void omitsGeneratedDslThatExceedsUtf8ByteLimit() {
        var oversizedDsl = Map.<String, Object>of("query", "á".repeat(60_000));

        service.saveSuccess(
                UUID.randomUUID(),
                "question",
                searchPlan(),
                oversizedDsl,
                1,
                10);

        var captor = ArgumentCaptor.forClass(SearchQueryLog.class);
        verify(persistenceService).save(captor.capture());
        assertThat(captor.getValue().getGeneratedDsl()).isNull();
    }

    @Test
    void savesSanitizedFailureWithoutSearchPlan() {
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
