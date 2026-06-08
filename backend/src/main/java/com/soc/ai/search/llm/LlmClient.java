package com.soc.ai.search.llm;

public interface LlmClient {

    LlmResponse generateSearchPlan(LlmSearchPlanRequest request);
}
