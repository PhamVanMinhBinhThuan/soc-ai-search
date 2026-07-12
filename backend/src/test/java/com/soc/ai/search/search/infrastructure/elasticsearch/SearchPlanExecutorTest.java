package com.soc.ai.search.search.infrastructure.elasticsearch;

import static com.soc.ai.search.search.domain.plan.AggregationType.COUNT;
import static com.soc.ai.search.search.domain.plan.AggregationType.DATE_HISTOGRAM;
import static com.soc.ai.search.search.domain.plan.AggregationType.TOP_N;
import static com.soc.ai.search.search.domain.plan.HistogramInterval.HOUR;
import static com.soc.ai.search.search.domain.plan.SearchMode.AGGREGATION;
import static com.soc.ai.search.search.domain.plan.SearchMode.SEARCH;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.config.elasticsearch.ElasticsearchProperties;
import com.soc.ai.search.search.domain.compiler.CompiledSearchQuery;
import com.soc.ai.search.search.domain.compiler.SearchPlanCompiler;
import com.soc.ai.search.search.domain.plan.AggregationPlan;
import com.soc.ai.search.search.domain.plan.SearchFilters;
import com.soc.ai.search.search.domain.plan.SearchPlan;
import com.soc.ai.search.search.domain.plan.TimeRange;
import com.soc.ai.search.search.domain.result.AggregationResultItem;
import com.soc.ai.search.search.domain.result.ChartType;
import com.soc.ai.search.search.domain.result.SearchEvent;
import com.soc.ai.search.search.domain.result.SearchExecutionResult;
import com.soc.ai.search.search.domain.result.SearchPlanSearchResponse;
import com.soc.ai.search.search.application.SearchExecutionException;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.StringEntity;
import org.apache.http.util.EntityUtils;
import org.elasticsearch.client.Request;
import org.elasticsearch.client.Response;
import org.elasticsearch.client.RestClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SearchPlanExecutorTest {

    @Mock
    private RestClient restClient;

    @Mock
    private SearchPlanCompiler compiler;

    @Mock
    private ElasticsearchSearchResponseMapper searchResponseMapper;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ElasticsearchProperties elasticsearchProperties = new ElasticsearchProperties(
            "http://localhost:9200",
            null,
            null,
            "soc-events-v1");
    private final ElasticsearchAggregationResponseMapper aggregationResponseMapper =
            new ElasticsearchAggregationResponseMapper();

    @Test
    void executeKeepsSearchModeResponseWorking() throws Exception {
        var plan = new SearchPlan(SEARCH, filters(), 0, 20);
        var compiledQuery = new CompiledSearchQuery(searchDsl());
        when(compiler.compile(plan)).thenReturn(compiledQuery);
        doReturn(response("""
                {
                  "hits": {
                    "total": { "value": 1, "relation": "eq" },
                    "hits": []
                  }
                }
                """)).when(restClient).performRequest(any(Request.class));
        when(searchResponseMapper.map(any())).thenReturn(new SearchExecutionResult(
                1,
                List.of(new SearchEvent(
                        "seed-42-1",
                        "2026-06-10T01:00:00Z",
                        "windows-auth",
                        "high",
                        "failed_login",
                        "admin",
                        "host-001",
                        "203.0.113.10",
                        "CN",
                        "Failed login attempt"))));

        var response = (SearchPlanSearchResponse) executor().execute(plan);

        assertThat(response.mode()).isEqualTo(SEARCH);
        assertThat(response.generatedDsl()).isSameAs(compiledQuery.searchSpec());
        assertThat(response.total()).isEqualTo(1);
        assertThat(response.events()).hasSize(1);
    }

    @Test
    void countAggregationUsesCompilerDslAndHitsTotal() throws Exception {
        var plan = aggregationPlan(new AggregationPlan(COUNT, null, null, null));
        var compiledQuery = new CompiledSearchQuery(countDsl());
        when(compiler.compile(plan)).thenReturn(compiledQuery);
        doReturn(response("""
                {
                  "hits": {
                    "total": { "value": 42, "relation": "eq" },
                    "hits": []
                  }
                }
                """)).when(restClient).performRequest(any(Request.class));

        var response = executor().aggregate(plan);

        assertThat(response.mode()).isEqualTo(AGGREGATION);
        assertThat(response.aggregationType()).isEqualTo(COUNT);
        assertThat(response.generatedDsl()).isSameAs(compiledQuery.searchSpec());
        assertThat(response.generatedDsl()).doesNotContainKey("aggs");
        assertThat(response.total()).isEqualTo(42);
        assertThat(response.aggregationResults()).containsExactly(new AggregationResultItem("total", 42));
        assertThat(response.chartMetadata().chartType()).isEqualTo(ChartType.NUMBER);
    }

    @Test
    void countAggregationNoResultReturnsEmptyAggregationResults() throws Exception {
        var plan = aggregationPlan(new AggregationPlan(COUNT, null, null, null));
        when(compiler.compile(plan)).thenReturn(new CompiledSearchQuery(countDsl()));
        doReturn(response("""
                {
                  "hits": {
                    "total": { "value": 0, "relation": "eq" },
                    "hits": []
                  }
                }
                """)).when(restClient).performRequest(any(Request.class));

        var response = executor().aggregate(plan);

        assertThat(response.total()).isZero();
        assertThat(response.aggregationResults()).isEmpty();
    }

    @Test
    void topNAggregationUsesHitsTotalNotBucketSum() throws Exception {
        var plan = aggregationPlan(new AggregationPlan(TOP_N, "ip", 10, null));
        when(compiler.compile(plan)).thenReturn(new CompiledSearchQuery(topNDsl()));
        doReturn(response("""
                {
                  "hits": {
                    "total": { "value": 10000, "relation": "eq" },
                    "hits": []
                  },
                  "aggregations": {
                    "top_values": {
                      "buckets": [
                        { "key": "203.0.113.10", "doc_count": 50 },
                        { "key": "198.51.100.20", "doc_count": 30 }
                      ]
                    }
                  }
                }
                """)).when(restClient).performRequest(any(Request.class));

        var response = executor().aggregate(plan);

        assertThat(response.total()).isEqualTo(10000);
        assertThat(response.aggregationResults()).containsExactly(
                new AggregationResultItem("203.0.113.10", 50),
                new AggregationResultItem("198.51.100.20", 30));
        assertThat(response.chartMetadata().chartType()).isEqualTo(ChartType.BAR);
    }

    @Test
    void dateHistogramAggregationKeepsCompilerGeneratedDsl() throws Exception {
        var plan = aggregationPlan(new AggregationPlan(DATE_HISTOGRAM, null, null, HOUR));
        var compiledQuery = new CompiledSearchQuery(dateHistogramDsl());
        when(compiler.compile(plan)).thenReturn(compiledQuery);
        doReturn(response("""
                {
                  "hits": {
                    "total": { "value": 10, "relation": "eq" },
                    "hits": []
                  },
                  "aggregations": {
                    "events_over_time": {
                      "buckets": [
                        { "key_as_string": "2026-06-10T01:00:00.000Z", "key": 1781053200000, "doc_count": 10 }
                      ]
                    }
                  }
                }
                """)).when(restClient).performRequest(any(Request.class));

        var response = executor().aggregate(plan);

        assertThat(response.generatedDsl()).isSameAs(compiledQuery.searchSpec());
        assertThat(response.generatedDsl().toString()).contains("fixed_interval=1h");
        assertThat(response.chartMetadata().chartType()).isEqualTo(ChartType.LINE);
    }

    @Test
    void requestUsesConfiguredIndexTimeoutAndTrackTotalHits() throws Exception {
        var plan = aggregationPlan(new AggregationPlan(COUNT, null, null, null));
        when(compiler.compile(plan)).thenReturn(new CompiledSearchQuery(countDsl()));
        doReturn(response("""
                {
                  "hits": {
                    "total": { "value": 1, "relation": "eq" },
                    "hits": []
                  }
                }
                """)).when(restClient).performRequest(any(Request.class));

        executor().aggregate(plan);

        var requestCaptor = ArgumentCaptor.forClass(Request.class);
        verify(restClient).performRequest(requestCaptor.capture());
        var request = requestCaptor.getValue();
        var requestBody = objectMapper.readTree(EntityUtils.toString(request.getEntity()));

        assertThat(request.getMethod()).isEqualTo("POST");
        assertThat(request.getEndpoint()).isEqualTo("/soc-events-v1/_search");
        assertThat(requestBody.path("timeout").asText()).isEqualTo("3s");
        assertThat(requestBody.path("track_total_hits").asBoolean()).isTrue();
    }

    @Test
    void wrapsElasticsearchIOException() throws Exception {
        var plan = aggregationPlan(new AggregationPlan(COUNT, null, null, null));
        when(compiler.compile(plan)).thenReturn(new CompiledSearchQuery(countDsl()));
        when(restClient.performRequest(any(Request.class))).thenThrow(new IOException("connection refused"));

        assertThatThrownBy(() -> executor().aggregate(plan))
                .isInstanceOf(SearchExecutionException.class)
                .hasMessage("Failed to execute Elasticsearch aggregation")
                .hasCauseInstanceOf(IOException.class);
    }

    private SearchPlanExecutor executor() {
        return new SearchPlanExecutor(
                restClient,
                objectMapper,
                elasticsearchProperties,
                compiler,
                searchResponseMapper,
                aggregationResponseMapper);
    }

    private Response response(String json) {
        var response = org.mockito.Mockito.mock(Response.class);
        when(response.getEntity()).thenReturn(new StringEntity(json, ContentType.APPLICATION_JSON));
        return response;
    }

    private SearchPlan aggregationPlan(AggregationPlan aggregation) {
        return new SearchPlan(AGGREGATION, filters(), aggregation, null, 0, 20);
    }

    private SearchFilters filters() {
        return new SearchFilters(
                new TimeRange("now-7d", "now"),
                null,
                List.of("failed_login"),
                null,
                null,
                null,
                null);
    }

    private Map<String, Object> searchDsl() {
        return Map.of(
                "query", Map.of(
                        "bool", Map.of(
                                "filter", List.of(Map.of(
                                        "terms", Map.of("event_type", List.of("failed_login")))))),
                "from", 0,
                "size", 20);
    }

    private Map<String, Object> countDsl() {
        return Map.of(
                "query", Map.of(
                        "bool", Map.of(
                                "filter", List.of(Map.of(
                                        "terms", Map.of("event_type", List.of("failed_login")))))),
                "size", 0);
    }

    private Map<String, Object> topNDsl() {
        return Map.of(
                "query", Map.of(
                        "bool", Map.of(
                                "filter", List.of())),
                "size", 0,
                "aggs", Map.of(
                        "top_values", Map.of(
                                "terms", Map.of(
                                        "field", "ip",
                                        "size", 10))));
    }

    private Map<String, Object> dateHistogramDsl() {
        return Map.of(
                "query", Map.of(
                        "bool", Map.of(
                                "filter", List.of())),
                "size", 0,
                "aggs", Map.of(
                        "events_over_time", Map.of(
                                "date_histogram", Map.of(
                                        "field", "timestamp",
                                        "fixed_interval", "1h",
                                        "order", Map.of("_key", "asc")))));
    }
}
