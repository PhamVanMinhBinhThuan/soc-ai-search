package com.soc.ai.search.search.plan;

import java.util.Arrays;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum SortOrder {
    ASC("asc"),
    DESC("desc");

    private final String jsonValue;

    SortOrder(String jsonValue) {
        this.jsonValue = jsonValue;
    }

    @JsonValue
    public String jsonValue() {
        return jsonValue;
    }

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static SortOrder fromJson(String value) {
        return Arrays.stream(values())
                .filter(order -> order.jsonValue.equalsIgnoreCase(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported sort order: " + value));
    }
}
