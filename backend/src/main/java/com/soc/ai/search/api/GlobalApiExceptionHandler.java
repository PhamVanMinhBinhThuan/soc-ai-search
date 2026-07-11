package com.soc.ai.search.api;

import java.util.List;

import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException;
import com.soc.ai.search.audit.AuditPersistenceException;
import com.soc.ai.search.csv.CsvExportConflictException;
import com.soc.ai.search.csv.CsvExportDependencyException;
import com.soc.ai.search.csv.CsvExportNotFoundException;
import com.soc.ai.search.search.execution.SearchErrorResponse;
import com.soc.ai.search.search.execution.SearchExecutionException;
import com.soc.ai.search.search.nl.NaturalLanguageSearchException;
import com.soc.ai.search.search.nl.NaturalLanguageSearchRateLimitException;
import com.soc.ai.search.search.refine.QueryRefinementException;
import com.soc.ai.search.search.validation.SearchPlanValidationException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.convert.ConversionFailedException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class GlobalApiExceptionHandler {

    @ExceptionHandler(SearchPlanValidationException.class)
    ResponseEntity<SearchErrorResponse> handleSearchPlanValidation(SearchPlanValidationException exception) {
        return ResponseEntity
                .badRequest()
                .body(new SearchErrorResponse("Invalid SearchPlan", exception.errors()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<SearchErrorResponse> handleBeanValidation(
            MethodArgumentNotValidException exception,
            HttpServletRequest request) {
        var errors = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .toList();
        return ResponseEntity
                .badRequest()
                .body(new SearchErrorResponse(validationMessage(request), errors));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<SearchErrorResponse> handleUnreadableMessage(HttpMessageNotReadableException exception) {
        return ResponseEntity
                .badRequest()
                .body(new SearchErrorResponse("Invalid request body", List.of(unreadableMessage(exception))));
    }

    @ExceptionHandler(NaturalLanguageSearchRateLimitException.class)
    ResponseEntity<SearchErrorResponse> handleNaturalLanguageSearchRateLimit(
            NaturalLanguageSearchRateLimitException exception) {
        return ResponseEntity
                .status(HttpStatus.TOO_MANY_REQUESTS)
                .body(new SearchErrorResponse(exception.getMessage(), exception.errors()));
    }

    @ExceptionHandler(NaturalLanguageSearchException.class)
    ResponseEntity<SearchErrorResponse> handleNaturalLanguageSearch(NaturalLanguageSearchException exception) {
        return ResponseEntity
                .status(HttpStatus.BAD_GATEWAY)
                .body(new SearchErrorResponse(exception.getMessage(), exception.errors()));
    }

    @ExceptionHandler(QueryRefinementException.class)
    ResponseEntity<SearchErrorResponse> handleQueryRefinement(QueryRefinementException exception) {
        return ResponseEntity
                .badRequest()
                .body(new SearchErrorResponse(exception.getMessage(), exception.errors()));
    }

    @ExceptionHandler(SearchExecutionException.class)
    ResponseEntity<SearchErrorResponse> handleSearchExecution() {
        return ResponseEntity
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new SearchErrorResponse("Search dependency is unavailable", List.of("Elasticsearch search failed")));
    }

    @ExceptionHandler(CsvExportNotFoundException.class)
    ResponseEntity<SearchErrorResponse> handleCsvNotFound(CsvExportNotFoundException exception) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(new SearchErrorResponse(exception.getMessage(), List.of("Query cannot be found")));
    }

    @ExceptionHandler(CsvExportConflictException.class)
    ResponseEntity<SearchErrorResponse> handleCsvConflict(CsvExportConflictException exception) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(new SearchErrorResponse(exception.getMessage(), List.of("Query cannot be exported")));
    }

    @ExceptionHandler(CsvExportDependencyException.class)
    ResponseEntity<SearchErrorResponse> handleCsvDependency() {
        return ResponseEntity
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new SearchErrorResponse(
                        "CSV export dependency is unavailable",
                        List.of("Elasticsearch export failed")));
    }

    @ExceptionHandler(AuditPersistenceException.class)
    ResponseEntity<SearchErrorResponse> handleAuditPersistence(
            AuditPersistenceException exception,
            HttpServletRequest request) {
        var path = request.getRequestURI();
        if (path.contains("/export.csv")) {
            return ResponseEntity
                    .status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(new SearchErrorResponse(
                            "CSV export dependency is unavailable",
                            List.of("PostgreSQL audit lookup failed")));
        }
        if (path.startsWith("/api/v1/audit-logs") || path.startsWith("/api/v1/search/history")) {
            return ResponseEntity
                    .status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(new SearchErrorResponse(
                            "Audit dependency is unavailable",
                            List.of("PostgreSQL audit query failed")));
        }
        return ResponseEntity
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new SearchErrorResponse(exception.getMessage(), List.of("PostgreSQL audit persistence failed")));
    }

    @ExceptionHandler({ MethodArgumentTypeMismatchException.class, ConversionFailedException.class })
    ResponseEntity<SearchErrorResponse> handleArgumentTypeMismatch(Exception exception) {
        if (isQueryIdMismatch(exception)) {
            return ResponseEntity
                    .badRequest()
                    .body(new SearchErrorResponse("Invalid query_id", List.of("query_id must be a UUID")));
        }
        return ResponseEntity
                .badRequest()
                .body(new SearchErrorResponse("Invalid request parameter", List.of("Request parameter cannot be parsed")));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<SearchErrorResponse> handleIllegalArgument(
            IllegalArgumentException exception,
            HttpServletRequest request) {
        if (isAuditReadPath(request.getRequestURI())) {
            return ResponseEntity
                    .badRequest()
                    .body(new SearchErrorResponse("Invalid pagination", List.of(exception.getMessage())));
        }
        return ResponseEntity
                .badRequest()
                .body(new SearchErrorResponse("Invalid request", List.of(exception.getMessage())));
    }

    private String validationMessage(HttpServletRequest request) {
        var path = request.getRequestURI();
        if ("/api/v1/search/plan".equals(path)) {
            return "Invalid SearchPlan";
        }
        if ("/api/v1/search".equals(path)) {
            return "Invalid natural language search request";
        }
        if ("/api/v1/search/refine".equals(path)) {
            return "Invalid query refinement request";
        }
        if ("/api/v1/suggestions/follow-up".equals(path)) {
            return "Invalid follow-up suggestion request";
        }
        return "Invalid request";
    }

    private String unreadableMessage(HttpMessageNotReadableException exception) {
        Throwable cause = exception.getCause();
        if (cause instanceof UnrecognizedPropertyException unrecognized) {
            return "Validation failed: Unrecognized field '" + unrecognized.getPropertyName()
                    + "'. This field is not in the allowlist.";
        }
        if (cause instanceof JsonMappingException mappingException) {
            return "Invalid JSON structure: " + mappingException.getOriginalMessage();
        }
        if (cause != null) {
            return cause.getMessage();
        }
        return "Request body cannot be parsed";
    }

    private boolean isQueryIdMismatch(Exception exception) {
        if (exception instanceof MethodArgumentTypeMismatchException mismatch) {
            return "queryId".equals(mismatch.getName());
        }
        return false;
    }

    private boolean isAuditReadPath(String path) {
        return path.startsWith("/api/v1/audit-logs") || path.startsWith("/api/v1/search/history");
    }
}
