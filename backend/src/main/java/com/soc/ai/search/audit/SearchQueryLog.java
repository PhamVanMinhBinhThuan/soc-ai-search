package com.soc.ai.search.audit;

import java.time.Instant;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
import com.soc.ai.search.search.plan.SearchMode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Convert;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "search_query_logs")
public class SearchQueryLog {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_identity", nullable = false)
    private String userIdentity;

    @Column(name = "question", nullable = false)
    private String question;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "search_plan", columnDefinition = "jsonb")
    private JsonNode searchPlan;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "generated_dsl", columnDefinition = "jsonb")
    private JsonNode generatedDsl;

    @Convert(converter = SearchModeAttributeConverter.class)
    @Column(name = "mode", length = 32)
    private SearchMode mode;

    @Column(name = "result_count")
    private Long resultCount;

    @Column(name = "latency_ms")
    private Long latencyMs;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private AuditStatus status;

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "summary")
    private String summary;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected SearchQueryLog() {
    }

    public SearchQueryLog(
            UUID id,
            String userIdentity,
            String question,
            JsonNode searchPlan,
            JsonNode generatedDsl,
            SearchMode mode,
            Long resultCount,
            Long latencyMs,
            AuditStatus status,
            String errorMessage,
            String summary,
            Instant createdAt) {
        this.id = id;
        this.userIdentity = userIdentity;
        this.question = question;
        this.searchPlan = searchPlan;
        this.generatedDsl = generatedDsl;
        this.mode = mode;
        this.resultCount = resultCount;
        this.latencyMs = latencyMs;
        this.status = status;
        this.errorMessage = errorMessage;
        this.summary = summary;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public String getUserIdentity() {
        return userIdentity;
    }

    public String getQuestion() {
        return question;
    }

    public JsonNode getSearchPlan() {
        return searchPlan;
    }

    public JsonNode getGeneratedDsl() {
        return generatedDsl;
    }

    public SearchMode getMode() {
        return mode;
    }

    public Long getResultCount() {
        return resultCount;
    }

    public Long getLatencyMs() {
        return latencyMs;
    }

    public AuditStatus getStatus() {
        return status;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public String getSummary() {
        return summary;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
