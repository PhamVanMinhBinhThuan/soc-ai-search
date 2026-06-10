package com.soc.ai.search.search.execution;

import java.util.List;

public record AggregationExecutionResult(long total, List<AggregationResultItem> results) {
}
