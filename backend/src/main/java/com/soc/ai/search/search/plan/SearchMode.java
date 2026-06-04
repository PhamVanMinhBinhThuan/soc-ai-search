package com.soc.ai.search.search.plan;

import java.util.Arrays;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum SearchMode {
    SEARCH("search");

    private final String jsonValue;

    SearchMode(String jsonValue) {
        this.jsonValue = jsonValue;
    }

    @JsonValue
    public String jsonValue() {
        return jsonValue;
    }

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static SearchMode fromJson(String value) {
        return Arrays.stream(values())
                .filter(mode -> mode.jsonValue.equalsIgnoreCase(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported search mode: " + value));
    }
}
