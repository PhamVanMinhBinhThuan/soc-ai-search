package com.soc.ai.search.llm.application;

import java.util.Objects;

public record LlmResponse(
        String content,
        String model,
        long latencyMs) {

    public LlmResponse {
        Objects.requireNonNull(content, "content must not be null");
        Objects.requireNonNull(model, "model must not be null");
    }
}
