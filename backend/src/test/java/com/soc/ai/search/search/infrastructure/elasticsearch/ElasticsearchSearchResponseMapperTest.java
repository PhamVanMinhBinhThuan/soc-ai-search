package com.soc.ai.search.search.infrastructure.elasticsearch;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.search.domain.result.SearchEvent;
import org.junit.jupiter.api.Test;

class ElasticsearchSearchResponseMapperTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ElasticsearchSearchResponseMapper mapper = new ElasticsearchSearchResponseMapper();

    @Test
    void mapsElasticsearchIdToEventIdAndSourceToEventFields() throws Exception {
        var response = objectMapper.readTree("""
                {
                  "hits": {
                    "total": { "value": 1, "relation": "eq" },
                    "hits": [
                      {
                        "_id": "seed-42-1",
                        "_source": {
                          "timestamp": "2026-06-06T10:00:00Z",
                          "source": "windows-auth",
                          "severity": "high",
                          "event_type": "failed_login",
                          "user": "admin",
                          "host": "host-001",
                          "ip": "203.0.113.10",
                          "country_code": "CN",
                          "message": "Failed login attempt from CN",
                          "raw": "raw log line"
                        }
                      }
                    ]
                  }
                }
                """);

        var result = mapper.map(response);

        assertThat(result.total()).isEqualTo(1);
        assertThat(result.events()).hasSize(1);
        assertThat(result.events().getFirst().eventId()).isEqualTo("seed-42-1");
        assertThat(result.events().getFirst().eventType()).isEqualTo("failed_login");
        assertThat(result.events().getFirst().countryCode()).isEqualTo("CN");
    }

    @Test
    void prefersSourceEventIdAndFallsBackToElasticsearchId() throws Exception {
        var response = objectMapper.readTree("""
                {
                  "hits": {
                    "total": { "value": 2, "relation": "eq" },
                    "hits": [
                      {
                        "_id": "legacy-id",
                        "_source": {
                          "event_id": "6f1d4c8e-1d93-4a27-9e87-9b7a9e9d8a12",
                          "timestamp": "2026-06-06T10:00:00Z",
                          "source": "windows-auth",
                          "severity": "high",
                          "event_type": "failed_login",
                          "user": "admin",
                          "host": "host-001",
                          "ip": "203.0.113.10",
                          "country_code": "CN",
                          "message": "Failed login attempt from CN"
                        }
                      },
                      {
                        "_id": "fallback-id",
                        "_source": {
                          "timestamp": "2026-06-06T10:01:00Z",
                          "source": "windows-auth",
                          "severity": "high",
                          "event_type": "failed_login",
                          "user": "admin",
                          "host": "host-001",
                          "ip": "203.0.113.10",
                          "country_code": "CN",
                          "message": "Failed login attempt from CN"
                        }
                      }
                    ]
                  }
                }
                """);

        var result = mapper.map(response);

        assertThat(result.events())
                .extracting(SearchEvent::eventId)
                .containsExactly("6f1d4c8e-1d93-4a27-9e87-9b7a9e9d8a12", "fallback-id");
    }

    @Test
    void mapsNoResultSearchToEmptyEvents() throws Exception {
        var response = objectMapper.readTree("""
                {
                  "hits": {
                    "total": { "value": 0, "relation": "eq" },
                    "hits": []
                  }
                }
                """);

        var result = mapper.map(response);

        assertThat(result.total()).isZero();
        assertThat(result.events()).isEmpty();
    }
}
