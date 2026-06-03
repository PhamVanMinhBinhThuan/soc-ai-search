package com.soc.ai.search.event;

public record BulkIngestError(
        int item,
        String id,
        String index,
        String reason) {
}
