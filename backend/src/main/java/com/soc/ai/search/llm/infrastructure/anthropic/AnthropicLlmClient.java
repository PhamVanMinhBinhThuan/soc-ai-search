package com.soc.ai.search.llm.infrastructure.anthropic;

import java.net.URI;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.llm.application.LlmClient;
import com.soc.ai.search.llm.application.LlmFollowUpSuggestionsRequest;
import com.soc.ai.search.llm.infrastructure.LlmHttpSupport;
import com.soc.ai.search.config.llm.LlmProperties;
import com.soc.ai.search.llm.application.LlmQuestionRefinementRequest;
import com.soc.ai.search.llm.application.LlmResponse;
import com.soc.ai.search.llm.application.LlmSearchPlanRequest;
import com.soc.ai.search.llm.application.LlmSummaryRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

public class AnthropicLlmClient implements LlmClient {

    static final String USER_AGENT = "soc-ai-search-mvp";
    static final String API_KEY_HEADER = "x-api-key";
    static final String VERSION_HEADER = "anthropic-version";
    static final String API_VERSION = "2023-06-01";

    private static final Logger LOGGER = LoggerFactory.getLogger(AnthropicLlmClient.class);
    private static final ObjectMapper RESPONSE_MAPPER = new ObjectMapper();
    private static final int MAX_TOKENS = 2048;

    private final RestClient searchPlanRestClient;
    private final RestClient summaryRestClient;
    private final LlmProperties properties;

    public AnthropicLlmClient(
            RestClient searchPlanRestClient,
            RestClient summaryRestClient,
            LlmProperties properties) {
        this.searchPlanRestClient = searchPlanRestClient;
        this.summaryRestClient = summaryRestClient;
        this.properties = properties;
    }

    @Override
    public LlmResponse generateSearchPlan(LlmSearchPlanRequest request) {
        validateConfiguration();

        var startedAt = System.nanoTime();
        var maxAttempts = LlmHttpSupport.maxAttempts(properties);

        for (var attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                var responseJson = callAnthropic(
                        searchPlanRestClient,
                        request.systemPrompt(),
                        request.userQuestion());
                return new LlmResponse(
                        extractText(responseJson),
                        extractModel(responseJson),
                        LlmHttpSupport.elapsedMs(startedAt));
            } catch (RestClientResponseException exception) {
                LOGGER.warn(
                        "Anthropic request attempt {}/{} returned HTTP {}: {}",
                        attempt,
                        maxAttempts,
                        exception.getStatusCode().value(),
                        LlmHttpSupport.providerErrorMessage(exception, RESPONSE_MAPPER));
                if (!LlmHttpSupport.shouldRetry(exception) || attempt == maxAttempts) {
                    throw mapResponseException(exception);
                }
            } catch (ResourceAccessException exception) {
                LOGGER.warn(
                        "Anthropic request attempt {}/{} timed out or could not connect: {}",
                        attempt,
                        maxAttempts,
                        exception.getMessage());
                if (attempt == maxAttempts) {
                    throw new AnthropicLlmException("Anthropic provider is unavailable", exception);
                }
            } catch (RestClientException exception) {
                LOGGER.warn(
                        "Anthropic request attempt {}/{} failed: {}",
                        attempt,
                        maxAttempts,
                        exception.getMessage());
                if (attempt == maxAttempts) {
                    throw new AnthropicLlmException("Anthropic request failed", exception);
                }
            }
        }

        throw new AnthropicLlmException("Anthropic provider is unavailable");
    }

    @Override
    public LlmResponse generateSummary(LlmSummaryRequest request) {
        validateConfiguration();
        var startedAt = System.nanoTime();

        try {
            var responseJson = callAnthropic(
                    summaryRestClient,
                    request.systemPrompt(),
                    request.userContent());
            return new LlmResponse(
                    extractText(responseJson),
                    extractModel(responseJson),
                    LlmHttpSupport.elapsedMs(startedAt));
        } catch (RestClientResponseException exception) {
            throw mapResponseException(exception);
        } catch (ResourceAccessException exception) {
            throw new AnthropicLlmException("Anthropic summary request timed out or is unavailable", exception);
        } catch (RestClientException exception) {
            throw new AnthropicLlmException("Anthropic summary request failed", exception);
        }
    }

    @Override
    public LlmResponse generateRefinedQuestion(LlmQuestionRefinementRequest request) {
        validateConfiguration();
        var startedAt = System.nanoTime();

        try {
            var responseJson = callAnthropic(
                    summaryRestClient,
                    request.systemPrompt(),
                    request.userContent());
            return new LlmResponse(
                    extractText(responseJson),
                    extractModel(responseJson),
                    LlmHttpSupport.elapsedMs(startedAt));
        } catch (RestClientResponseException exception) {
            throw mapResponseException(exception);
        } catch (ResourceAccessException exception) {
            throw new AnthropicLlmException("Anthropic query refinement request timed out or is unavailable", exception);
        } catch (RestClientException exception) {
            throw new AnthropicLlmException("Anthropic query refinement request failed", exception);
        }
    }

    @Override
    public LlmResponse generateFollowUpSuggestions(LlmFollowUpSuggestionsRequest request) {
        validateConfiguration();
        var startedAt = System.nanoTime();

        try {
            var responseJson = callAnthropic(
                    summaryRestClient,
                    request.systemPrompt(),
                    request.userContent());
            return new LlmResponse(
                    extractText(responseJson),
                    extractModel(responseJson),
                    LlmHttpSupport.elapsedMs(startedAt));
        } catch (RestClientResponseException exception) {
            throw mapResponseException(exception);
        } catch (ResourceAccessException exception) {
            throw new AnthropicLlmException("Anthropic follow-up suggestion request timed out or is unavailable", exception);
        } catch (RestClientException exception) {
            throw new AnthropicLlmException("Anthropic follow-up suggestion request failed", exception);
        }
    }

    private JsonNode callAnthropic(
            RestClient restClient,
            String systemPrompt,
            String userContent) {
        var responseBytes = restClient.post()
                .uri(messagesUri())
                .header(HttpHeaders.USER_AGENT, USER_AGENT)
                .header(API_KEY_HEADER, properties.apiKey())
                .header(VERSION_HEADER, API_VERSION)
                .contentType(MediaType.APPLICATION_JSON)
                .body(buildRequestBody(systemPrompt, userContent))
                .retrieve()
                .body(byte[].class);

        return LlmHttpSupport.parseJsonResponse(
                responseBytes,
                RESPONSE_MAPPER,
                () -> new AnthropicLlmException("Anthropic response is empty"),
                exception -> new AnthropicLlmException("Anthropic response is not valid JSON", exception));
    }

    private Map<String, Object> buildRequestBody(String systemPrompt, String userContent) {
        return Map.of(
                "model", properties.model().trim(),
                "max_tokens", MAX_TOKENS,
                "system", systemPrompt,
                "messages", List.of(Map.of(
                        "role", "user",
                        "content", userContent)));
    }

    private URI messagesUri() {
        return UriComponentsBuilder.fromUriString(LlmHttpSupport.trimTrailingSlash(properties.baseUrl()))
                .path("/v1/messages")
                .build()
                .toUri();
    }

    private String extractText(JsonNode responseJson) {
        if (responseJson == null) {
            throw new AnthropicLlmException("Anthropic response is empty");
        }

        var content = responseJson.path("content");
        if (!content.isArray()) {
            throw new AnthropicLlmException("Anthropic response does not contain text output");
        }

        for (var item : content) {
            var textNode = item.path("text");
            if (textNode.isTextual() && !textNode.asText().isBlank()) {
                return textNode.asText();
            }
        }

        throw new AnthropicLlmException("Anthropic response does not contain text output");
    }

    private String extractModel(JsonNode responseJson) {
        var responseModel = responseJson.path("model");
        if (responseModel.isTextual() && !responseModel.asText().isBlank()) {
            return responseModel.asText();
        }

        return properties.model().trim();
    }

    private RuntimeException mapResponseException(RestClientResponseException exception) {
        if (exception.getStatusCode().value() == 429) {
            return new AnthropicRateLimitException("Anthropic rate limit exceeded", exception);
        }

        if (exception.getStatusCode().is4xxClientError()) {
            return new AnthropicLlmException("Anthropic request was rejected by provider", exception);
        }

        if (exception.getStatusCode().is5xxServerError()) {
            return new AnthropicLlmException("Anthropic provider is unavailable", exception);
        }

        return new AnthropicLlmException("Anthropic request failed", exception);
    }

    private void validateConfiguration() {
        LlmHttpSupport.requireText(
                properties.baseUrl(),
                () -> new AnthropicLlmException("Anthropic base URL is not configured"));
        LlmHttpSupport.requireText(
                properties.apiKey(),
                () -> new AnthropicLlmException("Anthropic API key is not configured"));
        LlmHttpSupport.requireText(
                properties.model(),
                () -> new AnthropicLlmException("Anthropic model is not configured"));
    }
}
