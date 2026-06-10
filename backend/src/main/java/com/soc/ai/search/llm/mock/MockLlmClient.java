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

        if (containsFailedLoginByUserAggregation(normalized)) {
            return failedLoginByUserAggregationPlan();
        }

        if (containsTopIpAlerts(normalized)) {
            return topIpAlertsAggregationPlan();
        }

        if (containsEventsByHour(normalized)) {
            return eventsByHourAggregationPlan();
        }

        if (containsFailedLoginAdmin(normalized)) {
            return failedLoginAdminPlan();
        }

        if (containsFailedLoginChina(normalized)) {
            return failedLoginChinaPlan();
        }

        if (containsCriticalSevenDays(normalized)) {
            return criticalSevenDaysPlan();
        }

        if (normalized.contains("malware")) {
            return malwareSevenDaysPlan();
        }

        if (containsFirewallBlockCn(normalized)) {
            return firewallBlockCnPlan();
        }

        if (containsPrivilegeEscalationAdmin(normalized)) {
            return privilegeEscalationAdminPlan();
        }

        if (containsAccountLockout(normalized)) {
            return accountLockoutSevenDaysPlan();
        }

        return unsupportedQuestionPlan();
    }

    private boolean containsFailedLoginChina(String value) {
        return (value.contains("failed login") || containsVietnameseFailedLogin(value))
                && (value.contains("china") || value.contains(" cn") || value.contains("trung quoc"));
    }

    private boolean containsFailedLoginByUserAggregation(String value) {
        return (value.contains("dem") || value.contains("count"))
                && (value.contains("theo tung user") || value.contains("by user") || value.contains("per user"))
                && (value.contains("failed login") || containsVietnameseFailedLogin(value));
    }

    private boolean containsTopIpAlerts(String value) {
        return value.contains("top")
                && value.contains("ip")
                && (value.contains("alert") || value.contains("event"));
    }

    private boolean containsEventsByHour(String value) {
        return (value.contains("so event") || value.contains("event count") || value.contains("events"))
                && (value.contains("theo gio") || value.contains("by hour") || value.contains("per hour"));
    }

    private boolean containsCriticalSevenDays(String value) {
        return value.contains("critical")
                && (value.contains("7 day") || value.contains("7 days") || value.contains("7 ngay"));
    }

    private boolean containsFailedLoginAdmin(String value) {
        return value.contains("failed login") && value.contains("admin");
    }

    private boolean containsFirewallBlockCn(String value) {
        return value.contains("firewall") && value.contains("block")
                && (value.contains(" cn") || value.contains("china") || value.contains("trung quoc"));
    }

    private boolean containsPrivilegeEscalationAdmin(String value) {
        return value.contains("privilege") && value.contains("escalation") && value.contains("admin");
    }

    private boolean containsAccountLockout(String value) {
        return value.contains("account") && value.contains("lockout");
    }

    private boolean containsVietnameseFailedLogin(String value) {
        return value.contains("login that bai")
                || (value.contains("dang nhap") && value.contains("that bai"));
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

    private String failedLoginAdminPlan() {
        return """
                {
                  "mode": "search",
                  "filters": {
                    "timestamp": { "from": "now-30d", "to": "now" },
                    "event_type": ["failed_login"],
                    "user": "admin"
                  }
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

    private String firewallBlockCnPlan() {
        return """
                {
                  "mode": "search",
                  "filters": {
                    "timestamp": { "from": "now-30d", "to": "now" },
                    "event_type": ["firewall_block"],
                    "country_code": ["CN"]
                  }
                }
                """;
    }

    private String privilegeEscalationAdminPlan() {
        return """
                {
                  "mode": "search",
                  "filters": {
                    "timestamp": { "from": "now-30d", "to": "now" },
                    "event_type": ["privilege_escalation"],
                    "user": "admin"
                  }
                }
                """;
    }

    private String accountLockoutSevenDaysPlan() {
        return """
                {
                  "mode": "search",
                  "filters": {
                    "timestamp": { "from": "now-7d", "to": "now" },
                    "event_type": ["account_lockout"]
                  }
                }
                """;
    }

    private String failedLoginByUserAggregationPlan() {
        return """
                {
                  "mode": "aggregation",
                  "filters": {
                    "timestamp": { "from": "now-7d", "to": "now" },
                    "event_type": ["failed_login"]
                  },
                  "aggregation": {
                    "type": "group_by",
                    "field": "user",
                    "top_n": 10
                  }
                }
                """;
    }

    private String topIpAlertsAggregationPlan() {
        return """
                {
                  "mode": "aggregation",
                  "filters": {
                    "timestamp": { "from": "now-30d", "to": "now" }
                  },
                  "aggregation": {
                    "type": "top_n",
                    "field": "ip",
                    "top_n": 10
                  }
                }
                """;
    }

    private String eventsByHourAggregationPlan() {
        return """
                {
                  "mode": "aggregation",
                  "filters": {
                    "timestamp": { "from": "now-24h", "to": "now" }
                  },
                  "aggregation": {
                    "type": "date_histogram",
                    "interval": "hour"
                  }
                }
                """;
    }

    private String unsupportedQuestionPlan() {
        return """
                {
                  "mode": "search",
                  "unsupported_question": true
                }
                """;
    }

    private String normalize(String value) {
        var lowerCase = value.toLowerCase(Locale.ROOT);
        return Normalizer.normalize(lowerCase, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd');
    }
}
