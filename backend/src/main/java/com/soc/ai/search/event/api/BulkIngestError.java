package com.soc.ai.search.event.api;


public record BulkIngestError(
        int item,
        String id,
        String index,
        String reason) {
}
