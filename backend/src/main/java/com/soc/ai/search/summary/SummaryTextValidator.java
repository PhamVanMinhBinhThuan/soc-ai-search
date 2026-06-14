package com.soc.ai.search.summary;

import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

@Component
public class SummaryTextValidator {

    private static final int MAX_LENGTH = 2_000;
    private static final Pattern HTML = Pattern.compile("(?s).*<\\/?[a-zA-Z][^>]*>.*");
    private static final Pattern MARKDOWN_LINE = Pattern.compile(
            "(?m)^\\s*(#{1,6}\\s|[-*+]\\s|\\d+\\.\\s|>\\s)");
    private static final Pattern IPV4 = Pattern.compile(
            "\\b(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)){3}\\b");
    private static final Pattern DECIMAL = Pattern.compile("\\b\\d+\\.\\d+\\b");
    private static final Pattern SENTENCE_END = Pattern.compile("[.!?]+(?=\\s|$)");

    public boolean isValid(String value) {
        if (value == null || value.isBlank() || value.length() > MAX_LENGTH) {
            return false;
        }
        var trimmed = value.strip();
        if (trimmed.contains("```")
                || HTML.matcher(trimmed).matches()
                || MARKDOWN_LINE.matcher(trimmed).find()
                || trimmed.startsWith("{")
                || trimmed.startsWith("[")
                || trimmed.startsWith("<")) {
            return false;
        }

        var sentenceCount = countSentences(trimmed);
        return sentenceCount >= 3 && sentenceCount <= 5;
    }

    int countSentences(String value) {
        var withoutIps = IPV4.matcher(value).replaceAll("IP_ADDRESS");
        var withoutDecimals = DECIMAL.matcher(withoutIps).replaceAll("DECIMAL_VALUE");
        var matcher = SENTENCE_END.matcher(withoutDecimals);
        var count = 0;
        while (matcher.find()) {
            count++;
        }
        return count;
    }
}
