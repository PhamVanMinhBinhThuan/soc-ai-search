package com.soc.ai.search.audit.domain;

import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

public record PreparedAuditCsvExport(boolean truncated, StreamingResponseBody body) {
}
