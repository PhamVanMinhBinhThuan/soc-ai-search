package com.soc.ai.search.search.infrastructure.elasticsearch;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import com.soc.ai.search.search.domain.plan.AggregationType;
import com.soc.ai.search.search.domain.result.AggregationExecutionResult;
import com.soc.ai.search.search.domain.result.AggregationResultItem;
import org.springframework.stereotype.Component;

@Component
public class ElasticsearchAggregationResponseMapper {

    public AggregationExecutionResult map(JsonNode response, AggregationType aggregationType) {
        var total = extractTotal(response.path("hits").path("total"));
        var results = switch (aggregationType) {
            case COUNT -> countResult(total);
            case GROUP_BY -> bucketResults(response, "count_by_field", false);
            case TOP_N -> bucketResults(response, "top_values", false);
            case DATE_HISTOGRAM -> bucketResults(response, "events_over_time", true);
        };

        return new AggregationExecutionResult(total, results);
    }

    private List<AggregationResultItem> countResult(long total) {
        if (total == 0) {
            return List.of();
        }

        return List.of(new AggregationResultItem("total", total));
    }

    private List<AggregationResultItem> bucketResults(JsonNode response, String aggregationName, boolean useKeyAsString) {
        var buckets = response.path("aggregations").path(aggregationName).path("buckets");
        if (!buckets.isArray()) {
            return List.of();
        }

        var results = new ArrayList<AggregationResultItem>();
        for (var bucket : buckets) {
            results.add(new AggregationResultItem(bucketKey(bucket, useKeyAsString), bucket.path("doc_count").asLong(0)));
        }

        return List.copyOf(results);
    }

    private String bucketKey(JsonNode bucket, boolean useKeyAsString) {
        if (useKeyAsString && bucket.hasNonNull("key_as_string")) {
            return bucket.path("key_as_string").asText();
        }

        return bucket.path("key").asText();
    }

    private long extractTotal(JsonNode totalNode) {
        if (totalNode.isNumber()) {
            return totalNode.asLong();
        }

        return totalNode.path("value").asLong(0);
    }
}
