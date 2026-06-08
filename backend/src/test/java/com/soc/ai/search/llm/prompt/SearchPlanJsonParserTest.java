package com.soc.ai.search.llm.prompt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.search.validation.SearchPlanValidator;
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
