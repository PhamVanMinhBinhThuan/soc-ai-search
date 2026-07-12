package com.soc.ai.search.llm.infrastructure.anthropic;

import com.soc.ai.search.llm.application.LlmException;

public class AnthropicLlmException extends LlmException {

    public AnthropicLlmException(String message) {
        super(message);
    }

    public AnthropicLlmException(String message, Throwable cause) {
        super(message, cause);
    }
}
