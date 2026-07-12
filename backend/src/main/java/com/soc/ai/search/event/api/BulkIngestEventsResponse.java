package com.soc.ai.search.event.api;


import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

public record BulkIngestEventsResponse(
        @JsonProperty("requested_count") int requestedCount,
        @JsonProperty("indexed_count") int indexedCount,
        @JsonProperty("failed_count") int failedCount,
        List<BulkIngestError> errors) {

    @JsonIgnore
    public boolean hasFailures() {
        return failedCount > 0;
    }
}
