package com.soc.ai.search.event.api;


import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public record BulkIngestEventsRequest(
        @NotEmpty @Size(max = 1000) List<@Valid IngestEventRequest> events) {
}
