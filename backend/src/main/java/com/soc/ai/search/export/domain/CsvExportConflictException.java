package com.soc.ai.search.export.domain;

public class CsvExportConflictException extends RuntimeException {

    public CsvExportConflictException(String message) {
        super(message);
    }

    public CsvExportConflictException(String message, Throwable cause) {
        super(message, cause);
    }
}
