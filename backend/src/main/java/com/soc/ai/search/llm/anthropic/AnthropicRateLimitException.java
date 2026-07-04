package com.soc.ai.search.llm.anthropic;

import com.soc.ai.search.llm.LlmRateLimitException;

public class AnthropicRateLimitException extends LlmRateLimitException {

    public AnthropicRateLimitException(String message, Throwable cause) {
        super(message, cause);
    }
}
