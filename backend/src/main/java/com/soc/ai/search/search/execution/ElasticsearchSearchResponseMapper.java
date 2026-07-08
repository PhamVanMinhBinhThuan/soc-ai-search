package com.soc.ai.search.search.execution;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

@Component
public class ElasticsearchSearchResponseMapper {

    public SearchExecutionResult map(JsonNode response) {
        var hits = response.path("hits");
        var total = extractTotal(hits.path("total"));
        var events = new ArrayList<SearchEvent>();

        for (var hit : hits.path("hits")) {
            var source = hit.path("_source");
            var eventId = text(source.path("event_id"));
            if (eventId == null || eventId.isBlank()) {
                eventId = text(hit.path("_id"));
            }
            events.add(new SearchEvent(
                    eventId,
                    text(source.path("timestamp")),
                    text(source.path("source")),
                    text(source.path("severity")),
                    text(source.path("event_type")),
                    text(source.path("user")),
                    text(source.path("host")),
                    text(source.path("ip")),
                    text(source.path("country_code")),
                    text(source.path("message"))));
        }

        return new SearchExecutionResult(total, List.copyOf(events));
    }

    private long extractTotal(JsonNode totalNode) {
        if (totalNode.isNumber()) {
            return totalNode.asLong();
        }

        return totalNode.path("value").asLong(0);
    }

    private String text(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }

        return node.asText();
    }
}
