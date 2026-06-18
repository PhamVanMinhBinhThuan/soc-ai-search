package com.soc.ai.search.security;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.soc.ai.search.search.nl.NaturalLanguageSearchController;
import com.soc.ai.search.search.nl.NaturalLanguageSearchService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(NaturalLanguageSearchController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = "app.auth.enabled=true")
class SecurityConfigBusinessEndpointTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private NaturalLanguageSearchService naturalLanguageSearchService;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Test
    void businessEndpointRequiresJwtWhenAuthIsEnabled() throws Exception {
        mockMvc.perform(post("/api/v1/search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "question": "failed login china",
                                  "page": 0,
                                  "size": 5
                                }
                                """))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(naturalLanguageSearchService);
    }
}
