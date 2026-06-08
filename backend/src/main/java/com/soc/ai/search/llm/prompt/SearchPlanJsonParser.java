package com.soc.ai.search.llm.prompt;

import java.util.List;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectReader;
import com.soc.ai.search.search.plan.SearchPlan;
import com.soc.ai.search.search.validation.SearchPlanValidationException;
import com.soc.ai.search.search.validation.SearchPlanValidator;
import org.springframework.stereotype.Service;

@Service
public class SearchPlanJsonParser {

    private final ObjectReader strictSearchPlanReader;
    private final SearchPlanValidator searchPlanValidator;

    public SearchPlanJsonParser(ObjectMapper objectMapper, SearchPlanValidator searchPlanValidator) {
        this.strictSearchPlanReader = objectMapper.copy()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, true)
                .configure(DeserializationFeature.FAIL_ON_TRAILING_TOKENS, true)
                .readerFor(SearchPlan.class);
        this.searchPlanValidator = searchPlanValidator;
    }

    public SearchPlan parse(String rawContent) {
        var content = normalizeInput(rawContent);
        rejectNonJsonObjectShape(content);

        try {
            var plan = (SearchPlan) strictSearchPlanReader.readValue(content);
            return searchPlanValidator.validate(plan);
        } catch (SearchPlanValidationException exception) {
            throw new SearchPlanJsonParseException(exception.errors());
        } catch (JsonProcessingException exception) {
            throw new SearchPlanJsonParseException(List.of("LLM output must be a valid SearchPlan JSON object"));
        }
    }

    private String normalizeInput(String rawContent) {
        if (rawContent == null) {
            throw new SearchPlanJsonParseException(List.of("LLM output must not be null"));
        }

        return rawContent.trim();
    }

    private void rejectNonJsonObjectShape(String content) {
        if (content.isEmpty()) {
            throw new SearchPlanJsonParseException(List.of("LLM output must not be blank"));
        }

        if (content.contains("```")) {
            throw new SearchPlanJsonParseException(List.of("LLM output must not contain markdown code fences"));
        }

        if (!content.startsWith("{") || !content.endsWith("}")) {
            throw new SearchPlanJsonParseException(List.of("LLM output must be exactly one JSON object without prose"));
        }
    }
}
