package com.soc.ai.search.llm.infrastructure.anthropic;

import com.soc.ai.search.llm.application.LlmRateLimitException;

public class AnthropicRateLimitException extends LlmRateLimitException {

    public AnthropicRateLimitException(String message, Throwable cause) {
        super(message, cause);
    }
}
