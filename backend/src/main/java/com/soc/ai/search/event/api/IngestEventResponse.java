package com.soc.ai.search.event.api;


import com.fasterxml.jackson.annotation.JsonProperty;

public record IngestEventResponse(
        @JsonProperty("event_id") String eventId,
        String index,
        String result) {
}
