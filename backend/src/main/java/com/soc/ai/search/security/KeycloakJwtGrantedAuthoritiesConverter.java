package com.soc.ai.search.security;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;

public class KeycloakJwtGrantedAuthoritiesConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

    private static final String ROLE_PREFIX = "ROLE_";

    private final JwtGrantedAuthoritiesConverter scopeAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();

    @Override
    public Collection<GrantedAuthority> convert(Jwt jwt) {
        Set<GrantedAuthority> authorities = new LinkedHashSet<>(scopeAuthoritiesConverter.convert(jwt));
        roleNames(jwt).stream()
                .map(role -> role.startsWith(ROLE_PREFIX) ? role : ROLE_PREFIX + role)
                .map(SimpleGrantedAuthority::new)
                .forEach(authorities::add);
        return new ArrayList<>(authorities);
    }

    private Set<String> roleNames(Jwt jwt) {
        Set<String> roles = new LinkedHashSet<>();
        roles.addAll(extractRoles(jwt.getClaim("realm_access")));

        Map<String, Object> resourceAccess = jwt.getClaim("resource_access");
        if (resourceAccess != null) {
            resourceAccess.values().forEach(clientAccess -> roles.addAll(extractRoles(clientAccess)));
        }

        return roles;
    }

    private Collection<String> extractRoles(Object accessClaim) {
        if (!(accessClaim instanceof Map<?, ?> access)) {
            return Set.of();
        }

        Object rolesClaim = access.get("roles");
        if (!(rolesClaim instanceof Collection<?> values)) {
            return Set.of();
        }

        Set<String> roles = new LinkedHashSet<>();
        values.stream()
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .map(String::trim)
                .filter(role -> !role.isEmpty())
                .forEach(roles::add);
        return roles;
    }
}
