package com.soc.ai.search.event.api;


import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record IngestEventRequest(
        @NotNull Instant timestamp,
        @NotBlank String source,
        @NotBlank @Pattern(regexp = "low|medium|high|critical", message = "must be one of low, medium, high, critical") String severity,
        @JsonProperty("event_type") @NotBlank String eventType,
        @NotBlank String user,
        @NotBlank String host,
        @NotBlank @Pattern(regexp = "^((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.|$)){4}$", message = "must be a valid IPv4 address") String ip,
        @JsonProperty("country_code") @NotBlank @Pattern(regexp = "^[A-Z]{2}$", message = "must be an ISO-3166 alpha-2 country code") String countryCode,
        @NotBlank String message,
        @NotBlank String raw) {
}
