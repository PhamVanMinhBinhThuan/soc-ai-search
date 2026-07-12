package com.soc.ai.search.search.infrastructure.elasticsearch;

import static com.soc.ai.search.search.domain.plan.AggregationType.COUNT;
import static com.soc.ai.search.search.domain.plan.AggregationType.DATE_HISTOGRAM;
import static com.soc.ai.search.search.domain.plan.AggregationType.TOP_N;
import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.search.domain.result.AggregationResultItem;
import org.junit.jupiter.api.Test;

class ElasticsearchAggregationResponseMapperTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ElasticsearchAggregationResponseMapper mapper = new ElasticsearchAggregationResponseMapper();

    @Test
    void mapsCountFromHitsTotal() throws Exception {
        var response = objectMapper.readTree("""
                {
                  "hits": {
                    "total": { "value": 42, "relation": "eq" },
                    "hits": []
                  }
                }
                """);

        var result = mapper.map(response, COUNT);

        assertThat(result.total()).isEqualTo(42);
        assertThat(result.results()).containsExactly(new AggregationResultItem("total", 42));
    }

    @Test
    void mapsCountNoResultToEmptyAggregationResults() throws Exception {
        var response = objectMapper.readTree("""
                {
                  "hits": {
                    "total": { "value": 0, "relation": "eq" },
                    "hits": []
                  }
                }
                """);

        var result = mapper.map(response, COUNT);

        assertThat(result.total()).isZero();
        assertThat(result.results()).isEmpty();
    }

    @Test
    void mapsTopNBucketsAndKeepsTotalFromHitsTotal() throws Exception {
        var response = objectMapper.readTree("""
                {
                  "hits": {
                    "total": { "value": 10000, "relation": "eq" },
                    "hits": []
                  },
                  "aggregations": {
                    "top_values": {
                      "buckets": [
                        { "key": "203.0.113.10", "doc_count": 50 },
                        { "key": "198.51.100.20", "doc_count": 30 }
                      ]
                    }
                  }
                }
                """);

        var result = mapper.map(response, TOP_N);

        assertThat(result.total()).isEqualTo(10000);
        assertThat(result.results()).containsExactly(
                new AggregationResultItem("203.0.113.10", 50),
                new AggregationResultItem("198.51.100.20", 30));
    }

    @Test
    void mapsDateHistogramBucketsUsingKeyAsString() throws Exception {
        var response = objectMapper.readTree("""
                {
                  "hits": {
                    "total": { "value": 10, "relation": "eq" },
                    "hits": []
                  },
                  "aggregations": {
                    "events_over_time": {
                      "buckets": [
                        { "key_as_string": "2026-06-10T01:00:00.000Z", "key": 1781053200000, "doc_count": 4 },
                        { "key_as_string": "2026-06-10T02:00:00.000Z", "key": 1781056800000, "doc_count": 6 }
                      ]
                    }
                  }
                }
                """);

        var result = mapper.map(response, DATE_HISTOGRAM);

        assertThat(result.total()).isEqualTo(10);
        assertThat(result.results()).containsExactly(
                new AggregationResultItem("2026-06-10T01:00:00.000Z", 4),
                new AggregationResultItem("2026-06-10T02:00:00.000Z", 6));
    }
}
