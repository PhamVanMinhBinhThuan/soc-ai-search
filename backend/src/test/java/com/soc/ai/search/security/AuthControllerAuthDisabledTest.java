package com.soc.ai.search.security;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = "app.auth.enabled=false")
class AuthControllerAuthDisabledTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CurrentUserService currentUserService;

    @Test
    void meReturnsDemoIdentityWhenAuthIsDisabled() throws Exception {
        when(currentUserService.currentUser()).thenReturn(new CurrentUser(
                true,
                "demo-analyst",
                "demo-analyst",
                null,
                List.of("SOC_ANALYST")));

        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated").value(true))
                .andExpect(jsonPath("$.identity").value("demo-analyst"))
                .andExpect(jsonPath("$.username").value("demo-analyst"))
                .andExpect(jsonPath("$.roles[0]").value("SOC_ANALYST"));
    }
}
