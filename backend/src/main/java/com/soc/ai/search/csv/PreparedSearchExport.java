package com.soc.ai.search.csv;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.soc.ai.search.search.execution.SearchEvent;

record PreparedSearchExport(
        Map<String, Object> baseSearchSpec,
        long total,
        List<SearchEvent> firstEvents) {

    PreparedSearchExport {
        baseSearchSpec = Collections.unmodifiableMap(new LinkedHashMap<>(baseSearchSpec));
        firstEvents = List.copyOf(firstEvents);
    }
}
