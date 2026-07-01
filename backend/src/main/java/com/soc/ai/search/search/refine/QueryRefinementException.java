package com.soc.ai.search.search.refine;

import java.util.List;

public class QueryRefinementException extends RuntimeException {

    private final List<String> errors;

    public QueryRefinementException(String message, List<String> errors) {
        super(message);
        this.errors = List.copyOf(errors);
    }

    public QueryRefinementException(String message, List<String> errors, Throwable cause) {
        super(message, cause);
        this.errors = List.copyOf(errors);
    }

    public List<String> errors() {
        return errors;
    }
}
