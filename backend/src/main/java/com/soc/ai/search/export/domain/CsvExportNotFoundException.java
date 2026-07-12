package com.soc.ai.search.export.domain;

public class CsvExportNotFoundException extends RuntimeException {

    public CsvExportNotFoundException(String message) {
        super(message);
    }
}
