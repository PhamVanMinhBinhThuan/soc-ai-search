package com.soc.ai.search.search.domain.compiler;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

public record CompiledSearchQuery(Map<String, Object> searchSpec) {

    public CompiledSearchQuery {
        searchSpec = Collections.unmodifiableMap(new LinkedHashMap<>(searchSpec));
    }
}
