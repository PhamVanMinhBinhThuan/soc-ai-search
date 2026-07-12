package com.soc.ai.search.suggestions.application;


import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import com.soc.ai.search.suggestions.domain.FollowUpSuggestion;
@Component
public class FollowUpSuggestionParser {

    private static final TypeReference<List<FollowUpSuggestion>> SUGGESTION_LIST = new TypeReference<>() {
    };
    private static final Pattern UNSAFE = Pattern.compile(
            "\\b(delete|update|drop\\s+index|drop|script|query_string|password\\s+dump|dump\\s+password|_delete_by_query|_update_by_query)\\b",
            Pattern.CASE_INSENSITIVE);

    private final ObjectMapper mapper;

    public FollowUpSuggestionParser(ObjectMapper objectMapper) {
        this.mapper = objectMapper.copy()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, true)
                .configure(DeserializationFeature.FAIL_ON_TRAILING_TOKENS, true);
    }

    public List<FollowUpSuggestion> parse(String content) {
        if (content == null || content.isBlank()) {
            return List.of();
        }

        try {
            var suggestions = mapper.readValue(normalizeJsonPayload(content), SUGGESTION_LIST);
            return validate(suggestions);
        } catch (IOException exception) {
            return List.of();
        }
    }

    private String normalizeJsonPayload(String content) {
        var trimmed = content.trim();
        if (trimmed.startsWith("```")) {
            trimmed = trimmed.replaceFirst("^```(?:json)?\\s*", "")
                    .replaceFirst("\\s*```$", "")
                    .trim();
        }

        if (trimmed.startsWith("[")) {
            return trimmed;
        }

        var start = trimmed.indexOf('[');
        var end = trimmed.lastIndexOf(']');
        if (start >= 0 && end > start) {
            return trimmed.substring(start, end + 1).trim();
        }

        return trimmed;
    }

    private List<FollowUpSuggestion> validate(List<FollowUpSuggestion> suggestions) {
        if (suggestions == null || suggestions.size() != 3) {
            return List.of();
        }

        var unique = new LinkedHashSet<String>();
        var safe = new ArrayList<FollowUpSuggestion>();
        for (var suggestion : suggestions) {
            if (suggestion == null || !isSafeText(suggestion.title(), 60) || !isSafeText(suggestion.question(), 240)) {
                return List.of();
            }

            var normalized = normalize(suggestion.title()) + "|" + normalize(suggestion.question());
            if (!unique.add(normalized)) {
                return List.of();
            }
            safe.add(new FollowUpSuggestion(suggestion.title().trim(), suggestion.question().trim()));
        }

        return safe.size() == 3 ? safe : List.of();
    }

    private boolean isSafeText(String value, int maxLength) {
        if (value == null || value.isBlank() || value.length() > maxLength) {
            return false;
        }
        if (looksLikeMarkdown(value) || containsJsonOrDsl(value) || UNSAFE.matcher(value).find()) {
            return false;
        }
        return true;
    }

    private boolean looksLikeMarkdown(String value) {
        return value.contains("```") || value.startsWith("#") || value.contains("\n- ");
    }

    private boolean containsJsonOrDsl(String value) {
        var lower = value.toLowerCase(Locale.ROOT);
        if (value.contains("{") || value.contains("}") || value.contains("[") || value.contains("]")) {
            return true;
        }
        return lower.contains("\"mode\"")
                || lower.contains("\"query\"")
                || lower.contains("\"bool\"")
                || lower.contains("\"aggs\"")
                || lower.contains("\"search_plan\"");
    }

    private String normalize(String value) {
        return value == null
                ? ""
                : value.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }
}
