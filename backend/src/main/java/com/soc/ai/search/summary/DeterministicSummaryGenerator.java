package com.soc.ai.search.summary;

import java.util.List;

import com.soc.ai.search.search.execution.AggregationResultItem;
import org.springframework.stereotype.Component;

@Component
public class DeterministicSummaryGenerator {

    public String generate(SummaryPayload payload) {
        if (payload.mode() == com.soc.ai.search.search.plan.SearchMode.AGGREGATION) {
            return aggregation(payload);
        }
        return search(payload);
    }

    private String search(SummaryPayload payload) {
        if (payload.total() == 0) {
            return "No SOC events matched the validated search criteria. "
                    + "No entity or severity pattern is available for this query. "
                    + "Review the filters or expand the time range before investigating again.";
        }

        var entity = firstAvailable(payload.topUsers(), payload.topHosts(), payload.topIps());
        var severity = first(payload.severityDistribution());
        return "The validated search matched " + payload.total() + " SOC events. "
                + (entity == null
                        ? "The bounded result sample does not identify a leading user, host, or IP. "
                        : "The leading available entity is " + entity.key() + " with " + entity.value() + " events. ")
                + (severity == null
                        ? "No dominant severity was available in the bounded summary data."
                        : "The most frequent available severity is " + severity.key() + " with "
                                + severity.value() + " events.");
    }

    private String aggregation(SummaryPayload payload) {
        var results = payload.aggregationResults() == null ? List.<AggregationResultItem>of() : payload.aggregationResults();
        var type = payload.aggregationType() == null ? "aggregation" : payload.aggregationType().jsonValue();
        if (results.isEmpty()) {
            return "The " + type + " aggregation matched " + payload.total() + " SOC events. "
                    + "No aggregation buckets were returned for the validated criteria. "
                    + "Review the filters or aggregation field before running the investigation again.";
        }

        var first = results.get(0);
        return "The " + type + " aggregation matched " + payload.total() + " SOC events. "
                + "It returned " + results.size() + " bounded result buckets for analysis. "
                + "The leading bucket is " + first.key() + " with a value of " + first.value() + ".";
    }

    private SummaryBucket firstAvailable(List<SummaryBucket>... candidates) {
        for (var candidate : candidates) {
            var first = first(candidate);
            if (first != null) {
                return first;
            }
        }
        return null;
    }

    private SummaryBucket first(List<SummaryBucket> values) {
        return values == null || values.isEmpty() ? null : values.get(0);
    }
}
