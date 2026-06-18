package com.soc.ai.search.security;

import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class RbacPermissionService {

    private final AuthProperties authProperties;
    private final RoleHierarchy roleHierarchy;

    public RbacPermissionService(AuthProperties authProperties, RoleHierarchy roleHierarchy) {
        this.authProperties = authProperties;
        this.roleHierarchy = roleHierarchy;
    }

    public boolean authDisabled() {
        return !authProperties.enabled();
    }

    public boolean canViewRawLog() {
        return authDisabled() || hasRole(SecurityContextHolder.getContext().getAuthentication(), RoleNames.ROLE_ANALYST);
    }

    public boolean hasViewer(Authentication authentication) {
        return authDisabled() || hasRole(authentication, RoleNames.ROLE_VIEWER);
    }

    public boolean hasAnalyst(Authentication authentication) {
        return authDisabled() || hasRole(authentication, RoleNames.ROLE_ANALYST);
    }

    public boolean hasAdmin(Authentication authentication) {
        return authDisabled() || hasRole(authentication, RoleNames.ROLE_ADMIN);
    }

    private boolean hasRole(Authentication authentication, String role) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        return roleHierarchy.getReachableGrantedAuthorities(authentication.getAuthorities()).stream()
                .anyMatch(authority -> role.equals(authority.getAuthority()));
    }
}
