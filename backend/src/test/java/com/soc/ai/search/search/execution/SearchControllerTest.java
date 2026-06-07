package com.soc.ai.search.search.execution;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.search.plan.SearchPlan;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(SearchController.class)
class SearchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SearchPlanExecutor searchPlanExecutor;

    @Test
    void searchPlanReturnsResponseForValidSearchPlan() throws Exception {
        when(searchPlanExecutor.search(any(SearchPlan.class))).thenReturn(responseWithOneEvent());

        mockMvc.perform(post("/api/v1/search/plan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validSearchPlanJson()))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.mode").value("search"))
                .andExpect(jsonPath("$.generated_dsl.query.bool.filter").isArray())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.total_pages").value(1))
                .andExpect(jsonPath("$.latency_ms").value(12))
                .andExpect(jsonPath("$.events[0].event_id").value("seed-42-1"))
                .andExpect(jsonPath("$.events[0].event_type").value("failed_login"))
                .andExpect(jsonPath("$.events[0].country_code").value("CN"));

        verify(searchPlanExecutor).search(any(SearchPlan.class));
    }

    @Test
    void searchPlanAcceptsMessageQuery() throws Exception {
        when(searchPlanExecutor.search(any(SearchPlan.class))).thenReturn(responseWithOneEvent());

        mockMvc.perform(post("/api/v1/search/plan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validSearchPlanWithMessageQueryJson()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.events[0].message").value("Failed login attempt from CN"));

        verify(searchPlanExecutor).search(any(SearchPlan.class));
    }

    @Test
    void searchPlanReturnsOkForNoResults() throws Exception {
        when(searchPlanExecutor.search(any(SearchPlan.class))).thenReturn(emptyResponse());

        mockMvc.perform(post("/api/v1/search/plan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validSearchPlanJson()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0))
                .andExpect(jsonPath("$.total_pages").value(0))
                .andExpect(jsonPath("$.events").isArray())
                .andExpect(jsonPath("$.events").isEmpty());
    }

    @Test
    void searchPlanRejectsSizeOverLimit() throws Exception {
        mockMvc.perform(post("/api/v1/search/plan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validSearchPlanJson().replace("\"size\": 20", "\"size\": 101")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid SearchPlan"));

        verify(searchPlanExecutor, never()).search(any(SearchPlan.class));
    }

    @Test
    void searchPlanRejectsUnsupportedModeBeforeExecutor() throws Exception {
        mockMvc.perform(post("/api/v1/search/plan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validSearchPlanJson().replace("\"mode\": \"search\"", "\"mode\": \"aggregate\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid request body"));

        verify(searchPlanExecutor, never()).search(any(SearchPlan.class));
    }

    @Test
    void searchPlanReturnsControlledErrorWhenElasticsearchFails() throws Exception {
        when(searchPlanExecutor.search(any(SearchPlan.class)))
                .thenThrow(new SearchExecutionException("Failed to execute Elasticsearch search", new RuntimeException()));

        mockMvc.perform(post("/api/v1/search/plan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validSearchPlanJson()))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("Search dependency is unavailable"));
    }

    private SearchPlanSearchResponse responseWithOneEvent() {
        return new SearchPlanSearchResponse(
                SearchMode.SEARCH,
                generatedDsl(),
                1,
                0,
                20,
                1,
                12,
                List.of(new SearchEvent(
                        "seed-42-1",
                        "2026-06-06T10:00:00Z",
                        "windows-auth",
                        "high",
                        "failed_login",
                        "admin",
                        "host-001",
                        "203.0.113.10",
                        "CN",
                        "Failed login attempt from CN")));
    }

    private SearchPlanSearchResponse emptyResponse() {
        return new SearchPlanSearchResponse(
                SearchMode.SEARCH,
                generatedDsl(),
                0,
                0,
                20,
                0,
                5,
                List.of());
    }

    private Map<String, Object> generatedDsl() {
        return Map.of(
                "query", Map.of(
                        "bool", Map.of(
                                "filter", List.of(Map.of(
                                        "terms", Map.of("event_type", List.of("failed_login")))))),
                "from", 0,
                "size", 20,
                "sort", List.of(Map.of("timestamp", Map.of("order", "desc"))));
    }

    private String validSearchPlanJson() {
        return """
                {
                  "mode": "search",
                  "filters": {
                    "timestamp": { "from": "now-24h", "to": "now" },
                    "event_type": ["failed_login"],
                    "country_code": ["CN"]
                  },
                  "page": 0,
                  "size": 20
                }
                """;
    }

    private String validSearchPlanWithMessageQueryJson() {
        return validSearchPlanJson()
                .replace("\"page\": 0", "\"message_query\": \"malware detected\",%n                  \"page\": 0".formatted());
    }
}
