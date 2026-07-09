package com.soc.ai.search.config;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Paths;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.tags.Tag;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final List<String> TAG_ORDER = List.of(
            "Natural Language Search",
            "Search",
            "Query Refinement",
            "Follow-up Suggestions",
            "CSV Export",
            "Search History and Audit",
            "Auth",
            "Events",
            "Health");

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("SOC AI Search API")
                        .version("v1")
                        .description("REST APIs for natural-language SOC event search, SearchPlan execution, audit history, CSV export, and AI-assisted investigation features."))
                .addServersItem(new Server()
                        .url("https://api.soc-ai-search.app")
                        .description("Production API over HTTPS"))
                .addServersItem(new Server()
                        .url("http://localhost:8080")
                        .description("Local backend"))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Paste the raw JWT access token only. Do not include the 'Bearer ' prefix; Swagger UI adds it automatically.")))
                .tags(List.of(
                        new Tag()
                                .name(TAG_ORDER.get(0))
                                .description("Natural-language SOC event search APIs"),
                        new Tag()
                                .name(TAG_ORDER.get(1))
                                .description("Technical SearchPlan execution APIs"),
                        new Tag()
                                .name(TAG_ORDER.get(2))
                                .description("AI-assisted query correction and refinement APIs"),
                        new Tag()
                                .name(TAG_ORDER.get(3))
                                .description("AI-generated next investigation question APIs"),
                        new Tag()
                                .name(TAG_ORDER.get(4))
                                .description("Search result CSV export APIs"),
                        new Tag()
                                .name(TAG_ORDER.get(5))
                                .description("Query history and system audit APIs"),
                        new Tag()
                                .name(TAG_ORDER.get(6))
                                .description("Authentication introspection APIs"),
                        new Tag()
                                .name(TAG_ORDER.get(7))
                                .description("SOC event ingest and detail APIs"),
                        new Tag()
                                .name(TAG_ORDER.get(8))
                                .description("Public health check APIs")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }

    @Bean
    public OpenApiCustomizer demoFlowOpenApiCustomizer() {
        return openApi -> {
            if (openApi.getTags() != null) {
                openApi.getTags().sort(Comparator
                        .comparingInt((Tag tag) -> tagPriority(tag.getName()))
                        .thenComparing(Tag::getName));
            }

            if (openApi.getPaths() == null || openApi.getPaths().isEmpty()) {
                return;
            }

            var orderedPaths = new Paths();
            openApi.getPaths().entrySet().stream()
                    .sorted(Comparator
                            .comparingInt((Map.Entry<String, ?> entry) -> pathPriority(entry.getKey()))
                            .thenComparing(Map.Entry::getKey))
                    .forEach(entry -> orderedPaths.addPathItem(entry.getKey(), entry.getValue()));
            openApi.setPaths(orderedPaths);
        };
    }

    private static int tagPriority(String tagName) {
        var index = TAG_ORDER.indexOf(tagName);
        return index >= 0 ? index : TAG_ORDER.size();
    }

    private static int pathPriority(String path) {
        if ("/api/v1/search".equals(path)) {
            return 0;
        }
        if ("/api/v1/search/plan".equals(path)) {
            return 1;
        }
        if ("/api/v1/search/refine".equals(path)) {
            return 2;
        }
        if ("/api/v1/suggestions/follow-up".equals(path)) {
            return 3;
        }
        if (path.startsWith("/api/v1/search/{queryId}/export")) {
            return 4;
        }
        if (path.startsWith("/api/v1/search/history") || path.startsWith("/api/v1/audit-logs")) {
            return 5;
        }
        if (path.startsWith("/api/v1/auth")) {
            return 6;
        }
        if (path.startsWith("/api/v1/events")) {
            return 7;
        }
        if (path.startsWith("/api/v1/health")) {
            return 8;
        }
        return 9;
    }
}
