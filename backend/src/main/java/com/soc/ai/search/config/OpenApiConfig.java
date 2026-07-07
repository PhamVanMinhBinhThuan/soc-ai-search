package com.soc.ai.search.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
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
                                .description("Nhập Bearer Token (chuỗi bắt đầu bằng eyJ...) vào đây. Không cần gõ chữ 'Bearer ' ở trước.")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}
