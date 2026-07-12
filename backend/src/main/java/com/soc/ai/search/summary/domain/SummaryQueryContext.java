package com.soc.ai.search.summary.domain;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SummaryQueryContext(
        String mode,
        String timeFrom,
        String timeTo,
        List<String> source,
        List<String> severity,
        List<String> eventType,
        List<String> user,
        List<String> host,
        List<String> ip,
        List<String> countryCode,
        String messageQuery,
        String sortField,
        String sortOrder,
        String aggregationType,
        String aggregationField,
        Integer topN,
        String interval,
        String orderBy,
        String order) {
}
