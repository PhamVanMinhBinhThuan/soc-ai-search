package com.soc.ai.search.export.api;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import com.soc.ai.search.export.application.CsvExportService;
import com.soc.ai.search.security.CurrentUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping("/api/v1/search")
@Tag(name = "CSV Export", description = "Replay an audited SearchPlan and export current Elasticsearch results")
public class CsvExportController {

    private static final Logger LOGGER = LoggerFactory.getLogger(CsvExportController.class);

    private static final MediaType CSV_MEDIA_TYPE =
            new MediaType("text", "csv", StandardCharsets.UTF_8);

    private final CsvExportService exportService;
    private final CurrentUserService currentUserService;

    public CsvExportController(CsvExportService exportService, CurrentUserService currentUserService) {
        this.exportService = exportService;
        this.currentUserService = currentUserService;
    }

    @GetMapping(value = "/{queryId}/export.csv", produces = "text/csv")
    @PreAuthorize("@rbacPermissionService.authDisabled() or hasRole('SOC_ANALYST')")
    @Operation(
            summary = "Export an audited search query as CSV",
            description = "Requires SOC_ANALYST. Replays the stored SearchPlan against current Elasticsearch data. "
                    + "Search exports are capped at 10,000 rows; aggregation exports contain current buckets.")
    public ResponseEntity<StreamingResponseBody> export(@PathVariable UUID queryId) {
        var identity = currentUserService.currentIdentity();
        LOGGER.info("CSV export requested. query_id={} user_identity={}", queryId, identity);
        var prepared = exportService.prepare(queryId);
        var filename = "soc-ai-search.csv";
        LOGGER.info(
                "CSV export prepared. query_id={} user_identity={} truncated={}",
                queryId,
                identity,
                prepared.truncated());

        return ResponseEntity.ok()
                .contentType(CSV_MEDIA_TYPE)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(filename)
                                .build()
                                .toString())
                .header("X-Export-Truncated", Boolean.toString(prepared.truncated()))
                .body(prepared.body());
    }
}
