package com.soc.ai.search.audit.infrastructure.csv;


import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;

import com.soc.ai.search.audit.infrastructure.jpa.SearchQueryLog;
public final class AuditCsvWriter {

    private static final byte[] UTF_8_BOM = new byte[] {
            (byte) 0xEF,
            (byte) 0xBB,
            (byte) 0xBF
    };
    private static final String CRLF = "\r\n";

    private final Writer writer;

    public AuditCsvWriter(OutputStream outputStream) throws IOException {
        outputStream.write(UTF_8_BOM);
        writer = new OutputStreamWriter(outputStream, StandardCharsets.UTF_8);
    }

    public void writeHeader() throws IOException {
        writeRow(List.of(
                "created_at",
                "user_identity",
                "question",
                "mode",
                "status",
                "result_count",
                "error_message",
                "pinned",
                "pinned_at",
                "has_generated_dsl"));
    }

    public void writeLog(SearchQueryLog log) throws IOException {
        writeRow(List.of(
                log.getCreatedAt() == null ? "" : DateTimeFormatter.ISO_INSTANT.format(log.getCreatedAt()),
                nullToEmpty(log.getUserIdentity()),
                nullToEmpty(log.getQuestion()),
                log.getMode() == null ? "" : log.getMode().jsonValue(),
                log.getStatus() == null ? "" : log.getStatus().name(),
                log.getResultCount() == null ? "" : Long.toString(log.getResultCount()),
                nullToEmpty(log.getErrorMessage()),
                Boolean.toString(log.isPinned()),
                log.getPinnedAt() == null ? "" : DateTimeFormatter.ISO_INSTANT.format(log.getPinnedAt()),
                Boolean.toString(log.getGeneratedDsl() != null && !log.getGeneratedDsl().isNull())));
    }

    public void flush() throws IOException {
        writer.flush();
    }

    private void writeRow(List<String> values) throws IOException {
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

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
