package com.soc.ai.search.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import com.soc.ai.search.audit.AuditProperties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

class CurrentUserServiceTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void returnsDemoIdentityWhenAuthIsDisabled() {
        var service = new CurrentUserService(
                new AuthProperties(false),
                new AuditProperties("demo-analyst"));

        var currentUser = service.currentUser();

        assertThat(currentUser.authenticated()).isTrue();
        assertThat(currentUser.identity()).isEqualTo("demo-analyst");
        assertThat(currentUser.username()).isEqualTo("demo-analyst");
        assertThat(currentUser.email()).isNull();
        assertThat(currentUser.roles()).containsExactly("SOC_ANALYST");
    }

    @Test
    void usesPreferredUsernameBeforeEmailAndSubjectWhenAuthIsEnabled() {
        setJwtAuthentication(Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject("subject-123")
                .claim("preferred_username", "analyst.one")
                .claim("email", "analyst.one@example.com")
                .build());

        var service = new CurrentUserService(
                new AuthProperties(true),
                new AuditProperties("demo-analyst"));

        var currentUser = service.currentUser();

        assertThat(currentUser.authenticated()).isTrue();
        assertThat(currentUser.identity()).isEqualTo("analyst.one");
        assertThat(currentUser.username()).isEqualTo("analyst.one");
        assertThat(currentUser.email()).isEqualTo("analyst.one@example.com");
        assertThat(currentUser.roles()).containsExactly("SOC_ANALYST");
    }

    @Test
    void fallsBackToEmailThenSubjectWhenPreferredUsernameIsMissing() {
        setJwtAuthentication(Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject("subject-123")
                .claim("email", "analyst.two@example.com")
                .build());

        var service = new CurrentUserService(
                new AuthProperties(true),
                new AuditProperties("demo-analyst"));

        assertThat(service.currentUser().identity())
                .isEqualTo("analyst.two@example.com");

        setJwtAuthentication(Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject("subject-456")
                .build());

        assertThat(service.currentUser().identity())
                .isEqualTo("subject-456");
    }

    @Test
    void returnsUnauthenticatedUserWhenAuthEnabledWithoutJwtAuthentication() {
        var service = new CurrentUserService(
                new AuthProperties(true),
                new AuditProperties("demo-analyst"));

        var currentUser = service.currentUser();

        assertThat(currentUser.authenticated()).isFalse();
        assertThat(currentUser.identity()).isNull();
        assertThat(currentUser.roles()).isEmpty();
    }

    private void setJwtAuthentication(Jwt jwt) {
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(
                jwt,
                List.of(new SimpleGrantedAuthority("ROLE_SOC_ANALYST"))));
    }
}
