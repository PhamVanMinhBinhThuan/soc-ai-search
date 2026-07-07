package com.soc.ai.search.search.nl;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

import com.soc.ai.search.audit.AuditPersistenceException;
import com.soc.ai.search.audit.QueryIdGenerator;
import com.soc.ai.search.audit.SearchAuditService;
import com.soc.ai.search.llm.LlmClient;
import com.soc.ai.search.llm.LlmRateLimitException;
import com.soc.ai.search.llm.LlmResponse;
import com.soc.ai.search.llm.LlmSearchPlanRequest;
import com.soc.ai.search.llm.prompt.SearchPlanJsonParseException;
import com.soc.ai.search.llm.prompt.SearchPlanJsonParser;
import com.soc.ai.search.llm.prompt.SearchPlanPromptBuilder;
import com.soc.ai.search.search.execution.AggregationSearchResponse;
import com.soc.ai.search.search.execution.SearchPlanExecutor;
import com.soc.ai.search.search.execution.SearchPlanSearchResponse;
import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.search.plan.SearchPlan;
import com.soc.ai.search.summary.ResultSummaryService;
import com.soc.ai.search.summary.SummaryResult;
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
    private final SearchAuditService searchAuditService;
    private final QueryIdGenerator queryIdGenerator;
    private final ResultSummaryService resultSummaryService;

    public NaturalLanguageSearchService(
            SearchPlanPromptBuilder promptBuilder,
            LlmClient llmClient,
            SearchPlanJsonParser searchPlanJsonParser,
            SearchPlanExecutor searchPlanExecutor,
            SearchAuditService searchAuditService,
            QueryIdGenerator queryIdGenerator,
            ResultSummaryService resultSummaryService) {
        this.promptBuilder = promptBuilder;
        this.llmClient = llmClient;
        this.searchPlanJsonParser = searchPlanJsonParser;
        this.searchPlanExecutor = searchPlanExecutor;
        this.searchAuditService = searchAuditService;
        this.queryIdGenerator = queryIdGenerator;
        this.resultSummaryService = resultSummaryService;
    }

    public NaturalLanguageSearchResponse search(NaturalLanguageSearchRequest request) {
        UUID queryId = queryIdGenerator.generate();
        var startedAt = System.nanoTime();
        SearchPlan searchPlan = null;

        try {
            var initialLlmResponse = callLlm(promptBuilder.buildSearchPlanRequest(request.question()));
            var llmLatencyMs = initialLlmResponse.latencyMs();

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
                var summaryResult = resultSummaryService.summarizeAggregation(
                        request.question(),
                        searchPlan,
                        aggregationResponse);
                var response = aggregationResponse(
                        queryId,
                        request,
                        searchPlan,
                        llmLatencyMs,
                        startedAt,
                        aggregationResponse,
                        summaryResult);
                saveSuccessAudit(queryId, request, searchPlan, response);
                return response;
            }

            var searchResponse = searchPlanExecutor.search(searchPlan);
            var summaryResult = resultSummaryService.summarizeSearch(
                    request.question(),
                    searchPlan,
                    searchResponse);
            var response = searchResponse(
                    queryId,
                    request,
                    searchPlan,
                    llmLatencyMs,
                    startedAt,
                    searchResponse,
                    summaryResult);
            saveSuccessAudit(queryId, request, searchPlan, response);
            return response;
        } catch (AuditPersistenceException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            saveFailureAudit(queryId, request, searchPlan, startedAt, exception);
            throw exception;
        }
    }

    private NaturalLanguageSearchResponse searchResponse(
            UUID queryId,
            NaturalLanguageSearchRequest request,
            SearchPlan searchPlan,
            long llmLatencyMs,
            long startedAt,
            SearchPlanSearchResponse searchResponse,
            SummaryResult summaryResult) {
        var searchLatencyMs = searchResponse.latencyMs();
        var latencyMs = Math.max(
                elapsedMs(startedAt),
                llmLatencyMs + searchLatencyMs + summaryResult.latencyMs());

        return new NaturalLanguageSearchResponse(
                queryId,
                auditQuestion(request),
                searchResponse.mode(),
                searchPlan,
                searchResponse.generatedDsl(),
                searchResponse.total(),
                searchResponse.page(),
                searchResponse.size(),
                searchResponse.totalPages(),
                llmLatencyMs,
                searchLatencyMs,
                summaryResult.latencyMs(),
                latencyMs,
                summaryResult.summary(),
                summaryResult.source(),
                null,
                List.of(),
                null,
                searchResponse.events());
    }

    private NaturalLanguageSearchResponse aggregationResponse(
            UUID queryId,
            NaturalLanguageSearchRequest request,
            SearchPlan searchPlan,
            long llmLatencyMs,
            long startedAt,
            AggregationSearchResponse aggregationResponse,
            SummaryResult summaryResult) {
        var searchLatencyMs = aggregationResponse.latencyMs();
        var latencyMs = Math.max(
                elapsedMs(startedAt),
                llmLatencyMs + searchLatencyMs + summaryResult.latencyMs());

        return new NaturalLanguageSearchResponse(
                queryId,
                auditQuestion(request),
                aggregationResponse.mode(),
                searchPlan,
                aggregationResponse.generatedDsl(),
                aggregationResponse.total(),
                request.page(),
                request.size(),
                0,
                llmLatencyMs,
                searchLatencyMs,
                summaryResult.latencyMs(),
                latencyMs,
                summaryResult.summary(),
                summaryResult.source(),
                aggregationResponse.aggregationType(),
                aggregationResponse.aggregationResults(),
                aggregationResponse.chartMetadata(),
                List.of());
    }

    private void saveSuccessAudit(
            UUID queryId,
            NaturalLanguageSearchRequest request,
            SearchPlan searchPlan,
            NaturalLanguageSearchResponse response) {
        try {
            searchAuditService.saveSuccess(
                    queryId,
                    auditQuestion(request),
                    searchPlan,
                    response.generatedDsl(),
                    response.total(),
                    response.latencyMs(),
                    response.summary());
        } catch (AuditPersistenceException exception) {
            throw new AuditPersistenceException("Search completed but audit persistence failed", exception);
        }
    }

    private void saveFailureAudit(
            UUID queryId,
            NaturalLanguageSearchRequest request,
            SearchPlan searchPlan,
            long startedAt,
            RuntimeException originalException) {
        try {
            searchAuditService.saveFailure(
                    queryId,
                    auditQuestion(request),
                    searchPlan,
                    null,
                    elapsedMs(startedAt),
                    originalException);
        } catch (AuditPersistenceException auditException) {
            LOGGER.error(
                    "Failed to persist FAILED audit record; preserving original search error. query_id={}",
                    queryId,
                    auditException);
        }
    }

    private SearchPlan parseWithRequestPagination(String rawContent, NaturalLanguageSearchRequest request) {
        return searchPlanJsonParser.parseWithPaginationOverride(rawContent, request.page(), request.size());
    }

    private String auditQuestion(NaturalLanguageSearchRequest request) {
        if (request.auditQuestion() != null && !request.auditQuestion().isBlank()) {
            return request.auditQuestion().trim();
        }
        return request.question();
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
        } catch (LlmRateLimitException exception) {
            throw new NaturalLanguageSearchRateLimitException(
                    "LLM rate limit exceeded",
                    List.of("LLM quota exceeded; retry later or check the provider quota and billing settings"),
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
