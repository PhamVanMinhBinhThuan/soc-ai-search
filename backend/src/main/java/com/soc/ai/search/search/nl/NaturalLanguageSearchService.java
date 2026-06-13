package com.soc.ai.search.search.nl;

import java.time.Duration;
import java.util.List;

import com.soc.ai.search.llm.LlmClient;
import com.soc.ai.search.llm.LlmResponse;
import com.soc.ai.search.llm.LlmSearchPlanRequest;
import com.soc.ai.search.llm.gemini.GeminiRateLimitException;
import com.soc.ai.search.llm.prompt.SearchPlanJsonParseException;
import com.soc.ai.search.llm.prompt.SearchPlanJsonParser;
import com.soc.ai.search.llm.prompt.SearchPlanPromptBuilder;
import com.soc.ai.search.search.execution.AggregationSearchResponse;
import com.soc.ai.search.search.execution.SearchPlanExecutor;
import com.soc.ai.search.search.execution.SearchPlanSearchResponse;
import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.search.plan.SearchPlan;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class NaturalLanguageSearchService {

    private static final Logger LOGGER = LoggerFactory.getLogger(NaturalLanguageSearchService.class);

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
            LOGGER.warn(
                    "Initial LLM SearchPlan output failed validation; attempting one repair: {}",
                    initialException.errors());
            var repairResponse = callLlm(promptBuilder.buildRepairSearchPlanRequest(
                    request.question(),
                    initialLlmResponse.content(),
                    initialException.errors()));
            llmLatencyMs += repairResponse.latencyMs();
            searchPlan = parseRepairedOutput(repairResponse.content(), request);
        }

        if (searchPlan.mode() == SearchMode.AGGREGATION) {
            var aggregationResponse = searchPlanExecutor.aggregate(searchPlan);
            return aggregationResponse(request, searchPlan, llmLatencyMs, startedAt, aggregationResponse);
        }

        var searchResponse = searchPlanExecutor.search(searchPlan);
        return searchResponse(request, searchPlan, llmLatencyMs, startedAt, searchResponse);
    }

    private NaturalLanguageSearchResponse searchResponse(
            NaturalLanguageSearchRequest request,
            SearchPlan searchPlan,
            long llmLatencyMs,
            long startedAt,
            SearchPlanSearchResponse searchResponse) {
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
                null,
                List.of(),
                null,
                searchResponse.events());
    }

    private NaturalLanguageSearchResponse aggregationResponse(
            NaturalLanguageSearchRequest request,
            SearchPlan searchPlan,
            long llmLatencyMs,
            long startedAt,
            AggregationSearchResponse aggregationResponse) {
        var searchLatencyMs = aggregationResponse.latencyMs();
        var latencyMs = Math.max(elapsedMs(startedAt), llmLatencyMs + searchLatencyMs);

        return new NaturalLanguageSearchResponse(
                request.question(),
                aggregationResponse.mode(),
                searchPlan,
                aggregationResponse.generatedDsl(),
                aggregationResponse.total(),
                request.page(),
                request.size(),
                0,
                llmLatencyMs,
                searchLatencyMs,
                latencyMs,
                aggregationResponse.aggregationType(),
                aggregationResponse.aggregationResults(),
                aggregationResponse.chartMetadata(),
                List.of());
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
        } catch (GeminiRateLimitException exception) {
            throw new NaturalLanguageSearchRateLimitException(
                    "LLM rate limit exceeded",
                    List.of("Gemini quota exceeded; retry later or check the Google AI Studio quota and billing settings"),
                    exception);
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
