package com.soc.ai.search.search.refinement.api;


import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.soc.ai.search.search.domain.plan.SearchPlan;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record QueryRefinementRequest(
        @NotBlank @Size(max = 500) String originalQuestion,
        @NotBlank @Size(max = 500) String currentQuestion,
        @NotNull @Valid SearchPlan currentSearchPlan,
        @NotBlank @Size(max = 500) String refinement) {
}
