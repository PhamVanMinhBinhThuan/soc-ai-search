package com.soc.ai.search.export.infrastructure;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.config.elasticsearch.ElasticsearchProperties;
import com.soc.ai.search.export.application.ExportProperties;
import com.soc.ai.search.export.domain.CsvExportDependencyException;
import com.soc.ai.search.export.domain.PreparedAggregationExport;
import com.soc.ai.search.export.domain.PreparedSearchExport;
import com.soc.ai.search.search.domain.compiler.SearchPlanCompiler;
import com.soc.ai.search.search.domain.result.SearchExecutionResult;
import com.soc.ai.search.search.domain.plan.SearchPlan;
import com.soc.ai.search.search.domain.plan.SearchPlanContract;
import com.soc.ai.search.search.infrastructure.elasticsearch.ElasticsearchAggregationResponseMapper;
import com.soc.ai.search.search.infrastructure.elasticsearch.ElasticsearchSearchResponseMapper;
import org.apache.http.util.EntityUtils;
import org.elasticsearch.client.Request;
import org.elasticsearch.client.RestClient;
import org.springframework.stereotype.Service;

@Service
public class ExportSearchExecutor {

    public static final int MAX_EXPORT_ROWS = SearchPlanContract.MAX_EXPORT_ROWS;
    public static final int BATCH_SIZE = 1_000;

    private static final List<String> SOURCE_FIELDS = List.of(
            "timestamp",
            "source",
            "severity",
            "event_type",
            "user",
            "host",
            "ip",
            "country_code",
            "message");

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final ElasticsearchProperties elasticsearchProperties;
    private final ExportProperties exportProperties;
    private final SearchPlanCompiler compiler;
    private final ElasticsearchSearchResponseMapper searchResponseMapper;
    private final ElasticsearchAggregationResponseMapper aggregationResponseMapper;

    public ExportSearchExecutor(
            RestClient restClient,
            ObjectMapper objectMapper,
            ElasticsearchProperties elasticsearchProperties,
            ExportProperties exportProperties,
            SearchPlanCompiler compiler,
            ElasticsearchSearchResponseMapper searchResponseMapper,
            ElasticsearchAggregationResponseMapper aggregationResponseMapper) {
        this.restClient = restClient;
        this.objectMapper = objectMapper;
        this.elasticsearchProperties = elasticsearchProperties;
        this.exportProperties = exportProperties;
        this.compiler = compiler;
        this.searchResponseMapper = searchResponseMapper;
        this.aggregationResponseMapper = aggregationResponseMapper;
    }

    public PreparedSearchExport prepareSearch(SearchPlan plan) {
        var compiled = compiler.compile(plan);
        var baseSearchSpec = new LinkedHashMap<>(compiled.searchSpec());
        baseSearchSpec.remove("from");
        baseSearchSpec.remove("size");
        baseSearchSpec.putIfAbsent("sort", List.of(Map.of("timestamp", Map.of("order", "desc"))));

        var firstPage = executeSearchPage(baseSearchSpec, 0, BATCH_SIZE);
        return new PreparedSearchExport(baseSearchSpec, firstPage.total(), firstPage.events());
    }

    public SearchExecutionResult fetchSearchPage(PreparedSearchExport prepared, int from, int size) {
        if (from < 0 || size < 1 || from + size > MAX_EXPORT_ROWS) {
            throw new IllegalArgumentException("Export batch must stay within the 10,000 row window");
        }
        return executeSearchPage(prepared.baseSearchSpec(), from, size);
    }

    public PreparedAggregationExport prepareAggregation(SearchPlan plan) {
        var compiled = compiler.compile(plan);
        var responseJson = execute(compiled.searchSpec(), true);
        var result = aggregationResponseMapper.map(responseJson, plan.aggregation().type());
        return new PreparedAggregationExport(plan.aggregation().type(), result.total(), result.results());
    }

    private SearchExecutionResult executeSearchPage(Map<String, Object> baseSearchSpec, int from, int size) {
        var requestBody = new LinkedHashMap<>(baseSearchSpec);
        requestBody.put("from", from);
        requestBody.put("size", size);
        requestBody.put("_source", Map.of("includes", SOURCE_FIELDS));

        var responseJson = execute(requestBody, true);
        return searchResponseMapper.map(responseJson);
    }

    private com.fasterxml.jackson.databind.JsonNode execute(
            Map<String, Object> searchSpec,
            boolean trackTotalHits) {
        var requestBody = new LinkedHashMap<>(searchSpec);
        requestBody.put("timeout", exportProperties.esTimeoutMs() + "ms");
        requestBody.put("track_total_hits", trackTotalHits);

        var request = new Request("POST", "/" + elasticsearchProperties.indexEvents() + "/_search");
        try {
            request.setJsonEntity(objectMapper.writeValueAsString(requestBody));
            var response = restClient.performRequest(request);
            return objectMapper.readTree(EntityUtils.toString(response.getEntity()));
        } catch (IOException exception) {
            throw new CsvExportDependencyException("Elasticsearch CSV export failed", exception);
        }
    }
}
