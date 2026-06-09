package com.soc.ai.search.search.nl;

import java.util.List;

import com.soc.ai.search.search.execution.SearchErrorResponse;
import com.soc.ai.search.search.execution.SearchExecutionException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/search")
@Tag(name = "Natural Language Search", description = "Natural-language SOC event search APIs")
public class NaturalLanguageSearchController {

    private final NaturalLanguageSearchService naturalLanguageSearchService;

    public NaturalLanguageSearchController(NaturalLanguageSearchService naturalLanguageSearchService) {
        this.naturalLanguageSearchService = naturalLanguageSearchService;
    }

    @PostMapping
    @Operation(
            summary = "Search SOC events with a natural-language question",
            description = "Uses an LLM to convert the question into a validated SearchPlan, then executes Elasticsearch search.")
    public NaturalLanguageSearchResponse search(@Valid @RequestBody NaturalLanguageSearchRequest request) {
        return naturalLanguageSearchService.search(request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<SearchErrorResponse> handleBeanValidation(MethodArgumentNotValidException exception) {
        var errors = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .toList();
        return ResponseEntity
                .badRequest()
                .body(new SearchErrorResponse("Invalid natural language search request", errors));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<SearchErrorResponse> handleUnreadableMessage() {
        return ResponseEntity
                .badRequest()
                .body(new SearchErrorResponse("Invalid request body", List.of("Request body cannot be parsed")));
    }

    @ExceptionHandler(NaturalLanguageSearchException.class)
    ResponseEntity<SearchErrorResponse> handleNaturalLanguageSearch(NaturalLanguageSearchException exception) {
        return ResponseEntity
                .status(HttpStatus.BAD_GATEWAY)
                .body(new SearchErrorResponse(exception.getMessage(), exception.errors()));
    }

    @ExceptionHandler(SearchExecutionException.class)
    ResponseEntity<SearchErrorResponse> handleSearchExecution() {
        return ResponseEntity
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new SearchErrorResponse("Search dependency is unavailable", List.of("Elasticsearch search failed")));
    }
}
