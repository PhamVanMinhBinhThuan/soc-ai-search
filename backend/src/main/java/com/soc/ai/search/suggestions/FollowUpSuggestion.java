package com.soc.ai.search.suggestions;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record FollowUpSuggestion(
        @NotBlank @Size(max = 60) String title,
        @NotBlank @Size(max = 240) String question) {
}
