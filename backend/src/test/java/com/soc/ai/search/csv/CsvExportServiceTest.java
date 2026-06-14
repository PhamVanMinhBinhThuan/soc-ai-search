package com.soc.ai.search.csv;

import static com.soc.ai.search.search.plan.AggregationType.COUNT;
import static com.soc.ai.search.search.plan.SearchMode.AGGREGATION;
import static com.soc.ai.search.search.plan.SearchMode.SEARCH;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.audit.AuditStatus;
import com.soc.ai.search.audit.SearchQueryLogLookupService;
import com.soc.ai.search.audit.StoredSearchQuery;
import com.soc.ai.search.search.execution.SearchEvent;
import com.soc.ai.search.search.plan.AggregationPlan;
import com.soc.ai.search.search.plan.SearchPlan;
import com.soc.ai.search.search.validation.SearchPlanValidator;
import org.junit.jupiter.api.Test;

class CsvExportServiceTest {

    private final SearchQueryLogLookupService lookupService =
            org.mockito.Mockito.mock(SearchQueryLogLookupService.class);
    private final SearchPlanValidator validator =
            org.mockito.Mockito.mock(SearchPlanValidator.class);
    private final ExportSearchExecutor executor =
            org.mockito.Mockito.mock(ExportSearchExecutor.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final CsvExportService service =
            new CsvExportService(lookupService, objectMapper, validator, executor);

    @Test
    void streamsSearchAndUsesCurrentElasticsearchTotalForTruncation() throws Exception {
        var queryId = UUID.randomUUID();
        var plan = new SearchPlan(SEARCH, null, 0, 20);
        when(lookupService.findForExport(queryId)).thenReturn(Optional.of(stored(queryId, plan)));
        when(validator.validate(any(SearchPlan.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(executor.prepareSearch(any(SearchPlan.class))).thenReturn(new PreparedSearchExport(
                java.util.Map.of("query", java.util.Map.of()),
                10_001,
                List.of(event("seed-42-1"))));

        var prepared = service.prepare(queryId);
        var output = new ByteArrayOutputStream();
        prepared.body().writeTo(output);

        assertThat(prepared.truncated()).isTrue();
        assertThat(new String(output.toByteArray(), StandardCharsets.UTF_8))
                .contains("event_id,timestamp,source")
                .contains("seed-42-1")
                .doesNotContain(",raw,");
        verify(executor).prepareSearch(any(SearchPlan.class));
    }

    @Test
    void countNoResultStillExportsTotalZero() throws Exception {
        var queryId = UUID.randomUUID();
        var plan = new SearchPlan(
                AGGREGATION,
                null,
                new AggregationPlan(COUNT, null, null, null),
                null,
                0,
                20);
        when(lookupService.findForExport(queryId)).thenReturn(Optional.of(stored(queryId, plan)));
        when(validator.validate(any(SearchPlan.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(executor.prepareAggregation(any(SearchPlan.class)))
                .thenReturn(new PreparedAggregationExport(COUNT, 0, List.of()));

        var prepared = service.prepare(queryId);
        var output = new ByteArrayOutputStream();
        prepared.body().writeTo(output);

        assertThat(prepared.truncated()).isFalse();
        assertThat(new String(output.toByteArray(), StandardCharsets.UTF_8))
                .contains("key,value\r\n")
                .contains("total,0\r\n");
    }

    @Test
    void searchExportReadsSequentialBatchesWithoutChangingSearchPlanSize() throws Exception {
        var queryId = UUID.randomUUID();
        var plan = new SearchPlan(SEARCH, null, 0, 20);
        var firstBatch = java.util.stream.IntStream.range(0, 1_000)
                .mapToObj(index -> event("first-" + index))
                .toList();
        var secondBatch = java.util.stream.IntStream.range(0, 500)
                .mapToObj(index -> event("second-" + index))
                .toList();
        var preparedSearch = new PreparedSearchExport(
                java.util.Map.of("query", java.util.Map.of()),
                1_500,
                firstBatch);
        when(lookupService.findForExport(queryId)).thenReturn(Optional.of(stored(queryId, plan)));
        when(validator.validate(any(SearchPlan.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(executor.prepareSearch(any(SearchPlan.class))).thenReturn(preparedSearch);
        when(executor.fetchSearchPage(preparedSearch, 1_000, 1_000))
                .thenReturn(new com.soc.ai.search.search.execution.SearchExecutionResult(1_500, secondBatch));

        var prepared = service.prepare(queryId);
        prepared.body().writeTo(new ByteArrayOutputStream());

        verify(executor).fetchSearchPage(preparedSearch, 1_000, 1_000);
        assertThat(plan.size()).isEqualTo(20);
    }

    @Test
    void noResultSearchWritesOnlyHeader() throws Exception {
        var queryId = UUID.randomUUID();
        var plan = new SearchPlan(SEARCH, null, 0, 20);
        when(lookupService.findForExport(queryId)).thenReturn(Optional.of(stored(queryId, plan)));
        when(validator.validate(any(SearchPlan.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(executor.prepareSearch(any(SearchPlan.class))).thenReturn(new PreparedSearchExport(
                java.util.Map.of("query", java.util.Map.of()),
                0,
                List.of()));

        var output = new ByteArrayOutputStream();
        service.prepare(queryId).body().writeTo(output);

        var csv = new String(output.toByteArray(), StandardCharsets.UTF_8);
        assertThat(csv.replace("\uFEFF", ""))
                .isEqualTo("event_id,timestamp,source,severity,event_type,user,host,ip,country_code,message\r\n");
        verify(executor, never()).fetchSearchPage(any(), eq(1_000), eq(1_000));
    }

    @Test
    void rejectsFailedOrModeMismatchedStoredQueryBeforeElasticsearch() {
        var queryId = UUID.randomUUID();
        var plan = new SearchPlan(SEARCH, null, 0, 20);
        when(lookupService.findForExport(queryId)).thenReturn(Optional.of(new StoredSearchQuery(
                queryId,
                "demo-analyst",
                AuditStatus.FAILED,
                SEARCH,
                objectMapper.valueToTree(plan))));

        assertThatThrownBy(() -> service.prepare(queryId))
                .isInstanceOf(CsvExportConflictException.class);
        verify(executor, never()).prepareSearch(any());
    }

    @Test
    void rejectsStoredModeMismatch() {
        var queryId = UUID.randomUUID();
        var plan = new SearchPlan(SEARCH, null, 0, 20);
        when(lookupService.findForExport(queryId)).thenReturn(Optional.of(new StoredSearchQuery(
                queryId,
                "demo-analyst",
                AuditStatus.SUCCESS,
                AGGREGATION,
                objectMapper.valueToTree(plan))));
        when(validator.validate(any(SearchPlan.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertThatThrownBy(() -> service.prepare(queryId))
                .isInstanceOf(CsvExportConflictException.class)
                .hasMessage("Stored search mode does not match SearchPlan mode");
        verify(executor, never()).prepareSearch(any());
    }

    @Test
    void unknownQueryReturnsNotFound() {
        var queryId = UUID.randomUUID();
        when(lookupService.findForExport(queryId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.prepare(queryId))
                .isInstanceOf(CsvExportNotFoundException.class);
    }

    private StoredSearchQuery stored(UUID queryId, SearchPlan plan) {
        return new StoredSearchQuery(
                queryId,
                "demo-analyst",
                AuditStatus.SUCCESS,
                plan.mode(),
                objectMapper.valueToTree(plan));
    }

    private SearchEvent event(String id) {
        return new SearchEvent(
                id,
                "2026-06-14T00:00:00Z",
                "windows-auth",
                "high",
                "failed_login",
                "admin",
                "host-001",
                "203.0.113.10",
                "CN",
                "Failed login");
    }
}
