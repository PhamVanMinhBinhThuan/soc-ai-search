package com.soc.ai.search.common.logging;

import java.io.IOException;
import java.util.UUID;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {

    private static final int MAX_REQUEST_ID_LENGTH = 128;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        var requestId = requestId(request);
        MDC.put(LogFields.REQUEST_ID, requestId);
        response.setHeader(LogFields.REQUEST_ID_HEADER, requestId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(LogFields.REQUEST_ID);
        }
    }

    private String requestId(HttpServletRequest request) {
        var headerValue = request.getHeader(LogFields.REQUEST_ID_HEADER);
        if (headerValue != null) {
            var candidate = headerValue.strip();
            if (!candidate.isEmpty() && candidate.length() <= MAX_REQUEST_ID_LENGTH) {
                return candidate;
            }
        }
        return UUID.randomUUID().toString();
    }
}
