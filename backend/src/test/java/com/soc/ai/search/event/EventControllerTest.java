package com.soc.ai.search.event;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@WebMvcTest(EventController.class)
class EventControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EventIngestService eventIngestService;

    @Test
    void ingestReturnsCreatedForValidEvent() throws Exception {
        when(eventIngestService.ingest(any(IngestEventRequest.class)))
                .thenReturn(new IngestEventResponse("event-1", "soc-events-v1", "created"));

        mockMvc.perform(post("/api/v1/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validEventJson()))
                .andExpect(status().isCreated())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.event_id").value("event-1"))
                .andExpect(jsonPath("$.index").value("soc-events-v1"))
                .andExpect(jsonPath("$.result").value("created"));

        verify(eventIngestService).ingest(any(IngestEventRequest.class));
    }

    @Test
    void ingestRejectsInvalidSeverity() throws Exception {
        mockMvc.perform(post("/api/v1/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidSeverityEventJson()))
                .andExpect(status().isBadRequest());

        verify(eventIngestService, never()).ingest(any(IngestEventRequest.class));
    }

    private String validEventJson() {
        return """
                {
                  "timestamp": "2026-06-03T10:00:00Z",
                  "source": "windows-auth",
                  "severity": "high",
                  "event_type": "failed_login",
                  "user": "demo.user",
                  "host": "host-001",
                  "ip": "203.0.113.10",
                  "country_code": "CN",
                  "message": "Failed login attempt from CN",
                  "raw": "raw log line"
                }
                """;
    }

    private String invalidSeverityEventJson() {
        return validEventJson().replace("\"severity\": \"high\"", "\"severity\": \"urgent\"");
    }
}
