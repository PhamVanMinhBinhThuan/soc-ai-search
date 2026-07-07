package com.soc.ai.search.summary;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SummaryLanguageDetectorTest {

    private final SummaryLanguageDetector detector = new SummaryLanguageDetector();

    @Test
    void detectsVietnameseOnlyWhenQuestionContainsDiacritics() {
        assertThat(detector.detect("Số event theo giờ trong 24h qua")).isEqualTo(SummaryLanguage.VI);
        assertThat(detector.detect("tim failed_login trong 24h qua")).isEqualTo(SummaryLanguage.EN);
        assertThat(detector.detect("Show failed_login events from China")).isEqualTo(SummaryLanguage.EN);
        assertThat(detector.detect(null)).isEqualTo(SummaryLanguage.EN);
    }
}
