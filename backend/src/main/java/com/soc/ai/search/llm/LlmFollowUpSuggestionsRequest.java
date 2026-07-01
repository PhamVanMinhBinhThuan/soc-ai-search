package com.soc.ai.search.llm;

public record LlmFollowUpSuggestionsRequest(
        String systemPrompt,
        String userContent) {
}
