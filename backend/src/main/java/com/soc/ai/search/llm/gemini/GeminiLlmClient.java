package com.soc.ai.search.llm.gemini;

import java.net.URI;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.llm.LlmClient;
import com.soc.ai.search.llm.LlmFollowUpSuggestionsRequest;
import com.soc.ai.search.llm.LlmHttpSupport;
import com.soc.ai.search.llm.LlmProperties;
import com.soc.ai.search.llm.LlmQuestionRefinementRequest;
import com.soc.ai.search.llm.LlmResponse;
import com.soc.ai.search.llm.LlmSearchPlanRequest;
import com.soc.ai.search.llm.LlmSummaryRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

public class GeminiLlmClient implements LlmClient {

    static final String USER_AGENT = "soc-ai-search-mvp";
    static final String API_KEY_HEADER = "x-goog-api-key";

    private static final Logger LOGGER = LoggerFactory.getLogger(GeminiLlmClient.class);
    private static final ObjectMapper RESPONSE_MAPPER = new ObjectMapper();

    private final RestClient searchPlanRestClient;
    private final RestClient summaryRestClient;
    private final LlmProperties properties;

    public GeminiLlmClient(
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
                var responseJson = callGemini(
                        searchPlanRestClient,
                        request.systemPrompt(),
                        request.userQuestion(),
                        true);
                var content = extractText(responseJson);
                var model = extractModel(responseJson);
                return new LlmResponse(content, model, LlmHttpSupport.elapsedMs(startedAt));
            } catch (RestClientResponseException exception) {
                LOGGER.warn(
                        "Gemini request attempt {}/{} returned HTTP {}: {}",
                        attempt,
                        maxAttempts,
                        exception.getStatusCode().value(),
                        LlmHttpSupport.providerErrorMessage(exception, RESPONSE_MAPPER));
                if (!LlmHttpSupport.shouldRetry(exception) || attempt == maxAttempts) {
                    throw mapResponseException(exception);
                }
            } catch (ResourceAccessException exception) {
                LOGGER.warn(
                        "Gemini request attempt {}/{} timed out or could not connect: {}",
                        attempt,
                        maxAttempts,
                        exception.getMessage());
                if (attempt == maxAttempts) {
                    throw new GeminiLlmException("Gemini provider is unavailable", exception);
                }
            } catch (RestClientException exception) {
                LOGGER.warn(
                        "Gemini request attempt {}/{} failed: {}",
                        attempt,
                        maxAttempts,
                        exception.getMessage());
                if (attempt == maxAttempts) {
                    throw new GeminiLlmException("Gemini request failed", exception);
                }
            }
        }

        throw new GeminiLlmException("Gemini provider is unavailable");
    }

    @Override
    public LlmResponse generateSummary(LlmSummaryRequest request) {
        validateConfiguration();
        var startedAt = System.nanoTime();

        try {
            var responseJson = callGemini(
                    summaryRestClient,
                    request.systemPrompt(),
                    request.userContent(),
                    false);
            return new LlmResponse(
                    extractText(responseJson),
                    extractModel(responseJson),
                    LlmHttpSupport.elapsedMs(startedAt));
        } catch (RestClientResponseException exception) {
            throw mapResponseException(exception);
        } catch (ResourceAccessException exception) {
            throw new GeminiLlmException("Gemini summary request timed out or is unavailable", exception);
        } catch (RestClientException exception) {
            throw new GeminiLlmException("Gemini summary request failed", exception);
        }
    }

    @Override
    public LlmResponse generateRefinedQuestion(LlmQuestionRefinementRequest request) {
        validateConfiguration();
        var startedAt = System.nanoTime();

        try {
            var responseJson = callGemini(
                    summaryRestClient,
                    request.systemPrompt(),
                    request.userContent(),
                    false);
            return new LlmResponse(
                    extractText(responseJson),
                    extractModel(responseJson),
                    LlmHttpSupport.elapsedMs(startedAt));
        } catch (RestClientResponseException exception) {
            throw mapResponseException(exception);
        } catch (ResourceAccessException exception) {
            throw new GeminiLlmException("Gemini query refinement request timed out or is unavailable", exception);
        } catch (RestClientException exception) {
            throw new GeminiLlmException("Gemini query refinement request failed", exception);
        }
    }

    @Override
    public LlmResponse generateFollowUpSuggestions(LlmFollowUpSuggestionsRequest request) {
        validateConfiguration();
        var startedAt = System.nanoTime();

        try {
            var responseJson = callGemini(
                    summaryRestClient,
                    request.systemPrompt(),
                    request.userContent(),
                    true);
            return new LlmResponse(
                    extractText(responseJson),
                    extractModel(responseJson),
                    LlmHttpSupport.elapsedMs(startedAt));
        } catch (RestClientResponseException exception) {
            throw mapResponseException(exception);
        } catch (ResourceAccessException exception) {
            throw new GeminiLlmException("Gemini follow-up suggestion request timed out or is unavailable", exception);
        } catch (RestClientException exception) {
            throw new GeminiLlmException("Gemini follow-up suggestion request failed", exception);
        }
    }

    private JsonNode callGemini(
            RestClient restClient,
            String systemPrompt,
            String userContent,
            boolean jsonOutput) {
        var responseBytes = restClient.post()
                .uri(generateContentUri())
                .header(HttpHeaders.USER_AGENT, USER_AGENT)
                .header(API_KEY_HEADER, properties.apiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .body(buildRequestBody(systemPrompt, userContent, jsonOutput))
                .retrieve()
                .body(byte[].class);

        return LlmHttpSupport.parseJsonResponse(
                responseBytes,
                RESPONSE_MAPPER,
                () -> new GeminiLlmException("Gemini response is empty"),
                exception -> new GeminiLlmException("Gemini response is not valid JSON", exception));
    }

    private Map<String, Object> buildRequestBody(
            String systemPrompt,
            String userContent,
            boolean jsonOutput) {
        var generationConfig = new java.util.LinkedHashMap<String, Object>();
        generationConfig.put("temperature", 0.1);
        if (jsonOutput) {
            generationConfig.put("responseMimeType", MediaType.APPLICATION_JSON_VALUE);
        }

        return Map.of(
                "systemInstruction", Map.of(
                        "parts", List.of(Map.of("text", systemPrompt))),
                "contents", List.of(Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", userContent)))),
                "generationConfig", generationConfig);
    }

    private URI generateContentUri() {
        return UriComponentsBuilder.fromUriString(LlmHttpSupport.trimTrailingSlash(properties.baseUrl()))
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

    private RuntimeException mapResponseException(RestClientResponseException exception) {
        if (exception.getStatusCode().value() == 429) {
            return new GeminiRateLimitException("Gemini rate limit exceeded", exception);
        }

        if (exception.getStatusCode().is4xxClientError()) {
            return new GeminiLlmException("Gemini request was rejected by provider", exception);
        }

        if (exception.getStatusCode().is5xxServerError()) {
            return new GeminiLlmException("Gemini provider is unavailable", exception);
        }

        return new GeminiLlmException("Gemini request failed", exception);
    }

    private void validateConfiguration() {
        LlmHttpSupport.requireText(
                properties.baseUrl(),
                () -> new GeminiLlmException("Gemini base URL is not configured"));
        LlmHttpSupport.requireText(
                properties.apiKey(),
                () -> new GeminiLlmException("Gemini API key is not configured"));
        LlmHttpSupport.requireText(
                properties.model(),
                () -> new GeminiLlmException("Gemini model is not configured"));
    }
}
