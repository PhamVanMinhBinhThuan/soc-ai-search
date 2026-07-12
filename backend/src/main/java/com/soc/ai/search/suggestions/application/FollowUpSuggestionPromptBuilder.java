package com.soc.ai.search.suggestions.application;


import java.util.Locale;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.llm.application.LlmFollowUpSuggestionsRequest;
import org.springframework.stereotype.Component;

import com.soc.ai.search.suggestions.api.FollowUpSuggestionRequest;
@Component
public class FollowUpSuggestionPromptBuilder {

    private final ObjectMapper objectMapper;

    public FollowUpSuggestionPromptBuilder(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public LlmFollowUpSuggestionsRequest build(FollowUpSuggestionRequest request) {
        return new LlmFollowUpSuggestionsRequest(buildSystemPrompt(request.question()), buildUserContent(request));
    }

    private String buildSystemPrompt(String question) {
        var targetLanguage = usesVietnamese(question) ? "Vietnamese" : "English";
        return """
                You generate next-step SOC investigation questions.
                Return JSON only.
                The first character of the response must be [ and the last character must be ].
                Return exactly 3 suggestions.
                The JSON must be an array.
                Each suggestion must contain only title and question.
                Each question must be a natural-language search question.
                Do not return Elasticsearch DSL.
                Do not return SearchPlan JSON.
                Do not execute anything.
                Do not include explanations, markdown, confidence, category, result_type, or extra fields.

                Required output shape:
                [
                  {
                    "title": "Top source IPs",
                    "question": "Show the top 5 source IPs for failed_login events in the last 24 hours"
                  },
                  {
                    "title": "Affected users",
                    "question": "Group failed_login events by user in the last 24 hours"
                  },
                  {
                    "title": "Failed login trend",
                    "question": "Show failed_login trend by hour in the last 24 hours"
                  }
                ]

                Do not wrap the array inside source, suggestions, data, result, or any other object.

                Target language: %s.
                If the target language is Vietnamese, keep canonical SOC terms and dataset values in English.

                Known dataset values:
                severity: critical, high, medium, low
                event_type: failed_login, account_lockout, firewall_block, malware_detected, privilege_escalation, suspicious_outbound, large_transfer, successful_login, dns_query, process_start, file_access
                source: windows-auth, vpn, firewall, edr, proxy, dns
                users: admin, vpn.user, finance.user, jdoe, svc.backup
                hosts: vpn-gw-01, dc-01, endpoint-014, endpoint-023, finance-ws-07
                countries: CN, VN, US, DE, SG
                IP examples: 203.0.113.45, 203.0.113.77, 198.51.100.200, 10.10.1.15

                Prefer suggestions likely to return results in this synthetic SOC dataset.
                Avoid destructive, administrative, password dumping, script, query_string, delete, update, or index operations.
                """.formatted(targetLanguage);
    }

    private String buildUserContent(FollowUpSuggestionRequest request) {
        try {
            return """
                    Current successful search context:
                    %s

                    Generate exactly 3 follow-up natural-language questions.
                    """.formatted(objectMapper.writeValueAsString(request));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to build follow-up suggestion prompt", exception);
        }
    }

    private boolean usesVietnamese(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }

        var lower = value.toLowerCase(Locale.ROOT);
        var vietnameseWordCount = 0;
        for (var token : lower.split("[^\\p{L}]+")) {
            if (token.isBlank()) {
                continue;
            }
            if (token.matches(".*[ÄƒÃ¢Ä‘ÃªÃ´Æ¡Æ°Ã¡Ã áº£Ã£áº¡áº¥áº§áº©áº«áº­áº¯áº±áº³áºµáº·Ã©Ã¨áº»áº½áº¹áº¿á»á»ƒá»…á»‡Ã­Ã¬á»‰Ä©á»‹Ã³Ã²á»Ãµá»á»‘á»“á»•á»—á»™á»›á»á»Ÿá»¡á»£ÃºÃ¹á»§Å©á»¥á»©á»«á»­á»¯á»±Ã½á»³á»·á»¹á»µ].*")
                    || isCommonVietnameseToken(token)) {
                vietnameseWordCount++;
            }
        }
        return vietnameseWordCount > 1;
    }

    private boolean isCommonVietnameseToken(String token) {
        return switch (token) {
            case "tim", "tÃ¬m", "trong", "qua", "theo", "voi", "vá»›i", "cua", "cá»§a", "cho", "nguoi", "ngÆ°á»i",
                    "dung", "dÃ¹ng", "ngay", "ngÃ y", "gio", "giá»", "thong", "thá»‘ng", "ke", "kÃª", "hien", "hiá»ƒn",
                    "thi", "thá»‹", "nhieu", "nhiá»u", "nhat", "nháº¥t" -> true;
            default -> false;
        };
    }
}
