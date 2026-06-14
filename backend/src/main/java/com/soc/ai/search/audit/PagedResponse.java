package com.soc.ai.search.audit;

import java.util.List;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record PagedResponse<T>(
        List<T> items,
        int page,
        int size,
        long total,
        int totalPages) {
}
