package com.soc.ai.search.llm.anthropic;

import com.soc.ai.search.llm.LlmException;

public class AnthropicLlmException extends LlmException {

    public AnthropicLlmException(String message) {
        super(message);
    }

    public AnthropicLlmException(String message, Throwable cause) {
        super(message, cause);
    }
}
