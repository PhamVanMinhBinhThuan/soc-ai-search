package com.soc.ai.search.search.api;

import com.soc.ai.search.search.application.NaturalLanguageSearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
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
    @PreAuthorize("@rbacPermissionService.authDisabled() or hasRole('SOC_VIEWER')")
    @Operation(
            summary = "Search SOC events with a natural-language question",
            description = "Requires SOC_VIEWER. Uses an LLM to convert the question into a validated SearchPlan, "
                    + "then executes Elasticsearch search.")
    public NaturalLanguageSearchResponse search(@Valid @RequestBody NaturalLanguageSearchRequest request) {
        return naturalLanguageSearchService.search(request);
    }
}
