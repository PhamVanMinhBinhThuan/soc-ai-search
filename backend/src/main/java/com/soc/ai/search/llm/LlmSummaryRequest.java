package com.soc.ai.search.llm;

import java.util.Objects;

public record LlmSummaryRequest(
        String systemPrompt,
        String userContent) {

    public LlmSummaryRequest {
        Objects.requireNonNull(systemPrompt, "systemPrompt must not be null");
        Objects.requireNonNull(userContent, "userContent must not be null");
    }
}
