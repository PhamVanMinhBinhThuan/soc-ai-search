package com.soc.ai.search.summary.domain;


import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SummaryTextValidatorTest {

    private final SummaryTextValidator validator = new SummaryTextValidator();

    @Test
    void acceptsThreePlainTextSentencesWithoutSplittingIpv4() {
        var summary = "The query matched 25 events. "
                + "The leading IP is 203.0.113.10 with 12 events. "
                + "Analysts should review the associated hosts.";

        assertThat(validator.isValid(summary)).isTrue();
        assertThat(validator.countSentences(summary)).isEqualTo(3);
    }

    @Test
    void rejectsMarkdownHtmlStructuredAndWrongSentenceCounts() {
        assertThat(validator.isValid("# Heading\nFirst. Second. Third.")).isFalse();
        assertThat(validator.isValid("<p>First.</p> Second. Third.")).isFalse();
        assertThat(validator.isValid("{\"summary\":\"First. Second. Third.\"}")).isFalse();
        assertThat(validator.isValid("Only one sentence.")).isFalse();
        assertThat(validator.isValid("One. Two. Three. Four. Five. Six.")).isFalse();
    }
}
