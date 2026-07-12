package com.soc.ai.search.summary.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum SummaryLanguage {
    VI("vi", "Vietnamese"),
    EN("en", "English");

    private final String jsonValue;
    private final String promptLabel;

    SummaryLanguage(String jsonValue, String promptLabel) {
        this.jsonValue = jsonValue;
        this.promptLabel = promptLabel;
    }

    @JsonValue
    public String jsonValue() {
        return jsonValue;
    }

    public String promptLabel() {
        return promptLabel;
    }
}
