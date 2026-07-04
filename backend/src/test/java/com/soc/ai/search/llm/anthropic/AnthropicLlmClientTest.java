package com.soc.ai.search.llm.anthropic;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.ExpectedCount.times;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.soc.ai.search.llm.LlmProperties;
import com.soc.ai.search.llm.LlmProvider;
import com.soc.ai.search.llm.LlmSearchPlanRequest;
import com.soc.ai.search.llm.LlmSummaryRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class AnthropicLlmClientTest {

    private static final String BASE_URL = "https://api.anthropic.test";
    private static final String API_KEY = "test-anthropic-key";
    private static final String MODEL = "claude-test";

    @Test
    void parsesTextContentIntoLlmResponse() {
        var fixture = fixture(properties());
        fixture.server.expect(once(), requestTo(BASE_URL + "/v1/messages"))
                .andExpect(header(HttpHeaders.USER_AGENT, AnthropicLlmClient.USER_AGENT))
                .andExpect(header(AnthropicLlmClient.API_KEY_HEADER, API_KEY))
                .andExpect(header(AnthropicLlmClient.VERSION_HEADER, AnthropicLlmClient.API_VERSION))
                .andExpect(content().string(containsString("system prompt")))
                .andExpect(content().string(containsString("user question")))
                .andExpect(content().string(containsString("\"model\":\"" + MODEL + "\"")))
                .andExpect(content().string(not(containsString(API_KEY))))
                .andRespond(withSuccess(anthropicResponse("{\\\"mode\\\":\\\"search\\\"}"), MediaType.APPLICATION_JSON));

        var response = fixture.client.generateSearchPlan(request());

        assertThat(response.content()).isEqualTo("{\"mode\":\"search\"}");
        assertThat(response.model()).isEqualTo("claude-test-response");
        assertThat(response.latencyMs()).isGreaterThanOrEqualTo(0);
        assertThat(response.content()).doesNotContain(API_KEY);
        fixture.server.verify();
    }

    @Test
    void retriesHttp5xxUpToConfiguredLimit() {
        var fixture = fixture(properties());
        fixture.server.expect(times(2), requestTo(BASE_URL + "/v1/messages"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"message\":\"temporary\"}}"));

        assertThatThrownBy(() -> fixture.client.generateSearchPlan(request()))
                .isInstanceOf(AnthropicLlmException.class)
                .hasMessage("Anthropic provider is unavailable")
                .hasMessageNotContaining(API_KEY);

        fixture.server.verify();
    }

    @Test
    void mapsHttp429ToRateLimitException() {
        var fixture = fixture(properties());
        fixture.server.expect(once(), requestTo(BASE_URL + "/v1/messages"))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"message\":\"rate limited\"}}"));

        assertThatThrownBy(() -> fixture.client.generateSearchPlan(request()))
                .isInstanceOf(AnthropicRateLimitException.class)
                .hasMessage("Anthropic rate limit exceeded")
                .hasMessageNotContaining(API_KEY);

        fixture.server.verify();
    }

    @Test
    void rejectsResponseWithoutTextContent() {
        var fixture = fixture(properties());
        fixture.server.expect(once(), requestTo(BASE_URL + "/v1/messages"))
                .andRespond(withSuccess("{\"model\":\"claude-test-response\",\"content\":[]}", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> fixture.client.generateSearchPlan(request()))
                .isInstanceOf(AnthropicLlmException.class)
                .hasMessage("Anthropic response does not contain text output");

        fixture.server.verify();
    }

    @Test
    void generatesPlainTextSummaryWithOneProviderCall() {
        var fixture = fixture(properties());
        fixture.server.expect(once(), requestTo(BASE_URL + "/v1/messages"))
                .andExpect(content().string(containsString("bounded payload")))
                .andRespond(withSuccess(
                        anthropicResponse("First sentence. Second sentence. Third sentence."),
                        MediaType.APPLICATION_JSON));

        var response = fixture.client.generateSummary(new LlmSummaryRequest(
                "summary system prompt",
                "bounded payload"));

        assertThat(response.content()).isEqualTo("First sentence. Second sentence. Third sentence.");
        assertThat(response.latencyMs()).isGreaterThanOrEqualTo(0);
        fixture.server.verify();
    }

    @Test
    void summaryHttpFailureIsNotRetried() {
        var fixture = fixture(properties());
        fixture.server.expect(once(), requestTo(BASE_URL + "/v1/messages"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"message\":\"temporary\"}}"));

        assertThatThrownBy(() -> fixture.client.generateSummary(new LlmSummaryRequest(
                "summary prompt",
                "bounded payload")))
                .isInstanceOf(AnthropicLlmException.class);

        fixture.server.verify();
    }

    @Test
    void failsClearlyWhenRequiredConfigIsMissing() {
        var fixture = fixture(new LlmProperties(
                LlmProvider.ANTHROPIC,
                "",
                "",
                "",
                10_000,
                5_000,
                2));

        assertThatThrownBy(() -> fixture.client.generateSearchPlan(request()))
                .isInstanceOf(AnthropicLlmException.class)
                .hasMessage("Anthropic base URL is not configured")
                .hasMessageNotContaining(API_KEY);
    }

    private TestFixture fixture(LlmProperties properties) {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var restClient = builder.build();
        var client = new AnthropicLlmClient(restClient, restClient, properties);

        return new TestFixture(client, server);
    }

    private LlmProperties properties() {
        return new LlmProperties(
                LlmProvider.ANTHROPIC,
                BASE_URL,
                API_KEY,
                MODEL,
                10_000,
                5_000,
                2);
    }

    private LlmSearchPlanRequest request() {
        return new LlmSearchPlanRequest("system prompt", "user question");
    }

    private String anthropicResponse(String escapedText) {
        return """
                {
                  "id": "msg_test",
                  "type": "message",
                  "role": "assistant",
                  "model": "claude-test-response",
                  "content": [
                    {
                      "type": "text",
                      "text": "%s"
                    }
                  ]
                }
                """.formatted(escapedText);
    }

    private record TestFixture(AnthropicLlmClient client, MockRestServiceServer server) {
    }
}
