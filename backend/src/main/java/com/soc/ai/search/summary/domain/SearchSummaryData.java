package com.soc.ai.search.summary.domain;

import java.util.List;

import com.soc.ai.search.search.domain.result.SearchEvent;

public record SearchSummaryData(
        List<SummaryBucket> topUsers,
        List<SummaryBucket> topHosts,
        List<SummaryBucket> topIps,
        List<SummaryBucket> severityDistribution,
        List<SearchEvent> sampleEvents) {
}
