package com.soc.ai.search.search.nl;

import java.util.List;

public class NaturalLanguageSearchRateLimitException extends NaturalLanguageSearchException {

    public NaturalLanguageSearchRateLimitException(String message, List<String> errors, Throwable cause) {
        super(message, errors, cause);
    }
}
