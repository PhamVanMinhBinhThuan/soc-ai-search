package com.soc.ai.search.summary;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.search.execution.AggregationResultItem;
import com.soc.ai.search.search.execution.AggregationSearchResponse;
import com.soc.ai.search.search.execution.SearchEvent;
import com.soc.ai.search.search.plan.SearchMode;
import org.springframework.stereotype.Component;

@Component
public class SummaryPayloadBuilder {

    static final int MAX_PAYLOAD_CHARACTERS = 5_000;
    private static final int MAX_SAMPLE_EVENTS = 5;
    private static final int MAX_AGGREGATION_RESULTS = 10;
    private static final int MAX_VALUE_LENGTH = 160;
    private static final int MAX_MESSAGE_LENGTH = 300;
    private static final Pattern SECRET_PATTERN = Pattern.compile(
            "(?i)(api[_-]?key|password|token|secret)\\s*[:=]\\s*[^\\s,;]+");

    private final ObjectMapper objectMapper;

    public SummaryPayloadBuilder(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public SummaryPayload search(long total, SearchSummaryData data) {
        return fit(new SummaryPayload(
                SearchMode.SEARCH,
                total,
                limitBuckets(data.topUsers(), 5),
                limitBuckets(data.topHosts(), 5),
                limitBuckets(data.topIps(), 5),
                limitBuckets(data.severityDistribution(), 5),
                sampleEvents(data.sampleEvents()),
                null,
                null,
                null));
    }

    public SummaryPayload searchFallback(long total, List<SearchEvent> pageEvents) {
        var samples = pageEvents == null ? List.<SearchEvent>of() : pageEvents.stream()
                .limit(MAX_SAMPLE_EVENTS)
                .toList();
        return fit(new SummaryPayload(
                SearchMode.SEARCH,
                total,
                counts(samples, SearchEvent::user),
                counts(samples, SearchEvent::host),
                counts(samples, SearchEvent::ip),
                counts(samples, SearchEvent::severity),
                sampleEvents(samples),
                null,
                null,
                null));
    }

    public SummaryPayload aggregation(AggregationSearchResponse response) {
        var results = response.aggregationResults() == null
                ? List.<AggregationResultItem>of()
                : response.aggregationResults().stream()
                        .limit(MAX_AGGREGATION_RESULTS)
                        .map(item -> new AggregationResultItem(
                                sanitizeAndLimit(item.key(), MAX_VALUE_LENGTH),
                                item.value()))
                        .toList();
        return fit(new SummaryPayload(
                SearchMode.AGGREGATION,
                response.total(),
                null,
                null,
                null,
                null,
                null,
                response.aggregationType(),
                response.chartMetadata(),
                results));
    }

    public String toJson(SummaryPayload payload) {
        try {
            var json = objectMapper.writeValueAsString(payload);
            if (json.length() > MAX_PAYLOAD_CHARACTERS) {
                throw new IllegalStateException("Summary payload exceeds maximum size");
            }
            return json;
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Summary payload serialization failed", exception);
        }
    }

    private SummaryPayload fit(SummaryPayload payload) {
        var samples = mutable(payload.sampleEvents());
        var aggregationResults = mutable(payload.aggregationResults());
        var topUsers = mutable(payload.topUsers());
        var topHosts = mutable(payload.topHosts());
        var topIps = mutable(payload.topIps());
        var severities = mutable(payload.severityDistribution());

        var candidate = payload;
        while (serializedLength(candidate) > MAX_PAYLOAD_CHARACTERS) {
            if (!samples.isEmpty()) {
                samples.remove(samples.size() - 1);
            } else if (!aggregationResults.isEmpty()) {
                aggregationResults.remove(aggregationResults.size() - 1);
            } else if (!topHosts.isEmpty()) {
                topHosts.remove(topHosts.size() - 1);
            } else if (!topUsers.isEmpty()) {
                topUsers.remove(topUsers.size() - 1);
            } else if (!topIps.isEmpty()) {
                topIps.remove(topIps.size() - 1);
            } else if (!severities.isEmpty()) {
                severities.remove(severities.size() - 1);
            } else {
                return new SummaryPayload(payload.mode(), payload.total(), null, null, null, null, null,
                        payload.aggregationType(), payload.chartMetadata(), null);
            }

            candidate = new SummaryPayload(
                    payload.mode(),
                    payload.total(),
                    nullableCopy(topUsers),
                    nullableCopy(topHosts),
                    nullableCopy(topIps),
                    nullableCopy(severities),
                    nullableCopy(samples),
                    payload.aggregationType(),
                    payload.chartMetadata(),
                    nullableCopy(aggregationResults));
        }
        return candidate;
    }

    private List<SummarySampleEvent> sampleEvents(List<SearchEvent> events) {
        if (events == null) {
            return List.of();
        }
        return events.stream()
                .limit(MAX_SAMPLE_EVENTS)
                .map(event -> new SummarySampleEvent(
                        sanitizeAndLimit(event.timestamp(), MAX_VALUE_LENGTH),
                        sanitizeAndLimit(event.severity(), MAX_VALUE_LENGTH),
                        sanitizeAndLimit(event.eventType(), MAX_VALUE_LENGTH),
                        sanitizeAndLimit(event.user(), MAX_VALUE_LENGTH),
                        sanitizeAndLimit(event.host(), MAX_VALUE_LENGTH),
                        sanitizeAndLimit(event.ip(), MAX_VALUE_LENGTH),
                        sanitizeAndLimit(event.countryCode(), MAX_VALUE_LENGTH),
                        sanitizeAndLimit(event.message(), MAX_MESSAGE_LENGTH)))
                .toList();
    }

    private List<SummaryBucket> limitBuckets(List<SummaryBucket> values, int limit) {
        if (values == null) {
            return List.of();
        }
        return values.stream()
                .limit(limit)
                .map(value -> new SummaryBucket(sanitizeAndLimit(value.key(), MAX_VALUE_LENGTH), value.value()))
                .toList();
    }

    private List<SummaryBucket> counts(
            List<SearchEvent> events,
            java.util.function.Function<SearchEvent, String> extractor) {
        var counts = new LinkedHashMap<String, Long>();
        for (var event : events) {
            var value = extractor.apply(event);
            if (value != null && !value.isBlank()) {
                counts.merge(sanitizeAndLimit(value, MAX_VALUE_LENGTH), 1L, Long::sum);
            }
        }
        return counts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder()))
                .limit(5)
                .map(entry -> new SummaryBucket(entry.getKey(), entry.getValue()))
                .toList();
    }

    private String sanitizeAndLimit(String value, int limit) {
        if (value == null) {
            return null;
        }
        var sanitized = SECRET_PATTERN.matcher(value).replaceAll("$1=[REDACTED]").strip();
        if (sanitized.length() <= limit) {
            return sanitized;
        }
        return sanitized.substring(0, limit - 3) + "...";
    }

    private int serializedLength(SummaryPayload payload) {
        return toJsonUnchecked(payload).length();
    }

    private String toJsonUnchecked(SummaryPayload payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Summary payload serialization failed", exception);
        }
    }

    private <T> ArrayList<T> mutable(List<T> values) {
        return values == null ? new ArrayList<>() : new ArrayList<>(values);
    }

    private <T> List<T> nullableCopy(List<T> values) {
        return values.isEmpty() ? null : List.copyOf(values);
    }
}
