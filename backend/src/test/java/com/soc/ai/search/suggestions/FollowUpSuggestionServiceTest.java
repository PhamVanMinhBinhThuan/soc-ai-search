package com.soc.ai.search.suggestions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.llm.LlmClient;
import com.soc.ai.search.llm.LlmFollowUpSuggestionsRequest;
import com.soc.ai.search.llm.LlmResponse;
import com.soc.ai.search.search.plan.SearchFilters;
import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.search.plan.SearchPlan;
import com.soc.ai.search.search.plan.TimeRange;
import org.junit.jupiter.api.Test;

class FollowUpSuggestionServiceTest {

    @Test
    void returnsThreeValidatedSuggestions() {
        var llmClient = mock(LlmClient.class);
        when(llmClient.generateFollowUpSuggestions(any(LlmFollowUpSuggestionsRequest.class)))
                .thenReturn(new LlmResponse("""
                        [
                          {"title":"Top source IPs","question":"Show the top 5 source IPs for failed_login events in the last 24 hours"},
                          {"title":"Affected users","question":"Group failed_login events by user in the last 24 hours"},
                          {"title":"Failed login trend","question":"Show failed_login trend by hour in the last 24 hours"}
                        ]
                        """, "gemini-test", 18));
        var service = service(llmClient);

        var response = service.suggest(request("Show failed login attempts from China in the last 24h"));

        assertThat(response.source()).isEqualTo("llm");
        assertThat(response.suggestions()).hasSize(3);
        assertThat(response.suggestions().get(0).title()).isEqualTo("Top source IPs");
        verify(llmClient).generateFollowUpSuggestions(any(LlmFollowUpSuggestionsRequest.class));
    }

    @Test
    void invalidJsonReturnsEmptySuggestions() {
        var llmClient = mock(LlmClient.class);
        when(llmClient.generateFollowUpSuggestions(any(LlmFollowUpSuggestionsRequest.class)))
                .thenReturn(new LlmResponse("not json", "gemini-test", 18));
        var service = service(llmClient);

        var response = service.suggest(request("Show failed login attempts from China in the last 24h"));

        assertThat(response.source()).isEqualTo("none");
        assertThat(response.suggestions()).isEmpty();
    }

    @Test
    void parsesJsonCodeFenceSuggestions() {
        var llmClient = mock(LlmClient.class);
        when(llmClient.generateFollowUpSuggestions(any(LlmFollowUpSuggestionsRequest.class)))
                .thenReturn(new LlmResponse("""
                        ```json
                        [
                          {"title":"Top source IPs","question":"Show the top 5 source IPs for failed_login events in the last 24 hours"},
                          {"title":"Affected users","question":"Group failed_login events by user in the last 24 hours"},
                          {"title":"Failed login trend","question":"Show failed_login trend by hour in the last 24 hours"}
                        ]
                        ```
                        """, "claude-test", 18));
        var service = service(llmClient);

        var response = service.suggest(request("Show failed login attempts from China in the last 24h"));

        assertThat(response.source()).isEqualTo("llm");
        assertThat(response.suggestions()).hasSize(3);
    }

    @Test
    void proseWithoutJsonReturnsEmptySuggestions() {
        var llmClient = mock(LlmClient.class);
        when(llmClient.generateFollowUpSuggestions(any(LlmFollowUpSuggestionsRequest.class)))
                .thenReturn(new LlmResponse("Here are three follow-up ideas.", "claude-test", 18));
        var service = service(llmClient);

        var response = service.suggest(request("Show failed login attempts from China in the last 24h"));

        assertThat(response.source()).isEqualTo("none");
        assertThat(response.suggestions()).isEmpty();
    }

    @Test
    void proseWrappedJsonSuggestionsAreAccepted() {
        var llmClient = mock(LlmClient.class);
        when(llmClient.generateFollowUpSuggestions(any(LlmFollowUpSuggestionsRequest.class)))
                .thenReturn(new LlmResponse("""
                        Here is the JSON array:
                        [
                          {"title":"Top source IPs","question":"Show the top 5 source IPs for failed_login events in the last 24 hours"},
                          {"title":"Affected users","question":"Group failed_login events by user in the last 24 hours"},
                          {"title":"Failed login trend","question":"Show failed_login trend by hour in the last 24 hours"}
                        ]
                        """, "claude-test", 18));
        var service = service(llmClient);

        var response = service.suggest(request("Show failed login attempts from China in the last 24h"));

        assertThat(response.source()).isEqualTo("llm");
        assertThat(response.suggestions()).hasSize(3);
    }

    @Test
    void unsafeSuggestionReturnsEmptySuggestions() {
        var llmClient = mock(LlmClient.class);
        when(llmClient.generateFollowUpSuggestions(any(LlmFollowUpSuggestionsRequest.class)))
                .thenReturn(new LlmResponse("""
                        [
                          {"title":"Delete data","question":"Delete index soc-events-v1"},
                          {"title":"Affected users","question":"Group failed_login events by user in the last 24 hours"},
                          {"title":"Failed login trend","question":"Show failed_login trend by hour in the last 24 hours"}
                        ]
                        """, "gemini-test", 18));
        var service = service(llmClient);

        var response = service.suggest(request("Show failed login attempts from China in the last 24h"));

        assertThat(response.source()).isEqualTo("none");
        assertThat(response.suggestions()).isEmpty();
    }

    @Test
    void llmFailureReturnsEmptySuggestions() {
        var llmClient = mock(LlmClient.class);
        when(llmClient.generateFollowUpSuggestions(any(LlmFollowUpSuggestionsRequest.class)))
                .thenThrow(new IllegalStateException("quota exceeded"));
        var service = service(llmClient);

        var response = service.suggest(request("Show failed login attempts from China in the last 24h"));

        assertThat(response.source()).isEqualTo("none");
        assertThat(response.suggestions()).isEmpty();
    }

    @Test
    void vietnameseQuestionIsPassedToPromptBuilder() {
        var llmClient = mock(LlmClient.class);
        when(llmClient.generateFollowUpSuggestions(any(LlmFollowUpSuggestionsRequest.class)))
                .thenReturn(new LlmResponse("""
                        [
                          {"title":"Top IP failed_login","question":"Thống kê top 5 IP có nhiều failed_login nhất trong 24h qua"},
                          {"title":"User bị ảnh hưởng","question":"Group failed_login theo user trong 24h qua"},
                          {"title":"Xu hướng theo giờ","question":"Hiển thị failed_login theo giờ trong 24h qua"}
                        ]
                        """, "gemini-test", 18));
        var service = service(llmClient);

        var response = service.suggest(request("Tìm failed_login từ CN trong 24h qua"));

        assertThat(response.source()).isEqualTo("llm");
        assertThat(response.suggestions()).extracting(FollowUpSuggestion::question)
                .allMatch(question -> question.contains("failed_login"));
    }

    private FollowUpSuggestionService service(LlmClient llmClient) {
        var mapper = new ObjectMapper();
        return new FollowUpSuggestionService(
                new FollowUpSuggestionPromptBuilder(mapper),
                new FollowUpSuggestionParser(mapper),
                llmClient);
    }

    private FollowUpSuggestionRequest request(String question) {
        return new FollowUpSuggestionRequest(
                question,
                new SearchPlan(
                        SearchMode.SEARCH,
                        new SearchFilters(
                                new TimeRange("now-24h", "now"),
                                null,
                                List.of("failed_login"),
                                null,
                                null,
                                null,
                                List.of("CN")),
                        0,
                        10),
                188,
                SearchMode.SEARCH,
                List.of(new FollowUpSuggestionRequest.SampleEvent(
                        "failed_login",
                        "high",
                        "admin",
                        "vpn-gw-01",
                        "203.0.113.45",
                        "CN")),
                List.of());
    }
}
