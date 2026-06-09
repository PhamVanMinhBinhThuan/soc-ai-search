package com.soc.ai.search.search.plan;

import java.util.Arrays;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum HistogramInterval {
    MINUTE("minute"),
    HOUR("hour"),
    DAY("day");

    private final String jsonValue;

    HistogramInterval(String jsonValue) {
        this.jsonValue = jsonValue;
    }

    @JsonValue
    public String jsonValue() {
        return jsonValue;
    }

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static HistogramInterval fromJson(String value) {
        return Arrays.stream(values())
                .filter(interval -> interval.jsonValue.equalsIgnoreCase(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported histogram interval: " + value));
    }
}
