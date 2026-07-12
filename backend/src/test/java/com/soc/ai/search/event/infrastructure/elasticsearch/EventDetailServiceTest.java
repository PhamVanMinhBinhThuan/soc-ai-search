package com.soc.ai.search.event.infrastructure.elasticsearch;


import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.GetRequest;
import co.elastic.clients.elasticsearch.core.GetResponse;
import com.soc.ai.search.config.elasticsearch.ElasticsearchProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.soc.ai.search.event.application.EventDetailLookupException;
import com.soc.ai.search.event.application.EventDetailNotFoundException;
@ExtendWith(MockitoExtension.class)
class EventDetailServiceTest {

    @Mock
    private ElasticsearchClient elasticsearchClient;

    private final ElasticsearchProperties elasticsearchProperties = new ElasticsearchProperties(
            "http://localhost:9200",
            null,
            null,
            "soc-events-v1");

    @Test
    void findByIdMapsElasticsearchIdIndexAndSourceToDetailResponse() throws Exception {
        when(elasticsearchClient.get(any(GetRequest.class), eq(Map.class))).thenReturn(foundResponse());

        var service = new EventDetailService(elasticsearchClient, elasticsearchProperties);
        var response = service.findById("event-1");

        assertThat(response.eventId()).isEqualTo("event-1");
        assertThat(response.indexName()).isEqualTo("soc-events-v1");
        assertThat(response.timestamp()).isEqualTo("2026-06-03T10:00:00Z");
        assertThat(response.source()).isEqualTo("windows-auth");
        assertThat(response.severity()).isEqualTo("high");
        assertThat(response.eventType()).isEqualTo("failed_login");
        assertThat(response.user()).isEqualTo("demo.user");
        assertThat(response.host()).isEqualTo("host-001");
        assertThat(response.ip()).isEqualTo("203.0.113.10");
        assertThat(response.countryCode()).isEqualTo("CN");
        assertThat(response.message()).isEqualTo("Failed login attempt from CN");
        assertThat(response.raw()).isEqualTo("raw log line");
    }

    @Test
    void findByIdThrowsNotFoundWhenDocumentIsMissing() throws Exception {
        when(elasticsearchClient.get(any(GetRequest.class), eq(Map.class))).thenReturn(missingResponse());

        var service = new EventDetailService(elasticsearchClient, elasticsearchProperties);

        assertThatThrownBy(() -> service.findById("missing-event"))
                .isInstanceOf(EventDetailNotFoundException.class)
                .hasMessage("Event not found: missing-event");
    }

    @Test
    void findByIdWrapsElasticsearchIOException() throws Exception {
        when(elasticsearchClient.get(any(GetRequest.class), eq(Map.class)))
                .thenThrow(new IOException("connection refused"));

        var service = new EventDetailService(elasticsearchClient, elasticsearchProperties);

        assertThatThrownBy(() -> service.findById("event-1"))
                .isInstanceOf(EventDetailLookupException.class)
                .hasMessage("Failed to lookup event detail from Elasticsearch")
                .hasCauseInstanceOf(IOException.class);
    }

    private GetResponse<Map> foundResponse() {
        return GetResponse.of(response -> response
                .index("soc-events-v1")
                .id("event-1")
                .found(true)
                .source(sourceDocument()));
    }

    private GetResponse<Map> missingResponse() {
        return GetResponse.of(response -> response
                .index("soc-events-v1")
                .id("missing-event")
                .found(false));
    }

    private Map<String, Object> sourceDocument() {
        var source = new LinkedHashMap<String, Object>();
        source.put("timestamp", "2026-06-03T10:00:00Z");
        source.put("source", "windows-auth");
        source.put("severity", "high");
        source.put("event_type", "failed_login");
        source.put("user", "demo.user");
        source.put("host", "host-001");
        source.put("ip", "203.0.113.10");
        source.put("country_code", "CN");
        source.put("message", "Failed login attempt from CN");
        source.put("raw", "raw log line");
        return source;
    }
}
