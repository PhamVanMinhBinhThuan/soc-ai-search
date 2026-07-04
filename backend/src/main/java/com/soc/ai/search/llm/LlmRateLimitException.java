package com.soc.ai.search.llm;

public class LlmRateLimitException extends LlmException {

    public LlmRateLimitException(String message, Throwable cause) {
        super(message, cause);
    }
}
