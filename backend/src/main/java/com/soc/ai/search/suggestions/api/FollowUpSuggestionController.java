package com.soc.ai.search.suggestions.api;


import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.soc.ai.search.suggestions.application.FollowUpSuggestionService;
@RestController
@Tag(name = "Follow-up Suggestions", description = "Optional AI-generated next investigation questions")
public class FollowUpSuggestionController {

    private final FollowUpSuggestionService service;

    public FollowUpSuggestionController(FollowUpSuggestionService service) {
        this.service = service;
    }

    @PostMapping("/api/v1/suggestions/follow-up")
    @PreAuthorize("@rbacPermissionService.authDisabled() or hasRole('SOC_VIEWER')")
    @Operation(
            summary = "Generate optional AI follow-up suggestions",
            description = "Requires SOC_VIEWER. Suggestions do not execute search and do not create audit history.")
    public FollowUpSuggestionResponse suggest(@Valid @RequestBody FollowUpSuggestionRequest request) {
        return service.suggest(request);
    }
}
