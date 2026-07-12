package com.soc.ai.search.export.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

import com.soc.ai.search.search.domain.result.AggregationResultItem;
import com.soc.ai.search.search.domain.result.SearchEvent;
import org.junit.jupiter.api.Test;

class CsvRowWriterTest {

    @Test
    void writesUtf8BomCrlfEscapingAndFormulaProtection() throws Exception {
        var output = new ByteArrayOutputStream();
        var writer = new CsvRowWriter(output);

        writer.writeSearchHeader();
        writer.writeSearchEvent(new SearchEvent(
                "seed-42-1",
                "2026-06-14T00:00:00Z",
                "windows-auth",
                "high",
                "failed_login",
                "  =SUM(A1:A2)",
                "host-001",
                "203.0.113.10",
                "CN",
                "Failed login, \"admin\"\nsecond line"));
        writer.flush();

        var bytes = output.toByteArray();
        assertThat(bytes).startsWith((byte) 0xEF, (byte) 0xBB, (byte) 0xBF);
        var csv = new String(bytes, 3, bytes.length - 3, StandardCharsets.UTF_8);
        assertThat(csv).contains("\r\n");
        assertThat(csv).contains("'  =SUM(A1:A2)");
        assertThat(csv).contains("\"Failed login, \"\"admin\"\"\nsecond line\"");
    }

    @Test
    void truncatesLongUtf8MessageToFourKilobytesWithSuffix() throws Exception {
        var output = new ByteArrayOutputStream();
        var writer = new CsvRowWriter(output);
        writer.writeSearchEvent(new SearchEvent(
                "id",
                "timestamp",
                "source",
                "low",
                "event",
                "user",
                "host",
                "203.0.113.10",
                "VN",
                "áº¡".repeat(5_000)));
        writer.flush();

        var csv = new String(output.toByteArray(), StandardCharsets.UTF_8);
        assertThat(csv).endsWith("...\r\n");
        assertThat(csv.getBytes(StandardCharsets.UTF_8).length).isLessThanOrEqualTo(4_300);
    }

    @Test
    void keepsAggregationValueNumeric() throws Exception {
        var output = new ByteArrayOutputStream();
        var writer = new CsvRowWriter(output);

        writer.writeAggregationHeader();
        writer.writeAggregationResult(new AggregationResultItem("=danger", 12));
        writer.flush();

        var csv = new String(output.toByteArray(), StandardCharsets.UTF_8);
        assertThat(csv).contains("'=danger,12\r\n");
    }
}
