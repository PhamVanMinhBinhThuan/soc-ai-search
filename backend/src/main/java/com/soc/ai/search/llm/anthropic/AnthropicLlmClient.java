package com.soc.ai.search.llm.anthropic;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.llm.LlmClient;
import com.soc.ai.search.llm.LlmFollowUpSuggestionsRequest;
import com.soc.ai.search.llm.LlmProperties;
import com.soc.ai.search.llm.LlmQuestionRefinementRequest;
import com.soc.ai.search.llm.LlmResponse;
import com.soc.ai.search.llm.LlmSearchPlanRequest;
import com.soc.ai.search.llm.LlmSummaryRequest;
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
        var maxAttempts = Math.max(properties.maxAttempts(), 1);

        for (var attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                var responseJson = callAnthropic(
                        searchPlanRestClient,
                        request.systemPrompt(),
                        request.userQuestion());
                return new LlmResponse(
                        extractText(responseJson),
                        extractModel(responseJson),
                        elapsedMs(startedAt));
            } catch (RestClientResponseException exception) {
                LOGGER.warn(
                        "Anthropic request attempt {}/{} returned HTTP {}: {}",
                        attempt,
                        maxAttempts,
                        exception.getStatusCode().value(),
                        providerErrorMessage(exception));
                if (!shouldRetry(exception) || attempt == maxAttempts) {
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
                    elapsedMs(startedAt));
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
                    elapsedMs(startedAt));
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
                    elapsedMs(startedAt));
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

        if (responseBytes == null || responseBytes.length == 0) {
            throw new AnthropicLlmException("Anthropic response is empty");
        }

        try {
            var responseBody = new String(responseBytes, StandardCharsets.UTF_8);
            return RESPONSE_MAPPER.readTree(responseBody);
        } catch (IOException exception) {
            throw new AnthropicLlmException("Anthropic response is not valid JSON", exception);
        }
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
        return UriComponentsBuilder.fromUriString(trimTrailingSlash(properties.baseUrl()))
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

    private boolean shouldRetry(RestClientResponseException exception) {
        return exception.getStatusCode().is5xxServerError();
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

    private String providerErrorMessage(RestClientResponseException exception) {
        try {
            var responseBody = exception.getResponseBodyAsString();
            if (responseBody == null || responseBody.isBlank()) {
                return exception.getStatusText();
            }

            var responseJson = RESPONSE_MAPPER.readTree(responseBody);
            var message = responseJson.path("error").path("message");
            return message.isTextual() && !message.asText().isBlank()
                    ? message.asText()
                    : exception.getStatusText();
        } catch (Exception ignored) {
            return exception.getStatusText();
        }
    }

    private void validateConfiguration() {
        if (!hasText(properties.baseUrl())) {
            throw new AnthropicLlmException("Anthropic base URL is not configured");
        }
        if (!hasText(properties.apiKey())) {
            throw new AnthropicLlmException("Anthropic API key is not configured");
        }
        if (!hasText(properties.model())) {
            throw new AnthropicLlmException("Anthropic model is not configured");
        }
    }

    private String trimTrailingSlash(String value) {
        var trimmed = value.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private long elapsedMs(long startedAt) {
        return Duration.ofNanos(System.nanoTime() - startedAt).toMillis();
    }
}
