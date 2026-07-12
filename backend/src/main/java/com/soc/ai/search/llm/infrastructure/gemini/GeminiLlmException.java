package com.soc.ai.search.llm.infrastructure.gemini;

import com.soc.ai.search.llm.application.LlmException;

public class GeminiLlmException extends LlmException {

    public GeminiLlmException(String message) {
        super(message);
    }

    public GeminiLlmException(String message, Throwable cause) {
        super(message, cause);
    }
}
