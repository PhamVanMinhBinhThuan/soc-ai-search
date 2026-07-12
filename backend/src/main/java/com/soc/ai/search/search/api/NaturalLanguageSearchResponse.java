package com.soc.ai.search.search.api;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.soc.ai.search.search.domain.result.AggregationResultItem;
import com.soc.ai.search.search.domain.result.ChartMetadata;
import com.soc.ai.search.search.domain.result.SearchEvent;
import com.soc.ai.search.search.domain.plan.AggregationType;
import com.soc.ai.search.search.domain.plan.SearchMode;
import com.soc.ai.search.search.domain.plan.SearchPlan;
import com.soc.ai.search.summary.domain.SummarySource;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record NaturalLanguageSearchResponse(
        UUID queryId,
        String originalQuestion,
        SearchMode mode,
        SearchPlan searchPlan,
        Map<String, Object> generatedDsl,
        long total,
        int page,
        int size,
        long totalPages,
        long llmLatencyMs,
        long searchLatencyMs,
        long summaryLatencyMs,
        long latencyMs,
        String summary,
        SummarySource summarySource,
        AggregationType aggregationType,
        List<AggregationResultItem> aggregationResults,
        ChartMetadata chartMetadata,
        List<SearchEvent> events) {
}
