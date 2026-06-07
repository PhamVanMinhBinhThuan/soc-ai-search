package com.soc.ai.search.search.compiler;

import static com.soc.ai.search.search.plan.SearchMode.SEARCH;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import com.soc.ai.search.search.plan.SearchFilters;
import com.soc.ai.search.search.plan.SearchPlan;
import com.soc.ai.search.search.plan.TimeRange;
import com.soc.ai.search.search.validation.SearchPlanValidator;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class SearchPlanCompilerTest {

    private final SearchPlanCompiler compiler = new SearchPlanCompiler(new SearchPlanValidator(
            Validation.buildDefaultValidatorFactory().getValidator()));

    @ParameterizedTest(name = "{0}")
    @MethodSource("compiledQueryCases")
    void compilesExpectedDslShape(String name, SearchPlan plan, DslAssertion assertion) {
        var searchSpec = compiler.compile(plan).searchSpec();

        assertion.verify(searchSpec);
    }

    @Test
    void doesNotPutExecutorSettingsInCompiledSearchSpec() {
        var searchSpec = compiler.compile(validSearchPlan()).searchSpec();

        assertThat(searchSpec).doesNotContainKeys("timeout", "track_total_hits");
    }

    private static Stream<Arguments> compiledQueryCases() {
        return Stream.of(
                Arguments.of(
                        "failed_login CN last 24h keeps Elasticsearch date math",
                        validSearchPlan(),
                        (DslAssertion) searchSpec -> {
                            assertRange(searchSpec, "now-24h", "now");
                            assertTerms(searchSpec, "event_type", List.of("failed_login"));
                            assertTerms(searchSpec, "country_code", List.of("CN"));
                        }),
                Arguments.of(
                        "critical severity 7 days uses terms filter",
                        new SearchPlan(
                                SEARCH,
                                new SearchFilters(
                                        new TimeRange("now-7d", "now"),
                                        List.of("critical"),
                                        null,
                                        null,
                                        null,
                                        null,
                                        null),
                                0,
                                20),
                        (DslAssertion) searchSpec -> {
                            assertRange(searchSpec, "now-7d", "now");
                            assertTerms(searchSpec, "severity", List.of("critical"));
                        }),
                Arguments.of(
                        "multi severity uses terms not term with array",
                        validSearchPlan(),
                        (DslAssertion) searchSpec -> {
                            assertTerms(searchSpec, "severity", List.of("high", "critical"));
                            assertNoTerm(searchSpec, "severity");
                        }),
                Arguments.of(
                        "scalar fields use term filters",
                        validSearchPlan(),
                        (DslAssertion) searchSpec -> {
                            assertTerm(searchSpec, "user", "admin");
                            assertTerm(searchSpec, "host", "vpn-gw-01");
                            assertTerm(searchSpec, "ip", "203.0.113.45");
                        }),
                Arguments.of(
                        "message query uses match in bool must",
                        new SearchPlan(
                                SEARCH,
                                validFilters(),
                                "malware detected",
                                0,
                                20),
                        (DslAssertion) SearchPlanCompilerTest::assertMessageMatch),
                Arguments.of(
                        "page 2 size 20 compiles from 40",
                        new SearchPlan(SEARCH, validFilters(), 2, 20),
                        (DslAssertion) searchSpec -> {
                            assertThat(searchSpec.get("from")).isEqualTo(40);
                            assertThat(searchSpec.get("size")).isEqualTo(20);
                        }),
                Arguments.of(
                        "search spec always sorts timestamp desc",
                        validSearchPlan(),
                        (DslAssertion) SearchPlanCompilerTest::assertTimestampDescSort));
    }

    private static SearchPlan validSearchPlan() {
        return new SearchPlan(SEARCH, validFilters(), 0, 20);
    }

    private static SearchFilters validFilters() {
        return new SearchFilters(
                new TimeRange("now-24h", "now"),
                List.of("high", "critical"),
                List.of("failed_login"),
                "admin",
                "vpn-gw-01",
                "203.0.113.45",
                List.of("CN"));
    }

    private static void assertRange(Map<String, Object> searchSpec, String expectedGte, String expectedLte) {
        @SuppressWarnings("unchecked")
        var timestamp = (Map<String, Object>) findClause(searchSpec, "range", "timestamp");

        assertThat(timestamp).containsEntry("gte", expectedGte);
        assertThat(timestamp).containsEntry("lte", expectedLte);
    }

    private static void assertTerms(Map<String, Object> searchSpec, String field, List<String> expectedValues) {
        var values = findClause(searchSpec, "terms", field);

        assertThat(values).isEqualTo(expectedValues);
    }

    private static void assertTerm(Map<String, Object> searchSpec, String field, String expectedValue) {
        var value = findClause(searchSpec, "term", field);

        assertThat(value).isEqualTo(expectedValue);
    }

    private static void assertNoTerm(Map<String, Object> searchSpec, String field) {
        assertThat(filterClauses(searchSpec))
                .noneSatisfy(clause -> assertThat(clause)
                        .containsEntry("term", Map.of(field, List.of("high", "critical"))));
    }

    private static void assertMessageMatch(Map<String, Object> searchSpec) {
        var must = mustClauses(searchSpec);

        assertThat(must).contains(Map.of("match", Map.of("message", "malware detected")));
    }

    private static void assertTimestampDescSort(Map<String, Object> searchSpec) {
        assertThat(searchSpec.get("sort"))
                .isEqualTo(List.of(Map.of("timestamp", Map.of("order", "desc"))));
    }

    @SuppressWarnings("unchecked")
    private static Object findClause(Map<String, Object> searchSpec, String queryType, String field) {
        return filterClauses(searchSpec).stream()
                .filter(clause -> clause.containsKey(queryType))
                .map(clause -> (Map<String, Object>) clause.get(queryType))
                .filter(query -> query.containsKey(field))
                .findFirst()
                .map(query -> query.get(field))
                .orElseThrow(() -> new AssertionError("Missing " + queryType + " clause for " + field));
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> filterClauses(Map<String, Object> searchSpec) {
        var query = (Map<String, Object>) searchSpec.get("query");
        var bool = (Map<String, Object>) query.get("bool");
        return (List<Map<String, Object>>) bool.get("filter");
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> mustClauses(Map<String, Object> searchSpec) {
        var query = (Map<String, Object>) searchSpec.get("query");
        var bool = (Map<String, Object>) query.get("bool");
        return (List<Map<String, Object>>) bool.get("must");
    }

    @FunctionalInterface
    private interface DslAssertion {
        void verify(Map<String, Object> searchSpec);
    }
}
