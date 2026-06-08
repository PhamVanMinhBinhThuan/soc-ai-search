package com.soc.ai.search.llm.mock;

import java.text.Normalizer;
import java.util.Locale;

import com.soc.ai.search.llm.LlmClient;
import com.soc.ai.search.llm.LlmProperties;
import com.soc.ai.search.llm.LlmResponse;
import com.soc.ai.search.llm.LlmSearchPlanRequest;

public class MockLlmClient implements LlmClient {

    private final LlmProperties properties;

    public MockLlmClient(LlmProperties properties) {
        this.properties = properties;
    }

    @Override
    public LlmResponse generateSearchPlan(LlmSearchPlanRequest request) {
        var startedAt = System.nanoTime();
        var content = contentFor(request.userQuestion());
        var latencyMs = (System.nanoTime() - startedAt) / 1_000_000;

        return new LlmResponse(content, properties.effectiveModel(), latencyMs);
    }

    private String contentFor(String question) {
        var normalized = normalize(question);

        if (containsFailedLoginChina(normalized)) {
            return failedLoginChinaPlan();
        }

        if (containsCriticalSevenDays(normalized)) {
            return criticalSevenDaysPlan();
        }

        if (normalized.contains("malware")) {
            return malwareSevenDaysPlan();
        }

        return broadRecentSearchPlan();
    }

    private boolean containsFailedLoginChina(String value) {
        return value.contains("failed login")
                && (value.contains("china") || value.contains(" cn") || value.contains("trung quoc"));
    }

    private boolean containsCriticalSevenDays(String value) {
        return value.contains("critical")
                && (value.contains("7 day") || value.contains("7 days") || value.contains("7 ngay"));
    }

    private String failedLoginChinaPlan() {
        return """
                {
                  "mode": "search",
                  "filters": {
                    "timestamp": { "from": "now-24h", "to": "now" },
                    "event_type": ["failed_login"],
                    "country_code": ["CN"]
                  },
                  "page": 0,
                  "size": 20
                }
                """;
    }

    private String criticalSevenDaysPlan() {
        return """
                {
                  "mode": "search",
                  "filters": {
                    "timestamp": { "from": "now-7d", "to": "now" },
                    "severity": ["critical"]
                  },
                  "page": 0,
                  "size": 20
                }
                """;
    }

    private String malwareSevenDaysPlan() {
        return """
                {
                  "mode": "search",
                  "filters": {
                    "timestamp": { "from": "now-7d", "to": "now" }
                  },
                  "message_query": "malware detected",
                  "page": 0,
                  "size": 20
                }
                """;
    }

    private String broadRecentSearchPlan() {
        return """
                {
                  "mode": "search",
                  "filters": {
                    "timestamp": { "from": "now-24h", "to": "now" }
                  },
                  "page": 0,
                  "size": 20
                }
                """;
    }

    private String normalize(String value) {
        var lowerCase = value.toLowerCase(Locale.ROOT);
        return Normalizer.normalize(lowerCase, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
    }
}
