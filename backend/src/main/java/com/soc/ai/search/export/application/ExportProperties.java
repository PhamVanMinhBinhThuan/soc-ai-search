package com.soc.ai.search.export.application;

import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.export")
public record ExportProperties(@Min(1) int esTimeoutMs) {
}
