package com.soc.ai.search.export.domain;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.soc.ai.search.search.domain.result.SearchEvent;

public record PreparedSearchExport(
        Map<String, Object> baseSearchSpec,
        long total,
        List<SearchEvent> firstEvents) {

    public PreparedSearchExport {
        baseSearchSpec = Collections.unmodifiableMap(new LinkedHashMap<>(baseSearchSpec));
        firstEvents = List.copyOf(firstEvents);
    }
}
