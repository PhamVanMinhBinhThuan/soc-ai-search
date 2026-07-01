package com.soc.ai.search.llm;

public interface LlmClient {

    LlmResponse generateSearchPlan(LlmSearchPlanRequest request);

    LlmResponse generateSummary(LlmSummaryRequest request);

    LlmResponse generateRefinedQuestion(LlmQuestionRefinementRequest request);

    LlmResponse generateFollowUpSuggestions(LlmFollowUpSuggestionsRequest request);
}
