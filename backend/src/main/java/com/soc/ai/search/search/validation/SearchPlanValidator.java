package com.soc.ai.search.search.validation;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

import com.soc.ai.search.search.plan.AggregationPlan;
import com.soc.ai.search.search.plan.AggregationType;
import com.soc.ai.search.search.plan.SearchFilters;
import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.search.plan.SearchPlan;
import com.soc.ai.search.search.plan.TimeRange;
import jakarta.validation.Validator;
import org.springframework.stereotype.Service;

@Service
public class SearchPlanValidator {

    private static final Pattern RELATIVE_TIME_PATTERN = Pattern.compile("^now-(\\d+)(h|d)$");
    private static final int MAX_RELATIVE_HOURS = 720;
    private static final int MAX_RELATIVE_DAYS = 90;

    private static final Set<String> AGGREGATION_FIELD_ALLOWLIST = Set.of(
            "source",
            "severity",
            "event_type",
            "user",
            "host",
            "ip",
            "country_code");

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
    }

    private void validateGroupByAggregation(AggregationPlan aggregation, List<String> errors) {
        validateRequiredAggregationField(aggregation.field(), errors);
        validateOptionalTopN(aggregation.topN(), errors);
        if (aggregation.interval() != null) {
            errors.add("aggregation.interval: must be null for group_by aggregation");
        }
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
    }

    private void validateRequiredAggregationField(String field, List<String> errors) {
        if (field == null || field.isBlank()) {
            errors.add("aggregation.field: must not be blank");
            return;
        }

        if (!AGGREGATION_FIELD_ALLOWLIST.contains(field)) {
            errors.add("aggregation.field: must be one of " + String.join(", ", AGGREGATION_FIELD_ALLOWLIST));
        }
    }

    private void validateOptionalTopN(Integer topN, List<String> errors) {
        if (topN == null) {
            return;
        }

        if (topN < 1 || topN > 100) {
            errors.add("aggregation.top_n: must be between 1 and 100");
        }
    }

    private void validateFilters(SearchFilters filters, List<String> errors) {
        if (filters == null) {
            return;
        }

        validateTimeRange(filters.timestamp(), errors);
        rejectDangerousValues("filters.event_type", filters.eventType(), errors);
        rejectDangerousValue("filters.user", filters.user(), errors);
        rejectDangerousValue("filters.host", filters.host(), errors);
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
            case "h" -> amount <= MAX_RELATIVE_HOURS;
            case "d" -> amount <= MAX_RELATIVE_DAYS;
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

    private void rejectDangerousValue(String field, String value, List<String> errors) {
        if (value == null || value.isBlank()) {
            return;
        }

        if (value.contains("*") || value.contains("?")) {
            errors.add(field + ": wildcard query syntax is not allowed");
        }

        var normalized = value.toLowerCase(Locale.ROOT);
        if (normalized.contains("script") || normalized.contains("painless")) {
            errors.add(field + ": script query syntax is not allowed");
        }
    }
}
