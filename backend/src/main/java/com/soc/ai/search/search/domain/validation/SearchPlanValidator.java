package com.soc.ai.search.search.domain.validation;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

import com.soc.ai.search.search.domain.plan.AggregationPlan;
import com.soc.ai.search.search.domain.plan.AggregationType;
import com.soc.ai.search.search.domain.plan.SearchFilters;
import com.soc.ai.search.search.domain.plan.SearchMode;
import com.soc.ai.search.search.domain.plan.SearchPlan;
import com.soc.ai.search.search.domain.plan.SearchPlanContract;
import com.soc.ai.search.search.domain.plan.TimeRange;
import jakarta.validation.Validator;
import org.springframework.stereotype.Service;

@Service
public class SearchPlanValidator {

    private static final Pattern RELATIVE_TIME_PATTERN = Pattern.compile("^now-(\\d+)(h|d)$");
    private static final Pattern IPV4_PATTERN = Pattern.compile("^((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.|$)){4}$");

    private final Validator beanValidator;

    public SearchPlanValidator(Validator beanValidator) {
        this.beanValidator = Objects.requireNonNull(beanValidator);
    }

    public SearchPlan validate(SearchPlan plan) {
        var errors = new ArrayList<String>();

        if (plan == null) {
            throw new SearchPlanValidationException(List.of("search_plan: must not be null"));
        }

        collectBeanValidationErrors(plan, errors);
        validateMode(plan, errors);
        validateFilters(plan.filters(), errors);
        rejectDangerousValue("message_query", plan.messageQuery(), errors);
        validateSort(plan, errors);
        validateAggregation(plan, errors);

        if (!errors.isEmpty()) {
            throw new SearchPlanValidationException(errors);
        }

        return plan;
    }

    private void collectBeanValidationErrors(SearchPlan plan, List<String> errors) {
        beanValidator.validate(plan).stream()
                .map(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
                .sorted()
                .forEach(errors::add);
    }

    private void validateMode(SearchPlan plan, List<String> errors) {
        if (plan.mode() != null
                && plan.mode() != SearchMode.SEARCH
                && plan.mode() != SearchMode.AGGREGATION) {
            errors.add("mode: only search and aggregation are supported");
        }
    }

    private void validateAggregation(SearchPlan plan, List<String> errors) {
        if (plan.mode() == SearchMode.SEARCH) {
            if (plan.aggregation() != null) {
                errors.add("aggregation: must be null when mode is search");
            }
            return;
        }

        if (plan.mode() != SearchMode.AGGREGATION) {
            return;
        }

        if (plan.messageQuery() != null) {
            errors.add("message_query: is not supported when mode is aggregation");
        }

        var aggregation = plan.aggregation();
        if (aggregation == null) {
            errors.add("aggregation: must not be null when mode is aggregation");
            return;
        }

        validateAggregationByType(aggregation, errors);
    }

    private void validateAggregationByType(AggregationPlan aggregation, List<String> errors) {
        if (aggregation.type() == null) {
            return;
        }

        switch (aggregation.type()) {
            case COUNT -> validateCountAggregation(aggregation, errors);
            case GROUP_BY -> validateGroupByAggregation(aggregation, errors);
            case TOP_N -> validateTopNAggregation(aggregation, errors);
            case DATE_HISTOGRAM -> validateDateHistogramAggregation(aggregation, errors);
        }
    }

    private void validateCountAggregation(AggregationPlan aggregation, List<String> errors) {
        if (aggregation.field() != null) {
            errors.add("aggregation.field: must be null for count aggregation");
        }
        if (aggregation.topN() != null) {
            errors.add("aggregation.top_n: must be null for count aggregation");
        }
        if (aggregation.interval() != null) {
            errors.add("aggregation.interval: must be null for count aggregation");
        }
        validateNoAggregationOrder(aggregation, errors);
    }

    private void validateGroupByAggregation(AggregationPlan aggregation, List<String> errors) {
        validateRequiredAggregationField(aggregation.field(), errors);
        validateOptionalTopN(aggregation.topN(), errors);
        if (aggregation.interval() != null) {
            errors.add("aggregation.interval: must be null for group_by aggregation");
        }
        validateOptionalAggregationOrder(aggregation, errors);
    }

    private void validateTopNAggregation(AggregationPlan aggregation, List<String> errors) {
        validateRequiredAggregationField(aggregation.field(), errors);
        if (aggregation.topN() == null) {
            errors.add("aggregation.top_n: must not be null for top_n aggregation");
        } else {
            validateOptionalTopN(aggregation.topN(), errors);
        }
        if (aggregation.interval() != null) {
            errors.add("aggregation.interval: must be null for top_n aggregation");
        }
        validateOptionalAggregationOrder(aggregation, errors);
    }

    private void validateDateHistogramAggregation(AggregationPlan aggregation, List<String> errors) {
        if (aggregation.field() != null) {
            errors.add("aggregation.field: must be null for date_histogram aggregation because timestamp is fixed");
        }
        if (aggregation.topN() != null) {
            errors.add("aggregation.top_n: must be null for date_histogram aggregation");
        }
        if (aggregation.interval() == null) {
            errors.add("aggregation.interval: must not be null for date_histogram aggregation");
        }
        validateNoAggregationOrder(aggregation, errors);
    }

    private void validateNoAggregationOrder(AggregationPlan aggregation, List<String> errors) {
        if (aggregation.orderBy() != null) {
            errors.add("aggregation.order_by: is only supported for group_by and top_n aggregation");
        }
        if (aggregation.order() != null) {
            errors.add("aggregation.order: is only supported for group_by and top_n aggregation");
        }
    }

    private void validateOptionalAggregationOrder(AggregationPlan aggregation, List<String> errors) {
        if (aggregation.orderBy() == null && aggregation.order() == null) {
            return;
        }
        if (aggregation.orderBy() == null) {
            errors.add("aggregation.order_by: must not be null when aggregation.order is provided");
        }
        if (aggregation.order() == null) {
            errors.add("aggregation.order: must not be null when aggregation.order_by is provided");
        }
    }

    private void validateRequiredAggregationField(String field, List<String> errors) {
        if (field == null || field.isBlank()) {
            errors.add("aggregation.field: must not be blank");
            return;
        }

        if (!SearchPlanContract.AGGREGATION_FIELD_ALLOWLIST.contains(field)) {
            errors.add("aggregation.field: must be one of "
                    + String.join(", ", SearchPlanContract.AGGREGATION_FIELD_ALLOWLIST));
        }
    }

    private void validateOptionalTopN(Integer topN, List<String> errors) {
        if (topN == null) {
            return;
        }

        if (topN < 1 || topN > SearchPlanContract.MAX_TOP_N) {
            errors.add("aggregation.top_n: must be between 1 and " + SearchPlanContract.MAX_TOP_N);
        }
    }

    private void validateFilters(SearchFilters filters, List<String> errors) {
        if (filters == null) {
            return;
        }

        validateTimeRange(filters.timestamp(), errors);
        validateEventIds(filters.eventId(), errors);
        validateEntityValues("filters.source", filters.source(), errors);
        rejectDangerousValues("filters.event_type", filters.eventType(), errors);
        validateEntityValues("filters.user", filters.user(), errors);
        validateEntityValues("filters.host", filters.host(), errors);
        validateEntityValues("filters.ip", filters.ip(), errors);
        validateIpValues(filters.ip(), errors);
    }

    private void validateSort(SearchPlan plan, List<String> errors) {
        if (plan.sort() == null || plan.sort().isEmpty()) {
            return;
        }

        if (plan.mode() == SearchMode.AGGREGATION) {
            errors.add("sort: is only supported when mode is search");
            return;
        }

        for (var sort : plan.sort()) {
            if (sort == null) {
                errors.add("sort: must not contain null items");
                continue;
            }

            rejectDangerousValue("sort.field", sort.field(), errors);
            if (sort.field() != null && !SearchPlanContract.SEARCH_SORT_FIELD_ALLOWLIST.contains(sort.field())) {
                errors.add("sort.field: must be one of "
                        + String.join(", ", SearchPlanContract.SEARCH_SORT_FIELD_ALLOWLIST));
            }
        }
    }

    private void validateTimeRange(TimeRange timeRange, List<String> errors) {
        if (timeRange == null) {
            return;
        }

        validateTimeExpression("filters.timestamp.from", timeRange.from(), errors);
        validateTimeExpression("filters.timestamp.to", timeRange.to(), errors);
        validateAbsoluteTimeOrder(timeRange, errors);
    }

    private void validateTimeExpression(String field, String value, List<String> errors) {
        if (value == null || value.isBlank()) {
            return;
        }

        if ("now".equals(value) || isSupportedRelativeTime(value) || parseAbsoluteTime(value).isPresent()) {
            return;
        }

        errors.add(field + ": must be ISO-8601, now, now-<number>h up to now-720h, or now-<number>d up to now-90d");
    }

    private void validateAbsoluteTimeOrder(TimeRange timeRange, List<String> errors) {
        var from = parseAbsoluteTime(timeRange.from());
        var to = parseAbsoluteTime(timeRange.to());

        if (from.isPresent() && to.isPresent() && from.get().isAfter(to.get())) {
            errors.add("filters.timestamp: from must be before or equal to to");
        }
    }

    private Optional<Instant> parseAbsoluteTime(String value) {
        if (value == null || value.isBlank() || "now".equals(value) || isSupportedRelativeTime(value)) {
            return Optional.empty();
        }

        try {
            return Optional.of(Instant.parse(value));
        } catch (DateTimeParseException ignored) {
            try {
                return Optional.of(OffsetDateTime.parse(value).toInstant());
            } catch (DateTimeParseException ignoredAgain) {
                return Optional.empty();
            }
        }
    }

    private boolean isSupportedRelativeTime(String value) {
        var matcher = RELATIVE_TIME_PATTERN.matcher(value);
        if (!matcher.matches()) {
            return false;
        }

        var amount = Integer.parseInt(matcher.group(1));
        var unit = matcher.group(2);
        if (amount < 1) {
            return false;
        }

        return switch (unit) {
            case "h" -> amount <= SearchPlanContract.MAX_RELATIVE_HOURS;
            case "d" -> amount <= SearchPlanContract.MAX_RELATIVE_DAYS;
            default -> false;
        };
    }

    private void rejectDangerousValues(String field, List<String> values, List<String> errors) {
        if (values == null) {
            return;
        }

        for (var value : values) {
            rejectDangerousValue(field, value, errors);
        }
    }

    private void validateEntityValues(String field, List<String> values, List<String> errors) {
        if (values == null) {
            return;
        }
        if (values.isEmpty()) {
            errors.add(field + ": must not be empty");
            return;
        }
        if (values.size() > SearchPlanContract.MAX_ENTITY_FILTER_VALUES) {
            errors.add(field + ": must contain at most " + SearchPlanContract.MAX_ENTITY_FILTER_VALUES + " values");
        }

        for (var value : values) {
            if (value == null || value.isBlank()) {
                errors.add(field + ": values must not be blank");
                continue;
            }
            rejectDangerousValue(field, value, errors);
        }
    }

    private void validateIpValues(List<String> values, List<String> errors) {
        if (values == null) {
            return;
        }

        for (var value : values) {
            if (value != null && !value.isBlank() && !IPV4_PATTERN.matcher(value).matches()) {
                errors.add("filters.ip: must contain only valid IPv4 addresses");
            }
        }
    }

    private void validateEventIds(List<String> values, List<String> errors) {
        if (values == null) {
            return;
        }
        if (values.isEmpty()) {
            errors.add("filters.event_id: must not be empty");
            return;
        }
        if (values.size() > SearchPlanContract.MAX_EVENT_ID_FILTER_VALUES) {
            errors.add("filters.event_id: must contain at most "
                    + SearchPlanContract.MAX_EVENT_ID_FILTER_VALUES + " values");
        }

        for (var value : values) {
            if (value == null || value.isBlank()) {
                errors.add("filters.event_id: values must not be blank");
                continue;
            }
            rejectDangerousValue("filters.event_id", value, errors);
            try {
                UUID.fromString(value.trim());
            } catch (IllegalArgumentException exception) {
                errors.add("filters.event_id: values must be valid UUIDs");
            }
        }
    }

    private void rejectDangerousValue(String field, String value, List<String> errors) {
        if (value == null || value.isBlank()) {
            return;
        }

        if (value.contains("*") || value.contains("?")) {
            errors.add(field + ": wildcard query syntax is not allowed");
        }

        var normalized = value.toLowerCase(Locale.ROOT);
        if (normalized.contains("script") || normalized.contains("painless") || normalized.contains("query_string")) {
            errors.add(field + ": script query syntax is not allowed");
        }
    }
}
