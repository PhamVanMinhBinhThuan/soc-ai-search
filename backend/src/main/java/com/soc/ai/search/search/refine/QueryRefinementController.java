package com.soc.ai.search.search.refine;

import com.soc.ai.search.search.execution.SearchErrorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/search/refine")
@Tag(name = "Query Refinement", description = "AI-assisted natural-language query refinement")
public class QueryRefinementController {

    private final QueryRefinementService service;

    public QueryRefinementController(QueryRefinementService service) {
        this.service = service;
    }

    @PostMapping
    @PreAuthorize("@rbacPermissionService.authDisabled() or hasRole('SOC_VIEWER')")
    @Operation(
            summary = "Rewrite a SOC search question from a user refinement",
            description = "Requires SOC_VIEWER. The endpoint previews a rewritten natural-language question only; "
                    + "it does not execute search or write audit history.")
    public QueryRefinementResponse refine(@Valid @RequestBody QueryRefinementRequest request) {
        return service.refine(request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<SearchErrorResponse> handleBeanValidation(MethodArgumentNotValidException exception) {
        var errors = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .toList();
        return ResponseEntity
                .badRequest()
                .body(new SearchErrorResponse("Invalid query refinement request", errors));
    }

    @ExceptionHandler(QueryRefinementException.class)
    ResponseEntity<SearchErrorResponse> handleQueryRefinement(QueryRefinementException exception) {
        return ResponseEntity
                .badRequest()
                .body(new SearchErrorResponse(exception.getMessage(), exception.errors()));
    }
}
