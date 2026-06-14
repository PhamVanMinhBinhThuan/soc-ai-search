package com.soc.ai.search.audit;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.soc.ai.search.search.plan.SearchPlan;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class SearchAuditService {

    private static final Logger LOGGER = LoggerFactory.getLogger(SearchAuditService.class);
    private static final int MAX_GENERATED_DSL_BYTES = 100 * 1024;

    private final AuditPersistenceService persistenceService;
    private final AuditProperties properties;
    private final AuditErrorSanitizer errorSanitizer;
    private final ObjectMapper objectMapper;

    public SearchAuditService(
            AuditPersistenceService persistenceService,
            AuditProperties properties,
            AuditErrorSanitizer errorSanitizer,
            ObjectMapper objectMapper) {
        this.persistenceService = persistenceService;
        this.properties = properties;
        this.errorSanitizer = errorSanitizer;
        this.objectMapper = objectMapper;
    }

    public void saveSuccess(
            UUID queryId,
            String question,
            SearchPlan searchPlan,
            Map<String, Object> generatedDsl,
            long resultCount,
            long latencyMs,
            String summary) {
        persistenceService.save(new SearchQueryLog(
                queryId,
                properties.demoUserIdentity(),
                question,
                toJsonNode(searchPlan),
                toLimitedDslNode(queryId, generatedDsl),
                searchPlan.mode(),
                resultCount,
                latencyMs,
                AuditStatus.SUCCESS,
                null,
                summary,
                Instant.now()));
    }

    public void saveFailure(
            UUID queryId,
            String question,
            SearchPlan searchPlan,
            Map<String, Object> generatedDsl,
            long latencyMs,
            RuntimeException exception) {
        persistenceService.save(new SearchQueryLog(
                queryId,
                properties.demoUserIdentity(),
                question,
                toJsonNode(searchPlan),
                toLimitedDslNode(queryId, generatedDsl),
                searchPlan == null ? null : searchPlan.mode(),
                null,
                latencyMs,
                AuditStatus.FAILED,
                errorSanitizer.sanitize(exception),
                null,
                Instant.now()));
    }

    private JsonNode toJsonNode(Object value) {
        if (value == null) {
            return null;
        }

        try {
            return objectMapper.valueToTree(value);
        } catch (IllegalArgumentException exception) {
            throw new AuditPersistenceException("Audit JSON serialization failed", exception);
        }
    }

    private JsonNode toLimitedDslNode(UUID queryId, Map<String, Object> generatedDsl) {
        if (generatedDsl == null) {
            return null;
        }

        try {
            var serializedDsl = objectMapper.writeValueAsBytes(generatedDsl);
            if (serializedDsl.length > MAX_GENERATED_DSL_BYTES) {
                LOGGER.warn(
                        "Generated DSL omitted from audit record because it exceeds {} bytes; query_id={}",
                        MAX_GENERATED_DSL_BYTES,
                        queryId);
                return null;
            }

            return toJsonNode(generatedDsl);
        } catch (JsonProcessingException exception) {
            throw new AuditPersistenceException("Audit JSON serialization failed", exception);
        }
    }
}
