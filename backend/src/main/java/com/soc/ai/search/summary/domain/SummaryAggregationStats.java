package com.soc.ai.search.summary.domain;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SummaryAggregationStats(
        int totalBuckets,
        long sum,
        SummaryBucket maxBucket,
        SummaryBucket minBucket) {
}
