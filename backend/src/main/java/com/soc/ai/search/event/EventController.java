package com.soc.ai.search.event;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/events")
@Tag(name = "Events", description = "SOC event APIs")
public class EventController {

    private final EventIngestService eventIngestService;
    private final EventDetailService eventDetailService;

    public EventController(EventIngestService eventIngestService, EventDetailService eventDetailService) {
        this.eventIngestService = eventIngestService;
        this.eventDetailService = eventDetailService;
    }

    @PostMapping
    @Operation(summary = "Ingest one SOC event into Elasticsearch")
    public ResponseEntity<IngestEventResponse> ingest(@Valid @RequestBody IngestEventRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(eventIngestService.ingest(request));
    }

    @PostMapping("/bulk")
    @Operation(
            summary = "Bulk ingest SOC events into Elasticsearch",
            description = "Request body format: { \"events\": [ ... ] }. Maximum 1000 events per request.")
    public ResponseEntity<BulkIngestEventsResponse> ingestBulk(
            @Valid @RequestBody BulkIngestEventsRequest request) {
        var response = eventIngestService.ingestBulk(request);
        var status = response.hasFailures() ? HttpStatus.MULTI_STATUS : HttpStatus.CREATED;
        return ResponseEntity.status(status).body(response);
    }

    @GetMapping("/{event_id}")
    @Operation(summary = "Get SOC event detail by Elasticsearch document id")
    public EventDetailResponse detail(@PathVariable("event_id") String eventId) {
        return eventDetailService.findById(normalizeEventId(eventId));
    }

    @ExceptionHandler(InvalidEventIdException.class)
    ResponseEntity<EventErrorResponse> handleInvalidEventId(InvalidEventIdException exception) {
        return ResponseEntity
                .badRequest()
                .body(new EventErrorResponse(exception.getMessage()));
    }

    @ExceptionHandler(EventDetailNotFoundException.class)
    ResponseEntity<EventErrorResponse> handleEventDetailNotFound(EventDetailNotFoundException exception) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(new EventErrorResponse(exception.getMessage()));
    }

    @ExceptionHandler(EventDetailLookupException.class)
    ResponseEntity<EventErrorResponse> handleEventDetailLookup() {
        return ResponseEntity
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new EventErrorResponse("Event detail lookup failed"));
    }

    private String normalizeEventId(String eventId) {
        if (eventId == null) {
            throw new InvalidEventIdException("event_id must not be blank");
        }
        try {
            var normalized = URLDecoder.decode(eventId, StandardCharsets.UTF_8).trim();
            if (normalized.isEmpty()) {
                throw new InvalidEventIdException("event_id must not be blank");
            }
            return normalized;
        } catch (IllegalArgumentException exception) {
            throw new InvalidEventIdException("event_id is not valid");
        }
    }
}
