package com.soc.ai.search.search.domain.plan;

import java.util.Arrays;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AggregationOrderBy {
    VALUE("value"),
    KEY("key");

    private final String jsonValue;

    AggregationOrderBy(String jsonValue) {
        this.jsonValue = jsonValue;
    }

    @JsonValue
    public String jsonValue() {
        return jsonValue;
    }

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static AggregationOrderBy fromJson(String value) {
        return Arrays.stream(values())
                .filter(orderBy -> orderBy.jsonValue.equalsIgnoreCase(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported aggregation order_by: " + value));
    }
}
