package com.soc.ai.search.summary.application;


import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.stream.IntStream;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.search.domain.result.AggregationResultItem;
import com.soc.ai.search.search.domain.result.AggregationSearchResponse;
import com.soc.ai.search.search.domain.result.ChartMetadata;
import com.soc.ai.search.search.domain.result.ChartType;
import com.soc.ai.search.search.domain.result.SearchEvent;
import com.soc.ai.search.search.domain.plan.AggregationPlan;
import com.soc.ai.search.search.domain.plan.AggregationType;
import com.soc.ai.search.search.domain.plan.HistogramInterval;
import com.soc.ai.search.search.domain.plan.SearchFilters;
import com.soc.ai.search.search.domain.plan.SearchMode;
import com.soc.ai.search.search.domain.plan.SearchPlan;
import com.soc.ai.search.search.domain.plan.SortOrder;
import com.soc.ai.search.search.domain.plan.SortPlan;
import com.soc.ai.search.search.domain.plan.TimeRange;
import org.junit.jupiter.api.Test;

import com.soc.ai.search.summary.domain.SearchSummaryData;
import com.soc.ai.search.summary.domain.SummaryBucket;
import com.soc.ai.search.summary.domain.SummaryLanguage;
class SummaryPayloadBuilderTest {

    private final SummaryPayloadBuilder builder = new SummaryPayloadBuilder(new ObjectMapper());

    @Test
    void boundsSearchSamplesAndRedactsSecrets() {
        var events = IntStream.range(0, 10)
                .mapToObj(index -> event(index, "token=super-secret-value " + "message ".repeat(100)))
                .toList();
        var data = new SearchSummaryData(
                List.of(new SummaryBucket("admin", 20)),
                List.of(new SummaryBucket("host-001", 15)),
                List.of(new SummaryBucket("203.0.113.10", 12)),
                List.of(new SummaryBucket("high", 30)),
                events);

        var payload = builder.search(SummaryLanguage.EN, searchPlan(), 100, data);
        var json = builder.toJson(payload);

        assertThat(payload.outputLanguage()).isEqualTo(SummaryLanguage.EN);
        assertThat(payload.queryContext().timeFrom()).isEqualTo("now-24h");
        assertThat(payload.queryContext().eventType()).containsExactly("failed_login");
        assertThat(payload.queryContext().sortField()).isEqualTo("timestamp");
        assertThat(payload.queryContext().sortOrder()).isEqualTo("desc");
        assertThat(payload.recentSampleEvents()).hasSize(5);
        assertThat(json.length()).isLessThanOrEqualTo(SummaryPayloadBuilder.MAX_PAYLOAD_CHARACTERS);
        assertThat(json).contains("token=[REDACTED]");
        assertThat(json).doesNotContain("super-secret-value", "\"raw\"");
    }

    @Test
    void topNAggregationKeepsBoundedBucketsAndComputesStatsFromAllBuckets() {
        var results = IntStream.range(0, 20)
                .mapToObj(index -> new AggregationResultItem("bucket-" + index, 100 - index))
                .toList();
        var response = new AggregationSearchResponse(
                SearchMode.AGGREGATION,
                AggregationType.TOP_N,
                java.util.Map.of(),
                500,
                10,
                results,
                new ChartMetadata(ChartType.BAR, "ip", "Count"));

        var payload = builder.aggregation(SummaryLanguage.EN, topNPlan(), response);

        assertThat(payload.aggregationResults()).hasSize(10);
        assertThat(payload.aggregationStats().totalBuckets()).isEqualTo(20);
        assertThat(payload.aggregationStats().sum()).isEqualTo(1810);
        assertThat(payload.aggregationStats().maxBucket()).isEqualTo(new SummaryBucket("bucket-0", 100));
        assertThat(payload.aggregationStats().minBucket()).isEqualTo(new SummaryBucket("bucket-19", 81));
        assertThat(payload.topUsers()).isNull();
        assertThat(payload.recentSampleEvents()).isNull();
        assertThat(builder.toJson(payload)).hasSizeLessThanOrEqualTo(
                SummaryPayloadBuilder.MAX_PAYLOAD_CHARACTERS);
    }

    @Test
    void dateHistogramOmitsAggregationResultsAndKeepsStats() {
        var results = IntStream.range(0, 25)
                .mapToObj(index -> new AggregationResultItem("2026-07-07T%02d:00:00Z".formatted(index), index))
                .toList();
        var response = new AggregationSearchResponse(
                SearchMode.AGGREGATION,
                AggregationType.DATE_HISTOGRAM,
                java.util.Map.of(),
                300,
                10,
                results,
                new ChartMetadata(ChartType.LINE, "Time", "Event Count"));

        var payload = builder.aggregation(SummaryLanguage.EN, dateHistogramPlan(), response);

        assertThat(payload.aggregationResults()).isNull();
        assertThat(payload.aggregationStats().totalBuckets()).isEqualTo(25);
        assertThat(payload.aggregationStats().sum()).isEqualTo(300);
        assertThat(payload.aggregationStats().maxBucket()).isEqualTo(new SummaryBucket("2026-07-07T24:00:00Z", 24));
        assertThat(payload.aggregationStats().minBucket()).isEqualTo(new SummaryBucket("2026-07-07T00:00:00Z", 0));
    }

    private SearchPlan searchPlan() {
        return new SearchPlan(
                SearchMode.SEARCH,
                new SearchFilters(
                        new TimeRange("now-24h", "now"),
                        null,
                        null,
                        List.of("failed_login"),
                        List.of("admin"),
                        null,
                        null,
                        List.of("CN")),
                null,
                null,
                List.of(new SortPlan("timestamp", SortOrder.DESC)),
                0,
                10);
    }

    private SearchPlan topNPlan() {
        return new SearchPlan(
                SearchMode.AGGREGATION,
                new SearchFilters(new TimeRange("now-30d", "now"), null, null, null, null, null, null, null),
                new AggregationPlan(AggregationType.TOP_N, "ip", 5, null),
                null,
                0,
                10);
    }

    private SearchPlan dateHistogramPlan() {
        return new SearchPlan(
                SearchMode.AGGREGATION,
                new SearchFilters(new TimeRange("now-24h", "now"), null, null, null, null, null, null, null),
                new AggregationPlan(AggregationType.DATE_HISTOGRAM, null, null, HistogramInterval.HOUR),
                null,
                0,
                10);
    }

    private SearchEvent event(int index, String message) {
        return new SearchEvent(
                "event-" + index,
                "2026-06-14T10:00:00Z",
                "windows-auth",
                "high",
                "failed_login",
                "admin",
                "host-001",
                "203.0.113.10",
                "CN",
                message);
    }
}
