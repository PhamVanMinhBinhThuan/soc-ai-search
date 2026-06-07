package com.soc.ai.search.search.compiler;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.soc.ai.search.search.plan.SearchFilters;
import com.soc.ai.search.search.plan.SearchPlan;
import com.soc.ai.search.search.plan.TimeRange;
import com.soc.ai.search.search.validation.SearchPlanValidator;
import org.springframework.stereotype.Service;

@Service
public class SearchPlanCompiler {

    private final SearchPlanValidator validator;

    public SearchPlanCompiler(SearchPlanValidator validator) {
        this.validator = validator;
    }

    public CompiledSearchQuery compile(SearchPlan plan) {
        var validatedPlan = validator.validate(plan);
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
        searchSpec.put("sort", List.of(Map.of("timestamp", Map.of("order", "desc"))));

        return new CompiledSearchQuery(searchSpec);
    }

    private void addFilters(SearchFilters searchFilters, List<Map<String, Object>> filters) {
        if (searchFilters == null) {
            return;
        }

        addTimestampRange(searchFilters.timestamp(), filters);
        addTermsFilter("severity", searchFilters.severity(), filters);
        addTermsFilter("event_type", searchFilters.eventType(), filters);
        addTermFilter("user", searchFilters.user(), filters);
        addTermFilter("host", searchFilters.host(), filters);
        addTermFilter("ip", searchFilters.ip(), filters);
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

    private void addTermFilter(String field, String value, List<Map<String, Object>> filters) {
        if (!hasText(value)) {
            return;
        }

        filters.add(Map.of("term", Map.of(field, value)));
    }

    private Map<String, Object> match(String field, String value) {
        return Map.of("match", Map.of(field, value));
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
