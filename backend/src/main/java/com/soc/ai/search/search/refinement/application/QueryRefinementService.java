package com.soc.ai.search.search.refinement.application;


import java.util.List;
import java.util.Locale;

import com.soc.ai.search.llm.application.LlmClient;
import com.soc.ai.search.llm.application.LlmException;
import com.soc.ai.search.llm.application.LlmRateLimitException;
import org.springframework.stereotype.Service;

import com.soc.ai.search.search.refinement.api.QueryRefinementRequest;
import com.soc.ai.search.search.refinement.api.QueryRefinementResponse;
@Service
public class QueryRefinementService {

    private static final int MAX_REWRITTEN_QUESTION_LENGTH = 500;

    private final QueryRefinementPromptBuilder promptBuilder;
    private final LlmClient llmClient;

    public QueryRefinementService(
            QueryRefinementPromptBuilder promptBuilder,
            LlmClient llmClient) {
        this.promptBuilder = promptBuilder;
        this.llmClient = llmClient;
    }

    public QueryRefinementResponse refine(QueryRefinementRequest request) {
        try {
            var llmResponse = llmClient.generateRefinedQuestion(promptBuilder.build(request));
            var rewrittenQuestion = validateAndNormalize(llmResponse.content());
            return new QueryRefinementResponse(
                    rewrittenQuestion,
                    llmResponse.model(),
                    llmResponse.latencyMs());
        } catch (QueryRefinementException exception) {
            throw exception;
        } catch (LlmRateLimitException exception) {
            throw new QueryRefinementException(
                    "Unable to refine query right now. Please edit the question manually.",
                    List.of("LLM rate limit exceeded; retry later"),
                    exception);
        } catch (LlmException exception) {
            throw new QueryRefinementException(
                    "Unable to refine query right now. Please edit the question manually.",
                    List.of("LLM query refinement failed"),
                    exception);
        } catch (RuntimeException exception) {
            throw new QueryRefinementException(
                    "Unable to refine query right now. Please edit the question manually.",
                    List.of("Query refinement failed"),
                    exception);
        }
    }

    private String validateAndNormalize(String value) {
        if (value == null || value.isBlank()) {
            throw invalidOutput("LLM returned a blank refined question");
        }

        var trimmed = value.trim();
        if (trimmed.length() > MAX_REWRITTEN_QUESTION_LENGTH) {
            throw invalidOutput("LLM returned a refined question that is too long");
        }

        if (trimmed.contains("```") || trimmed.lines().count() > 1) {
            throw invalidOutput("LLM refined question must not contain markdown or multiline prose");
        }

        var lower = trimmed.toLowerCase(Locale.ROOT);
        if (trimmed.startsWith("{") || trimmed.startsWith("[")
                || lower.contains("\"query\"")
                || lower.contains("\"aggs\"")
                || lower.contains("elasticsearch dsl")
                || lower.contains("query_string")
                || lower.contains("script")
                || lower.contains("drop index")
                || lower.contains("delete ")
                || lower.contains("update ")) {
            throw invalidOutput("LLM refined question contained unsafe or non-question output");
        }

        return trimmed;
    }

    private QueryRefinementException invalidOutput(String error) {
        return new QueryRefinementException(
                "Unable to refine query right now. Please edit the question manually.",
                List.of(error));
    }
}
