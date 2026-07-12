package com.soc.ai.search.summary.infrastructure.elasticsearch;


public class SummaryQueryException extends RuntimeException {

    public SummaryQueryException(String message, Throwable cause) {
        super(message, cause);
    }
}
