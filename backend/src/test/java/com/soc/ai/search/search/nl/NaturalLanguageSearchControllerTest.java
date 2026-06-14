package com.soc.ai.search.search.nl;

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
import java.util.UUID;

import com.soc.ai.search.audit.AuditPersistenceException;
import com.soc.ai.search.search.execution.AggregationResultItem;
import com.soc.ai.search.search.execution.ChartMetadata;
import com.soc.ai.search.search.execution.ChartType;
import com.soc.ai.search.search.execution.SearchEvent;
import com.soc.ai.search.search.execution.SearchExecutionException;
import com.soc.ai.search.search.plan.AggregationPlan;
import com.soc.ai.search.search.plan.AggregationType;
import com.soc.ai.search.search.plan.SearchFilters;
import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.search.plan.SearchPlan;
import com.soc.ai.search.search.plan.TimeRange;
import com.soc.ai.search.summary.SummarySource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(NaturalLanguageSearchController.class)
class NaturalLanguageSearchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private NaturalLanguageSearchService naturalLanguageSearchService;

    @Test
    void naturalLanguageSearchReturnsResponseForValidQuestion() throws Exception {
        when(naturalLanguageSearchService.search(any(NaturalLanguageSearchRequest.class)))
                .thenReturn(response());

        mockMvc.perform(post("/api/v1/search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "question": "failed login china",
                                  "page": 0,
                                  "size": 5
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.query_id").value("11111111-1111-1111-1111-111111111111"))
                .andExpect(jsonPath("$.original_question").value("failed login china"))
                .andExpect(jsonPath("$.mode").value("search"))
                .andExpect(jsonPath("$.search_plan.mode").value("search"))
                .andExpect(jsonPath("$.generated_dsl.query.bool.filter").isArray())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(5))
                .andExpect(jsonPath("$.total_pages").value(1))
                .andExpect(jsonPath("$.llm_latency_ms").value(7))
                .andExpect(jsonPath("$.search_latency_ms").value(12))
                .andExpect(jsonPath("$.summary_latency_ms").value(3))
                .andExpect(jsonPath("$.latency_ms").value(22))
                .andExpect(jsonPath("$.summary").value("First sentence. Second sentence. Third sentence."))
                .andExpect(jsonPath("$.summary_source").value("llm"))
                .andExpect(jsonPath("$.events[0].event_id").value("seed-42-1"));
    }

    @Test
    void naturalLanguageSearchReturnsAggregationResponse() throws Exception {
        when(naturalLanguageSearchService.search(any(NaturalLanguageSearchRequest.class)))
                .thenReturn(aggregationResponse());

        mockMvc.perform(post("/api/v1/search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "question": "Đếm số lần login thất bại theo từng user trong 7 ngày qua",
                                  "page": 0,
                                  "size": 5
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.original_question").value("Đếm số lần login thất bại theo từng user trong 7 ngày qua"))
                .andExpect(jsonPath("$.mode").value("aggregation"))
                .andExpect(jsonPath("$.search_plan.mode").value("aggregation"))
                .andExpect(jsonPath("$.search_plan.aggregation.type").value("group_by"))
                .andExpect(jsonPath("$.search_plan.aggregation.field").value("user"))
                .andExpect(jsonPath("$.search_plan.aggregation.top_n").value(10))
                .andExpect(jsonPath("$.generated_dsl").isMap())
                .andExpect(jsonPath("$.aggregation_type").value("group_by"))
                .andExpect(jsonPath("$.aggregation_results[0].key").value("admin"))
                .andExpect(jsonPath("$.chart_metadata.chart_type").value("BAR"))
                .andExpect(jsonPath("$.events").isArray())
                .andExpect(jsonPath("$.events").isEmpty())
                .andExpect(jsonPath("$.search_latency_ms").value(12))
                .andExpect(jsonPath("$.aggregation_latency_ms").doesNotExist());
    }

    @Test
    void rejectsBlankQuestion() throws Exception {
        mockMvc.perform(post("/api/v1/search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "question": " ",
                                  "page": 0,
                                  "size": 5
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid natural language search request"));

        verify(naturalLanguageSearchService, never()).search(any(NaturalLanguageSearchRequest.class));
    }

    @Test
    void rejectsSizeOverLimit() throws Exception {
        mockMvc.perform(post("/api/v1/search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "question": "failed login china",
                                  "page": 0,
                                  "size": 101
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid natural language search request"));

        verify(naturalLanguageSearchService, never()).search(any(NaturalLanguageSearchRequest.class));
    }

    @Test
    void returnsControlledErrorWhenLlmOutputInvalidAfterRepair() throws Exception {
        when(naturalLanguageSearchService.search(any(NaturalLanguageSearchRequest.class)))
                .thenThrow(new NaturalLanguageSearchException(
                        "LLM output is invalid",
                        List.of("invalid SearchPlan")));

        mockMvc.perform(post("/api/v1/search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "question": "failed login china",
                                  "page": 0,
                                  "size": 5
                                }
                                """))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.message").value("LLM output is invalid"))
                .andExpect(jsonPath("$.errors[0]").value("invalid SearchPlan"));
    }

    @Test
    void returnsTooManyRequestsWhenGeminiQuotaIsExceeded() throws Exception {
        when(naturalLanguageSearchService.search(any(NaturalLanguageSearchRequest.class)))
                .thenThrow(new NaturalLanguageSearchRateLimitException(
                        "LLM rate limit exceeded",
                        List.of("Gemini quota exceeded; retry later"),
                        new RuntimeException()));

        mockMvc.perform(post("/api/v1/search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "question": "failed login china",
                                  "page": 0,
                                  "size": 5
                                }
                                """))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value("LLM rate limit exceeded"))
                .andExpect(jsonPath("$.errors[0]").value("Gemini quota exceeded; retry later"));
    }

    @Test
    void returnsControlledErrorWhenSearchDependencyFails() throws Exception {
        when(naturalLanguageSearchService.search(any(NaturalLanguageSearchRequest.class)))
                .thenThrow(new SearchExecutionException("Failed to execute Elasticsearch search", new RuntimeException()));

        mockMvc.perform(post("/api/v1/search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "question": "failed login china",
                                  "page": 0,
                                  "size": 5
                                }
                                """))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("Search dependency is unavailable"));
    }

    @Test
    void returnsControlledErrorWhenSuccessAuditPersistenceFails() throws Exception {
        when(naturalLanguageSearchService.search(any(NaturalLanguageSearchRequest.class)))
                .thenThrow(new AuditPersistenceException(
                        "Search completed but audit persistence failed",
                        new RuntimeException()));

        mockMvc.perform(post("/api/v1/search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "question": "failed login china",
                                  "page": 0,
                                  "size": 5
                                }
                                """))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("Search completed but audit persistence failed"))
                .andExpect(jsonPath("$.errors[0]").value("PostgreSQL audit persistence failed"));
    }

    private NaturalLanguageSearchResponse response() {
        return new NaturalLanguageSearchResponse(
                UUID.fromString("11111111-1111-1111-1111-111111111111"),
                "failed login china",
                SearchMode.SEARCH,
                searchPlan(),
                generatedDsl(),
                1,
                0,
                5,
                1,
                7,
                12,
                3,
                22,
                "First sentence. Second sentence. Third sentence.",
                SummarySource.LLM,
                null,
                List.of(),
                null,
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

    private NaturalLanguageSearchResponse aggregationResponse() {
        return new NaturalLanguageSearchResponse(
                UUID.fromString("22222222-2222-2222-2222-222222222222"),
                "Đếm số lần login thất bại theo từng user trong 7 ngày qua",
                SearchMode.AGGREGATION,
                aggregationPlan(),
                Map.of(
                        "query", Map.of("bool", Map.of("filter", List.of())),
                        "size", 0,
                        "aggs", Map.of(
                                "count_by_field", Map.of(
                                        "terms", Map.of("field", "user", "size", 10)))),
                10,
                0,
                5,
                0,
                7,
                12,
                3,
                22,
                "First sentence. Second sentence. Third sentence.",
                SummarySource.LLM,
                AggregationType.GROUP_BY,
                List.of(new AggregationResultItem("admin", 10)),
                new ChartMetadata(ChartType.BAR, "user", "Count"),
                List.of());
    }

    private SearchPlan searchPlan() {
        return new SearchPlan(
                SearchMode.SEARCH,
                new SearchFilters(
                        new TimeRange("now-24h", "now"),
                        null,
                        List.of("failed_login"),
                        null,
                        null,
                        null,
                        List.of("CN")),
                0,
                5);
    }

    private SearchPlan aggregationPlan() {
        return new SearchPlan(
                SearchMode.AGGREGATION,
                new SearchFilters(
                        new TimeRange("now-7d", "now"),
                        null,
                        List.of("failed_login"),
                        null,
                        null,
                        null,
                        null),
                new AggregationPlan(AggregationType.GROUP_BY, "user", 10, null),
                null,
                0,
                5);
    }

    private Map<String, Object> generatedDsl() {
        return Map.of(
                "query", Map.of(
                        "bool", Map.of(
                                "filter", List.of(Map.of(
                                        "terms", Map.of("event_type", List.of("failed_login")))))),
                "from", 0,
                "size", 5,
                "sort", List.of(Map.of("timestamp", Map.of("order", "desc"))));
    }
}
