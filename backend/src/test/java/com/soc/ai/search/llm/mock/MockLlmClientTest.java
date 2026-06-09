package com.soc.ai.search.llm.mock;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.stream.Stream;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.llm.LlmProperties;
import com.soc.ai.search.llm.LlmProvider;
import com.soc.ai.search.llm.LlmSearchPlanRequest;
import com.soc.ai.search.llm.prompt.SearchPlanJsonParseException;
import com.soc.ai.search.llm.prompt.SearchPlanJsonParser;
import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.search.plan.SearchPlan;
import com.soc.ai.search.search.validation.SearchPlanValidator;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class MockLlmClientTest {

    private final MockLlmClient client = new MockLlmClient(new LlmProperties(
            LlmProvider.MOCK,
            null,
            null,
            null,
            10_000,
            2));
    private final SearchPlanJsonParser parser = new SearchPlanJsonParser(
            new ObjectMapper(),
            new SearchPlanValidator(Validation.buildDefaultValidatorFactory().getValidator()));
    private final SearchPlanValidator validator = new SearchPlanValidator(
            Validation.buildDefaultValidatorFactory().getValidator());

    @ParameterizedTest(name = "{0}")
    @MethodSource("regressionQuestions")
    void mapsRegressionQuestionsToValidatedSearchPlans(String question, ExpectedPlan expected) {
        var response = client.generateSearchPlan(request(question));

        assertThat(response.model()).isEqualTo("mock-search-plan");
        assertThat(response.latencyMs()).isGreaterThanOrEqualTo(0);
        assertThat(response.content().trim()).startsWith("{").endsWith("}");
        assertThat(response.content()).doesNotContain("```", "Sure", "SearchPlan:", "query_string", "\"query\"");

        var plan = parser.parseWithPaginationOverride(response.content(), 0, 5);
        validator.validate(plan);

        assertThat(plan.mode()).isEqualTo(SearchMode.SEARCH);
        assertThat(plan.page()).isZero();
        assertThat(plan.size()).isEqualTo(5);
        assertThat(plan.messageQuery()).isEqualTo(expected.messageQuery());
        assertThat(plan.filters().timestamp().from()).isEqualTo(expected.from());
        assertThat(plan.filters().timestamp().to()).isEqualTo(expected.to());

        assertList(plan.filters().eventType(), expected.eventType());
        assertList(plan.filters().countryCode(), expected.countryCode());
        assertList(plan.filters().severity(), expected.severity());
        assertThat(plan.filters().user()).isEqualTo(expected.user());
    }

    @ParameterizedTest(name = "{0} and {1} map to same plan")
    @MethodSource("synonymQuestions")
    void mapsSynonymsByKeywordInsteadOfExactPhrase(String firstQuestion, String secondQuestion) {
        var firstPlan = parser.parseWithPaginationOverride(
                client.generateSearchPlan(request(firstQuestion)).content(),
                0,
                5);
        var secondPlan = parser.parseWithPaginationOverride(
                client.generateSearchPlan(request(secondQuestion)).content(),
                0,
                5);

        assertThat(secondPlan.filters().eventType()).isEqualTo(firstPlan.filters().eventType());
        assertThat(secondPlan.filters().countryCode()).isEqualTo(firstPlan.filters().countryCode());
        assertThat(secondPlan.filters().severity()).isEqualTo(firstPlan.filters().severity());
        assertThat(secondPlan.filters().timestamp()).isEqualTo(firstPlan.filters().timestamp());
    }

    @Test
    void unsupportedQuestionReturnsInvalidPlanForControlledErrorPath() {
        var response = client.generateSearchPlan(request("draw a dashboard pie chart"));

        assertThat(response.content()).contains("unsupported_question");
        assertThatThrownBy(() -> parser.parseWithPaginationOverride(response.content(), 0, 5))
                .isInstanceOf(SearchPlanJsonParseException.class);
    }

    private static Stream<Arguments> regressionQuestions() {
        return Stream.of(
                Arguments.of(
                        "Show me failed login attempts from China in the last 24h",
                        new ExpectedPlan(List.of("failed_login"), List.of("CN"), null, null, null, "now-24h", "now")),
                Arguments.of(
                        "Tìm login thất bại từ Trung Quốc trong 24 giờ qua",
                        new ExpectedPlan(List.of("failed_login"), List.of("CN"), null, null, null, "now-24h", "now")),
                Arguments.of(
                        "Tìm alert critical trong 7 ngày qua",
                        new ExpectedPlan(null, null, List.of("critical"), null, null, "now-7d", "now")),
                Arguments.of(
                        "Show critical alerts in the last 7 days",
                        new ExpectedPlan(null, null, List.of("critical"), null, null, "now-7d", "now")),
                Arguments.of(
                        "Tìm malware detected trong 7 ngày qua",
                        new ExpectedPlan(null, null, null, null, "malware detected", "now-7d", "now")),
                Arguments.of(
                        "Show malware detected events in the last 7 days",
                        new ExpectedPlan(null, null, null, null, "malware detected", "now-7d", "now")),
                Arguments.of(
                        "Tìm firewall block từ CN",
                        new ExpectedPlan(List.of("firewall_block"), List.of("CN"), null, null, null, "now-30d", "now")),
                Arguments.of(
                        "Show privilege escalation by admin",
                        new ExpectedPlan(List.of("privilege_escalation"), null, null, "admin", null, "now-30d", "now")),
                Arguments.of(
                        "Tìm account lockout trong 7 ngày qua",
                        new ExpectedPlan(List.of("account_lockout"), null, null, null, null, "now-7d", "now")),
                Arguments.of(
                        "Show failed login events for user admin",
                        new ExpectedPlan(List.of("failed_login"), null, null, "admin", null, "now-30d", "now")));
    }

    private static Stream<Arguments> synonymQuestions() {
        return Stream.of(
                Arguments.of("failed login china", "failed login from cn"),
                Arguments.of("critical 7 days", "critical 7 ngày"));
    }

    private void assertList(List<String> actual, List<String> expected) {
        if (expected == null) {
            assertThat(actual).isNull();
            return;
        }

        assertThat(actual).containsExactlyElementsOf(expected);
    }

    private LlmSearchPlanRequest request(String question) {
        return new LlmSearchPlanRequest("system prompt placeholder", question);
    }

    private record ExpectedPlan(
            List<String> eventType,
            List<String> countryCode,
            List<String> severity,
            String user,
            String messageQuery,
            String from,
            String to) {
    }
}
