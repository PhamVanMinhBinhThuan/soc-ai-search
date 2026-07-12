package com.soc.ai.search.config.llm;

import static org.assertj.core.api.Assertions.assertThat;

import com.soc.ai.search.llm.application.LlmClient;
import com.soc.ai.search.llm.domain.LlmProvider;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.web.client.RestClient;

class LlmPropertiesTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(LlmConfig.class)
            .withBean(RestClient.Builder.class, RestClient::builder)
            .withPropertyValues(
                    "app.llm.provider=mock",
                    "app.llm.timeout-ms=10000",
                    "app.llm.summary-timeout-ms=5000",
                    "app.llm.max-attempts=2");

    @Test
    void bindsProviderAsEnumAndCreatesMockClient() {
        contextRunner.run(context -> {
            var properties = context.getBean(LlmProperties.class);

            assertThat(properties.provider()).isEqualTo(LlmProvider.MOCK);
            assertThat(properties.timeoutMs()).isEqualTo(10_000);
            assertThat(properties.summaryTimeoutMs()).isEqualTo(5_000);
            assertThat(properties.maxAttempts()).isEqualTo(2);
            assertThat(context).hasSingleBean(LlmClient.class);
        });
    }

    @Test
    void createsAnthropicClientWhenConfigured() {
        contextRunner
                .withPropertyValues(
                        "app.llm.provider=anthropic",
                        "app.llm.base-url=https://api.anthropic.com",
                        "app.llm.api-key=test-key",
                        "app.llm.model=claude-sonnet-5-20250701")
                .run(context -> {
                    var properties = context.getBean(LlmProperties.class);

                    assertThat(properties.provider()).isEqualTo(LlmProvider.ANTHROPIC);
                    assertThat(context).hasSingleBean(LlmClient.class);
                });
    }
}
