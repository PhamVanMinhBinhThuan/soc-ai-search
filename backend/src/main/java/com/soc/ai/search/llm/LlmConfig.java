package com.soc.ai.search.llm;

import java.time.Duration;

import com.soc.ai.search.llm.anthropic.AnthropicLlmClient;
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
        var searchPlanClient = restClientBuilder
                .clone()
                .requestFactory(requestFactory(properties.timeoutMs()))
                .build();
        var summaryClient = restClientBuilder
                .clone()
                .requestFactory(requestFactory(properties.summaryTimeoutMs()))
                .build();

        return new GeminiLlmClient(searchPlanClient, summaryClient, properties);
    }

    @Bean
    @ConditionalOnProperty(prefix = "app.llm", name = "provider", havingValue = "anthropic")
    LlmClient anthropicLlmClient(RestClient.Builder restClientBuilder, LlmProperties properties) {
        var searchPlanClient = restClientBuilder
                .clone()
                .requestFactory(requestFactory(properties.timeoutMs()))
                .build();
        var summaryClient = restClientBuilder
                .clone()
                .requestFactory(requestFactory(properties.summaryTimeoutMs()))
                .build();

        return new AnthropicLlmClient(searchPlanClient, summaryClient, properties);
    }

    private SimpleClientHttpRequestFactory requestFactory(long timeoutMs) {
        var requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(timeoutMs));
        requestFactory.setReadTimeout(Duration.ofMillis(timeoutMs));
        return requestFactory;
    }
}
