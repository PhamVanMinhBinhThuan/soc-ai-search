package com.soc.ai.search.export.domain;

import java.util.List;

import com.soc.ai.search.search.domain.result.AggregationResultItem;
import com.soc.ai.search.search.domain.plan.AggregationType;

public record PreparedAggregationExport(
        AggregationType type,
        long total,
        List<AggregationResultItem> results) {

    public PreparedAggregationExport {
        results = List.copyOf(results);
    }
}
