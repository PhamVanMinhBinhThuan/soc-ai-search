package com.soc.ai.search.security;

import java.util.List;

public record AuthMeResponse(
        boolean authenticated,
        String identity,
        String username,
        String email,
        List<String> roles) {

    static AuthMeResponse from(CurrentUser currentUser) {
        return new AuthMeResponse(
                currentUser.authenticated(),
                currentUser.identity(),
                currentUser.username(),
                currentUser.email(),
                currentUser.roles());
    }
}
