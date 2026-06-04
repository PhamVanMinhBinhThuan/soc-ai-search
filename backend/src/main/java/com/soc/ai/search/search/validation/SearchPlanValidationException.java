package com.soc.ai.search.search.validation;

import java.util.List;

public class SearchPlanValidationException extends RuntimeException {

    private final List<String> errors;

    public SearchPlanValidationException(List<String> errors) {
        super(String.join("; ", errors));
        this.errors = List.copyOf(errors);
    }

    public List<String> errors() {
        return errors;
    }
}
