package com.soc.ai.search.search.infrastructure.elasticsearch;

import java.io.IOException;
import java.util.LinkedHashMap;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.config.elasticsearch.ElasticsearchProperties;
import com.soc.ai.search.search.application.SearchExecutionException;
import com.soc.ai.search.search.domain.compiler.SearchPlanCompiler;
import com.soc.ai.search.search.domain.plan.AggregationPlan;
import com.soc.ai.search.search.domain.plan.SearchPlan;
import com.soc.ai.search.search.domain.plan.SearchMode;
import com.soc.ai.search.search.domain.result.AggregationSearchResponse;
import com.soc.ai.search.search.domain.result.ChartMetadata;
import com.soc.ai.search.search.domain.result.ChartType;
import com.soc.ai.search.search.domain.result.SearchPlanSearchResponse;
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
    private final ElasticsearchAggregationResponseMapper aggregationResponseMapper;

    public SearchPlanExecutor(
            RestClient restClient,
            ObjectMapper objectMapper,
            ElasticsearchProperties elasticsearchProperties,
            SearchPlanCompiler compiler,
            ElasticsearchSearchResponseMapper responseMapper,
            ElasticsearchAggregationResponseMapper aggregationResponseMapper) {
        this.restClient = restClient;
        this.objectMapper = objectMapper;
        this.elasticsearchProperties = elasticsearchProperties;
        this.compiler = compiler;
        this.responseMapper = responseMapper;
        this.aggregationResponseMapper = aggregationResponseMapper;
    }

    public Object execute(SearchPlan plan) {
        if (plan.mode() == SearchMode.AGGREGATION) {
            return aggregate(plan);
        }

        return search(plan);
    }

    public SearchPlanSearchResponse search(SearchPlan plan) {
        var startedAt = System.nanoTime();
        var compiledQuery = compiler.compile(plan);

        try {
            var responseJson = executeSearch(compiledQuery.searchSpec());
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

    public AggregationSearchResponse aggregate(SearchPlan plan) {
        var startedAt = System.nanoTime();
        var compiledQuery = compiler.compile(plan);

        try {
            var responseJson = executeSearch(compiledQuery.searchSpec());
            var executionResult = aggregationResponseMapper.map(responseJson, plan.aggregation().type());
            var latencyMs = (System.nanoTime() - startedAt) / 1_000_000;

            return new AggregationSearchResponse(
                    plan.mode(),
                    plan.aggregation().type(),
                    compiledQuery.searchSpec(),
                    executionResult.total(),
                    latencyMs,
                    executionResult.results(),
                    chartMetadata(plan.aggregation()));
        } catch (IOException exception) {
            throw new SearchExecutionException("Failed to execute Elasticsearch aggregation", exception);
        }
    }

    private com.fasterxml.jackson.databind.JsonNode executeSearch(java.util.Map<String, Object> searchSpec)
            throws IOException {
        var requestBody = new LinkedHashMap<>(searchSpec);
        requestBody.put("timeout", SEARCH_TIMEOUT);
        requestBody.put("track_total_hits", true);

        var request = new Request("POST", "/" + elasticsearchProperties.indexEvents() + "/_search");
        request.setJsonEntity(objectMapper.writeValueAsString(requestBody));

        var response = restClient.performRequest(request);
        return objectMapper.readTree(EntityUtils.toString(response.getEntity()));
    }

    private ChartMetadata chartMetadata(AggregationPlan aggregation) {
        return switch (aggregation.type()) {
            case COUNT -> new ChartMetadata(ChartType.NUMBER, "Total", "Events");
            case GROUP_BY, TOP_N -> new ChartMetadata(ChartType.BAR, aggregation.field(), "Count");
            case DATE_HISTOGRAM -> new ChartMetadata(ChartType.LINE, "Time", "Event Count");
        };
    }

    private long totalPages(long total, int size) {
        if (total == 0) {
            return 0;
        }

        return (total + size - 1) / size;
    }
}
