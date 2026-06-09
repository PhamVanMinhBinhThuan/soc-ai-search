package com.soc.ai.search.llm.gemini;

public class GeminiLlmException extends RuntimeException {

    public GeminiLlmException(String message) {
        super(message);
    }

    public GeminiLlmException(String message, Throwable cause) {
        super(message, cause);
    }
}
