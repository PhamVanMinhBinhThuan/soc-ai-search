package com.soc.ai.search.config;

import java.util.List;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.tags.Tag;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

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
                                .name("Natural Language Search")
                                .description("Natural-language SOC event search APIs"),
                        new Tag()
                                .name("Search")
                                .description("Technical SearchPlan execution APIs"),
                        new Tag()
                                .name("Query Refinement")
                                .description("AI-assisted query correction and refinement APIs"),
                        new Tag()
                                .name("Follow-up Suggestions")
                                .description("AI-generated next investigation question APIs"),
                        new Tag()
                                .name("CSV Export")
                                .description("Search result CSV export APIs"),
                        new Tag()
                                .name("Search History and Audit")
                                .description("Query history and system audit APIs"),
                        new Tag()
                                .name("Auth")
                                .description("Authentication introspection APIs"),
                        new Tag()
                                .name("Events")
                                .description("SOC event ingest and detail APIs"),
                        new Tag()
                                .name("Health")
                                .description("Public health check APIs")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}
