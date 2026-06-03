package com.soc.ai.search.event;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.BulkRequest;
import com.soc.ai.search.config.ElasticsearchProperties;
import org.springframework.stereotype.Service;

@Service
public class EventIngestService {

    private static final int MAX_ERROR_DETAILS = 20;

    private final ElasticsearchClient elasticsearchClient;
    private final ElasticsearchProperties elasticsearchProperties;

    public EventIngestService(ElasticsearchClient elasticsearchClient, ElasticsearchProperties elasticsearchProperties) {
        this.elasticsearchClient = elasticsearchClient;
        this.elasticsearchProperties = elasticsearchProperties;
    }

    public IngestEventResponse ingest(IngestEventRequest request) {
        try {
            var response = elasticsearchClient.index(index -> index
                    .index(elasticsearchProperties.indexEvents())
                    .document(toDocument(request)));

            return new IngestEventResponse(response.id(), response.index(), response.result().jsonValue());
        } catch (IOException exception) {
            throw new EventIngestException("Failed to index event into Elasticsearch", exception);
        }
    }

    public BulkIngestEventsResponse ingestBulk(BulkIngestEventsRequest request) {
        try {
            var bulkRequest = new BulkRequest.Builder()
                    .index(elasticsearchProperties.indexEvents());

            for (var event : request.events()) {
                bulkRequest.operations(operation -> operation
                        .index(index -> index.document(toDocument(event))));
            }

            var response = elasticsearchClient.bulk(bulkRequest.build());
            var errors = new ArrayList<BulkIngestError>();

            for (var i = 0; i < response.items().size(); i++) {
                var item = response.items().get(i);
                if (item.error() != null && errors.size() < MAX_ERROR_DETAILS) {
                    errors.add(new BulkIngestError(i, item.id(), item.index(), item.error().reason()));
                }
            }

            var failedCount = (int) response.items().stream()
                    .filter(item -> item.error() != null)
                    .count();
            var indexedCount = response.items().size() - failedCount;

            return new BulkIngestEventsResponse(request.events().size(), indexedCount, failedCount, List.copyOf(errors));
        } catch (IOException exception) {
            throw new EventIngestException("Failed to bulk index events into Elasticsearch", exception);
        }
    }

    private Map<String, Object> toDocument(IngestEventRequest request) {
        var document = new LinkedHashMap<String, Object>();
        document.put("timestamp", request.timestamp().toString());
        document.put("source", request.source());
        document.put("severity", request.severity());
        document.put("event_type", request.eventType());
        document.put("user", request.user());
        document.put("host", request.host());
        document.put("ip", request.ip());
        document.put("country_code", request.countryCode());
        document.put("message", request.message());
        document.put("raw", request.raw());
        return document;
    }
}
