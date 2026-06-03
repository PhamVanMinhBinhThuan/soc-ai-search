package com.soc.ai.search.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.elasticsearch")
public record ElasticsearchProperties(
        @NotBlank String url,
        String username,
        String password,
        @NotBlank String indexEvents) {

    boolean hasCredentials() {
        return hasText(username) && hasText(password);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
