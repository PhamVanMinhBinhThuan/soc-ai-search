package com.soc.ai.search.audit;

import java.util.List;

import com.soc.ai.search.search.execution.SearchErrorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Search History and Audit", description = "Recent query history and application audit log APIs")
public class AuditQueryController {

    private final AuditQueryService queryService;

    public AuditQueryController(AuditQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping("/api/v1/search/history")
    @Operation(summary = "Get recent query history for the demo analyst")
    public PagedResponse<SearchHistoryItem> history(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return queryService.history(page, size);
    }

    @GetMapping("/api/v1/audit-logs")
    @Operation(summary = "Get paginated application audit logs")
    public PagedResponse<AuditLogItem> auditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return queryService.auditLogs(page, size);
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
}
