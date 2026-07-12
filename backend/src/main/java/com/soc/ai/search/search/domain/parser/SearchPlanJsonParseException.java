package com.soc.ai.search.search.domain.parser;

import java.util.List;

public class SearchPlanJsonParseException extends RuntimeException {

    private final List<String> errors;

    public SearchPlanJsonParseException(List<String> errors) {
        super(String.join("; ", errors));
        this.errors = List.copyOf(errors);
    }

    public List<String> errors() {
        return errors;
    }
}
