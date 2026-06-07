package com.soc.ai.search.search.execution;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
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
