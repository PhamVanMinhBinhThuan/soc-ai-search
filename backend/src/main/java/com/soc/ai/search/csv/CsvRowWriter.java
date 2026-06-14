package com.soc.ai.search.csv;

import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.util.List;

import com.soc.ai.search.search.execution.AggregationResultItem;
import com.soc.ai.search.search.execution.SearchEvent;

final class CsvRowWriter {

    private static final byte[] UTF_8_BOM = new byte[] {
            (byte) 0xEF,
            (byte) 0xBB,
            (byte) 0xBF
    };
    private static final int MESSAGE_MAX_BYTES = 4 * 1024;
    private static final String CRLF = "\r\n";

    private final Writer writer;

    CsvRowWriter(OutputStream outputStream) throws IOException {
        outputStream.write(UTF_8_BOM);
        writer = new OutputStreamWriter(outputStream, StandardCharsets.UTF_8);
    }

    void writeSearchHeader() throws IOException {
        writeTextRow(List.of(
                "event_id",
                "timestamp",
                "source",
                "severity",
                "event_type",
                "user",
                "host",
                "ip",
                "country_code",
                "message"));
    }

    void writeSearchEvent(SearchEvent event) throws IOException {
        writeTextRow(List.of(
                nullToEmpty(event.eventId()),
                nullToEmpty(event.timestamp()),
                nullToEmpty(event.source()),
                nullToEmpty(event.severity()),
                nullToEmpty(event.eventType()),
                nullToEmpty(event.user()),
                nullToEmpty(event.host()),
                nullToEmpty(event.ip()),
                nullToEmpty(event.countryCode()),
                truncateUtf8(nullToEmpty(event.message()), MESSAGE_MAX_BYTES)));
    }

    void writeAggregationHeader() throws IOException {
        writeTextRow(List.of("key", "value"));
    }

    void writeAggregationResult(AggregationResultItem item) throws IOException {
        writer.write(encodeText(item.key()));
        writer.write(',');
        writer.write(Long.toString(item.value()));
        writer.write(CRLF);
    }

    void flush() throws IOException {
        writer.flush();
    }

    private void writeTextRow(List<String> values) throws IOException {
        for (var index = 0; index < values.size(); index++) {
            if (index > 0) {
                writer.write(',');
            }
            writer.write(encodeText(values.get(index)));
        }
        writer.write(CRLF);
    }

    private String encodeText(String value) {
        var safeValue = neutralizeFormula(nullToEmpty(value));
        if (requiresQuotes(safeValue)) {
            return "\"" + safeValue.replace("\"", "\"\"") + "\"";
        }
        return safeValue;
    }

    private String neutralizeFormula(String value) {
        if (value.isEmpty()) {
            return value;
        }

        var first = value.charAt(0);
        if (first == '\t' || first == '\r') {
            return "'" + value;
        }

        var index = 0;
        while (index < value.length()) {
            var codePoint = value.codePointAt(index);
            if (!Character.isWhitespace(codePoint)) {
                return isFormulaPrefix(codePoint) ? "'" + value : value;
            }
            index += Character.charCount(codePoint);
        }
        return value;
    }

    private boolean isFormulaPrefix(int codePoint) {
        return codePoint == '=' || codePoint == '+' || codePoint == '-' || codePoint == '@';
    }

    private boolean requiresQuotes(String value) {
        return value.indexOf(',') >= 0
                || value.indexOf('"') >= 0
                || value.indexOf('\r') >= 0
                || value.indexOf('\n') >= 0;
    }

    private String truncateUtf8(String value, int maxBytes) {
        var bytes = value.getBytes(StandardCharsets.UTF_8);
        if (bytes.length <= maxBytes) {
            return value;
        }

        var suffix = "...";
        var remainingBytes = maxBytes - suffix.length();
        var builder = new StringBuilder();
        var usedBytes = 0;
        var index = 0;
        while (index < value.length()) {
            var codePoint = value.codePointAt(index);
            var asString = new String(Character.toChars(codePoint));
            var codePointBytes = asString.getBytes(StandardCharsets.UTF_8).length;
            if (usedBytes + codePointBytes > remainingBytes) {
                break;
            }
            builder.append(asString);
            usedBytes += codePointBytes;
            index += Character.charCount(codePoint);
        }
        return builder.append(suffix).toString();
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
