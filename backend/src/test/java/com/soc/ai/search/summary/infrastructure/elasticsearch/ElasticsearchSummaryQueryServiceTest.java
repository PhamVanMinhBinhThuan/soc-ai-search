package com.soc.ai.search.summary.infrastructure.elasticsearch;


import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.config.elasticsearch.ElasticsearchProperties;
import com.soc.ai.search.search.domain.compiler.CompiledSearchQuery;
import com.soc.ai.search.search.domain.compiler.SearchPlanCompiler;
import com.soc.ai.search.search.infrastructure.elasticsearch.ElasticsearchSearchResponseMapper;
import com.soc.ai.search.search.domain.plan.SearchFilters;
import com.soc.ai.search.search.domain.plan.SearchMode;
import com.soc.ai.search.search.domain.plan.SearchPlan;
import com.soc.ai.search.search.domain.plan.TimeRange;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.StringEntity;
import org.apache.http.util.EntityUtils;
import org.elasticsearch.client.Request;
import org.elasticsearch.client.Response;
import org.elasticsearch.client.RestClient;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.soc.ai.search.summary.domain.SummaryBucket;
class ElasticsearchSummaryQueryServiceTest {

    private final RestClient restClient = org.mockito.Mockito.mock(RestClient.class);
    private final SearchPlanCompiler compiler = org.mockito.Mockito.mock(SearchPlanCompiler.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void usesOneBoundedQueryAndPreservesMessageQuery() throws Exception {
        var plan = plan();
        when(compiler.compile(plan)).thenReturn(new CompiledSearchQuery(Map.of(
                "query", Map.of(
                        "bool", Map.of(
                                "filter", List.of(Map.of(
                                        "range", Map.of("timestamp", Map.of("gte", "now-7d", "lte", "now")))),
                                "must", List.of(Map.of("match", Map.of("message", "malware detected"))))),
                "from", 0,
                "size", 20)));
        var elasticsearchResponse = response();
        when(restClient.performRequest(any(Request.class))).thenReturn(elasticsearchResponse);

        var result = service().load(plan);

        var captor = ArgumentCaptor.forClass(Request.class);
        verify(restClient, times(1)).performRequest(captor.capture());
        var body = objectMapper.readTree(EntityUtils.toString(captor.getValue().getEntity()));

        assertThat(captor.getValue().getEndpoint()).isEqualTo("/soc-events-v1/_search");
        assertThat(body.path("size").asInt()).isEqualTo(5);
        assertThat(body.path("query").toString()).contains("malware detected");
        assertThat(body.path("aggs").size()).isEqualTo(4);
        assertThat(body.toString()).doesNotContain(".keyword", "script", "wildcard", "query_string", "raw");
        assertThat(result.topUsers()).containsExactly(new SummaryBucket("admin", 5));
        assertThat(result.sampleEvents()).hasSize(1);
    }

    private ElasticsearchSummaryQueryService service() {
        return new ElasticsearchSummaryQueryService(
                restClient,
                objectMapper,
                new ElasticsearchProperties("http://localhost:9200", null, null, "soc-events-v1"),
                compiler,
                new ElasticsearchSearchResponseMapper());
    }

    private SearchPlan plan() {
        return new SearchPlan(
                SearchMode.SEARCH,
                new SearchFilters(
                        new TimeRange("now-7d", "now"),
                        null,
                        null,
                        null,
                        null,
                        null,
                        null),
                "malware detected",
                0,
                20);
    }

    private Response response() {
        var response = org.mockito.Mockito.mock(Response.class);
        when(response.getEntity()).thenReturn(new StringEntity("""
                {
                  "hits": {
                    "total": { "value": 5, "relation": "eq" },
                    "hits": [
                      {
                        "_id": "event-1",
                        "_source": {
                          "timestamp": "2026-06-14T10:00:00Z",
                          "severity": "critical",
                          "event_type": "malware_detected",
                          "user": "admin",
                          "host": "host-001",
                          "ip": "203.0.113.10",
                          "country_code": "CN",
                          "message": "malware detected"
                        }
                      }
                    ]
                  },
                  "aggregations": {
                    "top_users": { "buckets": [{ "key": "admin", "doc_count": 5 }] },
                    "top_hosts": { "buckets": [{ "key": "host-001", "doc_count": 5 }] },
                    "top_ips": { "buckets": [{ "key": "203.0.113.10", "doc_count": 5 }] },
                    "severity_distribution": { "buckets": [{ "key": "critical", "doc_count": 5 }] }
                  }
                }
                """, ContentType.APPLICATION_JSON));
        return response;
    }
}
