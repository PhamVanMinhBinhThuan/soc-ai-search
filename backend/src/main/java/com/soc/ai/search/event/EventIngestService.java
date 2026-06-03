package com.soc.ai.search.event;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import com.soc.ai.search.config.ElasticsearchProperties;
import org.springframework.stereotype.Service;

@Service
public class EventIngestService {

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
