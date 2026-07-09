package com.soc.ai.search.health;

import java.util.Map;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/health")
@Tag(name = "Health", description = "Public health check APIs")
public class HealthController {

    @GetMapping("/live")
    @Operation(summary = "Public liveness check", description = "Does not require authentication.")
    @SecurityRequirements
    public Map<String, String> live() {
        return Map.of("status", "UP");
    }
}
