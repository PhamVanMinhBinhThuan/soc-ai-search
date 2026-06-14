package com.soc.ai.search.summary;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class SummarySourceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void serializesAndDeserializesLowercaseValues() throws Exception {
        assertThat(objectMapper.writeValueAsString(SummarySource.LLM)).isEqualTo("\"llm\"");
        assertThat(objectMapper.writeValueAsString(SummarySource.FALLBACK)).isEqualTo("\"fallback\"");
        assertThat(objectMapper.readValue("\"llm\"", SummarySource.class)).isEqualTo(SummarySource.LLM);
    }
}
