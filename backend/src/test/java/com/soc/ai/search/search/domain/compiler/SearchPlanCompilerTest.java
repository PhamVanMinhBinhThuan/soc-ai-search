package com.soc.ai.search.search.domain.compiler;

import static com.soc.ai.search.search.domain.plan.AggregationType.COUNT;
import static com.soc.ai.search.search.domain.plan.AggregationType.DATE_HISTOGRAM;
import static com.soc.ai.search.search.domain.plan.AggregationType.GROUP_BY;
import static com.soc.ai.search.search.domain.plan.AggregationType.TOP_N;
import static com.soc.ai.search.search.domain.plan.HistogramInterval.DAY;
import static com.soc.ai.search.search.domain.plan.HistogramInterval.HOUR;
import static com.soc.ai.search.search.domain.plan.SearchMode.AGGREGATION;
import static com.soc.ai.search.search.domain.plan.SearchMode.SEARCH;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import com.soc.ai.search.search.domain.plan.AggregationPlan;
import com.soc.ai.search.search.domain.plan.AggregationOrderBy;
import com.soc.ai.search.search.domain.plan.SearchFilters;
import com.soc.ai.search.search.domain.plan.SearchPlan;
import com.soc.ai.search.search.domain.plan.SortOrder;
import com.soc.ai.search.search.domain.plan.SortPlan;
import com.soc.ai.search.search.domain.plan.TimeRange;
import com.soc.ai.search.search.domain.validation.SearchPlanValidator;
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

    @ParameterizedTest(name = "{0}")
    @MethodSource("compiledAggregationCases")
    void compilesExpectedAggregationDslShape(String name, SearchPlan plan, DslAssertion assertion) {
        var searchSpec = compiler.compile(plan).searchSpec();

        assertion.verify(searchSpec);
        assertThat(searchSpec).isInstanceOf(Map.class);
        assertNoUnsupportedQueries(searchSpec);
        assertNoKeywordFields(searchSpec);
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
                        "source uses terms filter",
                        new SearchPlan(
                                SEARCH,
                                new SearchFilters(
                                        new TimeRange("now-7d", "now"),
                                        List.of("edr", "windows-auth"),
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null),
                                0,
                                20),
                        (DslAssertion) searchSpec -> {
                            assertRange(searchSpec, "now-7d", "now");
                            assertTerms(searchSpec, "source", List.of("edr", "windows-auth"));
                        }),
                Arguments.of(
                        "multi severity uses terms not term with array",
                        validSearchPlan(),
                        (DslAssertion) searchSpec -> {
                            assertTerms(searchSpec, "severity", List.of("high", "critical"));
                            assertNoTerm(searchSpec, "severity");
                        }),
                Arguments.of(
                        "entity fields use terms filters",
                        validSearchPlan(),
                        (DslAssertion) searchSpec -> {
                            assertTerms(searchSpec, "user", List.of("admin"));
                            assertTerms(searchSpec, "host", List.of("vpn-gw-01"));
                            assertTerms(searchSpec, "ip", List.of("203.0.113.45"));
                        }),
                Arguments.of(
                        "multi-value entity fields use terms filters",
                        new SearchPlan(
                                SEARCH,
                                new SearchFilters(
                                        new TimeRange("now-24h", "now"),
                                        null,
                                        List.of("vpn", "windows-auth"),
                                        List.of("high"),
                                        List.of("failed_login"),
                                        List.of("admin", "vpn.user"),
                                        List.of("vpn-gw-01", "web-01"),
                                        List.of("203.0.113.45", "198.51.100.200"),
                                        List.of("CN")),
                                0,
                                20),
                        (DslAssertion) searchSpec -> {
                            assertTerms(searchSpec, "source", List.of("vpn", "windows-auth"));
                            assertTerms(searchSpec, "user", List.of("admin", "vpn.user"));
                            assertTerms(searchSpec, "host", List.of("vpn-gw-01", "web-01"));
                            assertTerms(searchSpec, "ip", List.of("203.0.113.45", "198.51.100.200"));
                        }),
                Arguments.of(
                        "event_id uses terms filter",
                        new SearchPlan(
                                SEARCH,
                                new SearchFilters(
                                        new TimeRange("now-24h", "now"),
                                        List.of("6f1d4c8e-1d93-4a27-9e87-9b7a9e9d8a12"),
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null),
                                0,
                                20),
                        (DslAssertion) searchSpec -> assertTerms(
                                searchSpec,
                                "event_id",
                                List.of("6f1d4c8e-1d93-4a27-9e87-9b7a9e9d8a12"))),
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
                        (DslAssertion) SearchPlanCompilerTest::assertTimestampDescSort),
                Arguments.of(
                        "search spec uses severity rank sort",
                        new SearchPlan(SEARCH, validFilters(), null, null, List.of(new SortPlan("severity", SortOrder.ASC)), 0, 20),
                        (DslAssertion) searchSpec -> assertSeverityRankSort(searchSpec, "asc")));
    }

    private static Stream<Arguments> compiledAggregationCases() {
        return Stream.of(
                Arguments.of(
                        "count failed_login 7 days keeps query filter and no aggs",
                        aggregationPlan(
                                failedLoginSevenDaysFilters(),
                                new AggregationPlan(COUNT, null, null, null)),
                        (DslAssertion) searchSpec -> {
                            assertThat(searchSpec).containsEntry("size", 0);
                            assertThat(searchSpec).doesNotContainKey("aggs");
                            assertTerms(searchSpec, "event_type", List.of("failed_login"));
                            assertRange(searchSpec, "now-7d", "now");
                        }),
                Arguments.of(
                        "group_by user without top_n uses default bucket limit",
                        aggregationPlan(validFilters(), new AggregationPlan(GROUP_BY, "user", null, null)),
                        (DslAssertion) searchSpec -> assertTermsAggregation(searchSpec, "count_by_field", "user", 20)),
                Arguments.of(
                        "group_by user without top_n ignores SearchPlan size",
                        new SearchPlan(
                                AGGREGATION,
                                validFilters(),
                                new AggregationPlan(GROUP_BY, "user", null, null),
                                null,
                                0,
                                100),
                        (DslAssertion) searchSpec -> assertTermsAggregation(searchSpec, "count_by_field", "user", 20)),
                Arguments.of(
                        "group_by user with top_n uses requested bucket limit",
                        aggregationPlan(validFilters(), new AggregationPlan(GROUP_BY, "user", 50, null)),
                        (DslAssertion) searchSpec -> assertTermsAggregation(searchSpec, "count_by_field", "user", 50)),
                Arguments.of(
                        "top_n ip top 10 uses terms aggregation",
                        aggregationPlan(validFilters(), new AggregationPlan(TOP_N, "ip", 10, null)),
                        (DslAssertion) searchSpec -> assertTermsAggregation(searchSpec, "top_values", "ip", 10)),
                Arguments.of(
                        "top_n ip top 100 uses terms aggregation",
                        aggregationPlan(validFilters(), new AggregationPlan(TOP_N, "ip", 100, null)),
                        (DslAssertion) searchSpec -> assertTermsAggregation(searchSpec, "top_values", "ip", 100)),
                Arguments.of(
                        "top_n ip can order buckets by key asc",
                        aggregationPlan(validFilters(), new AggregationPlan(TOP_N, "ip", 10, null, AggregationOrderBy.KEY, SortOrder.ASC)),
                        (DslAssertion) searchSpec -> assertTermsAggregationOrder(searchSpec, "top_values", "_key", "asc")),
                Arguments.of(
                        "date_histogram hour uses fixed interval",
                        aggregationPlan(validFilters(), new AggregationPlan(DATE_HISTOGRAM, null, null, HOUR)),
                        (DslAssertion) searchSpec -> assertDateHistogram(searchSpec, "1h")),
                Arguments.of(
                        "date_histogram day uses fixed interval",
                        aggregationPlan(validFilters(), new AggregationPlan(DATE_HISTOGRAM, null, null, DAY)),
                        (DslAssertion) searchSpec -> assertDateHistogram(searchSpec, "1d")));
    }

    private static SearchPlan validSearchPlan() {
        return new SearchPlan(SEARCH, validFilters(), 0, 20);
    }

    private static SearchPlan aggregationPlan(SearchFilters filters, AggregationPlan aggregation) {
        return new SearchPlan(AGGREGATION, filters, aggregation, null, 0, 20);
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

    private static SearchFilters failedLoginSevenDaysFilters() {
        return new SearchFilters(
                new TimeRange("now-7d", "now"),
                null,
                List.of("failed_login"),
                null,
                null,
                null,
                null);
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
        assertSort(searchSpec, "timestamp", "desc");
    }

    private static void assertSort(Map<String, Object> searchSpec, String field, String order) {
        assertThat(searchSpec.get("sort"))
                .isEqualTo(List.of(Map.of(field, Map.of("order", order))));
    }

    @SuppressWarnings("unchecked")
    private static void assertSeverityRankSort(Map<String, Object> searchSpec, String order) {
        var sort = (List<Map<String, Object>>) searchSpec.get("sort");
        var scriptSort = (Map<String, Object>) sort.get(0).get("_script");
        var script = (Map<String, Object>) scriptSort.get("script");

        assertThat(scriptSort).containsEntry("type", "number");
        assertThat(scriptSort).containsEntry("order", order);
        assertThat(script.get("source").toString())
                .contains("if (value == 'critical') return 4")
                .contains("if (value == 'high') return 3")
                .contains("if (value == 'medium') return 2")
                .contains("if (value == 'low') return 1");
    }

    @SuppressWarnings("unchecked")
    private static void assertTermsAggregation(
            Map<String, Object> searchSpec,
            String aggregationName,
            String expectedField,
            int expectedSize) {
        var aggs = (Map<String, Object>) searchSpec.get("aggs");
        var aggregation = (Map<String, Object>) aggs.get(aggregationName);
        var terms = (Map<String, Object>) aggregation.get("terms");

        assertThat(terms).containsEntry("field", expectedField);
        assertThat(terms).containsEntry("size", expectedSize);
    }

    @SuppressWarnings("unchecked")
    private static void assertTermsAggregationOrder(
            Map<String, Object> searchSpec,
            String aggregationName,
            String expectedOrderBy,
            String expectedOrder) {
        var aggs = (Map<String, Object>) searchSpec.get("aggs");
        var aggregation = (Map<String, Object>) aggs.get(aggregationName);
        var terms = (Map<String, Object>) aggregation.get("terms");

        assertThat(terms).containsEntry("order", Map.of(expectedOrderBy, expectedOrder));
    }

    @SuppressWarnings("unchecked")
    private static void assertDateHistogram(Map<String, Object> searchSpec, String expectedFixedInterval) {
        var aggs = (Map<String, Object>) searchSpec.get("aggs");
        var aggregation = (Map<String, Object>) aggs.get("events_over_time");
        var dateHistogram = (Map<String, Object>) aggregation.get("date_histogram");

        assertThat(dateHistogram).containsEntry("field", "timestamp");
        assertThat(dateHistogram).containsEntry("fixed_interval", expectedFixedInterval);
        assertThat(dateHistogram).containsEntry("order", Map.of("_key", "asc"));
        assertThat(dateHistogram).containsEntry("min_doc_count", 0);
        assertThat(dateHistogram).containsEntry("extended_bounds", Map.of(
                "min", "now-24h",
                "max", "now"));
    }

    private static void assertNoUnsupportedQueries(Map<String, Object> searchSpec) {
        var rendered = searchSpec.toString();

        assertThat(rendered)
                .doesNotContain("script")
                .doesNotContain("wildcard")
                .doesNotContain("query_string");
    }

    private static void assertNoKeywordFields(Map<String, Object> searchSpec) {
        assertThat(searchSpec.toString()).doesNotContain(".keyword");
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
