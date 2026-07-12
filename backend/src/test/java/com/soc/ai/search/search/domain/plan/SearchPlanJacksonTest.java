package com.soc.ai.search.search.domain.plan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class SearchPlanJacksonTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void deserializesSnakeCaseJsonToCamelCaseRecordFields() throws Exception {
        var json = """
                {
                  "mode": "search",
                  "filters": {
                    "timestamp": { "from": "now-24h", "to": "now" },
                    "source": ["windows-auth"],
                    "severity": ["high", "critical"],
                    "event_type": ["failed_login"],
                    "user": "admin",
                    "host": "vpn-gw-01",
                    "ip": "203.0.113.45",
                    "country_code": ["CN"]
                  },
                  "message_query": "malware detected",
                  "page": 0,
                  "size": 20
                }
                """;

        var plan = objectMapper.readValue(json, SearchPlan.class);

        assertThat(plan.mode()).isEqualTo(SearchMode.SEARCH);
        assertThat(plan.filters().source()).containsExactly("windows-auth");
        assertThat(plan.filters().eventType()).containsExactly("failed_login");
        assertThat(plan.filters().user()).containsExactly("admin");
        assertThat(plan.filters().host()).containsExactly("vpn-gw-01");
        assertThat(plan.filters().ip()).containsExactly("203.0.113.45");
        assertThat(plan.filters().countryCode()).containsExactly("CN");
        assertThat(plan.filters().timestamp().from()).isEqualTo("now-24h");
        assertThat(plan.messageQuery()).isEqualTo("malware detected");
        assertThat(plan.aggregation()).isNull();
    }

    @Test
    void serializesCamelCaseRecordFieldsToSnakeCaseJson() throws Exception {
        var plan = new SearchPlan(
                SearchMode.SEARCH,
                new SearchFilters(
                        new TimeRange("now-24h", "now"),
                        List.of("windows-auth"),
                        List.of("high", "critical"),
                        List.of("failed_login"),
                        List.of("admin"),
                        List.of("vpn-gw-01"),
                        List.of("203.0.113.45"),
                        List.of("CN")),
                "malware detected",
                0,
                20);

        var root = objectMapper.readTree(objectMapper.writeValueAsString(plan));

        assertThat(root.path("mode").asText()).isEqualTo("search");
        assertThat(root.path("filters").path("source").get(0).asText()).isEqualTo("windows-auth");
        assertThat(root.path("filters").path("event_type").get(0).asText()).isEqualTo("failed_login");
        assertThat(root.path("filters").path("country_code").get(0).asText()).isEqualTo("CN");
        assertThat(root.path("message_query").asText()).isEqualTo("malware detected");
    }

    @Test
    void deserializesAggregationSearchPlanContract() throws Exception {
        var json = """
                {
                  "mode": "aggregation",
                  "filters": {
                    "timestamp": { "from": "now-7d", "to": "now" },
                    "event_type": ["failed_login"]
                  },
                  "aggregation": {
                    "type": "top_n",
                    "field": "user",
                    "top_n": 10,
                    "interval": "hour"
                  },
                  "page": 0,
                  "size": 10
                }
                """;

        var plan = objectMapper.readValue(json, SearchPlan.class);

        assertThat(plan.mode()).isEqualTo(SearchMode.AGGREGATION);
        assertThat(plan.aggregation()).isNotNull();
        assertThat(plan.aggregation().type()).isEqualTo(AggregationType.TOP_N);
        assertThat(plan.aggregation().field()).isEqualTo("user");
        assertThat(plan.aggregation().topN()).isEqualTo(10);
        assertThat(plan.aggregation().interval()).isEqualTo(HistogramInterval.HOUR);
    }

    @Test
    void serializesAggregationSearchPlanContract() throws Exception {
        var plan = new SearchPlan(
                SearchMode.AGGREGATION,
                new SearchFilters(
                        new TimeRange("now-7d", "now"),
                        null,
                        List.of("failed_login"),
                        null,
                        null,
                        null,
                        null),
                new AggregationPlan(AggregationType.TOP_N, "user", 10, HistogramInterval.HOUR),
                null,
                0,
                10);

        var root = objectMapper.readTree(objectMapper.writeValueAsString(plan));

        assertThat(root.path("mode").asText()).isEqualTo("aggregation");
        assertThat(root.path("aggregation").path("type").asText()).isEqualTo("top_n");
        assertThat(root.path("aggregation").path("field").asText()).isEqualTo("user");
        assertThat(root.path("aggregation").path("top_n").asInt()).isEqualTo(10);
        assertThat(root.path("aggregation").path("interval").asText()).isEqualTo("hour");
        assertThat(root.path("filters").path("event_type").get(0).asText()).isEqualTo("failed_login");
    }

    @Test
    void deserializesCountAggregationWithoutOptionalFields() throws Exception {
        var json = """
                {
                  "mode": "aggregation",
                  "filters": {
                    "timestamp": { "from": "now-7d", "to": "now" }
                  },
                  "aggregation": {
                    "type": "count"
                  },
                  "page": 0,
                  "size": 10
                }
                """;

        var plan = objectMapper.readValue(json, SearchPlan.class);

        assertThat(plan.aggregation().type()).isEqualTo(AggregationType.COUNT);
        assertThat(plan.aggregation().field()).isNull();
        assertThat(plan.aggregation().topN()).isNull();
        assertThat(plan.aggregation().interval()).isNull();
    }

    @Test
    void deserializesDateHistogramAggregationWithoutField() throws Exception {
        var json = """
                {
                  "mode": "aggregation",
                  "filters": {
                    "timestamp": { "from": "now-24h", "to": "now" }
                  },
                  "aggregation": {
                    "type": "date_histogram",
                    "interval": "hour"
                  },
                  "page": 0,
                  "size": 24
                }
                """;

        var plan = objectMapper.readValue(json, SearchPlan.class);

        assertThat(plan.aggregation().type()).isEqualTo(AggregationType.DATE_HISTOGRAM);
        assertThat(plan.aggregation().field()).isNull();
        assertThat(plan.aggregation().interval()).isEqualTo(HistogramInterval.HOUR);
    }

    @Test
    void rejectsInvalidModeValueDuringDeserialization() {
        var json = """
                {
                  "mode": "aggregate",
                  "filters": {},
                  "page": 0,
                  "size": 20
                }
                """;

        assertThatThrownBy(() -> objectMapper.readValue(json, SearchPlan.class))
                .isInstanceOf(JsonProcessingException.class)
                .hasRootCauseInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported search mode");
    }

    @Test
    void mapsAllAggregationTypeJsonValues() throws Exception {
        var expectedValues = Map.of(
                AggregationType.COUNT, "count",
                AggregationType.GROUP_BY, "group_by",
                AggregationType.TOP_N, "top_n",
                AggregationType.DATE_HISTOGRAM, "date_histogram");

        for (var entry : expectedValues.entrySet()) {
            assertThat(objectMapper.readValue("\"" + entry.getValue() + "\"", AggregationType.class))
                    .isEqualTo(entry.getKey());
            assertThat(objectMapper.writeValueAsString(entry.getKey()))
                    .isEqualTo("\"" + entry.getValue() + "\"");
        }
    }

    @Test
    void mapsAllHistogramIntervalJsonValues() throws Exception {
        var expectedValues = Map.of(
                HistogramInterval.MINUTE, "minute",
                HistogramInterval.HOUR, "hour",
                HistogramInterval.DAY, "day");

        for (var entry : expectedValues.entrySet()) {
            assertThat(objectMapper.readValue("\"" + entry.getValue() + "\"", HistogramInterval.class))
                    .isEqualTo(entry.getKey());
            assertThat(objectMapper.writeValueAsString(entry.getKey()))
                    .isEqualTo("\"" + entry.getValue() + "\"");
        }
    }
}
