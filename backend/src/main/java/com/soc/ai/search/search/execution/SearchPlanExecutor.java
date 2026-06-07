package com.soc.ai.search.search.execution;

import java.io.IOException;
import java.util.LinkedHashMap;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.config.ElasticsearchProperties;
import com.soc.ai.search.search.compiler.SearchPlanCompiler;
import com.soc.ai.search.search.plan.SearchPlan;
import org.apache.http.util.EntityUtils;
import org.elasticsearch.client.Request;
import org.elasticsearch.client.RestClient;
import org.springframework.stereotype.Service;

@Service
public class SearchPlanExecutor {

    private static final String SEARCH_TIMEOUT = "3s";

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final ElasticsearchProperties elasticsearchProperties;
    private final SearchPlanCompiler compiler;
    private final ElasticsearchSearchResponseMapper responseMapper;

    public SearchPlanExecutor(
            RestClient restClient,
            ObjectMapper objectMapper,
            ElasticsearchProperties elasticsearchProperties,
            SearchPlanCompiler compiler,
            ElasticsearchSearchResponseMapper responseMapper) {
        this.restClient = restClient;
        this.objectMapper = objectMapper;
        this.elasticsearchProperties = elasticsearchProperties;
        this.compiler = compiler;
        this.responseMapper = responseMapper;
    }

    public SearchPlanSearchResponse search(SearchPlan plan) {
        var startedAt = System.nanoTime();
        var compiledQuery = compiler.compile(plan);
        var requestBody = new LinkedHashMap<>(compiledQuery.searchSpec());
        requestBody.put("timeout", SEARCH_TIMEOUT);
        requestBody.put("track_total_hits", true);

        try {
            var request = new Request("POST", "/" + elasticsearchProperties.indexEvents() + "/_search");
            request.setJsonEntity(objectMapper.writeValueAsString(requestBody));

            var response = restClient.performRequest(request);
            var responseJson = objectMapper.readTree(EntityUtils.toString(response.getEntity()));
            var executionResult = responseMapper.map(responseJson);
            var latencyMs = (System.nanoTime() - startedAt) / 1_000_000;

            return new SearchPlanSearchResponse(
                    plan.mode(),
                    compiledQuery.searchSpec(),
                    executionResult.total(),
                    plan.page(),
                    plan.size(),
                    totalPages(executionResult.total(), plan.size()),
                    latencyMs,
                    executionResult.events());
        } catch (IOException exception) {
            throw new SearchExecutionException("Failed to execute Elasticsearch search", exception);
        }
    }

    private long totalPages(long total, int size) {
        if (total == 0) {
            return 0;
        }

        return (total + size - 1) / size;
    }
}
