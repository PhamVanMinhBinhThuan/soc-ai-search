package com.soc.ai.search.llm.application;

public record LlmFollowUpSuggestionsRequest(
        String systemPrompt,
        String userContent) {
}
