package com.soc.ai.search.search.execution;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import com.soc.ai.search.search.plan.AggregationType;
import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.search.plan.SearchPlan;
import com.soc.ai.search.security.SecurityConfig;
import com.soc.ai.search.summary.ResultSummaryService;
import com.soc.ai.search.summary.SummaryResult;
import com.soc.ai.search.summary.SummarySource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(SearchController.class)
@Import(SecurityConfig.class)
class SearchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SearchPlanExecutor searchPlanExecutor;

    @MockitoBean
    private ResultSummaryService resultSummaryService;

    @Test
    void searchPlanReturnsResponseWithoutSummaryByDefault() throws Exception {
        var response = responseWithOneEvent();
        when(searchPlanExecutor.execute(any(SearchPlan.class))).thenReturn(response);

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
                .andExpect(jsonPath("$.search_latency_ms").value(12))
                .andExpect(jsonPath("$.summary_latency_ms").value(0))
                .andExpect(jsonPath("$.latency_ms").value(12))
                .andExpect(jsonPath("$.summary").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.summary_source").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.events[0].event_id").value("seed-42-1"))
                .andExpect(jsonPath("$.events[0].event_type").value("failed_login"))
                .andExpect(jsonPath("$.events[0].country_code").value("CN"));

        verify(searchPlanExecutor).execute(any(SearchPlan.class));
        verify(resultSummaryService, never()).summarizeSearch(any(), any(), any());
    }

    @Test
    void searchPlanIncludesSummaryWhenRequested() throws Exception {
        when(searchPlanExecutor.execute(any(SearchPlan.class))).thenReturn(responseWithOneEvent());
        when(resultSummaryService.summarizeSearch(any(), any(), any()))
                .thenReturn(new SummaryResult("Edited summary sentence. Second sentence. Third sentence.",
                        SummarySource.LLM,
                        7));

        mockMvc.perform(post("/api/v1/search/plan")
                        .queryParam("include_summary", "true")
                        .queryParam("summary_question", "Tìm event critical trong 7 ngày qua")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validSearchPlanJson()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.search_latency_ms").value(12))
                .andExpect(jsonPath("$.summary_latency_ms").value(7))
                .andExpect(jsonPath("$.latency_ms").value(19))
                .andExpect(jsonPath("$.summary").value("Edited summary sentence. Second sentence. Third sentence."))
                .andExpect(jsonPath("$.summary_source").value("llm"));

        verify(resultSummaryService).summarizeSearch(eq("Tìm event critical trong 7 ngày qua"), any(), any());
    }

    @Test
    void searchPlanAcceptsMessageQuery() throws Exception {
        when(searchPlanExecutor.execute(any(SearchPlan.class))).thenReturn(responseWithOneEvent());

        mockMvc.perform(post("/api/v1/search/plan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validSearchPlanWithMessageQueryJson()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.events[0].message").value("Failed login attempt from CN"));

        verify(searchPlanExecutor).execute(any(SearchPlan.class));
    }

    @Test
    void searchPlanReturnsOkForNoResults() throws Exception {
        when(searchPlanExecutor.execute(any(SearchPlan.class))).thenReturn(emptyResponse());

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

        verify(searchPlanExecutor, never()).execute(any(SearchPlan.class));
    }

    @Test
    void searchPlanRejectsUnsupportedModeBeforeExecutor() throws Exception {
        mockMvc.perform(post("/api/v1/search/plan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validSearchPlanJson().replace("\"mode\": \"search\"", "\"mode\": \"aggregate\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid request body"));

        verify(searchPlanExecutor, never()).execute(any(SearchPlan.class));
    }

    @Test
    void searchPlanReturnsControlledErrorWhenElasticsearchFails() throws Exception {
        when(searchPlanExecutor.execute(any(SearchPlan.class)))
                .thenThrow(new SearchExecutionException("Failed to execute Elasticsearch search", new RuntimeException()));

        mockMvc.perform(post("/api/v1/search/plan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validSearchPlanJson()))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("Search dependency is unavailable"));
    }

    @Test
    void searchPlanReturnsAggregationResponseForAggregationMode() throws Exception {
        when(searchPlanExecutor.execute(any(SearchPlan.class))).thenReturn(aggregationResponse());

        mockMvc.perform(post("/api/v1/search/plan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validAggregationPlanJson()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("aggregation"))
                .andExpect(jsonPath("$.aggregation_type").value("count"))
                .andExpect(jsonPath("$.generated_dsl.query.bool.filter").isArray())
                .andExpect(jsonPath("$.generated_dsl").isMap())
                .andExpect(jsonPath("$.total").value(42))
                .andExpect(jsonPath("$.search_latency_ms").value(9))
                .andExpect(jsonPath("$.summary_latency_ms").value(0))
                .andExpect(jsonPath("$.latency_ms").value(9))
                .andExpect(jsonPath("$.summary").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.summary_source").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.aggregation_results[0].key").value("total"))
                .andExpect(jsonPath("$.aggregation_results[0].value").value(42))
                .andExpect(jsonPath("$.chart_metadata.chart_type").value("NUMBER"));

        verify(searchPlanExecutor).execute(any(SearchPlan.class));
        verify(resultSummaryService, never()).summarizeAggregation(any(), any());
    }

    @Test
    void aggregationSearchPlanIncludesSummaryWhenRequested() throws Exception {
        when(searchPlanExecutor.execute(any(SearchPlan.class))).thenReturn(aggregationResponse());
        when(resultSummaryService.summarizeAggregation(any(), any()))
                .thenReturn(new SummaryResult("Aggregation summary sentence. Second sentence. Third sentence.",
                        SummarySource.LLM,
                        6));

        mockMvc.perform(post("/api/v1/search/plan")
                        .queryParam("include_summary", "true")
                        .queryParam("summary_question", "Top 5 IP có nhiều event nhất tháng này")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validAggregationPlanJson()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("aggregation"))
                .andExpect(jsonPath("$.search_latency_ms").value(9))
                .andExpect(jsonPath("$.summary_latency_ms").value(6))
                .andExpect(jsonPath("$.latency_ms").value(15))
                .andExpect(jsonPath("$.summary").value("Aggregation summary sentence. Second sentence. Third sentence."))
                .andExpect(jsonPath("$.summary_source").value("llm"));

        verify(resultSummaryService).summarizeAggregation(eq("Top 5 IP có nhiều event nhất tháng này"), any());
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

    private AggregationSearchResponse aggregationResponse() {
        return new AggregationSearchResponse(
                SearchMode.AGGREGATION,
                AggregationType.COUNT,
                Map.of(
                        "query", Map.of(
                                "bool", Map.of(
                                        "filter", List.of(Map.of(
                                                "terms", Map.of("event_type", List.of("failed_login")))))),
                        "size", 0),
                42,
                9,
                List.of(new AggregationResultItem("total", 42)),
                new ChartMetadata(ChartType.NUMBER, "Total", "Events"));
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

    private String validAggregationPlanJson() {
        return """
                {
                  "mode": "aggregation",
                  "filters": {
                    "timestamp": { "from": "now-7d", "to": "now" },
                    "event_type": ["failed_login"]
                  },
                  "aggregation": {
                    "type": "count"
                  },
                  "page": 0,
                  "size": 20
                }
                """;
    }
}
