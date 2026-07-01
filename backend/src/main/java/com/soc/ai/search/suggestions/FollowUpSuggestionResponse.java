package com.soc.ai.search.suggestions;

import java.util.List;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record FollowUpSuggestionResponse(
        String source,
        List<FollowUpSuggestion> suggestions) {

    public static FollowUpSuggestionResponse empty() {
        return new FollowUpSuggestionResponse("none", List.of());
    }

    public static FollowUpSuggestionResponse llm(List<FollowUpSuggestion> suggestions) {
        return new FollowUpSuggestionResponse("llm", List.copyOf(suggestions));
    }
}
