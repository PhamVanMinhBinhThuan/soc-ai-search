package com.soc.ai.search.summary;

import java.time.Duration;

import com.soc.ai.search.llm.LlmClient;
import com.soc.ai.search.search.execution.AggregationSearchResponse;
import com.soc.ai.search.search.execution.SearchPlanSearchResponse;
import com.soc.ai.search.search.plan.SearchPlan;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class ResultSummaryService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ResultSummaryService.class);

    private final ElasticsearchSummaryQueryService summaryQueryService;
    private final SummaryPayloadBuilder payloadBuilder;
    private final SummaryPromptBuilder promptBuilder;
    private final SummaryTextValidator textValidator;
    private final DeterministicSummaryGenerator fallbackGenerator;
    private final LlmClient llmClient;

    public ResultSummaryService(
            ElasticsearchSummaryQueryService summaryQueryService,
            SummaryPayloadBuilder payloadBuilder,
            SummaryPromptBuilder promptBuilder,
            SummaryTextValidator textValidator,
            DeterministicSummaryGenerator fallbackGenerator,
            LlmClient llmClient) {
        this.summaryQueryService = summaryQueryService;
        this.payloadBuilder = payloadBuilder;
        this.promptBuilder = promptBuilder;
        this.textValidator = textValidator;
        this.fallbackGenerator = fallbackGenerator;
        this.llmClient = llmClient;
    }

    public SummaryResult summarizeSearch(
            String originalQuestion,
            SearchPlan plan,
            SearchPlanSearchResponse response) {
        var startedAt = System.nanoTime();
        if (response.total() == 0) {
            return fallback(originalQuestion, payloadBuilder.searchFallback(0, response.events()), startedAt);
        }

        final SummaryPayload payload;
        try {
            payload = payloadBuilder.search(response.total(), summaryQueryService.load(plan));
        } catch (RuntimeException exception) {
            LOGGER.warn("Search summary query failed; using deterministic fallback: {}", exception.getMessage());
            return fallback(originalQuestion, payloadBuilder.searchFallback(response.total(), response.events()), startedAt);
        }
        return summarize(originalQuestion, payload, startedAt);
    }

    public SummaryResult summarizeAggregation(
            String originalQuestion,
            AggregationSearchResponse response) {
        var startedAt = System.nanoTime();
        var payload = payloadBuilder.aggregation(response);
        if (response.aggregationResults() == null || response.aggregationResults().isEmpty()) {
            return fallback(originalQuestion, payload, startedAt);
        }
        return summarize(originalQuestion, payload, startedAt);
    }

    private SummaryResult summarize(String originalQuestion, SummaryPayload payload, long startedAt) {
        try {
            var payloadJson = payloadBuilder.toJson(payload);
            var llmResponse = llmClient.generateSummary(promptBuilder.build(originalQuestion, payloadJson));
            if (textValidator.isValid(llmResponse.content())) {
                return new SummaryResult(
                        llmResponse.content().strip(),
                        SummarySource.LLM,
                        elapsedMs(startedAt));
            }
            LOGGER.warn("LLM summary output was invalid; using deterministic fallback");
        } catch (RuntimeException exception) {
            LOGGER.warn("LLM summary failed; using deterministic fallback: {}", exception.getMessage());
        }
        return fallback(originalQuestion, payload, startedAt);
    }

    private SummaryResult fallback(String originalQuestion, SummaryPayload payload, long startedAt) {
        return new SummaryResult(
                fallbackGenerator.generate(payload, originalQuestion),
                SummarySource.FALLBACK,
                elapsedMs(startedAt));
    }

    private long elapsedMs(long startedAt) {
        return Duration.ofNanos(System.nanoTime() - startedAt).toMillis();
    }
}
