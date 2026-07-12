package com.soc.ai.search.security;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import com.soc.ai.search.audit.application.AuditProperties;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {

    private static final String DEMO_ROLE = "SOC_ANALYST";

    private final AuthProperties authProperties;
    private final AuditProperties auditProperties;

    public CurrentUserService(AuthProperties authProperties, AuditProperties auditProperties) {
        this.authProperties = authProperties;
        this.auditProperties = auditProperties;
    }

    public CurrentUser currentUser() {
        if (!authProperties.enabled()) {
            return new CurrentUser(
                    true,
                    auditProperties.demoUserIdentity(),
                    auditProperties.demoUserIdentity(),
                    null,
                    List.of(DEMO_ROLE));
        }

        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication instanceof JwtAuthenticationToken jwtAuthentication) || !authentication.isAuthenticated()) {
            return new CurrentUser(false, null, null, null, List.of());
        }

        var jwt = jwtAuthentication.getToken();
        var username = claimAsString(jwt, "preferred_username").orElse(null);
        var email = claimAsString(jwt, "email").orElse(null);
        var subject = claimAsString(jwt, "sub").orElse(jwt.getSubject());
        var identity = firstNonBlank(username, email, subject).orElse(subject);

        return new CurrentUser(
                true,
                identity,
                username,
                email,
                roles(authentication));
    }

    public String currentIdentity() {
        return currentUser().identity();
    }

    private Optional<String> claimAsString(Jwt jwt, String claimName) {
        return Optional.ofNullable(jwt.getClaimAsString(claimName))
                .map(String::trim)
                .filter(value -> !value.isEmpty());
    }

    private Optional<String> firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return Optional.of(value);
            }
        }
        return Optional.empty();
    }

    private List<String> roles(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .filter(authority -> authority.startsWith("ROLE_"))
                .map(authority -> authority.substring("ROLE_".length()))
                .filter(role -> !role.isBlank())
                .distinct()
                .sorted(Comparator.naturalOrder())
                .toList();
    }
}
