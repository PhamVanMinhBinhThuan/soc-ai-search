package com.soc.ai.search.llm.infrastructure.gemini;

import com.soc.ai.search.llm.application.LlmRateLimitException;

public class GeminiRateLimitException extends LlmRateLimitException {

    public GeminiRateLimitException(String message, Throwable cause) {
        super(message, cause);
    }
}
