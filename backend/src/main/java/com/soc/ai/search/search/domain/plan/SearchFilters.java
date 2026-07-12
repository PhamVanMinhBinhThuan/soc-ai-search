package com.soc.ai.search.search.domain.plan;

import java.util.List;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SearchFilters(
        @Valid TimeRange timestamp,
        @JsonDeserialize(using = FlexibleStringListDeserializer.class)
        List<@NotBlank @Pattern(regexp = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$", message = "must be a valid UUID") String> eventId,
        @JsonDeserialize(using = FlexibleStringListDeserializer.class)
        List<@NotBlank @Pattern(regexp = "^[a-z0-9._-]+$", message = "must contain only lowercase letters, numbers, dot, underscore, or hyphen") String> source,
        List<@NotBlank @Pattern(regexp = "low|medium|high|critical", message = "must be one of low, medium, high, critical") String> severity,
        List<@NotBlank String> eventType,
        @JsonDeserialize(using = FlexibleStringListDeserializer.class)
        List<@NotBlank @Pattern(regexp = "^[A-Za-z0-9._-]+$", message = "must contain only letters, numbers, dot, underscore, or hyphen") String> user,
        @JsonDeserialize(using = FlexibleStringListDeserializer.class)
        List<@NotBlank @Pattern(regexp = "^[A-Za-z0-9._-]+$", message = "must contain only letters, numbers, dot, underscore, or hyphen") String> host,
        @JsonDeserialize(using = FlexibleStringListDeserializer.class)
        List<@NotBlank @Pattern(regexp = "^((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.|$)){4}$", message = "must be a valid IPv4 address") String> ip,
        List<@NotBlank @Pattern(regexp = "^[A-Z]{2}$", message = "must be an ISO-3166 alpha-2 country code") String> countryCode) {

    public SearchFilters(
            TimeRange timestamp,
            List<String> severity,
            List<String> eventType,
            String user,
            String host,
            String ip,
            List<String> countryCode) {
        this(timestamp, null, null, severity, eventType, singleValue(user), singleValue(host), singleValue(ip), countryCode);
    }

    public SearchFilters(
            TimeRange timestamp,
            List<String> source,
            List<String> severity,
            List<String> eventType,
            List<String> user,
            List<String> host,
            List<String> ip,
            List<String> countryCode) {
        this(timestamp, null, source, severity, eventType, user, host, ip, countryCode);
    }

    private static List<String> singleValue(String value) {
        return value == null ? null : List.of(value);
    }
}
