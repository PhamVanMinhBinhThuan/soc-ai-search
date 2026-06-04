package com.soc.ai.search.search.plan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

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
                    "severity": ["high", "critical"],
                    "event_type": ["failed_login"],
                    "user": "admin",
                    "host": "vpn-gw-01",
                    "ip": "203.0.113.45",
                    "country_code": ["CN"]
                  },
                  "page": 0,
                  "size": 20
                }
                """;

        var plan = objectMapper.readValue(json, SearchPlan.class);

        assertThat(plan.mode()).isEqualTo(SearchMode.SEARCH);
        assertThat(plan.filters().eventType()).containsExactly("failed_login");
        assertThat(plan.filters().countryCode()).containsExactly("CN");
        assertThat(plan.filters().timestamp().from()).isEqualTo("now-24h");
    }

    @Test
    void serializesCamelCaseRecordFieldsToSnakeCaseJson() throws Exception {
        var plan = new SearchPlan(
                SearchMode.SEARCH,
                new SearchFilters(
                        new TimeRange("now-24h", "now"),
                        List.of("high", "critical"),
                        List.of("failed_login"),
                        "admin",
                        "vpn-gw-01",
                        "203.0.113.45",
                        List.of("CN")),
                0,
                20);

        var root = objectMapper.readTree(objectMapper.writeValueAsString(plan));

        assertThat(root.path("mode").asText()).isEqualTo("search");
        assertThat(root.path("filters").path("event_type").get(0).asText()).isEqualTo("failed_login");
        assertThat(root.path("filters").path("country_code").get(0).asText()).isEqualTo("CN");
        assertThat(root.path("message_query").isMissingNode()).isTrue();
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
}
