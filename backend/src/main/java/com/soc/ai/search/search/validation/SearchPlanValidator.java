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

import com.soc.ai.search.search.plan.SearchFilters;
import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.search.plan.SearchPlan;
import com.soc.ai.search.search.plan.TimeRange;
import jakarta.validation.Validator;
import org.springframework.stereotype.Service;

@Service
public class SearchPlanValidator {

    private static final Set<String> SUPPORTED_RELATIVE_TIMES = Set.of(
            "now",
            "now-24h",
            "now-7d",
            "now-30d");

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
        if (plan.mode() != null && plan.mode() != SearchMode.SEARCH) {
            errors.add("mode: only search is supported in day 3 MVP scope");
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

        if (SUPPORTED_RELATIVE_TIMES.contains(value) || parseAbsoluteTime(value).isPresent()) {
            return;
        }

        errors.add(field + ": must be ISO-8601 or one of now, now-24h, now-7d, now-30d");
    }

    private void validateAbsoluteTimeOrder(TimeRange timeRange, List<String> errors) {
        var from = parseAbsoluteTime(timeRange.from());
        var to = parseAbsoluteTime(timeRange.to());

        if (from.isPresent() && to.isPresent() && from.get().isAfter(to.get())) {
            errors.add("filters.timestamp: from must be before or equal to to");
        }
    }

    private Optional<Instant> parseAbsoluteTime(String value) {
        if (value == null || value.isBlank() || SUPPORTED_RELATIVE_TIMES.contains(value)) {
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
