package com.soc.ai.search.search.application;

import java.util.List;

public class NaturalLanguageSearchException extends RuntimeException {

    private final List<String> errors;

    public NaturalLanguageSearchException(String message, List<String> errors) {
        super(message);
        this.errors = List.copyOf(errors);
    }

    public NaturalLanguageSearchException(String message, List<String> errors, Throwable cause) {
        super(message, cause);
        this.errors = List.copyOf(errors);
    }

    public List<String> errors() {
        return errors;
    }
}
