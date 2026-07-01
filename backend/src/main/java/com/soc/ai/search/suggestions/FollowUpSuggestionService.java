package com.soc.ai.search.suggestions;

import java.util.List;

import com.soc.ai.search.llm.LlmClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class FollowUpSuggestionService {

    private static final Logger LOGGER = LoggerFactory.getLogger(FollowUpSuggestionService.class);

    private final FollowUpSuggestionPromptBuilder promptBuilder;
    private final FollowUpSuggestionParser parser;
    private final LlmClient llmClient;

    public FollowUpSuggestionService(
            FollowUpSuggestionPromptBuilder promptBuilder,
            FollowUpSuggestionParser parser,
            LlmClient llmClient) {
        this.promptBuilder = promptBuilder;
        this.parser = parser;
        this.llmClient = llmClient;
    }

    public FollowUpSuggestionResponse suggest(FollowUpSuggestionRequest request) {
        if (request.resultCount() == null || request.resultCount() <= 0) {
            return FollowUpSuggestionResponse.empty();
        }

        try {
            var llmResponse = llmClient.generateFollowUpSuggestions(promptBuilder.build(request));
            var suggestions = parser.parse(llmResponse.content());
            return suggestions.isEmpty()
                    ? FollowUpSuggestionResponse.empty()
                    : FollowUpSuggestionResponse.llm(suggestions);
        } catch (RuntimeException exception) {
            LOGGER.warn("AI follow-up suggestions are unavailable: {}", exception.getMessage());
            return FollowUpSuggestionResponse.empty();
        }
    }
}
