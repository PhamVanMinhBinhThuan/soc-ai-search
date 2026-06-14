package com.soc.ai.search.csv;

import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

public record PreparedCsvExport(
        boolean truncated,
        StreamingResponseBody body) {
}
