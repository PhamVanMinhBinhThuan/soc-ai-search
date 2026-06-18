package com.soc.ai.search.search.execution;

import java.util.List;

import com.soc.ai.search.search.plan.SearchPlan;
import com.soc.ai.search.search.validation.SearchPlanValidationException;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/search")
@Tag(name = "Search", description = "Technical SearchPlan APIs")
public class SearchController {

    private final SearchPlanExecutor searchPlanExecutor;

    public SearchController(SearchPlanExecutor searchPlanExecutor) {
        this.searchPlanExecutor = searchPlanExecutor;
    }

    @PostMapping("/plan")
    @PreAuthorize("@rbacPermissionService.authDisabled() or hasRole('SOC_VIEWER')")
    @Operation(
            summary = "Execute a validated SearchPlan",
            description = "Requires SOC_VIEWER. Technical endpoint for deterministic search or aggregation SearchPlan execution.")
    public Object searchByPlan(@Valid @RequestBody SearchPlan searchPlan) {
        return searchPlanExecutor.execute(searchPlan);
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
    ResponseEntity<SearchErrorResponse> handleUnreadableMessage() {
        return ResponseEntity
                .badRequest()
                .body(new SearchErrorResponse("Invalid request body", List.of("Request body cannot be parsed")));
    }

    @ExceptionHandler(SearchExecutionException.class)
    ResponseEntity<SearchErrorResponse> handleSearchExecution() {
        return ResponseEntity
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new SearchErrorResponse("Search dependency is unavailable", List.of("Elasticsearch search failed")));
    }
}
