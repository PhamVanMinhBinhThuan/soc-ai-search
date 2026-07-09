package com.soc.ai.search.llm.mock;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

import com.soc.ai.search.llm.LlmClient;
import com.soc.ai.search.llm.LlmFollowUpSuggestionsRequest;
import com.soc.ai.search.llm.LlmProperties;
import com.soc.ai.search.llm.LlmQuestionRefinementRequest;
import com.soc.ai.search.llm.LlmResponse;
import com.soc.ai.search.llm.LlmSearchPlanRequest;
import com.soc.ai.search.llm.LlmSummaryRequest;

public class MockLlmClient implements LlmClient {

    private static final Pattern TOP_N_PATTERN = Pattern.compile("\\btop\\s+(\\d{1,3})\\b");
    private static final Pattern LAST_DAYS_PATTERN = Pattern.compile("\\b(?:last|trong)\\s+(\\d{1,2})\\s+(?:day|days|ngay)\\b");

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

    @Override
    public LlmResponse generateSummary(LlmSummaryRequest request) {
        var startedAt = System.nanoTime();
        var summary = "The query results were summarized from the validated SOC dataset. "
                + "The response highlights the total volume and the most relevant entities or buckets. "
                + "Analysts should use the displayed events and generated query details for further investigation.";
        var latencyMs = (System.nanoTime() - startedAt) / 1_000_000;
        return new LlmResponse(summary, properties.effectiveModel(), latencyMs);
    }

    @Override
    public LlmResponse generateRefinedQuestion(LlmQuestionRefinementRequest request) {
        var startedAt = System.nanoTime();
        var normalized = normalize(request.userContent());
        String question;
        if (normalized.contains("vpn.user") && (normalized.contains("7 day") || normalized.contains("7 days"))) {
            question = "Show failed login events from China for admin or vpn.user in the last 7 days";
        } else if (normalized.contains("critical") && normalized.contains("high")) {
            question = "Show critical or high severity events in the last 24 hours";
        } else {
            question = "Show failed login events from China in the last 24 hours";
        }
        var latencyMs = (System.nanoTime() - startedAt) / 1_000_000;
        return new LlmResponse(question, properties.effectiveModel(), latencyMs);
    }

    @Override
    public LlmResponse generateFollowUpSuggestions(LlmFollowUpSuggestionsRequest request) {
        return new LlmResponse("[]", properties.effectiveModel(), 0);
    }

    private String contentFor(String question) {
        var normalized = normalize(question);

        if (containsFailedLoginByUserAggregation(normalized)) {
            return failedLoginByUserAggregationPlan();
        }

        if (containsTopAccountLockoutUsers(normalized)) {
            return topAccountLockoutUsersAggregationPlan();
        }

        if (containsTopMalwareHosts(normalized)) {
            return topMalwareHostsAggregationPlan();
        }

        if (containsTopIpAlerts(normalized)) {
            return topIpAlertsAggregationPlan(extractTopN(normalized, 10), extractLastDays(normalized, 30));
        }

        if (containsAccountLockoutTrend(normalized)) {
            return accountLockoutTrendAggregationPlan();
        }

        if (containsMalwareTrend(normalized)) {
            return malwareTrendAggregationPlan();
        }

        if (containsEventsByHour(normalized)) {
            return eventsByHourAggregationPlan();
        }

        if (containsWindowsAuthAdmin(normalized)) {
            return windowsAuthAdminPlan();
        }

        if (containsEdrEvents(normalized)) {
            return edrEventsSevenDaysPlan();
        }

        if (containsFailedLoginAdminOrVpnUser(normalized)) {
            return failedLoginAdminOrVpnUserPlan();
        }

        if (containsFailedLoginAdmin(normalized)) {
            return failedLoginAdminPlan();
        }

        if (containsHighCriticalFailedLoginChina(normalized)) {
            return highCriticalFailedLoginChinaPlan();
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

    private boolean containsTopAccountLockoutUsers(String value) {
        return value.contains("top")
                && value.contains("user")
                && value.contains("account")
                && value.contains("lockout");
    }

    private boolean containsTopMalwareHosts(String value) {
        return value.contains("top")
                && value.contains("host")
                && value.contains("malware");
    }

    private boolean containsEventsByHour(String value) {
        return (value.contains("so event") || value.contains("event count") || value.contains("events"))
                && (value.contains("theo gio") || value.contains("by hour") || value.contains("per hour"));
    }

    private boolean containsAccountLockoutTrend(String value) {
        return value.contains("account")
                && value.contains("lockout")
                && (value.contains("trend") || value.contains("by hour") || value.contains("per hour"));
    }

    private boolean containsMalwareTrend(String value) {
        return value.contains("malware")
                && (value.contains("trend") || value.contains("by day") || value.contains("by hour") || value.contains("per day"));
    }

    private boolean containsCriticalSevenDays(String value) {
        return value.contains("critical")
                && (value.contains("7 day") || value.contains("7 days") || value.contains("7 ngay"));
    }

    private boolean containsFailedLoginAdmin(String value) {
        return value.contains("failed login") && value.contains("admin");
    }

    private boolean containsFailedLoginAdminOrVpnUser(String value) {
        return value.contains("failed login")
                && value.contains("admin")
                && value.contains("vpn.user");
    }

    private boolean containsHighCriticalFailedLoginChina(String value) {
        return (value.contains("failed login") || containsVietnameseFailedLogin(value))
                && (value.contains("china") || value.contains(" cn") || value.contains("trung quoc"))
                && value.contains("high")
                && value.contains("critical");
    }

    private boolean containsEdrEvents(String value) {
        return value.contains("edr")
                && (value.contains("event") || value.contains("alert"));
    }

    private boolean containsWindowsAuthAdmin(String value) {
        return value.contains("windows-auth")
                && value.contains("admin")
                && (value.contains("event") || value.contains("alert"));
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

    private String highCriticalFailedLoginChinaPlan() {
        return """
                {
                  "mode": "search",
                  "filters": {
                    "timestamp": { "from": "now-24h", "to": "now" },
                    "severity": ["high", "critical"],
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

    private String failedLoginAdminOrVpnUserPlan() {
        return """
                {
                  "mode": "search",
                  "filters": {
                    "timestamp": { "from": "now-24h", "to": "now" },
                    "event_type": ["failed_login"],
                    "user": ["admin", "vpn.user"]
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

    private String edrEventsSevenDaysPlan() {
        return """
                {
                  "mode": "search",
                  "filters": {
                    "timestamp": { "from": "now-7d", "to": "now" },
                    "source": ["edr"]
                  },
                  "page": 0,
                  "size": 20
                }
                """;
    }

    private String windowsAuthAdminPlan() {
        return """
                {
                  "mode": "search",
                  "filters": {
                    "timestamp": { "from": "now-24h", "to": "now" },
                    "source": ["windows-auth"],
                    "user": "admin"
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

    private String topAccountLockoutUsersAggregationPlan() {
        return """
                {
                  "mode": "aggregation",
                  "filters": {
                    "timestamp": { "from": "now-7d", "to": "now" },
                    "event_type": ["account_lockout"]
                  },
                  "aggregation": {
                    "type": "top_n",
                    "field": "user",
                    "top_n": 5
                  }
                }
                """;
    }

    private String topMalwareHostsAggregationPlan() {
        return """
                {
                  "mode": "aggregation",
                  "filters": {
                    "timestamp": { "from": "now-30d", "to": "now" },
                    "event_type": ["malware_detected"]
                  },
                  "aggregation": {
                    "type": "top_n",
                    "field": "host",
                    "top_n": 5
                  }
                }
                """;
    }

    private String accountLockoutTrendAggregationPlan() {
        return """
                {
                  "mode": "aggregation",
                  "filters": {
                    "timestamp": { "from": "now-7d", "to": "now" },
                    "event_type": ["account_lockout"]
                  },
                  "aggregation": {
                    "type": "date_histogram",
                    "interval": "hour"
                  }
                }
                """;
    }

    private String malwareTrendAggregationPlan() {
        return """
                {
                  "mode": "aggregation",
                  "filters": {
                    "timestamp": { "from": "now-30d", "to": "now" },
                    "event_type": ["malware_detected"]
                  },
                  "aggregation": {
                    "type": "date_histogram",
                    "interval": "day"
                  }
                }
                """;
    }

    private String topIpAlertsAggregationPlan(int topN, int days) {
        return """
                {
                  "mode": "aggregation",
                  "filters": {
                    "timestamp": { "from": "now-%dd", "to": "now" }
                  },
                  "aggregation": {
                    "type": "top_n",
                    "field": "ip",
                    "top_n": %d
                  }
                }
                """.formatted(days, topN);
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

    private int extractTopN(String value, int defaultValue) {
        var matcher = TOP_N_PATTERN.matcher(value);
        if (!matcher.find()) {
            return defaultValue;
        }

        return clamp(Integer.parseInt(matcher.group(1)), 1, 100);
    }

    private int extractLastDays(String value, int defaultValue) {
        var matcher = LAST_DAYS_PATTERN.matcher(value);
        if (!matcher.find()) {
            return defaultValue;
        }

        return clamp(Integer.parseInt(matcher.group(1)), 1, 90);
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}
