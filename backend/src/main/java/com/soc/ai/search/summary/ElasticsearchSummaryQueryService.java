package com.soc.ai.search.summary;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.config.ElasticsearchProperties;
import com.soc.ai.search.search.compiler.SearchPlanCompiler;
import com.soc.ai.search.search.execution.ElasticsearchSearchResponseMapper;
import com.soc.ai.search.search.plan.SearchPlan;
import org.apache.http.util.EntityUtils;
import org.elasticsearch.client.Request;
import org.elasticsearch.client.RestClient;
import org.springframework.stereotype.Service;

@Service
public class ElasticsearchSummaryQueryService {

    private static final int LIMIT = 5;
    private static final String SUMMARY_TIMEOUT = "3s";

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final ElasticsearchProperties elasticsearchProperties;
    private final SearchPlanCompiler compiler;
    private final ElasticsearchSearchResponseMapper searchResponseMapper;

    public ElasticsearchSummaryQueryService(
            RestClient restClient,
            ObjectMapper objectMapper,
            ElasticsearchProperties elasticsearchProperties,
            SearchPlanCompiler compiler,
            ElasticsearchSearchResponseMapper searchResponseMapper) {
        this.restClient = restClient;
        this.objectMapper = objectMapper;
        this.elasticsearchProperties = elasticsearchProperties;
        this.compiler = compiler;
        this.searchResponseMapper = searchResponseMapper;
    }

    public SearchSummaryData load(SearchPlan plan) {
        var compiled = compiler.compile(plan);
        var requestBody = new LinkedHashMap<String, Object>();
        requestBody.put("query", compiled.searchSpec().get("query"));
        requestBody.put("size", LIMIT);
        requestBody.put("sort", List.of(Map.of("timestamp", Map.of("order", "desc"))));
        requestBody.put("_source", List.of(
                "timestamp",
                "severity",
                "event_type",
                "user",
                "host",
                "ip",
                "country_code",
                "message"));
        requestBody.put("aggs", Map.of(
                "top_users", terms("user"),
                "top_hosts", terms("host"),
                "top_ips", terms("ip"),
                "severity_distribution", terms("severity")));
        requestBody.put("timeout", SUMMARY_TIMEOUT);
        requestBody.put("track_total_hits", false);

        var request = new Request("POST", "/" + elasticsearchProperties.indexEvents() + "/_search");
        try {
            request.setJsonEntity(objectMapper.writeValueAsString(requestBody));
            var response = restClient.performRequest(request);
            var responseJson = objectMapper.readTree(EntityUtils.toString(response.getEntity()));
            return new SearchSummaryData(
                    buckets(responseJson, "top_users"),
                    buckets(responseJson, "top_hosts"),
                    buckets(responseJson, "top_ips"),
                    buckets(responseJson, "severity_distribution"),
                    searchResponseMapper.map(responseJson).events());
        } catch (IOException exception) {
            throw new SummaryQueryException("Elasticsearch summary query failed", exception);
        }
    }

    private Map<String, Object> terms(String field) {
        return Map.of("terms", Map.of("field", field, "size", LIMIT));
    }

    private List<SummaryBucket> buckets(JsonNode response, String name) {
        var nodes = response.path("aggregations").path(name).path("buckets");
        if (!nodes.isArray()) {
            return List.of();
        }

        var buckets = new ArrayList<SummaryBucket>();
        for (var node : nodes) {
            buckets.add(new SummaryBucket(node.path("key").asText(), node.path("doc_count").asLong()));
        }
        return List.copyOf(buckets);
    }
}
