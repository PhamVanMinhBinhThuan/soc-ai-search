package com.soc.ai.search.export.infrastructure;

import static com.soc.ai.search.search.domain.plan.AggregationType.COUNT;
import static com.soc.ai.search.search.domain.plan.SearchMode.AGGREGATION;
import static com.soc.ai.search.search.domain.plan.SearchMode.SEARCH;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.config.elasticsearch.ElasticsearchProperties;
import com.soc.ai.search.export.application.ExportProperties;
import com.soc.ai.search.search.domain.compiler.CompiledSearchQuery;
import com.soc.ai.search.search.domain.compiler.SearchPlanCompiler;
import com.soc.ai.search.search.infrastructure.elasticsearch.ElasticsearchAggregationResponseMapper;
import com.soc.ai.search.search.infrastructure.elasticsearch.ElasticsearchSearchResponseMapper;
import com.soc.ai.search.search.domain.plan.AggregationPlan;
import com.soc.ai.search.search.domain.plan.SearchPlan;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.StringEntity;
import org.apache.http.util.EntityUtils;
import org.elasticsearch.client.Request;
import org.elasticsearch.client.Response;
import org.elasticsearch.client.RestClient;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class ExportSearchExecutorTest {

    private final RestClient restClient = org.mockito.Mockito.mock(RestClient.class);
    private final SearchPlanCompiler compiler = org.mockito.Mockito.mock(SearchPlanCompiler.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ElasticsearchSearchResponseMapper searchMapper = new ElasticsearchSearchResponseMapper();
    private final ElasticsearchAggregationResponseMapper aggregationMapper =
            new ElasticsearchAggregationResponseMapper();

    @Test
    void preparesSearchWithCompilerSortSourceFilterAndExportTimeout() throws Exception {
        var plan = new SearchPlan(SEARCH, null, 0, 20);
        var spec = Map.<String, Object>of(
                "query", Map.of("bool", Map.of("filter", List.of())),
                "from", 0,
                "size", 20,
                "sort", List.of(Map.of("timestamp", Map.of("order", "desc"))));
        when(compiler.compile(plan)).thenReturn(new CompiledSearchQuery(spec));
        doReturn(response("""
                {
                  "hits": {
                    "total": { "value": 50, "relation": "eq" },
                    "hits": [
                      {
                        "_id": "seed-42-1",
                        "_source": {
                          "timestamp": "2026-06-14T00:00:00Z",
                          "source": "windows-auth",
                          "severity": "high",
                          "event_type": "failed_login",
                          "user": "admin",
                          "host": "host-001",
                          "ip": "203.0.113.10",
                          "country_code": "CN",
                          "message": "Failed login"
                        }
                      }
                    ]
                  }
                }
                """)).when(restClient).performRequest(any(Request.class));

        var prepared = executor().prepareSearch(plan);

        assertThat(prepared.total()).isEqualTo(50);
        assertThat(prepared.firstEvents()).singleElement()
                .extracting(event -> event.eventId())
                .isEqualTo("seed-42-1");

        var captor = ArgumentCaptor.forClass(Request.class);
        verify(restClient).performRequest(captor.capture());
        var body = objectMapper.readTree(EntityUtils.toString(captor.getValue().getEntity()));
        assertThat(body.path("from").asInt()).isZero();
        assertThat(body.path("size").asInt()).isEqualTo(1_000);
        assertThat(body.path("timeout").asText()).isEqualTo("10000ms");
        assertThat(body.path("track_total_hits").asBoolean()).isTrue();
        assertThat(body.path("sort").toString()).contains("timestamp");
        assertThat(body.path("_source").path("includes").toString()).doesNotContain("raw");
        assertThat(body.path("_source").path("includes").toString()).doesNotContain("event_id");
    }

    @Test
    void countAggregationUsesCurrentElasticsearchTotal() throws Exception {
        var plan = new SearchPlan(
                AGGREGATION,
                null,
                new AggregationPlan(COUNT, null, null, null),
                null,
                0,
                20);
        when(compiler.compile(plan)).thenReturn(new CompiledSearchQuery(Map.of(
                "query", Map.of("bool", Map.of("filter", List.of())),
                "size", 0)));
        doReturn(response("""
                {
                  "hits": {
                    "total": { "value": 50, "relation": "eq" },
                    "hits": []
                  }
                }
                """)).when(restClient).performRequest(any(Request.class));

        var prepared = executor().prepareAggregation(plan);

        assertThat(prepared.total()).isEqualTo(50);
        assertThat(prepared.type()).isEqualTo(COUNT);
    }

    private ExportSearchExecutor executor() {
        return new ExportSearchExecutor(
                restClient,
                objectMapper,
                new ElasticsearchProperties("http://localhost:9200", null, null, "soc-events-v1"),
                new ExportProperties(10_000),
                compiler,
                searchMapper,
                aggregationMapper);
    }

    private Response response(String json) {
        var response = org.mockito.Mockito.mock(Response.class);
        when(response.getEntity()).thenReturn(new StringEntity(json, ContentType.APPLICATION_JSON));
        return response;
    }
}
