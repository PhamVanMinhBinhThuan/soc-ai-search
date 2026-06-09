package com.soc.ai.search.search.nl;

import java.time.Duration;
import java.util.List;

import com.soc.ai.search.llm.LlmClient;
import com.soc.ai.search.llm.LlmResponse;
import com.soc.ai.search.llm.LlmSearchPlanRequest;
import com.soc.ai.search.llm.prompt.SearchPlanJsonParseException;
import com.soc.ai.search.llm.prompt.SearchPlanJsonParser;
import com.soc.ai.search.llm.prompt.SearchPlanPromptBuilder;
import com.soc.ai.search.search.execution.SearchPlanExecutor;
import com.soc.ai.search.search.plan.SearchPlan;
import org.springframework.stereotype.Service;

@Service
public class NaturalLanguageSearchService {

    private final SearchPlanPromptBuilder promptBuilder;
    private final LlmClient llmClient;
    private final SearchPlanJsonParser searchPlanJsonParser;
    private final SearchPlanExecutor searchPlanExecutor;

    public NaturalLanguageSearchService(
            SearchPlanPromptBuilder promptBuilder,
            LlmClient llmClient,
            SearchPlanJsonParser searchPlanJsonParser,
            SearchPlanExecutor searchPlanExecutor) {
        this.promptBuilder = promptBuilder;
        this.llmClient = llmClient;
        this.searchPlanJsonParser = searchPlanJsonParser;
        this.searchPlanExecutor = searchPlanExecutor;
    }

    public NaturalLanguageSearchResponse search(NaturalLanguageSearchRequest request) {
        var startedAt = System.nanoTime();
        var initialLlmResponse = callLlm(promptBuilder.buildSearchPlanRequest(request.question()));
        var llmLatencyMs = initialLlmResponse.latencyMs();
        SearchPlan searchPlan;

        try {
            searchPlan = parseWithRequestPagination(initialLlmResponse.content(), request);
        } catch (SearchPlanJsonParseException initialException) {
            var repairResponse = callLlm(promptBuilder.buildRepairSearchPlanRequest(
                    request.question(),
                    initialLlmResponse.content(),
                    initialException.errors()));
            llmLatencyMs += repairResponse.latencyMs();
            searchPlan = parseRepairedOutput(repairResponse.content(), request);
        }

        var searchResponse = searchPlanExecutor.search(searchPlan);
        var searchLatencyMs = searchResponse.latencyMs();
        var latencyMs = Math.max(elapsedMs(startedAt), llmLatencyMs + searchLatencyMs);

        return new NaturalLanguageSearchResponse(
                request.question(),
                searchResponse.mode(),
                searchPlan,
                searchResponse.generatedDsl(),
                searchResponse.total(),
                searchResponse.page(),
                searchResponse.size(),
                searchResponse.totalPages(),
                llmLatencyMs,
                searchLatencyMs,
                latencyMs,
                searchResponse.events());
    }

    private SearchPlan parseWithRequestPagination(String rawContent, NaturalLanguageSearchRequest request) {
        return searchPlanJsonParser.parseWithPaginationOverride(rawContent, request.page(), request.size());
    }

    private SearchPlan parseRepairedOutput(String rawContent, NaturalLanguageSearchRequest request) {
        try {
            return parseWithRequestPagination(rawContent, request);
        } catch (SearchPlanJsonParseException exception) {
            throw new NaturalLanguageSearchException(
                    "LLM output is invalid",
                    exception.errors(),
                    exception);
        }
    }

    private LlmResponse callLlm(LlmSearchPlanRequest request) {
        try {
            return llmClient.generateSearchPlan(request);
        } catch (RuntimeException exception) {
            throw new NaturalLanguageSearchException(
                    "LLM provider is unavailable",
                    List.of("LLM request failed"),
                    exception);
        }
    }

    private long elapsedMs(long startedAt) {
        return Duration.ofNanos(System.nanoTime() - startedAt).toMillis();
    }
}
