package com.soc.ai.search.csv;

import java.io.IOException;
import java.io.OutputStream;
import java.util.UUID;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.audit.AuditStatus;
import com.soc.ai.search.audit.SearchQueryLogLookupService;
import com.soc.ai.search.audit.StoredSearchQuery;
import com.soc.ai.search.search.execution.AggregationResultItem;
import com.soc.ai.search.search.plan.AggregationType;
import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.search.plan.SearchPlan;
import com.soc.ai.search.search.validation.SearchPlanValidationException;
import com.soc.ai.search.search.validation.SearchPlanValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class CsvExportService {

    private static final Logger LOGGER = LoggerFactory.getLogger(CsvExportService.class);

    private final SearchQueryLogLookupService lookupService;
    private final ObjectMapper objectMapper;
    private final SearchPlanValidator validator;
    private final ExportSearchExecutor exportSearchExecutor;

    public CsvExportService(
            SearchQueryLogLookupService lookupService,
            ObjectMapper objectMapper,
            SearchPlanValidator validator,
            ExportSearchExecutor exportSearchExecutor) {
        this.lookupService = lookupService;
        this.objectMapper = objectMapper;
        this.validator = validator;
        this.exportSearchExecutor = exportSearchExecutor;
    }

    public PreparedCsvExport prepare(UUID queryId) {
        var storedQuery = lookupService.findForExport(queryId)
                .orElseThrow(() -> new CsvExportNotFoundException("Search query not found: " + queryId));
        var plan = validatedPlan(storedQuery);

        if (plan.mode() == SearchMode.AGGREGATION) {
            return prepareAggregation(queryId, plan);
        }
        return prepareSearch(queryId, plan);
    }

    private SearchPlan validatedPlan(StoredSearchQuery storedQuery) {
        if (storedQuery.status() != AuditStatus.SUCCESS) {
            throw new CsvExportConflictException("Only successful search queries can be exported");
        }
        if (storedQuery.searchPlan() == null || storedQuery.searchPlan().isNull()) {
            throw new CsvExportConflictException("Stored SearchPlan is missing");
        }

        final SearchPlan plan;
        try {
            plan = objectMapper.treeToValue(storedQuery.searchPlan(), SearchPlan.class);
            validator.validate(plan);
        } catch (JsonProcessingException | SearchPlanValidationException | IllegalArgumentException exception) {
            throw new CsvExportConflictException("Stored SearchPlan is invalid", exception);
        }

        if (storedQuery.mode() != plan.mode()) {
            throw new CsvExportConflictException("Stored search mode does not match SearchPlan mode");
        }
        return plan;
    }

    private PreparedCsvExport prepareSearch(UUID queryId, SearchPlan plan) {
        var prepared = exportSearchExecutor.prepareSearch(plan);
        var truncated = prepared.total() > ExportSearchExecutor.MAX_EXPORT_ROWS;

        return new PreparedCsvExport(
                truncated,
                outputStream -> streamSearch(queryId, prepared, outputStream));
    }

    private PreparedCsvExport prepareAggregation(UUID queryId, SearchPlan plan) {
        var prepared = exportSearchExecutor.prepareAggregation(plan);
        return new PreparedCsvExport(
                false,
                outputStream -> streamAggregation(queryId, prepared, outputStream));
    }

    private void streamSearch(
            UUID queryId,
            PreparedSearchExport prepared,
            OutputStream outputStream) throws IOException {
        var writer = new CsvRowWriter(outputStream);
        writer.writeSearchHeader();

        var targetRows = Math.min(prepared.total(), ExportSearchExecutor.MAX_EXPORT_ROWS);
        var writtenRows = writeSearchEvents(writer, prepared.firstEvents(), targetRows);
        var previousBatchSize = prepared.firstEvents().size();
        var offset = ExportSearchExecutor.BATCH_SIZE;

        try {
            while (writtenRows < targetRows && previousBatchSize == ExportSearchExecutor.BATCH_SIZE) {
                var requestSize = (int) Math.min(
                        ExportSearchExecutor.BATCH_SIZE,
                        ExportSearchExecutor.MAX_EXPORT_ROWS - offset);
                if (requestSize <= 0) {
                    break;
                }

                var page = exportSearchExecutor.fetchSearchPage(prepared, offset, requestSize);
                previousBatchSize = page.events().size();
                writtenRows += writeSearchEvents(writer, page.events(), targetRows - writtenRows);
                offset += requestSize;
            }
            writer.flush();
        } catch (CsvExportDependencyException exception) {
            LOGGER.warn("CSV export stream stopped after Elasticsearch failure for query {}", queryId);
            throw new IOException("CSV export stream interrupted", exception);
        } catch (IOException exception) {
            LOGGER.warn("CSV export stream stopped for query {}", queryId);
            throw exception;
        }
    }

    private long writeSearchEvents(
            CsvRowWriter writer,
            java.util.List<com.soc.ai.search.search.execution.SearchEvent> events,
            long remainingRows) throws IOException {
        var written = 0L;
        for (var event : events) {
            if (written >= remainingRows) {
                break;
            }
            writer.writeSearchEvent(event);
            written++;
        }
        return written;
    }

    private void streamAggregation(
            UUID queryId,
            PreparedAggregationExport prepared,
            OutputStream outputStream) throws IOException {
        try {
            var writer = new CsvRowWriter(outputStream);
            writer.writeAggregationHeader();

            if (prepared.type() == AggregationType.COUNT) {
                writer.writeAggregationResult(new AggregationResultItem("total", prepared.total()));
            } else {
                for (var item : prepared.results()) {
                    writer.writeAggregationResult(item);
                }
            }
            writer.flush();
        } catch (IOException exception) {
            LOGGER.warn("Aggregation CSV stream stopped for query {}", queryId);
            throw exception;
        }
    }
}
