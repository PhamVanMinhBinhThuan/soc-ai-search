package com.soc.ai.search.search.validation;

import static com.soc.ai.search.search.plan.AggregationType.COUNT;
import static com.soc.ai.search.search.plan.AggregationType.DATE_HISTOGRAM;
import static com.soc.ai.search.search.plan.AggregationType.GROUP_BY;
import static com.soc.ai.search.search.plan.AggregationType.TOP_N;
import static com.soc.ai.search.search.plan.HistogramInterval.HOUR;
import static com.soc.ai.search.search.plan.SearchMode.AGGREGATION;
import static com.soc.ai.search.search.plan.SearchMode.SEARCH;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.stream.Stream;

import com.soc.ai.search.search.plan.AggregationPlan;
import com.soc.ai.search.search.plan.SearchFilters;
import com.soc.ai.search.search.plan.SearchPlan;
import com.soc.ai.search.search.plan.TimeRange;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class SearchPlanValidatorTest {

    private final SearchPlanValidator validator = new SearchPlanValidator(
            Validation.buildDefaultValidatorFactory().getValidator());

    @ParameterizedTest(name = "{0}")
    @MethodSource("validPlans")
    void acceptsValidPlans(String name, SearchPlan plan) {
        assertThatCode(() -> validator.validate(plan)).doesNotThrowAnyException();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidPlans")
    void rejectsInvalidPlans(String name, SearchPlan plan, String expectedError) {
        assertThatThrownBy(() -> validator.validate(plan))
                .isInstanceOf(SearchPlanValidationException.class)
                .satisfies(exception -> assertThat(((SearchPlanValidationException) exception).errors())
                        .anySatisfy(error -> assertThat(error).contains(expectedError)));
    }

    @Test
    void rejectsNullSearchPlan() {
        assertThatThrownBy(() -> validator.validate(null))
                .isInstanceOf(SearchPlanValidationException.class)
                .hasMessageContaining("search_plan");
    }

    private static Stream<Arguments> validPlans() {
        return Stream.of(
                Arguments.of("failed_login CN last 24h", validFailedLoginCnPlan()),
                Arguments.of("critical severity 7 days", new SearchPlan(
                        SEARCH,
                        new SearchFilters(
                                new TimeRange("now-7d", "now"),
                                List.of("critical"),
                                List.of("malware_detected"),
                                null,
                                null,
                                null,
                                null),
                        0,
                        20)),
                Arguments.of("count failed_login 7 days", aggregationPlan(
                        new SearchFilters(
                                new TimeRange("now-7d", "now"),
                                null,
                                List.of("failed_login"),
                                null,
                                null,
                                null,
                                null),
                        new AggregationPlan(COUNT, null, null, null))),
                Arguments.of("group_by user", aggregationPlan(validFilters(), new AggregationPlan(GROUP_BY, "user", null, null))),
                Arguments.of("top_n ip", aggregationPlan(validFilters(), new AggregationPlan(TOP_N, "ip", 10, null))),
                Arguments.of("date_histogram hour", aggregationPlan(validFilters(), new AggregationPlan(DATE_HISTOGRAM, null, null, HOUR))));
    }

    private static Stream<Arguments> invalidPlans() {
        return Stream.of(
                Arguments.of("invalid severity", withSeverity(List.of("urgent")), "severity"),
                Arguments.of("invalid IP", withIp("999.999.999.999"), "ip"),
                Arguments.of("invalid country code", withCountryCode(List.of("cn")), "countryCode"),
                Arguments.of("invalid size > 100", new SearchPlan(SEARCH, validFilters(), 0, 101), "size"),
                Arguments.of("mode null", new SearchPlan(null, validFilters(), 0, 20), "mode"),
                Arguments.of("unsupported relative time", withTimeRange(new TimeRange("now-2h", "now")), "timestamp.from"),
                Arguments.of("absolute from after to", withTimeRange(new TimeRange(
                        "2026-06-04T10:00:00Z",
                        "2026-06-03T10:00:00Z")), "timestamp"),
                Arguments.of("wildcard query syntax", withEventType(List.of("failed*login")), "wildcard"),
                Arguments.of("script query syntax", withUser("painless script"), "script"),
                Arguments.of("blank message query", withMessageQuery(" "), "messageQuery"),
                Arguments.of("message query too long", withMessageQuery("a".repeat(201)), "messageQuery"),
                Arguments.of("message query wildcard", withMessageQuery("malware*"), "wildcard"),
                Arguments.of("message query script syntax", withMessageQuery("painless script"), "script"),
                Arguments.of("aggregation null in aggregation mode",
                        new SearchPlan(AGGREGATION, validFilters(), null, null, 0, 20),
                        "aggregation"),
                Arguments.of("aggregation present in search mode",
                        new SearchPlan(SEARCH, validFilters(), new AggregationPlan(TOP_N, "user", 10, null), null, 0, 20),
                        "aggregation"),
                Arguments.of("aggregation field message", aggregationPlan(validFilters(), new AggregationPlan(TOP_N, "message", 10, null)), "aggregation.field"),
                Arguments.of("aggregation field raw", aggregationPlan(validFilters(), new AggregationPlan(TOP_N, "raw", 10, null)), "aggregation.field"),
                Arguments.of("aggregation field user.keyword", aggregationPlan(validFilters(), new AggregationPlan(TOP_N, "user.keyword", 10, null)), "aggregation.field"),
                Arguments.of("aggregation field User case-sensitive", aggregationPlan(validFilters(), new AggregationPlan(TOP_N, "User", 10, null)), "aggregation.field"),
                Arguments.of("aggregation field USER case-sensitive", aggregationPlan(validFilters(), new AggregationPlan(TOP_N, "USER", 10, null)), "aggregation.field"),
                Arguments.of("aggregation field Ip case-sensitive", aggregationPlan(validFilters(), new AggregationPlan(TOP_N, "Ip", 10, null)), "aggregation.field"),
                Arguments.of("aggregation field EVENT_TYPE case-sensitive", aggregationPlan(validFilters(), new AggregationPlan(TOP_N, "EVENT_TYPE", 10, null)), "aggregation.field"),
                Arguments.of("count with field", aggregationPlan(validFilters(), new AggregationPlan(COUNT, "user", null, null)), "aggregation.field"),
                Arguments.of("count with top_n", aggregationPlan(validFilters(), new AggregationPlan(COUNT, null, 10, null)), "aggregation.top_n"),
                Arguments.of("count with interval", aggregationPlan(validFilters(), new AggregationPlan(COUNT, null, null, HOUR)), "aggregation.interval"),
                Arguments.of("date_histogram with field", aggregationPlan(validFilters(), new AggregationPlan(DATE_HISTOGRAM, "user", null, HOUR)), "aggregation.field"),
                Arguments.of("date_histogram with top_n", aggregationPlan(validFilters(), new AggregationPlan(DATE_HISTOGRAM, null, 10, HOUR)), "aggregation.top_n"),
                Arguments.of("top_n > 100", aggregationPlan(validFilters(), new AggregationPlan(TOP_N, "ip", 101, null)), "aggregation.top_n"),
                Arguments.of("date_histogram interval null", aggregationPlan(validFilters(), new AggregationPlan(DATE_HISTOGRAM, null, null, null)), "aggregation.interval"),
                Arguments.of("message query in aggregation", new SearchPlan(
                        AGGREGATION,
                        validFilters(),
                        new AggregationPlan(TOP_N, "user", 10, null),
                        "malware detected",
                        0,
                        20), "message_query"));
    }

    private static SearchPlan validFailedLoginCnPlan() {
        return new SearchPlan(
                SEARCH,
                validFilters(),
                0,
                20);
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

    private static SearchPlan withSeverity(List<String> severity) {
        var filters = validFilters();
        return new SearchPlan(
                SEARCH,
                new SearchFilters(
                        filters.timestamp(),
                        severity,
                        filters.eventType(),
                        filters.user(),
                        filters.host(),
                        filters.ip(),
                        filters.countryCode()),
                0,
                20);
    }

    private static SearchPlan withIp(String ip) {
        var filters = validFilters();
        return new SearchPlan(
                SEARCH,
                new SearchFilters(
                        filters.timestamp(),
                        filters.severity(),
                        filters.eventType(),
                        filters.user(),
                        filters.host(),
                        ip,
                        filters.countryCode()),
                0,
                20);
    }

    private static SearchPlan withCountryCode(List<String> countryCode) {
        var filters = validFilters();
        return new SearchPlan(
                SEARCH,
                new SearchFilters(
                        filters.timestamp(),
                        filters.severity(),
                        filters.eventType(),
                        filters.user(),
                        filters.host(),
                        filters.ip(),
                        countryCode),
                0,
                20);
    }

    private static SearchPlan withTimeRange(TimeRange timeRange) {
        var filters = validFilters();
        return new SearchPlan(
                SEARCH,
                new SearchFilters(
                        timeRange,
                        filters.severity(),
                        filters.eventType(),
                        filters.user(),
                        filters.host(),
                        filters.ip(),
                        filters.countryCode()),
                0,
                20);
    }

    private static SearchPlan withEventType(List<String> eventType) {
        var filters = validFilters();
        return new SearchPlan(
                SEARCH,
                new SearchFilters(
                        filters.timestamp(),
                        filters.severity(),
                        eventType,
                        filters.user(),
                        filters.host(),
                        filters.ip(),
                        filters.countryCode()),
                0,
                20);
    }

    private static SearchPlan withUser(String user) {
        var filters = validFilters();
        return new SearchPlan(
                SEARCH,
                new SearchFilters(
                        filters.timestamp(),
                        filters.severity(),
                        filters.eventType(),
                        user,
                        filters.host(),
                        filters.ip(),
                        filters.countryCode()),
                0,
                20);
    }

    private static SearchPlan withMessageQuery(String messageQuery) {
        return new SearchPlan(
                SEARCH,
                validFilters(),
                messageQuery,
                0,
                20);
    }

    private static SearchPlan aggregationPlan(SearchFilters filters, AggregationPlan aggregation) {
        return new SearchPlan(
                AGGREGATION,
                filters,
                aggregation,
                null,
                0,
                20);
    }
}
