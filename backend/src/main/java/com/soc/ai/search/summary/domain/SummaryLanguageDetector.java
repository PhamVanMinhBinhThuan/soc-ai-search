package com.soc.ai.search.summary.domain;

import org.springframework.stereotype.Component;

@Component
public class SummaryLanguageDetector {

    public SummaryLanguage detect(String value) {
        if (value != null && value.matches(".*[\\u00C0-\\u1EF9].*")) {
            return SummaryLanguage.VI;
        }
        return SummaryLanguage.EN;
    }
}
