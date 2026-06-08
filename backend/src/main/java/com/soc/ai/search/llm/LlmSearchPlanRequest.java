package com.soc.ai.search.llm;

import java.util.Objects;

public record LlmSearchPlanRequest(
        String systemPrompt,
        String userQuestion) {

    public LlmSearchPlanRequest {
        Objects.requireNonNull(systemPrompt, "systemPrompt must not be null");
        Objects.requireNonNull(userQuestion, "userQuestion must not be null");
    }
}
