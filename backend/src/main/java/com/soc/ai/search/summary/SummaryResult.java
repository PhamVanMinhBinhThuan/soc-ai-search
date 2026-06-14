package com.soc.ai.search.summary;

public record SummaryResult(
        String summary,
        SummarySource source,
        long latencyMs) {
}
