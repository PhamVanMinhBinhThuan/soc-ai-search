package com.soc.ai.search.security;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Auth", description = "Authentication introspection APIs")
public class AuthController {

    private final CurrentUserService currentUserService;

    public AuthController(CurrentUserService currentUserService) {
        this.currentUserService = currentUserService;
    }

    @GetMapping("/api/v1/auth/me")
    @Operation(summary = "Get current authenticated user identity and roles")
    public AuthMeResponse me() {
        return AuthMeResponse.from(currentUserService.currentUser());
    }
}
