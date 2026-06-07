package com.soc.ai.search.search.execution;

import java.util.List;

public record SearchExecutionResult(long total, List<SearchEvent> events) {
}
