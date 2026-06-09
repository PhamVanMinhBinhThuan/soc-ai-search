package com.soc.ai.search.llm;

import java.time.Duration;

import com.soc.ai.search.llm.gemini.GeminiLlmClient;
import com.soc.ai.search.llm.mock.MockLlmClient;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(LlmProperties.class)
public class LlmConfig {

    @Bean
    @ConditionalOnProperty(prefix = "app.llm", name = "provider", havingValue = "mock", matchIfMissing = true)
    LlmClient mockLlmClient(LlmProperties properties) {
        return new MockLlmClient(properties);
    }

    @Bean
    @ConditionalOnProperty(prefix = "app.llm", name = "provider", havingValue = "gemini")
    LlmClient geminiLlmClient(RestClient.Builder restClientBuilder, LlmProperties properties) {
        var requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(properties.timeoutMs()));
        requestFactory.setReadTimeout(Duration.ofMillis(properties.timeoutMs()));

        var restClient = restClientBuilder
                .requestFactory(requestFactory)
                .build();

        return new GeminiLlmClient(restClient, properties);
    }
}
