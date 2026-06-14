package com.soc.ai.search.llm;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.llm")
public record LlmProperties(
        @NotNull LlmProvider provider,
        String baseUrl,
        String apiKey,
        String model,
        @Min(1_000) long timeoutMs,
        @Min(1_000) long summaryTimeoutMs,
        @Min(1) int maxAttempts) {

    public String effectiveModel() {
        if (model == null || model.isBlank()) {
            return "mock-search-plan";
        }

        return model;
    }
}
