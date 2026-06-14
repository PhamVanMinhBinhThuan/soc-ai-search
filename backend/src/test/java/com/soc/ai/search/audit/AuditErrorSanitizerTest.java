package com.soc.ai.search.audit;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class AuditErrorSanitizerTest {

    private final AuditErrorSanitizer sanitizer = new AuditErrorSanitizer();

    @Test
    void removesCredentialsAndNormalizesWhitespace() {
        var sanitized = sanitizer.sanitize(new RuntimeException(
                "Request failed\npassword=abc123 token=xyz Bearer bearer-secret"));

        assertThat(sanitized)
                .isEqualTo("Request failed password=[REDACTED] token=[REDACTED] Bearer [REDACTED]");
    }

    @Test
    void limitsMessageLength() {
        var sanitized = sanitizer.sanitize(new RuntimeException("x".repeat(2_500)));

        assertThat(sanitized).hasSize(AuditErrorSanitizer.MAX_LENGTH);
    }
}
