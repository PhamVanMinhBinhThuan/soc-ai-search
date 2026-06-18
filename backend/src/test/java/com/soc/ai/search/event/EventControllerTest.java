package com.soc.ai.search.event;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import com.soc.ai.search.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(EventController.class)
@Import(SecurityConfig.class)
class EventControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EventIngestService eventIngestService;

    @MockitoBean
    private EventDetailService eventDetailService;

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

    @Test
    void ingestBulkReturnsCreatedForValidBatch() throws Exception {
        when(eventIngestService.ingestBulk(any(BulkIngestEventsRequest.class)))
                .thenReturn(new BulkIngestEventsResponse(2, 2, 0, List.of()));

        mockMvc.perform(post("/api/v1/events/bulk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bulkEventJson(validEventJson(), anotherValidEventJson())))
                .andExpect(status().isCreated())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.requested_count").value(2))
                .andExpect(jsonPath("$.indexed_count").value(2))
                .andExpect(jsonPath("$.failed_count").value(0))
                .andExpect(jsonPath("$.errors").isArray());

        verify(eventIngestService).ingestBulk(any(BulkIngestEventsRequest.class));
    }

    @Test
    void ingestBulkReturnsMultiStatusWhenElasticsearchHasItemErrors() throws Exception {
        when(eventIngestService.ingestBulk(any(BulkIngestEventsRequest.class)))
                .thenReturn(new BulkIngestEventsResponse(
                        2,
                        1,
                        1,
                        List.of(new BulkIngestError(1, "event-2", "soc-events-v1", "mapper_parsing_exception"))));

        mockMvc.perform(post("/api/v1/events/bulk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bulkEventJson(validEventJson(), anotherValidEventJson())))
                .andExpect(status().isMultiStatus())
                .andExpect(jsonPath("$.requested_count").value(2))
                .andExpect(jsonPath("$.indexed_count").value(1))
                .andExpect(jsonPath("$.failed_count").value(1))
                .andExpect(jsonPath("$.errors[0].item").value(1))
                .andExpect(jsonPath("$.errors[0].reason").value("mapper_parsing_exception"));
    }

    @Test
    void ingestBulkRejectsEmptyBatch() throws Exception {
        mockMvc.perform(post("/api/v1/events/bulk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "events": []
                                }
                                """))
                .andExpect(status().isBadRequest());

        verify(eventIngestService, never()).ingestBulk(any(BulkIngestEventsRequest.class));
    }

    @Test
    void ingestBulkRejectsBatchOverLimit() throws Exception {
        mockMvc.perform(post("/api/v1/events/bulk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bulkWithRepeatedEvents(1001)))
                .andExpect(status().isBadRequest());

        verify(eventIngestService, never()).ingestBulk(any(BulkIngestEventsRequest.class));
    }

    @Test
    void ingestBulkRejectsInvalidEventInBatch() throws Exception {
        mockMvc.perform(post("/api/v1/events/bulk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bulkEventJson(validEventJson(), invalidSeverityEventJson())))
                .andExpect(status().isBadRequest());

        verify(eventIngestService, never()).ingestBulk(any(BulkIngestEventsRequest.class));
    }

    @Test
    void detailReturnsEventWithRawForExistingEvent() throws Exception {
        when(eventDetailService.findById("event-1")).thenReturn(eventDetailResponse("event-1"));

        mockMvc.perform(get("/api/v1/events/event-1"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.event_id").value("event-1"))
                .andExpect(jsonPath("$.index_name").value("soc-events-v1"))
                .andExpect(jsonPath("$.event_type").value("failed_login"))
                .andExpect(jsonPath("$.country_code").value("CN"))
                .andExpect(jsonPath("$.raw").value("raw log line"));

        verify(eventDetailService).findById("event-1");
    }

    @Test
    void detailTrimsEventIdBeforeLookup() throws Exception {
        when(eventDetailService.findById("event-1")).thenReturn(eventDetailResponse("event-1"));

        mockMvc.perform(get("/api/v1/events/%20event-1%20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.event_id").value("event-1"));

        verify(eventDetailService).findById("event-1");
    }

    @Test
    void detailRejectsBlankEventId() throws Exception {
        mockMvc.perform(get("/api/v1/events/%20"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("event_id must not be blank"));

        verify(eventDetailService, never()).findById(anyString());
    }

    @Test
    void detailReturnsNotFoundForMissingEvent() throws Exception {
        when(eventDetailService.findById("missing-event"))
                .thenThrow(new EventDetailNotFoundException("missing-event"));

        mockMvc.perform(get("/api/v1/events/missing-event"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Event not found: missing-event"));
    }

    @Test
    void detailReturnsServiceUnavailableForElasticsearchLookupError() throws Exception {
        when(eventDetailService.findById("event-1"))
                .thenThrow(new EventDetailLookupException("Failed to lookup event detail from Elasticsearch",
                        new RuntimeException("connection refused")));

        mockMvc.perform(get("/api/v1/events/event-1"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("Event detail lookup failed"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("connection refused"))));
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

    private String anotherValidEventJson() {
        return validEventJson()
                .replace("\"user\": \"demo.user\"", "\"user\": \"demo.admin\"")
                .replace("\"ip\": \"203.0.113.10\"", "\"ip\": \"203.0.113.11\"");
    }

    private String invalidSeverityEventJson() {
        return validEventJson().replace("\"severity\": \"high\"", "\"severity\": \"urgent\"");
    }

    private String bulkEventJson(String... events) {
        return """
                {
                  "events": [
                """
                + String.join(",", events)
                + """
                
                  ]
                }
                """;
    }

    private String bulkWithRepeatedEvents(int count) {
        var events = IntStream.range(0, count)
                .mapToObj(ignored -> validEventJson())
                .collect(Collectors.joining(","));

        return """
                {
                  "events": [
                """
                + events
                + """
                
                  ]
                }
                """;
    }

    private EventDetailResponse eventDetailResponse(String eventId) {
        return new EventDetailResponse(
                eventId,
                "soc-events-v1",
                "2026-06-03T10:00:00Z",
                "windows-auth",
                "high",
                "failed_login",
                "demo.user",
                "host-001",
                "203.0.113.10",
                "CN",
                "Failed login attempt from CN",
                "raw log line");
    }
}
