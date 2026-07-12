package com.soc.ai.search.common.logging;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;

import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class CorrelationIdFilterTest {

    private final CorrelationIdFilter filter = new CorrelationIdFilter();

    @Test
    void reusesClientRequestIdAndEchoesItBack() throws ServletException, IOException {
        var request = new MockHttpServletRequest("GET", "/api/v1/health/live");
        request.addHeader(LogFields.REQUEST_ID_HEADER, "demo-request-id");
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getHeader(LogFields.REQUEST_ID_HEADER)).isEqualTo("demo-request-id");
        assertThat(MDC.get(LogFields.REQUEST_ID)).isNull();
    }

    @Test
    void createsRequestIdWhenHeaderIsMissing() throws ServletException, IOException {
        var request = new MockHttpServletRequest("GET", "/api/v1/health/live");
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getHeader(LogFields.REQUEST_ID_HEADER)).isNotBlank();
        assertThat(MDC.get(LogFields.REQUEST_ID)).isNull();
    }
}
