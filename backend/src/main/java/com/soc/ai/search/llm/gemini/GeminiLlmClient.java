package com.soc.ai.search.llm.gemini;

import java.net.URI;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.soc.ai.search.llm.LlmClient;
import com.soc.ai.search.llm.LlmProperties;
import com.soc.ai.search.llm.LlmResponse;
import com.soc.ai.search.llm.LlmSearchPlanRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

public class GeminiLlmClient implements LlmClient {

    static final String USER_AGENT = "soc-ai-search-mvp";
    static final String API_KEY_HEADER = "x-goog-api-key";

    private final RestClient restClient;
    private final LlmProperties properties;

    public GeminiLlmClient(RestClient restClient, LlmProperties properties) {
        this.restClient = restClient;
        this.properties = properties;
    }

    @Override
    public LlmResponse generateSearchPlan(LlmSearchPlanRequest request) {
        validateConfiguration();

        var startedAt = System.nanoTime();
        var maxAttempts = Math.max(properties.maxAttempts(), 1);

        for (var attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                var responseJson = callGemini(request);
                var content = extractText(responseJson);
                var model = extractModel(responseJson);
                return new LlmResponse(content, model, elapsedMs(startedAt));
            } catch (RestClientResponseException exception) {
                if (!shouldRetry(exception) || attempt == maxAttempts) {
                    throw mapResponseException(exception);
                }
            } catch (ResourceAccessException exception) {
                if (attempt == maxAttempts) {
                    throw new GeminiLlmException("Gemini provider is unavailable", exception);
                }
            } catch (RestClientException exception) {
                if (attempt == maxAttempts) {
                    throw new GeminiLlmException("Gemini request failed", exception);
                }
            }
        }

        throw new GeminiLlmException("Gemini provider is unavailable");
    }

    private JsonNode callGemini(LlmSearchPlanRequest request) {
        return restClient.post()
                .uri(generateContentUri())
                .header(HttpHeaders.USER_AGENT, USER_AGENT)
                .header(API_KEY_HEADER, properties.apiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .body(buildRequestBody(request))
                .retrieve()
                .body(JsonNode.class);
    }

    private Map<String, Object> buildRequestBody(LlmSearchPlanRequest request) {
        return Map.of(
                "systemInstruction", Map.of(
                        "parts", List.of(Map.of("text", request.systemPrompt()))),
                "contents", List.of(Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", request.userQuestion())))));
    }

    private URI generateContentUri() {
        return UriComponentsBuilder.fromUriString(trimTrailingSlash(properties.baseUrl()))
                .path("/models/{model}:generateContent")
                .build(properties.model());
    }

    private String extractText(JsonNode responseJson) {
        if (responseJson == null) {
            throw new GeminiLlmException("Gemini response is empty");
        }

        var textNode = responseJson.path("candidates")
                .path(0)
                .path("content")
                .path("parts")
                .path(0)
                .path("text");

        if (!textNode.isTextual() || textNode.asText().isBlank()) {
            throw new GeminiLlmException("Gemini response does not contain text output");
        }

        return textNode.asText();
    }

    private String extractModel(JsonNode responseJson) {
        var responseModel = responseJson.path("modelVersion");
        if (responseModel.isTextual() && !responseModel.asText().isBlank()) {
            return responseModel.asText();
        }

        return properties.model().trim();
    }

    private boolean shouldRetry(RestClientResponseException exception) {
        return exception.getStatusCode().is5xxServerError();
    }

    private GeminiLlmException mapResponseException(RestClientResponseException exception) {
        if (exception.getStatusCode().is4xxClientError()) {
            return new GeminiLlmException("Gemini request was rejected by provider", exception);
        }

        if (exception.getStatusCode().is5xxServerError()) {
            return new GeminiLlmException("Gemini provider is unavailable", exception);
        }

        return new GeminiLlmException("Gemini request failed", exception);
    }

    private void validateConfiguration() {
        if (!hasText(properties.baseUrl())) {
            throw new GeminiLlmException("Gemini base URL is not configured");
        }
        if (!hasText(properties.apiKey())) {
            throw new GeminiLlmException("Gemini API key is not configured");
        }
        if (!hasText(properties.model())) {
            throw new GeminiLlmException("Gemini model is not configured");
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
