package com.soc.ai.search.summary;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.stream.IntStream;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.search.execution.AggregationResultItem;
import com.soc.ai.search.search.execution.AggregationSearchResponse;
import com.soc.ai.search.search.execution.ChartMetadata;
import com.soc.ai.search.search.execution.ChartType;
import com.soc.ai.search.search.execution.SearchEvent;
import com.soc.ai.search.search.plan.AggregationType;
import com.soc.ai.search.search.plan.SearchMode;
import org.junit.jupiter.api.Test;

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

        var payload = builder.search(100, data);
        var json = builder.toJson(payload);

        assertThat(payload.sampleEvents()).hasSize(5);
        assertThat(json.length()).isLessThanOrEqualTo(SummaryPayloadBuilder.MAX_PAYLOAD_CHARACTERS);
        assertThat(json).contains("token=[REDACTED]");
        assertThat(json).doesNotContain("super-secret-value", "\"raw\"");
    }

    @Test
    void aggregationPayloadUsesOnlyFirstTenBuckets() {
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

        var payload = builder.aggregation(response);

        assertThat(payload.aggregationResults()).hasSize(10);
        assertThat(payload.topUsers()).isNull();
        assertThat(payload.sampleEvents()).isNull();
        assertThat(builder.toJson(payload)).hasSizeLessThanOrEqualTo(
                SummaryPayloadBuilder.MAX_PAYLOAD_CHARACTERS);
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
