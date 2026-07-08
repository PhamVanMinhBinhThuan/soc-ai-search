package com.soc.ai.search.search.compiler;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.soc.ai.search.search.plan.AggregationPlan;
import com.soc.ai.search.search.plan.AggregationOrderBy;
import com.soc.ai.search.search.plan.SearchFilters;
import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.search.plan.SearchPlan;
import com.soc.ai.search.search.plan.SortOrder;
import com.soc.ai.search.search.plan.SortPlan;
import com.soc.ai.search.search.plan.TimeRange;
import com.soc.ai.search.search.validation.SearchPlanValidator;
import org.springframework.stereotype.Service;

@Service
public class SearchPlanCompiler {

    private static final int DEFAULT_AGGREGATION_BUCKET_LIMIT = 20;

    private final SearchPlanValidator validator;

    public SearchPlanCompiler(SearchPlanValidator validator) {
        this.validator = validator;
    }

    public CompiledSearchQuery compile(SearchPlan plan) {
        var validatedPlan = validator.validate(plan);
        if (validatedPlan.mode() == SearchMode.AGGREGATION) {
            return compileAggregation(validatedPlan);
        }

        return compileSearch(validatedPlan);
    }

    private CompiledSearchQuery compileSearch(SearchPlan validatedPlan) {
        var searchSpec = new LinkedHashMap<String, Object>();
        var boolQuery = new LinkedHashMap<String, Object>();
        var filters = new ArrayList<Map<String, Object>>();

        addFilters(validatedPlan.filters(), filters);
        boolQuery.put("filter", filters);

        if (hasText(validatedPlan.messageQuery())) {
            boolQuery.put("must", List.of(match("message", validatedPlan.messageQuery())));
        }

        searchSpec.put("query", Map.of("bool", boolQuery));
        searchSpec.put("from", validatedPlan.page() * validatedPlan.size());
        searchSpec.put("size", validatedPlan.size());
        searchSpec.put("sort", sort(validatedPlan));

        return new CompiledSearchQuery(searchSpec);
    }

    private CompiledSearchQuery compileAggregation(SearchPlan validatedPlan) {
        var searchSpec = new LinkedHashMap<String, Object>();
        var boolQuery = new LinkedHashMap<String, Object>();
        var filters = new ArrayList<Map<String, Object>>();

        addFilters(validatedPlan.filters(), filters);
        boolQuery.put("filter", filters);

        searchSpec.put("query", Map.of("bool", boolQuery));
        searchSpec.put("size", 0);

        var aggregations = aggregations(validatedPlan);
        if (!aggregations.isEmpty()) {
            searchSpec.put("aggs", aggregations);
        }

        return new CompiledSearchQuery(searchSpec);
    }

    private Map<String, Object> aggregations(SearchPlan validatedPlan) {
        AggregationPlan aggregation = validatedPlan.aggregation();
        return switch (aggregation.type()) {
            case COUNT -> Map.of();
            case GROUP_BY -> termsAggregation("count_by_field", aggregation.field(), bucketLimit(aggregation), aggregation);
            case TOP_N -> termsAggregation("top_values", aggregation.field(), aggregation.topN(), aggregation);
            case DATE_HISTOGRAM -> dateHistogramAggregation(validatedPlan);
        };
    }

    private Map<String, Object> termsAggregation(String aggregationName, String field, int size, AggregationPlan aggregation) {
        var terms = new LinkedHashMap<String, Object>();
        terms.put("field", field);
        terms.put("size", size);
        terms.put("order", aggregationOrder(aggregation));

        return Map.of(
                aggregationName,
                Map.of("terms", terms));
    }

    private Map<String, Object> aggregationOrder(AggregationPlan aggregation) {
        var orderBy = aggregation.orderBy() == null ? AggregationOrderBy.VALUE : aggregation.orderBy();
        var order = aggregation.order() == null ? SortOrder.DESC : aggregation.order();

        var elasticOrderBy = orderBy == AggregationOrderBy.KEY ? "_key" : "_count";
        return Map.of(elasticOrderBy, order.name().toLowerCase());
    }

    private List<Map<String, Object>> sort(SearchPlan validatedPlan) {
        if (validatedPlan.sort() == null || validatedPlan.sort().isEmpty()) {
            return List.of(Map.of("timestamp", Map.of("order", "desc")));
        }

        return validatedPlan.sort().stream()
                .map(this::sortClause)
                .toList();
    }

    private Map<String, Object> sortClause(SortPlan sort) {
        if ("severity".equals(sort.field())) {
            return severityRankSortClause(sort.order());
        }

        return Map.of(sort.field(), Map.of("order", sort.order().name().toLowerCase()));
    }

    private Map<String, Object> severityRankSortClause(SortOrder order) {
        return Map.of("_script", Map.of(
                "type", "number",
                "order", order.name().toLowerCase(),
                "script", Map.of(
                        "lang", "painless",
                        "source", """
                                if (doc['severity'].size() == 0) return 0;
                                def value = doc['severity'].value;
                                if (value == 'critical') return 4;
                                if (value == 'high') return 3;
                                if (value == 'medium') return 2;
                                if (value == 'low') return 1;
                                return 0;
                                """)));
    }

    private Map<String, Object> dateHistogramAggregation(SearchPlan validatedPlan) {
        var aggregation = validatedPlan.aggregation();
        var timeRange = validatedPlan.filters() != null ? validatedPlan.filters().timestamp() : null;

        var dateHistogram = new LinkedHashMap<String, Object>();
        dateHistogram.put("field", "timestamp");
        dateHistogram.put("fixed_interval", fixedInterval(aggregation));
        dateHistogram.put("order", Map.of("_key", "asc"));

        if (timeRange != null && hasText(timeRange.from()) && hasText(timeRange.to())) {
            dateHistogram.put("min_doc_count", 0);
            dateHistogram.put("extended_bounds", Map.of(
                    "min", timeRange.from(),
                    "max", timeRange.to()));
        }

        return Map.of(
                "events_over_time",
                Map.of("date_histogram", dateHistogram));
    }

    private int bucketLimit(AggregationPlan aggregation) {
        if (aggregation.topN() == null) {
            return DEFAULT_AGGREGATION_BUCKET_LIMIT;
        }

        return aggregation.topN();
    }

    private String fixedInterval(AggregationPlan aggregation) {
        return switch (aggregation.interval()) {
            case MINUTE -> "1m";
            case HOUR -> "1h";
            case DAY -> "1d";
        };
    }

    private void addFilters(SearchFilters searchFilters, List<Map<String, Object>> filters) {
        if (searchFilters == null) {
            return;
        }

        addTimestampRange(searchFilters.timestamp(), filters);
        addTermsFilter("event_id", searchFilters.eventId(), filters);
        addTermsFilter("source", searchFilters.source(), filters);
        addTermsFilter("severity", searchFilters.severity(), filters);
        addTermsFilter("event_type", searchFilters.eventType(), filters);
        addTermsFilter("user", searchFilters.user(), filters);
        addTermsFilter("host", searchFilters.host(), filters);
        addTermsFilter("ip", searchFilters.ip(), filters);
        addTermsFilter("country_code", searchFilters.countryCode(), filters);
    }

    private void addTimestampRange(TimeRange timeRange, List<Map<String, Object>> filters) {
        if (timeRange == null) {
            return;
        }

        var range = new LinkedHashMap<String, Object>();
        if (hasText(timeRange.from())) {
            range.put("gte", timeRange.from());
        }
        if (hasText(timeRange.to())) {
            range.put("lte", timeRange.to());
        }

        if (!range.isEmpty()) {
            filters.add(Map.of("range", Map.of("timestamp", range)));
        }
    }

    private void addTermsFilter(String field, List<String> values, List<Map<String, Object>> filters) {
        if (values == null || values.isEmpty()) {
            return;
        }

        filters.add(Map.of("terms", Map.of(field, List.copyOf(values))));
    }

    private Map<String, Object> match(String field, String value) {
        return Map.of("match", Map.of(field, value));
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
