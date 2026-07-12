package com.soc.ai.search.audit.application;


import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

@Component
public class AuditErrorSanitizer {

    static final int MAX_LENGTH = 2_000;

    private static final Pattern SENSITIVE_QUERY_PARAMETER = Pattern.compile(
            "(?i)(api[_-]?key|password|token|secret|key)=([^&\\s]+)");
    private static final Pattern BEARER_TOKEN = Pattern.compile("(?i)Bearer\\s+[^\\s,;]+");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    public String sanitize(RuntimeException exception) {
        var message = exception.getMessage();
        if (message == null || message.isBlank()) {
            message = "Search request failed";
        }

        var sanitized = SENSITIVE_QUERY_PARAMETER.matcher(message).replaceAll("$1=[REDACTED]");
        sanitized = BEARER_TOKEN.matcher(sanitized).replaceAll("Bearer [REDACTED]");
        sanitized = WHITESPACE.matcher(sanitized).replaceAll(" ").trim();

        if (sanitized.length() <= MAX_LENGTH) {
            return sanitized;
        }

        return sanitized.substring(0, MAX_LENGTH);
    }
}
