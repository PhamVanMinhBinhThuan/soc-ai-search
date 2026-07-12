package com.soc.ai.search.audit.application;


import java.util.UUID;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(AuditProperties.class)
public class AuditConfig {

    @Bean
    QueryIdGenerator queryIdGenerator() {
        return UUID::randomUUID;
    }
}
