package com.soc.ai.search.event;

import java.io.IOException;
import java.util.Map;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.GetRequest;
import com.soc.ai.search.config.ElasticsearchProperties;
import org.springframework.stereotype.Service;

@Service
public class EventDetailService {

    private final ElasticsearchClient elasticsearchClient;
    private final ElasticsearchProperties elasticsearchProperties;

    public EventDetailService(ElasticsearchClient elasticsearchClient, ElasticsearchProperties elasticsearchProperties) {
        this.elasticsearchClient = elasticsearchClient;
        this.elasticsearchProperties = elasticsearchProperties;
    }

    public EventDetailResponse findById(String eventId) {
        try {
            var request = new GetRequest.Builder()
                    .index(elasticsearchProperties.indexEvents())
                    .id(eventId)
                    .build();
            var response = elasticsearchClient.get(request, Map.class);

            if (!response.found() || response.source() == null) {
                throw new EventDetailNotFoundException(eventId);
            }

            var source = response.source();
            var eventIdFromSource = value(source, "event_id");
            return new EventDetailResponse(
                    eventIdFromSource == null || eventIdFromSource.isBlank() ? response.id() : eventIdFromSource,
                    response.index() == null ? elasticsearchProperties.indexEvents() : response.index(),
                    value(source, "timestamp"),
                    value(source, "source"),
                    value(source, "severity"),
                    value(source, "event_type"),
                    value(source, "user"),
                    value(source, "host"),
                    value(source, "ip"),
                    value(source, "country_code"),
                    value(source, "message"),
                    value(source, "raw"));
        } catch (EventDetailNotFoundException exception) {
            throw exception;
        } catch (IOException exception) {
            throw new EventDetailLookupException("Failed to lookup event detail from Elasticsearch", exception);
        }
    }

    private String value(Map<?, ?> source, String fieldName) {
        var value = source.get(fieldName);
        return value == null ? null : value.toString();
    }
}
