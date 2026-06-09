package com.soc.ai.search.search.nl;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record NaturalLanguageSearchRequest(
        @NotBlank @Size(max = 500) String question,
        @NotNull @Min(0) Integer page,
        @NotNull @Min(1) @Max(100) Integer size) {
}
