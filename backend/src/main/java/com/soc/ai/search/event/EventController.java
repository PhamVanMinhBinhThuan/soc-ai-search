package com.soc.ai.search.event;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/events")
@Tag(name = "Events", description = "SOC event ingest APIs")
public class EventController {

    private final EventIngestService eventIngestService;

    public EventController(EventIngestService eventIngestService) {
        this.eventIngestService = eventIngestService;
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
}
