package com.soc.ai.search.llm;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class LlmPropertiesTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(LlmConfig.class)
            .withPropertyValues(
                    "app.llm.provider=mock",
                    "app.llm.timeout-ms=10000",
                    "app.llm.max-attempts=2");

    @Test
    void bindsProviderAsEnumAndCreatesMockClient() {
        contextRunner.run(context -> {
            var properties = context.getBean(LlmProperties.class);

            assertThat(properties.provider()).isEqualTo(LlmProvider.MOCK);
            assertThat(properties.timeoutMs()).isEqualTo(10_000);
            assertThat(properties.maxAttempts()).isEqualTo(2);
            assertThat(context).hasSingleBean(LlmClient.class);
        });
    }
}
