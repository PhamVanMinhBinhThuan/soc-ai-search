package com.soc.ai.search.common.logging;

import java.io.IOException;
import java.util.Comparator;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger LOGGER = LoggerFactory.getLogger(RequestLoggingFilter.class);
    private static final String ANONYMOUS_USER = "anonymousUser";
    private static final Pattern UUID_PATTERN = Pattern.compile(
            "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        var startedAt = System.nanoTime();
        putUserContext();
        extractQueryId(request).ifPresent(queryId -> MDC.put(LogFields.QUERY_ID, queryId));
        try {
            filterChain.doFilter(request, response);
        } finally {
            var latencyMs = (System.nanoTime() - startedAt) / 1_000_000;
            LOGGER.info(
                    "HTTP request completed. request_id={} query_id={} user_identity={} roles={} method={} path={} status={} latency_ms={}",
                    MDC.get(LogFields.REQUEST_ID),
                    MDC.get(LogFields.QUERY_ID),
                    MDC.get(LogFields.USER_IDENTITY),
                    MDC.get(LogFields.USER_ROLES),
                    request.getMethod(),
                    request.getRequestURI(),
                    response.getStatus(),
                    latencyMs);
            MDC.remove(LogFields.QUERY_ID);
            MDC.remove(LogFields.USER_IDENTITY);
            MDC.remove(LogFields.USER_ROLES);
        }
    }

    static Optional<String> extractQueryId(HttpServletRequest request) {
        var explicitQueryId = firstPresentParameter(request, "query_id", "queryId");
        if (explicitQueryId.isPresent()) {
            return explicitQueryId;
        }
        var matcher = UUID_PATTERN.matcher(request.getRequestURI());
        if (matcher.find()) {
            return Optional.of(matcher.group());
        }
        return Optional.empty();
    }

    private static Optional<String> firstPresentParameter(HttpServletRequest request, String... names) {
        for (var name : names) {
            var value = request.getParameter(name);
            if (value != null && !value.isBlank()) {
                return Optional.of(value);
            }
        }
        return Optional.empty();
    }

    private void putUserContext() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return;
        }

        var identity = identity(authentication);
        if (identity != null && !identity.isBlank() && !ANONYMOUS_USER.equals(identity)) {
            MDC.put(LogFields.USER_IDENTITY, identity);
        }

        var roles = authentication.getAuthorities().stream()
                .map(Object::toString)
                .filter(authority -> authority.startsWith("ROLE_"))
                .map(authority -> authority.substring("ROLE_".length()))
                .sorted(Comparator.naturalOrder())
                .collect(Collectors.joining(","));
        if (!roles.isBlank()) {
            MDC.put(LogFields.USER_ROLES, roles);
        }
    }

    private String identity(Authentication authentication) {
        if (authentication instanceof JwtAuthenticationToken jwtAuthentication) {
            var jwt = jwtAuthentication.getToken();
            var username = jwt.getClaimAsString("preferred_username");
            if (username != null && !username.isBlank()) {
                return username;
            }
            var email = jwt.getClaimAsString("email");
            if (email != null && !email.isBlank()) {
                return email;
            }
            return jwt.getSubject();
        }
        return authentication.getName();
    }
}
