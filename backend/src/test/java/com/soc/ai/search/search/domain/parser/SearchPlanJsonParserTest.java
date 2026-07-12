package com.soc.ai.search.search.domain.parser;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.search.domain.plan.SearchMode;
import com.soc.ai.search.search.domain.validation.SearchPlanValidator;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class SearchPlanJsonParserTest {

    private final SearchPlanJsonParser parser = new SearchPlanJsonParser(
            new ObjectMapper(),
            new SearchPlanValidator(Validation.buildDefaultValidatorFactory().getValidator()));

    @Test
    void parsesValidSearchPlanJson() {
        var plan = parser.parse(validJson());

        assertThat(plan.mode()).isEqualTo(SearchMode.SEARCH);
        assertThat(plan.filters().eventType()).containsExactly("failed_login");
        assertThat(plan.filters().countryCode()).containsExactly("CN");
        assertThat(plan.filters().timestamp().from()).isEqualTo("now-24h");
        assertThat(plan.page()).isZero();
        assertThat(plan.size()).isEqualTo(20);
    }

    @Test
    void parsesJsonWithoutPaginationWhenBackendOverridesPagination() {
        var plan = parser.parseWithPaginationOverride("""
                {
                  "mode": "search",
                  "filters": {
                    "event_type": ["failed_login"],
                    "country_code": ["CN"]
                  }
                }
                """, 2, 5);

        assertThat(plan.page()).isEqualTo(2);
        assertThat(plan.size()).isEqualTo(5);
        assertThat(plan.filters().eventType()).containsExactly("failed_login");
    }

    @Test
    void parsesSourceFilter() {
        var plan = parser.parse("""
                {
                  "mode": "search",
                  "filters": {
                    "timestamp": { "from": "now-7d", "to": "now" },
                    "source": ["edr", "windows-auth"]
                  },
                  "page": 0,
                  "size": 20
                }
                """);

        assertThat(plan.filters().source()).containsExactly("edr", "windows-auth");
        assertThat(plan.filters().timestamp().from()).isEqualTo("now-7d");
    }

    @Test
    void parsesBackwardCompatibleStringEntityFilters() {
        var plan = parser.parse("""
                {
                  "mode": "search",
                  "filters": {
                    "source": "vpn",
                    "user": "admin",
                    "host": "vpn-gw-01",
                    "ip": "203.0.113.45"
                  },
                  "page": 0,
                  "size": 20
                }
                """);

        assertThat(plan.filters().source()).containsExactly("vpn");
        assertThat(plan.filters().user()).containsExactly("admin");
        assertThat(plan.filters().host()).containsExactly("vpn-gw-01");
        assertThat(plan.filters().ip()).containsExactly("203.0.113.45");
    }

    @Test
    void parsesMultiValueEntityFilters() {
        var plan = parser.parse("""
                {
                  "mode": "search",
                  "filters": {
                    "source": ["vpn", "windows-auth"],
                    "user": ["admin", "vpn.user"],
                    "host": ["vpn-gw-01", "web-01"],
                    "ip": ["203.0.113.45", "198.51.100.200"]
                  },
                  "page": 0,
                  "size": 20
                }
                """);

        assertThat(plan.filters().source()).containsExactly("vpn", "windows-auth");
        assertThat(plan.filters().user()).containsExactly("admin", "vpn.user");
        assertThat(plan.filters().host()).containsExactly("vpn-gw-01", "web-01");
        assertThat(plan.filters().ip()).containsExactly("203.0.113.45", "198.51.100.200");
    }

    @Test
    void backendPaginationOverrideWinsOverLlmPagination() {
        var plan = parser.parseWithPaginationOverride("""
                {
                  "mode": "search",
                  "filters": {},
                  "page": 9,
                  "size": 100
                }
                """, 0, 5);

        assertThat(plan.page()).isZero();
        assertThat(plan.size()).isEqualTo(5);
    }

    @Test
    void rejectsMarkdownCodeFence() {
        assertInvalid("""
                ```json
                %s
                ```
                """.formatted(validJson()));
    }

    @Test
    void rejectsProseBeforeJson() {
        assertInvalid("Here is the result:\n" + validJson());
    }

    @Test
    void rejectsProseAfterJson() {
        assertInvalid(validJson() + "\nHope this helps.");
    }

    @Test
    void rejectsTrailingText() {
        assertInvalid(validJson() + " trailing");
    }

    @Test
    void rejectsMultipleJsonObjects() {
        assertInvalid(validJson() + "\n" + validJson());
    }

    @Test
    void rejectsRootJsonArray() {
        assertInvalid("[" + validJson() + "]");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "\"search\"",
            "true",
            "123",
            "null"
    })
    void rejectsScalarJsonValue(String rawJson) {
        assertInvalid(rawJson);
    }

    @Test
    void rejectsEmptyJsonObject() {
        assertInvalid("{}");
    }

    @Test
    void rejectsNullMode() {
        assertInvalid("""
                {
                  "mode": null,
                  "filters": {},
                  "page": 0,
                  "size": 20
                }
                """);
    }

    @Test
    void rejectsUnknownRootField() {
        assertInvalid("""
                {
                  "mode": "search",
                  "filters": {},
                  "admin": true,
                  "page": 0,
                  "size": 20
                }
                """);
    }

    @Test
    void rejectsUnknownFilterField() {
        assertInvalid("""
                {
                  "mode": "search",
                  "filters": {
                    "hack_field": "abc"
                  },
                  "page": 0,
                  "size": 20
                }
                """);
    }

    @Test
    void rejectsInvalidSeverity() {
        assertInvalid("""
                {
                  "mode": "search",
                  "filters": {
                    "severity": ["urgent"]
                  },
                  "page": 0,
                  "size": 20
                }
                """);
    }

    @Test
    void rejectsInvalidSize() {
        assertInvalid("""
                {
                  "mode": "search",
                  "filters": {},
                  "page": 0,
                  "size": 101
                }
                """);
    }

    private void assertInvalid(String rawJson) {
        assertThatThrownBy(() -> parser.parse(rawJson))
                .isInstanceOf(SearchPlanJsonParseException.class)
                .hasMessageNotContaining("Exception")
                .hasMessageNotContaining("com.soc.ai");
    }

    private String validJson() {
        return """
                {
                  "mode": "search",
                  "filters": {
                    "timestamp": { "from": "now-24h", "to": "now" },
                    "event_type": ["failed_login"],
                    "country_code": ["CN"]
                  },
                  "page": 0,
                  "size": 20
                }
                """;
    }
}
