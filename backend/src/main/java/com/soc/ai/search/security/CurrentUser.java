package com.soc.ai.search.security;

import java.util.List;

public record CurrentUser(
        boolean authenticated,
        String identity,
        String username,
        String email,
        List<String> roles) {
}
