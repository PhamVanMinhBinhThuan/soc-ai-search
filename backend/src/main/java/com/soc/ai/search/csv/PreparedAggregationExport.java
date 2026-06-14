package com.soc.ai.search.csv;

import java.util.List;

import com.soc.ai.search.search.execution.AggregationResultItem;
import com.soc.ai.search.search.plan.AggregationType;

record PreparedAggregationExport(
        AggregationType type,
        long total,
        List<AggregationResultItem> results) {

    PreparedAggregationExport {
        results = List.copyOf(results);
    }
}
