package com.soc.ai.search.security;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = "app.auth.enabled=true")
class AuthControllerAuthEnabledTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CurrentUserService currentUserService;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Test
    void meReturnsUnauthorizedWithoutTokenWhenAuthIsEnabled() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Unauthorized"))
                .andExpect(jsonPath("$.errors[0]").value("Authentication is required"));
    }

    @Test
    void meReturnsCurrentUserWithJwtWhenAuthIsEnabled() throws Exception {
        when(currentUserService.currentUser()).thenReturn(new CurrentUser(
                true,
                "analyst.one",
                "analyst.one",
                "analyst.one@example.com",
                List.of("SOC_ANALYST")));

        mockMvc.perform(get("/api/v1/auth/me")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_SOC_ANALYST"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated").value(true))
                .andExpect(jsonPath("$.identity").value("analyst.one"))
                .andExpect(jsonPath("$.email").value("analyst.one@example.com"))
                .andExpect(jsonPath("$.roles[0]").value("SOC_ANALYST"));
    }
}
