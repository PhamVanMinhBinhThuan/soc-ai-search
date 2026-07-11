package com.soc.ai.search.security;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.soc.ai.search.audit.AuditLogItem;
import com.soc.ai.search.audit.AuditQueryController;
import com.soc.ai.search.audit.AuditQueryService;
import com.soc.ai.search.audit.AuditStatus;
import com.soc.ai.search.audit.PagedResponse;
import com.soc.ai.search.audit.QueryIdGenerator;
import com.soc.ai.search.audit.SearchAuditService;
import com.soc.ai.search.audit.SearchHistoryItem;
import com.soc.ai.search.csv.CsvExportController;
import com.soc.ai.search.csv.CsvExportService;
import com.soc.ai.search.csv.PreparedCsvExport;
import com.soc.ai.search.event.EventController;
import com.soc.ai.search.event.EventDetailResponse;
import com.soc.ai.search.event.EventDetailService;
import com.soc.ai.search.event.EventIngestService;
import com.soc.ai.search.event.IngestEventRequest;
import com.soc.ai.search.event.IngestEventResponse;
import com.soc.ai.search.search.execution.SearchController;
import com.soc.ai.search.search.execution.SearchEvent;
import com.soc.ai.search.search.execution.SearchPlanExecutor;
import com.soc.ai.search.search.execution.SearchPlanSearchResponse;
import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.search.plan.SearchPlan;
import com.soc.ai.search.search.refine.QueryRefinementController;
import com.soc.ai.search.search.refine.QueryRefinementRequest;
import com.soc.ai.search.search.refine.QueryRefinementResponse;
import com.soc.ai.search.search.refine.QueryRefinementService;
import com.soc.ai.search.summary.ResultSummaryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

@WebMvcTest(controllers = {
        EventController.class,
        CsvExportController.class,
        AuditQueryController.class,
        SearchController.class,
        QueryRefinementController.class
})
@Import(SecurityConfig.class)
@TestPropertySource(properties = "app.auth.enabled=true")
class RbacEndpointGuardTest {

    private static final UUID QUERY_ID = UUID.fromString("00000000-0000-4000-8000-000000000456");

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EventIngestService eventIngestService;

    @MockitoBean
    private EventDetailService eventDetailService;

    @MockitoBean
    private CsvExportService exportService;

    @MockitoBean
    private AuditQueryService auditQueryService;

    @MockitoBean
    private SearchPlanExecutor searchPlanExecutor;

    @MockitoBean
    private ResultSummaryService resultSummaryService;

    @MockitoBean
    private SearchAuditService searchAuditService;

    @MockitoBean
    private QueryIdGenerator queryIdGenerator;

    @MockitoBean
    private QueryRefinementService queryRefinementService;

    @MockitoBean
    private CurrentUserService currentUserService;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @BeforeEach
    void setUp() {
        when(queryIdGenerator.generate()).thenReturn(QUERY_ID);
    }

    @Test
    void unauthenticatedBusinessEndpointReturnsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/v1/search/plan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validSearchPlanJson()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Unauthorized"))
                .andExpect(jsonPath("$.errors[0]").value("Authentication is required"));
    }

    @Test
    void viewerCanExecuteSearchPlan() throws Exception {
        when(searchPlanExecutor.execute(any(SearchPlan.class))).thenReturn(searchResponse());

        mockMvc.perform(post("/api/v1/search/plan")
                        .with(role(RoleNames.ROLE_VIEWER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validSearchPlanJson()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("search"))
                .andExpect(jsonPath("$.events[0].event_id").value("seed-42-1"));
    }

    @Test
    void viewerCanPreviewQueryRefinement() throws Exception {
        when(queryRefinementService.refine(any(QueryRefinementRequest.class)))
                .thenReturn(new QueryRefinementResponse("Show failed login events in the last 7 days", "gemini", 10));

        mockMvc.perform(post("/api/v1/search/refine")
                        .with(role(RoleNames.ROLE_VIEWER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(queryRefinementJson()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rewritten_question").value("Show failed login events in the last 7 days"));
    }

    @Test
    void viewerCanGetEventDetailButRawIsRedacted() throws Exception {
        when(eventDetailService.findById("event-1")).thenReturn(eventDetailResponse("event-1"));

        mockMvc.perform(get("/api/v1/events/event-1").with(role(RoleNames.ROLE_VIEWER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.event_id").value("event-1"))
                .andExpect(jsonPath("$.raw").doesNotExist())
                .andExpect(jsonPath("$.raw_visible").value(false));
    }

    @Test
    void analystCanGetEventDetailWithRaw() throws Exception {
        when(eventDetailService.findById("event-1")).thenReturn(eventDetailResponse("event-1"));

        mockMvc.perform(get("/api/v1/events/event-1").with(role(RoleNames.ROLE_ANALYST)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.raw").value("raw log line"))
                .andExpect(jsonPath("$.raw_visible").value(true));
    }

    @Test
    void viewerCannotExportCsv() throws Exception {
        var queryId = UUID.randomUUID();

        mockMvc.perform(get("/api/v1/search/{queryId}/export.csv", queryId).with(role(RoleNames.ROLE_VIEWER)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Forbidden"))
                .andExpect(jsonPath("$.errors[0]").value("Insufficient role"))
                .andExpect(jsonPath("$.errors[0]").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("AccessDeniedException"))));

        verifyNoInteractions(exportService);
    }

    @Test
    void analystCanExportCsv() throws Exception {
        var queryId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        when(exportService.prepare(queryId)).thenReturn(new PreparedCsvExport(
                false,
                output -> output.write("key,value\r\ntotal,12\r\n".getBytes(StandardCharsets.UTF_8))));

        var result = mockMvc.perform(get("/api/v1/search/{queryId}/export.csv", queryId)
                        .with(role(RoleNames.ROLE_ANALYST)))
                .andExpect(request().asyncStarted())
                .andExpect(header().string("X-Export-Truncated", "false"))
                .andReturn();

        mockMvc.perform(asyncDispatch(result))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/csv"))
                .andExpect(content().string("key,value\r\ntotal,12\r\n"));
    }

    @Test
    void viewerCannotReadHistoryOrAuditLogs() throws Exception {
        mockMvc.perform(get("/api/v1/search/history").with(role(RoleNames.ROLE_VIEWER)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Forbidden"));

        mockMvc.perform(get("/api/v1/audit-logs").with(role(RoleNames.ROLE_VIEWER)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Forbidden"));

        verifyNoInteractions(auditQueryService);
    }

    @Test
    void analystCanReadHistoryButCannotReadAuditLogs() throws Exception {
        when(auditQueryService.history(org.mockito.ArgumentMatchers.eq(0), org.mockito.ArgumentMatchers.eq(20), org.mockito.ArgumentMatchers.any(com.soc.ai.search.audit.AuditLogFilters.class))).thenReturn(new PagedResponse<>(
                List.of(new SearchHistoryItem(
                        UUID.fromString("22222222-2222-2222-2222-222222222222"),
                        "failed login china",
                        SearchMode.SEARCH,
                        3L,
                        25L,
                        AuditStatus.SUCCESS,
                        Instant.parse("2026-06-18T00:00:00Z"),
                        false,
                        null)),
                0,
                20,
                1,
                1));

        mockMvc.perform(get("/api/v1/search/history").with(role(RoleNames.ROLE_ANALYST)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].query_id").value("22222222-2222-2222-2222-222222222222"));

        mockMvc.perform(get("/api/v1/audit-logs").with(role(RoleNames.ROLE_ANALYST)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    @Test
    void adminCanReadAuditLogsThroughRoleHierarchy() throws Exception {
        when(auditQueryService.auditLogs(org.mockito.ArgumentMatchers.eq(0), org.mockito.ArgumentMatchers.eq(50), org.mockito.ArgumentMatchers.any(com.soc.ai.search.audit.AuditLogFilters.class))).thenReturn(new PagedResponse<>(
                List.of(new AuditLogItem(
                        UUID.fromString("33333333-3333-3333-3333-333333333333"),
                        "admin.one",
                        "audit query",
                        SearchMode.AGGREGATION,
                        10L,
                        50L,
                        AuditStatus.SUCCESS,
                        null,
                        Instant.parse("2026-06-18T00:00:00Z"))),
                0,
                50,
                1,
                1));

        mockMvc.perform(get("/api/v1/audit-logs").with(role(RoleNames.ROLE_ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].user_identity").value("admin.one"));

        when(auditQueryService.history(org.mockito.ArgumentMatchers.eq(0), org.mockito.ArgumentMatchers.eq(20), org.mockito.ArgumentMatchers.any(com.soc.ai.search.audit.AuditLogFilters.class))).thenReturn(new PagedResponse<>(List.of(), 0, 20, 0, 0));
        mockMvc.perform(get("/api/v1/search/history").with(role(RoleNames.ROLE_ADMIN)))
                .andExpect(status().isOk());
    }

    @Test
    void ingestIsAdminOnlyWhenAuthIsEnabled() throws Exception {
        mockMvc.perform(post("/api/v1/events")
                        .with(role(RoleNames.ROLE_ANALYST))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validEventJson()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Forbidden"));

        when(eventIngestService.ingest(any(IngestEventRequest.class)))
                .thenReturn(new IngestEventResponse("event-1", "soc-events-v1", "created"));

        mockMvc.perform(post("/api/v1/events")
                        .with(role(RoleNames.ROLE_ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validEventJson()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.event_id").value("event-1"));
    }

    private RequestPostProcessor role(String authority) {
        return jwt().authorities(new SimpleGrantedAuthority(authority));
    }

    private SearchPlanSearchResponse searchResponse() {
        return new SearchPlanSearchResponse(
                SearchMode.SEARCH,
                Map.of("query", Map.of("bool", Map.of("filter", List.of()))),
                1,
                0,
                20,
                1,
                12,
                List.of(new SearchEvent(
                        "seed-42-1",
                        "2026-06-06T10:00:00Z",
                        "windows-auth",
                        "high",
                        "failed_login",
                        "admin",
                        "host-001",
                        "203.0.113.10",
                        "CN",
                        "Failed login attempt from CN")));
    }

    private EventDetailResponse eventDetailResponse(String eventId) {
        return new EventDetailResponse(
                eventId,
                "soc-events-v1",
                "2026-06-03T10:00:00Z",
                "windows-auth",
                "high",
                "failed_login",
                "demo.user",
                "host-001",
                "203.0.113.10",
                "CN",
                "Failed login attempt from CN",
                "raw log line");
    }

    private String validSearchPlanJson() {
        return """
                {
                  "mode": "search",
                  "filters": {
                    "timestamp": { "from": "now-24h", "to": "now" },
                    "event_type": ["failed_login"],
                    "country_code": ["CN"]
                  },
                  "page": 0,
                  "size": 20
                }
                """;
    }

    private String queryRefinementJson() {
        return """
                {
                  "original_question": "Show failed login events from China in the last 24h",
                  "current_question": "Show failed login events from China in the last 24h",
                  "current_search_plan": {
                    "mode": "search",
                    "filters": {
                      "timestamp": { "from": "now-24h", "to": "now" },
                      "event_type": ["failed_login"],
                      "country_code": ["CN"]
                    },
                    "page": 0,
                    "size": 20
                  },
                  "refinement": "Make it 7 days"
                }
                """;
    }

    private String validEventJson() {
        return """
                {
                  "timestamp": "2026-06-03T10:00:00Z",
                  "source": "windows-auth",
                  "severity": "high",
                  "event_type": "failed_login",
                  "user": "demo.user",
                  "host": "host-001",
                  "ip": "203.0.113.10",
                  "country_code": "CN",
                  "message": "Failed login attempt from CN",
                  "raw": "raw log line"
                }
                """;
    }
}
