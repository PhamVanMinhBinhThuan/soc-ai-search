package com.soc.ai.search.summary;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum SummarySource {
    LLM,
    FALLBACK;

    @JsonCreator
    public static SummarySource fromJson(String value) {
        return value == null ? null : valueOf(value.trim().toUpperCase());
    }

    @JsonValue
    public String toJson() {
        return name().toLowerCase();
    }
}
