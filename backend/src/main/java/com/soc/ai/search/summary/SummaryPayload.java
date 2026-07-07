package com.soc.ai.search.summary;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.soc.ai.search.search.execution.AggregationResultItem;
import com.soc.ai.search.search.execution.ChartMetadata;
import com.soc.ai.search.search.plan.AggregationType;
import com.soc.ai.search.search.plan.SearchMode;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SummaryPayload(
        SummaryLanguage outputLanguage,
        SummaryQueryContext queryContext,
        SearchMode mode,
        long total,
        List<SummaryBucket> topUsers,
        List<SummaryBucket> topHosts,
        List<SummaryBucket> topIps,
        List<SummaryBucket> severityDistribution,
        List<SummarySampleEvent> recentSampleEvents,
        AggregationType aggregationType,
        ChartMetadata chartMetadata,
        SummaryAggregationStats aggregationStats,
        List<AggregationResultItem> aggregationResults) {
}
