package com.soc.ai.search.search.domain.result;

import java.util.List;

public record SearchExecutionResult(long total, List<SearchEvent> events) {
}
