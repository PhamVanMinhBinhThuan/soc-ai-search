package com.soc.ai.search.summary;

import java.util.List;

import com.soc.ai.search.search.execution.SearchEvent;

public record SearchSummaryData(
        List<SummaryBucket> topUsers,
        List<SummaryBucket> topHosts,
        List<SummaryBucket> topIps,
        List<SummaryBucket> severityDistribution,
        List<SearchEvent> sampleEvents) {
}
