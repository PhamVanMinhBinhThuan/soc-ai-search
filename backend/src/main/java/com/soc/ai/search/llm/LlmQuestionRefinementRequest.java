package com.soc.ai.search.llm;

import java.util.Objects;

public record LlmQuestionRefinementRequest(
        String systemPrompt,
        String userContent) {

    public LlmQuestionRefinementRequest {
        Objects.requireNonNull(systemPrompt, "systemPrompt must not be null");
        Objects.requireNonNull(userContent, "userContent must not be null");
    }
}
