package com.soc.ai.search.llm.gemini;

public class GeminiRateLimitException extends GeminiLlmException {

    public GeminiRateLimitException(String message, Throwable cause) {
        super(message, cause);
    }
}
