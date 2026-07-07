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
    private final SummaryLanguageDetector languageDetector;
    private final LlmClient llmClient;

    public ResultSummaryService(
            ElasticsearchSummaryQueryService summaryQueryService,
            SummaryPayloadBuilder payloadBuilder,
            SummaryPromptBuilder promptBuilder,
            SummaryTextValidator textValidator,
            DeterministicSummaryGenerator fallbackGenerator,
            SummaryLanguageDetector languageDetector,
            LlmClient llmClient) {
        this.summaryQueryService = summaryQueryService;
        this.payloadBuilder = payloadBuilder;
        this.promptBuilder = promptBuilder;
        this.textValidator = textValidator;
        this.fallbackGenerator = fallbackGenerator;
        this.languageDetector = languageDetector;
        this.llmClient = llmClient;
    }

    public SummaryResult summarizeSearch(
            String originalQuestion,
            SearchPlan plan,
            SearchPlanSearchResponse response) {
        var startedAt = System.nanoTime();
        var language = languageDetector.detect(originalQuestion);
        if (response.total() == 0) {
            return fallback(language, payloadBuilder.searchFallback(language, plan, 0, response.events()), startedAt);
        }

        final SummaryPayload payload;
        try {
            payload = payloadBuilder.search(language, plan, response.total(), summaryQueryService.load(plan));
        } catch (RuntimeException exception) {
            LOGGER.warn("Search summary query failed; using deterministic fallback: {}", exception.getMessage());
            return fallback(language, payloadBuilder.searchFallback(language, plan, response.total(), response.events()), startedAt);
        }
        return summarize(language, payload, startedAt);
    }

    public SummaryResult summarizeAggregation(
            String originalQuestion,
            SearchPlan plan,
            AggregationSearchResponse response) {
        var startedAt = System.nanoTime();
        var language = languageDetector.detect(originalQuestion);
        var payload = payloadBuilder.aggregation(language, plan, response);
        if (response.aggregationResults() == null || response.aggregationResults().isEmpty()) {
            return fallback(language, payload, startedAt);
        }
        return summarize(language, payload, startedAt);
    }

    private SummaryResult summarize(SummaryLanguage language, SummaryPayload payload, long startedAt) {
        try {
            var payloadJson = payloadBuilder.toJson(payload);
            var llmResponse = llmClient.generateSummary(promptBuilder.build(language, payloadJson));
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
        return fallback(language, payload, startedAt);
    }

    private SummaryResult fallback(SummaryLanguage language, SummaryPayload payload, long startedAt) {
        return new SummaryResult(
                fallbackGenerator.generate(payload, language),
                SummarySource.FALLBACK,
                elapsedMs(startedAt));
    }

    private long elapsedMs(long startedAt) {
        return Duration.ofNanos(System.nanoTime() - startedAt).toMillis();
    }
}
