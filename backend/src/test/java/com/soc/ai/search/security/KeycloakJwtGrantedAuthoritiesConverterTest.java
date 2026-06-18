package com.soc.ai.search.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

class KeycloakJwtGrantedAuthoritiesConverterTest {

    private final KeycloakJwtGrantedAuthoritiesConverter converter =
            new KeycloakJwtGrantedAuthoritiesConverter();

    @Test
    void mapsRealmAndResourceRolesToSpringAuthorities() {
        var jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .claim("realm_access", Map.of("roles", List.of("SOC_ANALYST")))
                .claim("resource_access", Map.of(
                        "soc-ai-search-frontend", Map.of("roles", List.of("SOC_VIEWER"))))
                .build();

        var authorities = converter.convert(jwt).stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        assertThat(authorities)
                .contains("ROLE_SOC_ANALYST", "ROLE_SOC_VIEWER");
    }

    @Test
    void keepsScopeAuthoritiesAndDeduplicatesRoles() {
        var jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .claim("scope", "openid profile")
                .claim("realm_access", Map.of("roles", List.of("SOC_ADMIN", "SOC_ADMIN")))
                .build();

        var authorities = converter.convert(jwt).stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        assertThat(authorities)
                .contains("SCOPE_openid", "SCOPE_profile", "ROLE_SOC_ADMIN");
        assertThat(authorities)
                .filteredOn("ROLE_SOC_ADMIN"::equals)
                .hasSize(1);
    }
}
