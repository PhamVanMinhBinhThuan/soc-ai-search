package com.soc.ai.search.search.refinement.application;


import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.llm.application.LlmQuestionRefinementRequest;

import org.springframework.stereotype.Component;

import com.soc.ai.search.search.refinement.api.QueryRefinementRequest;
@Component
public class QueryRefinementPromptBuilder {

    private final ObjectMapper objectMapper;

    public QueryRefinementPromptBuilder(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public LlmQuestionRefinementRequest build(QueryRefinementRequest request) {
        return new LlmQuestionRefinementRequest(systemPrompt(), userContent(request));
    }

    private String systemPrompt() {
        return """
                You correct or refine SOC investigation questions.
                Return one corrected and explicit natural-language question only.
                Do not return JSON.
                Do not return Elasticsearch DSL.
                Do not use markdown.
                Do not explain.
                The user feedback may mean either:
                1. The current SearchPlan misunderstood the original question and must be corrected.
                2. The current SearchPlan is valid, but the analyst wants to refine, narrow, or broaden the investigation.
                Use the original question, current question, current SearchPlan, and user feedback together.
                Preserve the original investigation intent unless the feedback explicitly changes it.
                Apply the smallest necessary change requested by the feedback.
                If the feedback contradicts the current SearchPlan, follow the feedback.
                Make implicit filters explicit enough for another SearchPlan generation step.
                Do not invent filters, users, IPs, hosts, time ranges, or aggregations that are not in the question,
                SearchPlan, feedback, or known demo values.
                Use only known SOC fields and values when possible.
                If the refinement asks to delete, update, mutate, dump credentials, run scripts, or bypass security,
                return the original safe search question unchanged.

                Known values:
                - severity: critical, high, medium, low
                - event_type: failed_login, account_lockout, firewall_block, malware_detected, privilege_escalation,
                  suspicious_outbound, large_transfer, successful_login, dns_query, process_start, file_access
                - source: windows-auth, vpn, firewall, edr, proxy, dns
                - users: admin, vpn.user, finance.user, jdoe, svc.backup
                - hosts: vpn-gw-01, dc-01, endpoint-014, endpoint-023, finance-ws-07
                - country codes: CN, VN, US, DE, SG
                - IP examples: 203.0.113.45, 203.0.113.77, 198.51.100.200, 10.10.1.15

                Examples:
                Original: Show failed login events from China in the last 24h
                Refinement: add admin or vpn.user and make it 7 days
                Output: Show failed login events from China for admin or vpn.user in the last 7 days

                Original: Show top 3 source IPs with the most alerts in the last 12 days
                Current SearchPlan mistake: timestamp.from is now-30d
                Refinement: It should be 12 days, not 30 days
                Output: Show the top 3 source IPs with the most alerts in the last 12 days

                Original: Show events by hour in the last 24h
                Refinement: only critical and high severity
                Output: Show critical or high severity events by hour in the last 24 hours
                """;
    }

    private String userContent(QueryRefinementRequest request) {
        return """
                Original question:
                %s

                Current question:
                %s

                Current SearchPlan:
                %s

                User refinement:
                %s

                Correct or refine the current question into one complete natural-language SOC search question.
                """.formatted(
                request.originalQuestion().trim(),
                request.currentQuestion().trim(),
                searchPlanJson(request),
                request.refinement().trim());
    }

    private String searchPlanJson(QueryRefinementRequest request) {
        try {
            return objectMapper.writeValueAsString(request.currentSearchPlan());
        } catch (JsonProcessingException exception) {
            throw new QueryRefinementException(
                    "Unable to refine query right now. Please edit the question manually.",
                    java.util.List.of("Current SearchPlan cannot be serialized"),
                    exception);
        }
    }
}
