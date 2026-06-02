CREATE TABLE search_query_logs (
    id UUID PRIMARY KEY,
    user_identity VARCHAR(255) NOT NULL,
    question TEXT NOT NULL,
    search_plan JSONB,
    generated_dsl JSONB,
    mode VARCHAR(32),
    result_count BIGINT,
    latency_ms BIGINT,
    status VARCHAR(32) NOT NULL,
    error_message TEXT,
    summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_search_query_logs_created_at
    ON search_query_logs (created_at DESC);

CREATE INDEX idx_search_query_logs_user_identity_created_at
    ON search_query_logs (user_identity, created_at DESC);
