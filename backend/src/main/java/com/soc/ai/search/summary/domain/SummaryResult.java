package com.soc.ai.search.summary.domain;

public record SummaryResult(
        String summary,
        SummarySource source,
        long latencyMs) {
}
