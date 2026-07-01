package com.soc.ai.search.search.refine;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.soc.ai.search.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(QueryRefinementController.class)
@Import(SecurityConfig.class)
class QueryRefinementControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private QueryRefinementService service;

    @Test
    void refinesQuestion() throws Exception {
        when(service.refine(any(QueryRefinementRequest.class)))
                .thenReturn(new QueryRefinementResponse(
                        "Show failed login events from China for admin or vpn.user in the last 7 days",
                        "gemini",
                        42));

        mockMvc.perform(post("/api/v1/search/refine")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rewritten_question")
                        .value("Show failed login events from China for admin or vpn.user in the last 7 days"))
                .andExpect(jsonPath("$.source").value("gemini"))
                .andExpect(jsonPath("$.latency_ms").value(42));
    }

    @Test
    void rejectsBlankRefinement() throws Exception {
        mockMvc.perform(post("/api/v1/search/refine")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest().replace(
                                "Add admin or vpn.user and change the time range to 7 days",
                                " ")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid query refinement request"));

        verify(service, never()).refine(any(QueryRefinementRequest.class));
    }

    @Test
    void returnsControlledErrorWhenRefinementFails() throws Exception {
        when(service.refine(any(QueryRefinementRequest.class)))
                .thenThrow(new QueryRefinementException(
                        "Unable to refine query right now. Please edit the question manually.",
                        java.util.List.of("LLM query refinement failed")));

        mockMvc.perform(post("/api/v1/search/refine")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("Unable to refine query right now. Please edit the question manually."))
                .andExpect(jsonPath("$.errors[0]").value("LLM query refinement failed"));
    }

    private String validRequest() {
        return """
                {
                  "original_question": "Show failed login events from China in the last 24h",
                  "current_question": "Show failed login events from China in the last 24h",
                  "current_search_plan": {
                    "mode": "search",
                    "filters": {
                      "timestamp": { "from": "now-24h", "to": "now" },
                      "event_type": ["failed_login"],
                      "country_code": ["CN"]
                    },
                    "page": 0,
                    "size": 10
                  },
                  "refinement": "Add admin or vpn.user and change the time range to 7 days"
                }
                """;
    }
}
