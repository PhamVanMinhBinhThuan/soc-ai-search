package com.soc.ai.search.search.execution;

import java.util.UUID;

import com.soc.ai.search.audit.QueryIdGenerator;
import com.soc.ai.search.audit.SearchAuditService;
import com.soc.ai.search.security.CurrentUserService;
import com.soc.ai.search.search.plan.SearchPlan;
import com.soc.ai.search.summary.ResultSummaryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/search")
@Tag(name = "Search", description = "Technical SearchPlan APIs")
public class SearchController {

    private static final Logger LOGGER = LoggerFactory.getLogger(SearchController.class);

    private final SearchPlanExecutor searchPlanExecutor;
    private final ResultSummaryService resultSummaryService;
    private final SearchAuditService searchAuditService;
    private final QueryIdGenerator queryIdGenerator;
    private final CurrentUserService currentUserService;

    public SearchController(
            SearchPlanExecutor searchPlanExecutor,
            ResultSummaryService resultSummaryService,
            SearchAuditService searchAuditService,
            QueryIdGenerator queryIdGenerator,
            CurrentUserService currentUserService) {
        this.searchPlanExecutor = searchPlanExecutor;
        this.resultSummaryService = resultSummaryService;
        this.searchAuditService = searchAuditService;
        this.queryIdGenerator = queryIdGenerator;
        this.currentUserService = currentUserService;
    }

    @PostMapping("/plan")
    @PreAuthorize("@rbacPermissionService.authDisabled() or hasRole('SOC_VIEWER')")
    @Operation(
            summary = "Execute a validated SearchPlan",
            description = "Requires SOC_VIEWER. Technical endpoint for deterministic search or aggregation SearchPlan execution.")
    public SearchPlanExecutionResponse searchByPlan(
            @Valid @RequestBody SearchPlan searchPlan,
            @RequestParam(name = "include_summary", defaultValue = "false") boolean includeSummary,
            @RequestParam(name = "audit", defaultValue = "true") boolean audit,
            @RequestParam(name = "summary_question", required = false) String summaryQuestion) {
        var effectiveSummaryQuestion = effectiveSummaryQuestion(summaryQuestion);
        var queryId = queryIdGenerator.generate();
        var startedAt = System.nanoTime();
        var identity = currentUserService.currentIdentity();

        try {
            LOGGER.info(
                    "Executing SearchPlan. query_id={} user_identity={} mode={} include_summary={} audit={}",
                    queryId,
                    identity,
                    searchPlan.mode(),
                    includeSummary,
                    audit);
            var response = searchPlanExecutor.execute(searchPlan);
            SearchPlanExecutionResponse executionResponse;

            if (response instanceof SearchPlanSearchResponse searchResponse) {
                if (!includeSummary) {
                    executionResponse = SearchPlanExecutionResponse.fromSearch(queryId, searchResponse);
                } else {
                    var summary = resultSummaryService.summarizeSearch(
                            effectiveSummaryQuestion,
                            searchPlan,
                            searchResponse);
                    executionResponse = SearchPlanExecutionResponse.fromSearch(
                            queryId,
                            searchResponse,
                            summary.latencyMs(),
                            summary.summary(),
                            summary.source());
                }
            } else if (response instanceof AggregationSearchResponse aggregationResponse) {
                if (!includeSummary) {
                    executionResponse = SearchPlanExecutionResponse.fromAggregation(
                            queryId,
                            aggregationResponse,
                            searchPlan.page(),
                            searchPlan.size());
                } else {
                    var summary = resultSummaryService.summarizeAggregation(
                            effectiveSummaryQuestion,
                            searchPlan,
                            aggregationResponse);
                    executionResponse = SearchPlanExecutionResponse.fromAggregation(
                            queryId,
                            aggregationResponse,
                            searchPlan.page(),
                            searchPlan.size(),
                            summary.latencyMs(),
                            summary.summary(),
                            summary.source());
                }
            } else {
                throw new SearchExecutionException(
                        "Unsupported SearchPlan execution response type",
                        new IllegalStateException(response == null ? "null" : response.getClass().getName()));
            }

            if (audit) {
                searchAuditService.saveSuccess(
                        queryId,
                        effectiveSummaryQuestion,
                        searchPlan,
                        executionResponse.generatedDsl(),
                        executionResponse.total(),
                        executionResponse.latencyMs(),
                        executionResponse.summary());
            }
            LOGGER.info(
                    "SearchPlan execution completed. query_id={} user_identity={} mode={} total={} latency_ms={}",
                    queryId,
                    identity,
                    executionResponse.mode(),
                    executionResponse.total(),
                    executionResponse.latencyMs());
            return executionResponse;
        } catch (RuntimeException exception) {
            LOGGER.warn(
                    "SearchPlan execution failed. query_id={} user_identity={} mode={} latency_ms={} error_type={}",
                    queryId,
                    identity,
                    searchPlan.mode(),
                    elapsedMs(startedAt),
                    exception.getClass().getSimpleName());
            if (audit) {
                searchAuditService.saveFailure(
                        queryId,
                        effectiveSummaryQuestion,
                        searchPlan,
                        null,
                        elapsedMs(startedAt),
                        exception);
            }
            throw exception;
        }
    }

    private long elapsedMs(long startedAt) {
        return Math.max(0, (System.nanoTime() - startedAt) / 1_000_000);
    }

    private String effectiveSummaryQuestion(String summaryQuestion) {
        if (summaryQuestion == null || summaryQuestion.isBlank()) {
            return "Edited SearchPlan";
        }
        return summaryQuestion.strip();
    }
}
