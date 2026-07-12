package com.soc.ai.search.search.domain.plan;

import java.util.Arrays;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AggregationType {
    COUNT("count"),
    GROUP_BY("group_by"),
    TOP_N("top_n"),
    DATE_HISTOGRAM("date_histogram");

    private final String jsonValue;

    AggregationType(String jsonValue) {
        this.jsonValue = jsonValue;
    }

    @JsonValue
    public String jsonValue() {
        return jsonValue;
    }

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static AggregationType fromJson(String value) {
        return Arrays.stream(values())
                .filter(type -> type.jsonValue.equalsIgnoreCase(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported aggregation type: " + value));
    }
}
