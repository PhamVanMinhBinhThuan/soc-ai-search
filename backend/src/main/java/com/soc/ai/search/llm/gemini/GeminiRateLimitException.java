package com.soc.ai.search.llm.gemini;

import com.soc.ai.search.llm.LlmRateLimitException;

public class GeminiRateLimitException extends LlmRateLimitException {

    public GeminiRateLimitException(String message, Throwable cause) {
        super(message, cause);
    }
}
