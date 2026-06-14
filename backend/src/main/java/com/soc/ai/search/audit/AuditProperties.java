package com.soc.ai.search.audit;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.audit")
public record AuditProperties(@NotBlank String demoUserIdentity) {
}
