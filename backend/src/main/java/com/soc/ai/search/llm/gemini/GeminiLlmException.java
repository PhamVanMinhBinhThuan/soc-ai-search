package com.soc.ai.search.llm.gemini;

import com.soc.ai.search.llm.LlmException;

public class GeminiLlmException extends LlmException {

    public GeminiLlmException(String message) {
        super(message);
    }

    public GeminiLlmException(String message, Throwable cause) {
        super(message, cause);
    }
}
