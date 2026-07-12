package com.soc.ai.search.audit.application;


import static org.assertj.core.api.Assertions.assertThat;

import java.util.stream.IntStream;

import org.junit.jupiter.api.Test;

class AuditConfigTest {

    @Test
    void queryIdGeneratorCreatesUniqueIds() {
        var generator = new AuditConfig().queryIdGenerator();
        var queryIds = IntStream.range(0, 10)
                .mapToObj(ignored -> generator.generate())
                .toList();

        assertThat(queryIds).doesNotHaveDuplicates();
    }
}
