package com.soc.ai.search.csv;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import com.soc.ai.search.audit.AuditPersistenceException;
import com.soc.ai.search.search.execution.SearchErrorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.convert.ConversionFailedException;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping("/api/v1/search")
@Tag(name = "CSV Export", description = "Replay an audited SearchPlan and export current Elasticsearch results")
public class CsvExportController {

    private static final MediaType CSV_MEDIA_TYPE =
            new MediaType("text", "csv", StandardCharsets.UTF_8);

    private final CsvExportService exportService;

    public CsvExportController(CsvExportService exportService) {
        this.exportService = exportService;
    }

    @GetMapping(value = "/{queryId}/export.csv", produces = "text/csv")
    @PreAuthorize("@rbacPermissionService.authDisabled() or hasRole('SOC_ANALYST')")
    @Operation(
            summary = "Export an audited search query as CSV",
            description = "Requires SOC_ANALYST. Replays the stored SearchPlan against current Elasticsearch data. "
                    + "Search exports are capped at 10,000 rows; aggregation exports contain current buckets.")
    public ResponseEntity<StreamingResponseBody> export(@PathVariable UUID queryId) {
        var prepared = exportService.prepare(queryId);
        var filename = "soc-search-" + queryId + ".csv";

        return ResponseEntity.ok()
                .contentType(CSV_MEDIA_TYPE)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(filename)
                                .build()
                                .toString())
                .header("X-Export-Truncated", Boolean.toString(prepared.truncated()))
                .body(prepared.body());
    }

    @ExceptionHandler(CsvExportNotFoundException.class)
    ResponseEntity<SearchErrorResponse> handleNotFound(CsvExportNotFoundException exception) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(new SearchErrorResponse(exception.getMessage(), List.of("Query cannot be found")));
    }

    @ExceptionHandler(CsvExportConflictException.class)
    ResponseEntity<SearchErrorResponse> handleConflict(CsvExportConflictException exception) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(new SearchErrorResponse(exception.getMessage(), List.of("Query cannot be exported")));
    }

    @ExceptionHandler({ MethodArgumentTypeMismatchException.class, ConversionFailedException.class })
    ResponseEntity<SearchErrorResponse> handleInvalidQueryId() {
        return ResponseEntity
                .badRequest()
                .body(new SearchErrorResponse("Invalid query_id", List.of("query_id must be a UUID")));
    }

    @ExceptionHandler(CsvExportDependencyException.class)
    ResponseEntity<SearchErrorResponse> handleElasticsearchFailure() {
        return ResponseEntity
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new SearchErrorResponse(
                        "CSV export dependency is unavailable",
                        List.of("Elasticsearch export failed")));
    }

    @ExceptionHandler(AuditPersistenceException.class)
    ResponseEntity<SearchErrorResponse> handleAuditLookupFailure() {
        return ResponseEntity
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new SearchErrorResponse(
                        "CSV export dependency is unavailable",
                        List.of("PostgreSQL audit lookup failed")));
    }
}
