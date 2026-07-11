package com.soc.ai.search.llm;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.function.Function;
import java.util.function.Supplier;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.client.RestClientResponseException;

public final class LlmHttpSupport {

    private LlmHttpSupport() {
    }

    public static int maxAttempts(LlmProperties properties) {
        return Math.max(properties.maxAttempts(), 1);
    }

    public static boolean shouldRetry(RestClientResponseException exception) {
        return exception.getStatusCode().is5xxServerError();
    }

    public static long elapsedMs(long startedAt) {
        return Duration.ofNanos(System.nanoTime() - startedAt).toMillis();
    }

    public static String trimTrailingSlash(String value) {
        var trimmed = value.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    public static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    public static void requireText(String value, Supplier<? extends RuntimeException> exceptionSupplier) {
        if (!hasText(value)) {
            throw exceptionSupplier.get();
        }
    }

    public static JsonNode parseJsonResponse(
            byte[] responseBytes,
            ObjectMapper mapper,
            Supplier<? extends RuntimeException> emptyResponseException,
            Function<IOException, ? extends RuntimeException> invalidJsonException) {
        if (responseBytes == null || responseBytes.length == 0) {
            throw emptyResponseException.get();
        }

        try {
            var responseBody = new String(responseBytes, StandardCharsets.UTF_8);
            return mapper.readTree(responseBody);
        } catch (IOException exception) {
            throw invalidJsonException.apply(exception);
        }
    }

    public static String providerErrorMessage(RestClientResponseException exception, ObjectMapper mapper) {
        try {
            var responseBody = exception.getResponseBodyAsString();
            if (responseBody == null || responseBody.isBlank()) {
                return exception.getStatusText();
            }

            var responseJson = mapper.readTree(responseBody);
            var message = responseJson.path("error").path("message");
            return message.isTextual() && !message.asText().isBlank()
                    ? message.asText()
                    : exception.getStatusText();
        } catch (Exception ignored) {
            return exception.getStatusText();
        }
    }
}
