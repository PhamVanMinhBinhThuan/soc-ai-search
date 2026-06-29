package com.soc.ai.search.search.execution;

import java.util.List;

import com.soc.ai.search.search.plan.SearchPlan;
import com.soc.ai.search.search.validation.SearchPlanValidationException;
import com.soc.ai.search.summary.ResultSummaryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/search")
@Tag(name = "Search", description = "Technical SearchPlan APIs")
public class SearchController {

    private final SearchPlanExecutor searchPlanExecutor;
    private final ResultSummaryService resultSummaryService;

    public SearchController(
            SearchPlanExecutor searchPlanExecutor,
            ResultSummaryService resultSummaryService) {
        this.searchPlanExecutor = searchPlanExecutor;
        this.resultSummaryService = resultSummaryService;
    }

    @PostMapping("/plan")
    @PreAuthorize("@rbacPermissionService.authDisabled() or hasRole('SOC_VIEWER')")
    @Operation(
            summary = "Execute a validated SearchPlan",
            description = "Requires SOC_VIEWER. Technical endpoint for deterministic search or aggregation SearchPlan execution.")
    public SearchPlanExecutionResponse searchByPlan(
            @Valid @RequestBody SearchPlan searchPlan,
            @RequestParam(name = "include_summary", defaultValue = "false") boolean includeSummary,
            @RequestParam(name = "summary_question", required = false) String summaryQuestion) {
        var response = searchPlanExecutor.execute(searchPlan);
        var effectiveSummaryQuestion = effectiveSummaryQuestion(summaryQuestion);
        if (response instanceof SearchPlanSearchResponse searchResponse) {
            if (!includeSummary) {
                return SearchPlanExecutionResponse.fromSearch(searchResponse);
            }
            var summary = resultSummaryService.summarizeSearch(
                    effectiveSummaryQuestion,
                    searchPlan,
                    searchResponse);
            return SearchPlanExecutionResponse.fromSearch(
                    searchResponse,
                    summary.latencyMs(),
                    summary.summary(),
                    summary.source());
        }

        if (response instanceof AggregationSearchResponse aggregationResponse) {
            if (!includeSummary) {
                return SearchPlanExecutionResponse.fromAggregation(
                        aggregationResponse,
                        searchPlan.page(),
                        searchPlan.size());
            }
            var summary = resultSummaryService.summarizeAggregation(
                    effectiveSummaryQuestion,
                    aggregationResponse);
            return SearchPlanExecutionResponse.fromAggregation(
                    aggregationResponse,
                    searchPlan.page(),
                    searchPlan.size(),
                    summary.latencyMs(),
                    summary.summary(),
                    summary.source());
        }

        throw new SearchExecutionException(
                "Unsupported SearchPlan execution response type",
                new IllegalStateException(response == null ? "null" : response.getClass().getName()));
    }

    private String effectiveSummaryQuestion(String summaryQuestion) {
        if (summaryQuestion == null || summaryQuestion.isBlank()) {
            return "Edited SearchPlan";
        }
        return summaryQuestion.strip();
    }

    @ExceptionHandler(SearchPlanValidationException.class)
    ResponseEntity<SearchErrorResponse> handleSearchPlanValidation(SearchPlanValidationException exception) {
        return ResponseEntity
                .badRequest()
                .body(new SearchErrorResponse("Invalid SearchPlan", exception.errors()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<SearchErrorResponse> handleBeanValidation(MethodArgumentNotValidException exception) {
        var errors = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .toList();
        return ResponseEntity
                .badRequest()
                .body(new SearchErrorResponse("Invalid SearchPlan", errors));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<SearchErrorResponse> handleUnreadableMessage(HttpMessageNotReadableException exception) {
        String detailMessage = "Request body cannot be parsed";
        Throwable cause = exception.getCause();
        if (cause instanceof com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException unrecognized) {
            detailMessage = "Validation failed: Unrecognized field '" + unrecognized.getPropertyName() + "'. This field is not in the allowlist.";
        } else if (cause instanceof com.fasterxml.jackson.databind.JsonMappingException mappingEx) {
            detailMessage = "Invalid JSON structure: " + mappingEx.getOriginalMessage();
        } else if (cause != null) {
            detailMessage = cause.getMessage();
        }

        return ResponseEntity
                .badRequest()
                .body(new SearchErrorResponse("Invalid request body", List.of(detailMessage)));
    }

    @ExceptionHandler(SearchExecutionException.class)
    ResponseEntity<SearchErrorResponse> handleSearchExecution() {
        return ResponseEntity
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new SearchErrorResponse("Search dependency is unavailable", List.of("Elasticsearch search failed")));
    }
}
