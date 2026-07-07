package com.soc.ai.search.csv;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import com.soc.ai.search.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(CsvExportController.class)
@Import(SecurityConfig.class)
class CsvExportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CsvExportService exportService;

    @Test
    void returnsStreamingCsvWithSafeHeaders() throws Exception {
        var queryId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        when(exportService.prepare(queryId)).thenReturn(new PreparedCsvExport(
                true,
                output -> output.write("key,value\r\ntotal,12\r\n".getBytes(java.nio.charset.StandardCharsets.UTF_8))));

        var result = mockMvc.perform(get("/api/v1/search/{queryId}/export.csv", queryId))
                .andExpect(request().asyncStarted())
                .andExpect(header().string("X-Export-Truncated", "true"))
                .andExpect(header().string(
                        "Content-Disposition",
                        org.hamcrest.Matchers.containsString(
                                "soc-ai-search.csv")))
                .andReturn();

        mockMvc.perform(asyncDispatch(result))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/csv"))
                .andExpect(content().string("key,value\r\ntotal,12\r\n"));
    }

    @Test
    void invalidUuidReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/search/not-a-uuid/export.csv"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid query_id"));
    }

    @Test
    void failedQueryReturnsConflict() throws Exception {
        var queryId = UUID.randomUUID();
        when(exportService.prepare(queryId))
                .thenThrow(new CsvExportConflictException("Only successful search queries can be exported"));

        mockMvc.perform(get("/api/v1/search/{queryId}/export.csv", queryId))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Only successful search queries can be exported"));
    }

    @Test
    void preflightElasticsearchFailureReturnsServiceUnavailable() throws Exception {
        var queryId = UUID.randomUUID();
        when(exportService.prepare(queryId))
                .thenThrow(new CsvExportDependencyException("failed", new RuntimeException()));

        mockMvc.perform(get("/api/v1/search/{queryId}/export.csv", queryId))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("CSV export dependency is unavailable"));
    }
}
