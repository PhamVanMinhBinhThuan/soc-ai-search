package com.soc.ai.search.search.plan;

import java.util.List;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SearchFilters(
        @Valid TimeRange timestamp,
        List<@NotBlank @Pattern(regexp = "^[a-z0-9._-]+$", message = "must contain only lowercase letters, numbers, dot, underscore, or hyphen") String> source,
        List<@NotBlank @Pattern(regexp = "low|medium|high|critical", message = "must be one of low, medium, high, critical") String> severity,
        List<@NotBlank String> eventType,
        @Pattern(regexp = ".*\\S.*", message = "must not be blank") String user,
        @Pattern(regexp = ".*\\S.*", message = "must not be blank") String host,
        @Pattern(regexp = "^((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.|$)){4}$", message = "must be a valid IPv4 address") String ip,
        List<@NotBlank @Pattern(regexp = "^[A-Z]{2}$", message = "must be an ISO-3166 alpha-2 country code") String> countryCode) {

    public SearchFilters(
            TimeRange timestamp,
            List<String> severity,
            List<String> eventType,
            String user,
            String host,
            String ip,
            List<String> countryCode) {
        this(timestamp, null, severity, eventType, user, host, ip, countryCode);
    }
}
