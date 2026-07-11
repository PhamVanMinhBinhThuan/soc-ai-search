package com.soc.ai.search.search.plan;

import java.util.List;
import java.util.Set;

public final class SearchPlanContract {

    public static final int MAX_PAGE_SIZE = 100;
    public static final int MAX_MESSAGE_QUERY_LENGTH = 200;
    public static final int MAX_RELATIVE_HOURS = 720;
    public static final int MAX_RELATIVE_DAYS = 90;
    public static final int MAX_ENTITY_FILTER_VALUES = 10;
    public static final int MAX_EVENT_ID_FILTER_VALUES = 20;
    public static final int DEFAULT_AGGREGATION_BUCKET_LIMIT = 20;
    public static final int MAX_TOP_N = 100;
    public static final int MAX_EXPORT_ROWS = 10_000;

    public static final List<String> SEARCH_PLAN_SCHEMA_FIELDS = List.of(
            "timestamp.from",
            "timestamp.to",
            "event_id",
            "source",
            "severity",
            "event_type",
            "user",
            "host",
            "ip",
            "country_code",
            "message_query",
            "aggregation.type",
            "aggregation.field",
            "aggregation.top_n",
            "aggregation.interval",
            "page",
            "size");

    public static final Set<String> AGGREGATION_FIELD_ALLOWLIST = Set.of(
            "source",
            "severity",
            "event_type",
            "user",
            "host",
            "ip",
            "country_code");

    public static final Set<String> SEARCH_SORT_FIELD_ALLOWLIST = Set.of(
            "timestamp",
            "severity",
            "source",
            "event_type",
            "user",
            "host",
            "ip",
            "country_code");

    public static final List<String> SUPPORTED_TIME_VALUES = List.of(
            "now",
            "now-<number>h for relative hours, for example now-12h or now-24h",
            "now-<number>d for relative days, for example now-10d, now-11d, now-12d, or now-30d",
            "ISO-8601 absolute timestamp");

    public static final List<String> SUPPORTED_SEVERITIES = List.of(
            "low",
            "medium",
            "high",
            "critical");

    public static final List<String> SUPPORTED_EVENT_TYPES = List.of(
            "failed_login",
            "account_lockout",
            "firewall_block",
            "malware_detected",
            "privilege_escalation",
            "suspicious_outbound",
            "data_exfiltration",
            "large_transfer",
            "successful_login",
            "dns_query",
            "process_start",
            "file_access");

    public static final List<String> SUPPORTED_SOURCES = List.of(
            "windows-auth",
            "vpn",
            "firewall",
            "edr",
            "proxy",
            "dns");

    private SearchPlanContract() {
    }
}
