package com.soc.ai.search.audit;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuditQueryController.class)
@Import(SecurityConfig.class)
class AuditQueryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuditQueryService queryService;

    @Test
    void returnsPaginatedHistory() throws Exception {
        when(queryService.history(org.mockito.ArgumentMatchers.eq(0), org.mockito.ArgumentMatchers.eq(20), org.mockito.ArgumentMatchers.any(com.soc.ai.search.audit.AuditLogFilters.class))).thenReturn(new PagedResponse<>(
                List.of(new SearchHistoryItem(
                        UUID.fromString("11111111-1111-1111-1111-111111111111"),
                        "failed login china",
                        SearchMode.SEARCH,
                        3L,
                        20L,
                        AuditStatus.SUCCESS,
                        Instant.parse("2026-06-14T00:00:00Z"),
                        false,
                        null)),
                0,
                20,
                1,
                1));

        mockMvc.perform(get("/api/v1/search/history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].query_id")
                        .value("11111111-1111-1111-1111-111111111111"))
                .andExpect(jsonPath("$.items[0].mode").value("search"))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.total_pages").value(1));
    }

    @Test
    void returnsPaginatedAuditLogs() throws Exception {
        when(queryService.auditLogs(org.mockito.ArgumentMatchers.eq(0), org.mockito.ArgumentMatchers.eq(50), org.mockito.ArgumentMatchers.any(com.soc.ai.search.audit.AuditLogFilters.class))).thenReturn(new PagedResponse<>(
                List.of(),
                0,
                50,
                0,
                0));

        mockMvc.perform(get("/api/v1/audit-logs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty())
                .andExpect(jsonPath("$.total").value(0))
                .andExpect(jsonPath("$.total_pages").value(0));
    }

    @Test
    void parsesLowercaseHistoryModeFilter() throws Exception {
        var filtersCaptor = ArgumentCaptor.forClass(AuditLogFilters.class);
        when(queryService.history(
                org.mockito.ArgumentMatchers.eq(0),
                org.mockito.ArgumentMatchers.eq(20),
                filtersCaptor.capture()))
                .thenReturn(new PagedResponse<>(List.of(), 0, 20, 0, 0));

        mockMvc.perform(get("/api/v1/search/history").param("mode", "search"))
                .andExpect(status().isOk());

        org.assertj.core.api.Assertions.assertThat(filtersCaptor.getValue().mode())
                .isEqualTo(SearchMode.SEARCH);
    }

    @Test
    void parsesLowercaseAuditModeFilter() throws Exception {
        var filtersCaptor = ArgumentCaptor.forClass(AuditLogFilters.class);
        when(queryService.auditLogs(
                org.mockito.ArgumentMatchers.eq(0),
                org.mockito.ArgumentMatchers.eq(50),
                filtersCaptor.capture()))
                .thenReturn(new PagedResponse<>(List.of(), 0, 50, 0, 0));

        mockMvc.perform(get("/api/v1/audit-logs").param("mode", "aggregation"))
                .andExpect(status().isOk());

        org.assertj.core.api.Assertions.assertThat(filtersCaptor.getValue().mode())
                .isEqualTo(SearchMode.AGGREGATION);
    }

    @Test
    void returnsBadRequestForInvalidPagination() throws Exception {
        when(queryService.history(org.mockito.ArgumentMatchers.eq(-1), org.mockito.ArgumentMatchers.eq(20), org.mockito.ArgumentMatchers.any(com.soc.ai.search.audit.AuditLogFilters.class)))
                .thenThrow(new IllegalArgumentException("page must be greater than or equal to 0"));

        mockMvc.perform(get("/api/v1/search/history").param("page", "-1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid pagination"));
    }

    @Test
    void returnsControlledErrorWhenPostgresLookupFails() throws Exception {
        when(queryService.auditLogs(org.mockito.ArgumentMatchers.eq(0), org.mockito.ArgumentMatchers.eq(50), org.mockito.ArgumentMatchers.any(com.soc.ai.search.audit.AuditLogFilters.class)))
                .thenThrow(new AuditPersistenceException("Audit log lookup failed", new RuntimeException()));

        mockMvc.perform(get("/api/v1/audit-logs"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("Audit dependency is unavailable"))
                .andExpect(jsonPath("$.errors[0]").value("PostgreSQL audit query failed"));
    }
}
