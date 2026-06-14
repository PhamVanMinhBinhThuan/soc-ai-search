package com.soc.ai.search.llm.gemini;

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

class GeminiLlmClientTest {

    private static final String BASE_URL = "https://gemini.test/v1beta";
    private static final String API_KEY = "test-api-key";
    private static final String MODEL = "gemini-test";

    @Test
    void parsesFirstCandidateTextIntoLlmResponse() {
        var fixture = fixture(properties());
        fixture.server.expect(once(), requestTo(containsString("/models/" + MODEL + ":generateContent")))
                .andExpect(header(HttpHeaders.USER_AGENT, GeminiLlmClient.USER_AGENT))
                .andExpect(header(GeminiLlmClient.API_KEY_HEADER, API_KEY))
                .andExpect(content().string(containsString("system prompt")))
                .andExpect(content().string(containsString("user question")))
                .andExpect(content().string(not(containsString(API_KEY))))
                .andRespond(withSuccess(geminiResponse("{\\\"mode\\\":\\\"search\\\"}"), MediaType.APPLICATION_JSON));

        var response = fixture.client.generateSearchPlan(request());

        assertThat(response.content()).isEqualTo("{\"mode\":\"search\"}");
        assertThat(response.model()).isEqualTo("gemini-test-response");
        assertThat(response.latencyMs()).isGreaterThanOrEqualTo(0);
        assertThat(response.content()).doesNotContain(API_KEY);
        fixture.server.verify();
    }

    @Test
    void retriesHttp5xxUpToConfiguredLimit() {
        var fixture = fixture(properties());
        fixture.server.expect(times(2), requestTo(containsString(":generateContent")))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"message\":\"temporary\"}}"));

        assertThatThrownBy(() -> fixture.client.generateSearchPlan(request()))
                .isInstanceOf(GeminiLlmException.class)
                .hasMessage("Gemini provider is unavailable")
                .hasMessageNotContaining(API_KEY);

        fixture.server.verify();
    }

    @Test
    void doesNotRetryHttp4xxForever() {
        var fixture = fixture(properties());
        fixture.server.expect(once(), requestTo(containsString(":generateContent")))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"message\":\"bad request\"}}"));

        assertThatThrownBy(() -> fixture.client.generateSearchPlan(request()))
                .isInstanceOf(GeminiLlmException.class)
                .hasMessage("Gemini request was rejected by provider")
                .hasMessageNotContaining(API_KEY);

        fixture.server.verify();
    }

    @Test
    void mapsHttp429ToRateLimitExceptionWithoutRetrying() {
        var fixture = fixture(properties());
        fixture.server.expect(once(), requestTo(containsString(":generateContent")))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"message\":\"quota exceeded\"}}"));

        assertThatThrownBy(() -> fixture.client.generateSearchPlan(request()))
                .isInstanceOf(GeminiRateLimitException.class)
                .hasMessage("Gemini rate limit exceeded")
                .hasMessageNotContaining(API_KEY);

        fixture.server.verify();
    }

    @Test
    void rejectsResponseWithoutCandidateText() {
        var fixture = fixture(properties());
        fixture.server.expect(once(), requestTo(containsString(":generateContent")))
                .andRespond(withSuccess("{\"candidates\":[]}", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> fixture.client.generateSearchPlan(request()))
                .isInstanceOf(GeminiLlmException.class)
                .hasMessage("Gemini response does not contain text output");

        fixture.server.verify();
    }

    @Test
    void parsesJsonResponseEvenWhenProviderUsesOctetStreamContentType() {
        var fixture = fixture(properties());
        fixture.server.expect(once(), requestTo(containsString(":generateContent")))
                .andRespond(withSuccess(
                        geminiResponse("{\\\"mode\\\":\\\"search\\\"}"),
                        MediaType.APPLICATION_OCTET_STREAM));

        var response = fixture.client.generateSearchPlan(request());

        assertThat(response.content()).isEqualTo("{\"mode\":\"search\"}");
        fixture.server.verify();
    }

    @Test
    void generatesPlainTextSummaryWithOneProviderCall() {
        var fixture = fixture(properties());
        fixture.server.expect(once(), requestTo(containsString(":generateContent")))
                .andExpect(content().string(containsString("bounded payload")))
                .andExpect(content().string(not(containsString("responseMimeType"))))
                .andRespond(withSuccess(
                        geminiResponse("First sentence. Second sentence. Third sentence."),
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
        fixture.server.expect(once(), requestTo(containsString(":generateContent")))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"message\":\"temporary\"}}"));

        assertThatThrownBy(() -> fixture.client.generateSummary(new LlmSummaryRequest(
                "summary prompt",
                "bounded payload")))
                .isInstanceOf(GeminiLlmException.class);

        fixture.server.verify();
    }

    @Test
    void failsClearlyWhenRequiredConfigIsMissing() {
        var fixture = fixture(new LlmProperties(
                LlmProvider.GEMINI,
                "",
                "",
                "",
                10_000,
                5_000,
                2));

        assertThatThrownBy(() -> fixture.client.generateSearchPlan(request()))
                .isInstanceOf(GeminiLlmException.class)
                .hasMessage("Gemini base URL is not configured")
                .hasMessageNotContaining(API_KEY);
    }

    private TestFixture fixture(LlmProperties properties) {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var restClient = builder.build();
        var client = new GeminiLlmClient(restClient, restClient, properties);

        return new TestFixture(client, server);
    }

    private LlmProperties properties() {
        return new LlmProperties(
                LlmProvider.GEMINI,
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

    private String geminiResponse(String escapedText) {
        return """
                {
                  "modelVersion": "gemini-test-response",
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          { "text": "%s" }
                        ]
                      }
                    }
                  ]
                }
                """.formatted(escapedText);
    }

    private record TestFixture(GeminiLlmClient client, MockRestServiceServer server) {
    }
}
