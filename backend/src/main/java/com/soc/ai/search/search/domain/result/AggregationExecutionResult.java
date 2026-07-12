package com.soc.ai.search.search.domain.result;

import java.util.List;

public record AggregationExecutionResult(long total, List<AggregationResultItem> results) {
}
