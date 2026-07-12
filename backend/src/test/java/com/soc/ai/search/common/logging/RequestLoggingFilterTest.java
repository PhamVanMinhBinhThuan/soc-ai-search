package com.soc.ai.search.common.logging;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class RequestLoggingFilterTest {

    @Test
    void extractsQueryIdFromRequestParameter() {
        var request = new MockHttpServletRequest("GET", "/api/v1/audit-logs/export");
        request.setParameter("query_id", "11111111-1111-1111-1111-111111111111");

        assertThat(RequestLoggingFilter.extractQueryId(request))
                .contains("11111111-1111-1111-1111-111111111111");
    }

    @Test
    void extractsQueryIdFromPath() {
        var request = new MockHttpServletRequest(
                "GET",
                "/api/v1/search/22222222-2222-2222-2222-222222222222/export.csv");

        assertThat(RequestLoggingFilter.extractQueryId(request))
                .contains("22222222-2222-2222-2222-222222222222");
    }

    @Test
    void returnsEmptyWhenQueryIdIsNotPresent() {
        var request = new MockHttpServletRequest("GET", "/api/v1/health/live");

        assertThat(RequestLoggingFilter.extractQueryId(request)).isEmpty();
    }
}
