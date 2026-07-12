package com.soc.ai.search.export.domain;

import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

public record PreparedCsvExport(
        boolean truncated,
        StreamingResponseBody body) {
}
