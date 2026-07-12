package com.soc.ai.search.summary.application;


import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.search.domain.result.AggregationResultItem;
import com.soc.ai.search.search.domain.result.AggregationSearchResponse;
import com.soc.ai.search.search.domain.result.SearchEvent;
import com.soc.ai.search.search.domain.plan.AggregationPlan;
import com.soc.ai.search.search.domain.plan.AggregationType;
import com.soc.ai.search.search.domain.plan.SearchFilters;
import com.soc.ai.search.search.domain.plan.SearchMode;
import com.soc.ai.search.search.domain.plan.SearchPlan;
import com.soc.ai.search.search.domain.plan.SortPlan;
import com.soc.ai.search.search.domain.plan.TimeRange;
import org.springframework.stereotype.Component;

import com.soc.ai.search.summary.domain.SearchSummaryData;
import com.soc.ai.search.summary.domain.SummaryAggregationStats;
import com.soc.ai.search.summary.domain.SummaryBucket;
import com.soc.ai.search.summary.domain.SummaryLanguage;
import com.soc.ai.search.summary.domain.SummaryPayload;
import com.soc.ai.search.summary.domain.SummaryQueryContext;
import com.soc.ai.search.summary.domain.SummarySampleEvent;
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

    public SummaryPayload search(SummaryLanguage language, SearchPlan plan, long total, SearchSummaryData data) {
        return fit(new SummaryPayload(
                language,
                queryContext(plan),
                SearchMode.SEARCH,
                total,
                limitBuckets(data.topUsers(), 5),
                limitBuckets(data.topHosts(), 5),
                limitBuckets(data.topIps(), 5),
                limitBuckets(data.severityDistribution(), 5),
                sampleEvents(data.sampleEvents()),
                null,
                null,
                null,
                null));
    }

    public SummaryPayload searchFallback(SummaryLanguage language, SearchPlan plan, long total, List<SearchEvent> pageEvents) {
        var samples = pageEvents == null ? List.<SearchEvent>of() : pageEvents.stream()
                .limit(MAX_SAMPLE_EVENTS)
                .toList();
        return fit(new SummaryPayload(
                language,
                queryContext(plan),
                SearchMode.SEARCH,
                total,
                counts(samples, SearchEvent::user),
                counts(samples, SearchEvent::host),
                counts(samples, SearchEvent::ip),
                counts(samples, SearchEvent::severity),
                sampleEvents(samples),
                null,
                null,
                null,
                null));
    }

    public SummaryPayload aggregation(SummaryLanguage language, SearchPlan plan, AggregationSearchResponse response) {
        var allResults = response.aggregationResults() == null
                ? List.<AggregationResultItem>of()
                : response.aggregationResults();
        var results = response.aggregationType() == AggregationType.DATE_HISTOGRAM
                ? null
                : allResults.stream()
                        .limit(MAX_AGGREGATION_RESULTS)
                        .map(item -> new AggregationResultItem(
                                sanitizeAndLimit(item.key(), MAX_VALUE_LENGTH),
                                item.value()))
                        .toList();
        return fit(new SummaryPayload(
                language,
                queryContext(plan),
                SearchMode.AGGREGATION,
                response.total(),
                null,
                null,
                null,
                null,
                null,
                response.aggregationType(),
                response.chartMetadata(),
                aggregationStats(allResults),
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
        var samples = mutable(payload.recentSampleEvents());
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
                return new SummaryPayload(
                        payload.outputLanguage(),
                        payload.queryContext(),
                        payload.mode(),
                        payload.total(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        payload.aggregationType(),
                        payload.chartMetadata(),
                        payload.aggregationStats(),
                        null);
            }

            candidate = new SummaryPayload(
                    payload.outputLanguage(),
                    payload.queryContext(),
                    payload.mode(),
                    payload.total(),
                    nullableCopy(topUsers),
                    nullableCopy(topHosts),
                    nullableCopy(topIps),
                    nullableCopy(severities),
                    nullableCopy(samples),
                    payload.aggregationType(),
                    payload.chartMetadata(),
                    payload.aggregationStats(),
                    nullableCopy(aggregationResults));
        }
        return candidate;
    }

    private SummaryQueryContext queryContext(SearchPlan plan) {
        if (plan == null) {
            return null;
        }
        SearchFilters filters = plan.filters();
        TimeRange timestamp = filters == null ? null : filters.timestamp();
        AggregationPlan aggregation = plan.aggregation();
        SortPlan sort = plan.sort() == null || plan.sort().isEmpty() ? null : plan.sort().get(0);

        return new SummaryQueryContext(
                plan.mode() == null ? null : plan.mode().jsonValue(),
                timestamp == null ? null : timestamp.from(),
                timestamp == null ? null : timestamp.to(),
                filters == null ? null : limitStrings(filters.source(), 10),
                filters == null ? null : limitStrings(filters.severity(), 10),
                filters == null ? null : limitStrings(filters.eventType(), 10),
                filters == null ? null : limitStrings(filters.user(), 10),
                filters == null ? null : limitStrings(filters.host(), 10),
                filters == null ? null : limitStrings(filters.ip(), 10),
                filters == null ? null : limitStrings(filters.countryCode(), 10),
                sanitizeAndLimit(plan.messageQuery(), MAX_VALUE_LENGTH),
                sort == null ? null : sanitizeAndLimit(sort.field(), MAX_VALUE_LENGTH),
                sort == null || sort.order() == null ? null : sort.order().jsonValue(),
                aggregation == null || aggregation.type() == null ? null : aggregation.type().jsonValue(),
                aggregation == null ? null : sanitizeAndLimit(aggregation.field(), MAX_VALUE_LENGTH),
                aggregation == null ? null : aggregation.topN(),
                aggregation == null || aggregation.interval() == null ? null : aggregation.interval().jsonValue(),
                aggregation == null || aggregation.orderBy() == null ? null : aggregation.orderBy().jsonValue(),
                aggregation == null || aggregation.order() == null ? null : aggregation.order().jsonValue());
    }

    private List<String> limitStrings(List<String> values, int limit) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        return values.stream()
                .limit(limit)
                .map(value -> sanitizeAndLimit(value, MAX_VALUE_LENGTH))
                .toList();
    }

    private SummaryAggregationStats aggregationStats(List<AggregationResultItem> results) {
        if (results == null || results.isEmpty()) {
            return null;
        }
        long sum = 0;
        AggregationResultItem max = null;
        AggregationResultItem min = null;
        for (var result : results) {
            sum += result.value();
            if (max == null || result.value() > max.value()) {
                max = result;
            }
            if (min == null || result.value() < min.value()) {
                min = result;
            }
        }
        return new SummaryAggregationStats(
                results.size(),
                sum,
                bucket(max),
                bucket(min));
    }

    private SummaryBucket bucket(AggregationResultItem item) {
        if (item == null) {
            return null;
        }
        return new SummaryBucket(sanitizeAndLimit(item.key(), MAX_VALUE_LENGTH), item.value());
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
