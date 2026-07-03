package com.soc.ai.search.audit;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

import com.soc.ai.search.search.execution.SearchErrorResponse;
import com.soc.ai.search.search.plan.SearchMode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@Tag(name = "Search History and Audit", description = "Recent query history and application audit log APIs")
public class AuditQueryController {

    private static final MediaType CSV_MEDIA_TYPE =
            new MediaType("text", "csv", StandardCharsets.UTF_8);

    private final AuditQueryService queryService;

    public AuditQueryController(AuditQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping("/api/v1/search/history")
    @PreAuthorize("@rbacPermissionService.authDisabled() or hasRole('SOC_ANALYST')")
    @Operation(
            summary = "Get recent query history for the current analyst",
            description = "Requires SOC_ANALYST. Results are scoped to the current identity.")
    public PagedResponse<SearchHistoryItem> history(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Boolean pinned,
            @RequestParam(required = false) AuditStatus status,
            @RequestParam(required = false) String mode,
            @RequestParam(required = false) String question,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(required = false) String sort) {
        return queryService.history(page, size, new AuditLogFilters(
                firstText(question, q),
                status,
                parseMode(mode),
                pinned,
                null,
                from,
                to,
                sort));
    }

    @GetMapping("/api/v1/search/history/{queryId}")
    @PreAuthorize("@rbacPermissionService.authDisabled() or hasAnyRole('SOC_ANALYST', 'SOC_ADMIN')")
    @Operation(summary = "Get detailed query history", description = "Requires SOC_ANALYST or SOC_ADMIN.")
    public ResponseEntity<SearchHistoryDetailItem> getHistoryDetail(@PathVariable java.util.UUID queryId) {
        return ResponseEntity.ok(queryService.getHistoryDetail(queryId));
    }

    @PatchMapping("/api/v1/search/history/{queryId}/pin")
    @PreAuthorize("@rbacPermissionService.authDisabled() or hasAnyRole('SOC_ANALYST', 'SOC_ADMIN')")
    @Operation(summary = "Pin or unpin a query", description = "Requires SOC_ANALYST or SOC_ADMIN.")
    public ResponseEntity<SearchHistoryItem> pinQuery(
            @PathVariable java.util.UUID queryId,
            @RequestBody PinQueryRequest request) {
        return ResponseEntity.ok(queryService.pinQuery(queryId, request.pinned()));
    }

    @GetMapping("/api/v1/audit-logs")
    @PreAuthorize("@rbacPermissionService.authDisabled() or hasRole('SOC_ADMIN')")
    @Operation(summary = "Get paginated application audit logs", description = "Requires SOC_ADMIN.")
    public PagedResponse<AuditLogItem> auditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) AuditStatus status,
            @RequestParam(required = false) String mode,
            @RequestParam(required = false) String question,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String identity,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(required = false) String sort) {
        return queryService.auditLogs(page, size, new AuditLogFilters(
                firstText(question, q),
                status,
                parseMode(mode),
                null,
                identity,
                from,
                to,
                sort));
    }

    @GetMapping(value = "/api/v1/audit-logs/export", produces = "text/csv")
    @PreAuthorize("@rbacPermissionService.authDisabled() or hasRole('SOC_ADMIN')")
    @Operation(summary = "Export filtered application audit logs as CSV", description = "Requires SOC_ADMIN.")
    public ResponseEntity<StreamingResponseBody> exportAuditLogs(
            @RequestParam(required = false) AuditStatus status,
            @RequestParam(required = false) String mode,
            @RequestParam(required = false) String question,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String identity,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(required = false) String sort) {
        var filters = new AuditLogFilters(firstText(question, q), status, parseMode(mode), null, identity, from, to, sort);
        var prepared = queryService.prepareAuditExport(filters);

        return ResponseEntity.ok()
                .contentType(CSV_MEDIA_TYPE)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename("soc-audit-logs.csv")
                                .build()
                                .toString())
                .header("X-Export-Truncated", Boolean.toString(prepared.truncated()))
                .body(prepared.body());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<SearchErrorResponse> handleInvalidPagination(IllegalArgumentException exception) {
        return ResponseEntity
                .badRequest()
                .body(new SearchErrorResponse("Invalid pagination", List.of(exception.getMessage())));
    }

    @ExceptionHandler(AuditPersistenceException.class)
    ResponseEntity<SearchErrorResponse> handleAuditPersistence() {
        return ResponseEntity
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new SearchErrorResponse(
                        "Audit dependency is unavailable",
                        List.of("PostgreSQL audit query failed")));
    }

    private SearchMode parseMode(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return SearchMode.fromJson(value);
    }

    private String firstText(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) {
            return primary;
        }
        return fallback;
    }
}
