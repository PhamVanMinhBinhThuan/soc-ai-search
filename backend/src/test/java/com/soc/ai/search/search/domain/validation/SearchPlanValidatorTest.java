package com.soc.ai.search.search.domain.validation;

import static com.soc.ai.search.search.domain.plan.AggregationType.COUNT;
import static com.soc.ai.search.search.domain.plan.AggregationType.DATE_HISTOGRAM;
import static com.soc.ai.search.search.domain.plan.AggregationType.GROUP_BY;
import static com.soc.ai.search.search.domain.plan.AggregationType.TOP_N;
import static com.soc.ai.search.search.domain.plan.HistogramInterval.HOUR;
import static com.soc.ai.search.search.domain.plan.SearchMode.AGGREGATION;
import static com.soc.ai.search.search.domain.plan.SearchMode.SEARCH;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.stream.Stream;

import com.soc.ai.search.search.domain.plan.AggregationPlan;
import com.soc.ai.search.search.domain.plan.AggregationOrderBy;
import com.soc.ai.search.search.domain.plan.SearchFilters;
import com.soc.ai.search.search.domain.plan.SearchPlan;
import com.soc.ai.search.search.domain.plan.SortOrder;
import com.soc.ai.search.search.domain.plan.SortPlan;
import com.soc.ai.search.search.domain.plan.TimeRange;
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
                Arguments.of("flexible relative time 10 days", withTimeRange(new TimeRange("now-10d", "now"))),
                Arguments.of("flexible relative time 11 days", withTimeRange(new TimeRange("now-11d", "now"))),
                Arguments.of("flexible relative time 12 days", withTimeRange(new TimeRange("now-12d", "now"))),
                Arguments.of("flexible relative time 36 hours", withTimeRange(new TimeRange("now-36h", "now"))),
                Arguments.of("absolute ISO-8601 timestamp", withTimeRange(new TimeRange(
                        "2026-06-01T00:00:00Z",
                        "2026-06-02T00:00:00Z"))),
                Arguments.of("critical severity 7 days", new SearchPlan(
                        SEARCH,
                        new SearchFilters(
                                new TimeRange("now-7d", "now"),
                                List.of("edr"),
                                List.of("critical"),
                                List.of("malware_detected"),
                                null,
                                null,
                                null,
                                null),
                        0,
                        20)),
                Arguments.of("source edr filter", new SearchPlan(
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
                        20)),
                Arguments.of("multi-value entity filters", new SearchPlan(
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
                        20)),
                Arguments.of("event_id UUID filter", new SearchPlan(
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
                        20)),
                Arguments.of("safe search sort", new SearchPlan(
                        SEARCH,
                        validFilters(),
                        null,
                        null,
                        List.of(new SortPlan("timestamp", SortOrder.ASC)),
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
                Arguments.of("group_by user order by key asc", aggregationPlan(validFilters(), new AggregationPlan(GROUP_BY, "user", null, null, AggregationOrderBy.KEY, SortOrder.ASC))),
                Arguments.of("top_n ip", aggregationPlan(validFilters(), new AggregationPlan(TOP_N, "ip", 10, null))),
                Arguments.of("date_histogram hour", aggregationPlan(validFilters(), new AggregationPlan(DATE_HISTOGRAM, null, null, HOUR))));
    }

    private static Stream<Arguments> invalidPlans() {
        return Stream.of(
                Arguments.of("invalid severity", withSeverity(List.of("urgent")), "severity"),
                Arguments.of("invalid IP", withIp("999.999.999.999"), "ip"),
                Arguments.of("invalid country code", withCountryCode(List.of("cn")), "countryCode"),
                Arguments.of("invalid source uppercase", withSource(List.of("EDR")), "source"),
                Arguments.of("invalid size > 100", new SearchPlan(SEARCH, validFilters(), 0, 101), "size"),
                Arguments.of("mode null", new SearchPlan(null, validFilters(), 0, 20), "mode"),
                Arguments.of("relative time zero days", withTimeRange(new TimeRange("now-0d", "now")), "timestamp.from"),
                Arguments.of("relative time zero hours", withTimeRange(new TimeRange("now-0h", "now")), "timestamp.from"),
                Arguments.of("relative time too many days", withTimeRange(new TimeRange("now-9999d", "now")), "timestamp.from"),
                Arguments.of("relative time plus syntax", withTimeRange(new TimeRange("now+7d", "now")), "timestamp.from"),
                Arguments.of("relative time unsupported unit", withTimeRange(new TimeRange("now-1y", "now")), "timestamp.from"),
                Arguments.of("relative time rounded date math", withTimeRange(new TimeRange("now-7d||/d", "now")), "timestamp.from"),
                Arguments.of("absolute from after to", withTimeRange(new TimeRange(
                        "2026-06-04T10:00:00Z",
                        "2026-06-03T10:00:00Z")), "timestamp"),
                Arguments.of("wildcard query syntax", withEventType(List.of("failed*login")), "wildcard"),
                Arguments.of("source wildcard query syntax", withSource(List.of("edr*")), "wildcard"),
                Arguments.of("script query syntax", withUser("painless script"), "script"),
                Arguments.of("query_string syntax", withUser("query_string admin"), "script"),
                Arguments.of("empty user list", withUsers(List.of()), "filters.user"),
                Arguments.of("blank user list item", withUsers(List.of("admin", " ")), "user"),
                Arguments.of("too many user values", withUsers(List.of(
                        "u01", "u02", "u03", "u04", "u05", "u06", "u07", "u08", "u09", "u10", "u11")),
                        "at most 10"),
                Arguments.of("invalid event_id", withEventIds(List.of("not-a-uuid")), "event_id"),
                Arguments.of("blank event_id list item", withEventIds(List.of("6f1d4c8e-1d93-4a27-9e87-9b7a9e9d8a12", " ")), "event_id"),
                Arguments.of("too many event_id values", withEventIds(List.of(
                        "00000000-0000-4000-8000-000000000001",
                        "00000000-0000-4000-8000-000000000002",
                        "00000000-0000-4000-8000-000000000003",
                        "00000000-0000-4000-8000-000000000004",
                        "00000000-0000-4000-8000-000000000005",
                        "00000000-0000-4000-8000-000000000006",
                        "00000000-0000-4000-8000-000000000007",
                        "00000000-0000-4000-8000-000000000008",
                        "00000000-0000-4000-8000-000000000009",
                        "00000000-0000-4000-8000-000000000010",
                        "00000000-0000-4000-8000-000000000011",
                        "00000000-0000-4000-8000-000000000012",
                        "00000000-0000-4000-8000-000000000013",
                        "00000000-0000-4000-8000-000000000014",
                        "00000000-0000-4000-8000-000000000015",
                        "00000000-0000-4000-8000-000000000016",
                        "00000000-0000-4000-8000-000000000017",
                        "00000000-0000-4000-8000-000000000018",
                        "00000000-0000-4000-8000-000000000019",
                        "00000000-0000-4000-8000-000000000020",
                        "00000000-0000-4000-8000-000000000021")), "at most 20"),
                Arguments.of("invalid multi-value IP", withIps(List.of("203.0.113.45", "999.999.999.999")), "IPv4"),
                Arguments.of("blank message query", withMessageQuery(" "), "messageQuery"),
                Arguments.of("message query too long", withMessageQuery("a".repeat(201)), "messageQuery"),
                Arguments.of("message query wildcard", withMessageQuery("malware*"), "wildcard"),
                Arguments.of("message query script syntax", withMessageQuery("painless script"), "script"),
                Arguments.of("sort unsafe field message", withSort("message", SortOrder.ASC), "sort.field"),
                Arguments.of("sort not supported for aggregation", new SearchPlan(
                        AGGREGATION,
                        validFilters(),
                        new AggregationPlan(TOP_N, "ip", 10, null),
                        null,
                        List.of(new SortPlan("timestamp", SortOrder.ASC)),
                        0,
                        20), "sort"),
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
                Arguments.of("count with bucket order", aggregationPlan(validFilters(), new AggregationPlan(COUNT, null, null, null, AggregationOrderBy.VALUE, SortOrder.DESC)), "aggregation.order_by"),
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
                        filters.source(),
                        severity,
                        filters.eventType(),
                        filters.user(),
                        filters.host(),
                        filters.ip(),
                        filters.countryCode()),
                0,
                20);
    }

    private static SearchPlan withSource(List<String> source) {
        var filters = validFilters();
        return new SearchPlan(
                SEARCH,
                new SearchFilters(
                        filters.timestamp(),
                        source,
                        filters.severity(),
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
                        filters.source(),
                        filters.severity(),
                        filters.eventType(),
                        filters.user(),
                        filters.host(),
                        List.of(ip),
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
                        filters.source(),
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
                        filters.source(),
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
                        filters.source(),
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
        return withUsers(List.of(user));
    }

    private static SearchPlan withUsers(List<String> users) {
        var filters = validFilters();
        return new SearchPlan(
                SEARCH,
                new SearchFilters(
                        filters.timestamp(),
                        filters.source(),
                        filters.severity(),
                        filters.eventType(),
                        users,
                        filters.host(),
                        filters.ip(),
                        filters.countryCode()),
                0,
                20);
    }

    private static SearchPlan withIps(List<String> ips) {
        var filters = validFilters();
        return new SearchPlan(
                SEARCH,
                new SearchFilters(
                        filters.timestamp(),
                        filters.eventId(),
                        filters.source(),
                        filters.severity(),
                        filters.eventType(),
                        filters.user(),
                        filters.host(),
                        ips,
                        filters.countryCode()),
                0,
                20);
    }

    private static SearchPlan withEventIds(List<String> eventIds) {
        var filters = validFilters();
        return new SearchPlan(
                SEARCH,
                new SearchFilters(
                        filters.timestamp(),
                        eventIds,
                        filters.source(),
                        filters.severity(),
                        filters.eventType(),
                        filters.user(),
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

    private static SearchPlan withSort(String field, SortOrder order) {
        return new SearchPlan(
                SEARCH,
                validFilters(),
                null,
                null,
                List.of(new SortPlan(field, order)),
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
