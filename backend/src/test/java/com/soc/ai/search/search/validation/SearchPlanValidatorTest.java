package com.soc.ai.search.search.validation;

import static com.soc.ai.search.search.plan.SearchMode.SEARCH;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.stream.Stream;

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
                        20)));
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
                Arguments.of("script query syntax", withUser("painless script"), "script"));
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
}
