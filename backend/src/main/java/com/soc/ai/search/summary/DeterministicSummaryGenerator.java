package com.soc.ai.search.summary;

import java.util.List;

import com.soc.ai.search.search.execution.AggregationResultItem;
import org.springframework.stereotype.Component;

@Component
public class DeterministicSummaryGenerator {

    public String generate(SummaryPayload payload) {
        return generate(payload, null);
    }

    public String generate(SummaryPayload payload, String originalQuestion) {
        if (isVietnamese(originalQuestion)) {
            return vietnamese(payload);
        }
        if (payload.mode() == com.soc.ai.search.search.plan.SearchMode.AGGREGATION) {
            return aggregation(payload);
        }
        return search(payload);
    }

    private String vietnamese(SummaryPayload payload) {
        if (payload.mode() == com.soc.ai.search.search.plan.SearchMode.AGGREGATION) {
            return vietnameseAggregation(payload);
        }
        return vietnameseSearch(payload);
    }

    private String search(SummaryPayload payload) {
        if (payload.total() == 0) {
            return "No SOC events matched the validated search criteria. "
                    + "No entity or severity pattern is available for this query. "
                    + "Review the filters or expand the time range before investigating again.";
        }

        var entity = firstAvailable(payload.topUsers(), payload.topHosts(), payload.topIps());
        var severity = first(payload.severityDistribution());
        return "The validated search matched " + payload.total() + " SOC events. "
                + (entity == null
                        ? "The bounded result sample does not identify a leading user, host, or IP. "
                        : "The leading available entity is " + entity.key() + " with " + entity.value() + " events. ")
                + (severity == null
                        ? "No dominant severity was available in the bounded summary data."
                        : "The most frequent available severity is " + severity.key() + " with "
                                + severity.value() + " events.");
    }

    private String aggregation(SummaryPayload payload) {
        var results = payload.aggregationResults() == null ? List.<AggregationResultItem>of() : payload.aggregationResults();
        var type = payload.aggregationType() == null ? "aggregation" : payload.aggregationType().jsonValue();
        if (results.isEmpty()) {
            return "The " + type + " aggregation matched " + payload.total() + " SOC events. "
                    + "No aggregation buckets were returned for the validated criteria. "
                    + "Review the filters or aggregation field before running the investigation again.";
        }

        var first = results.get(0);
        return "The " + type + " aggregation matched " + payload.total() + " SOC events. "
                + "It returned " + results.size() + " bounded result buckets for analysis. "
                + "The leading bucket is " + first.key() + " with a value of " + first.value() + ".";
    }

    private String vietnameseSearch(SummaryPayload payload) {
        if (payload.total() == 0) {
            return "Không có sự kiện SOC nào khớp với điều kiện tìm kiếm đã xác thực. "
                    + "Không có mẫu thực thể hoặc mức độ nghiêm trọng nổi bật cho truy vấn này. "
                    + "Hãy kiểm tra bộ lọc hoặc mở rộng khoảng thời gian trước khi điều tra lại.";
        }

        var entity = firstAvailable(payload.topUsers(), payload.topHosts(), payload.topIps());
        var severity = first(payload.severityDistribution());
        return "Truy vấn đã xác thực khớp " + payload.total() + " sự kiện SOC. "
                + (entity == null
                        ? "Mẫu dữ liệu giới hạn chưa xác định được user, host hoặc IP nổi bật. "
                        : "Thực thể nổi bật là " + entity.key() + " với " + entity.value() + " sự kiện. ")
                + (severity == null
                        ? "Không có mức độ nghiêm trọng nổi bật trong dữ liệu tóm tắt giới hạn."
                        : "Mức độ nghiêm trọng xuất hiện nhiều nhất là " + severity.key() + " với "
                                + severity.value() + " sự kiện.");
    }

    private String vietnameseAggregation(SummaryPayload payload) {
        var results = payload.aggregationResults() == null ? List.<AggregationResultItem>of() : payload.aggregationResults();
        var type = payload.aggregationType() == null ? "aggregation" : payload.aggregationType().jsonValue();
        if (results.isEmpty()) {
            return "Phép thống kê " + type + " khớp " + payload.total() + " sự kiện SOC. "
                    + "Không có bucket thống kê nào được trả về cho điều kiện đã xác thực. "
                    + "Hãy kiểm tra bộ lọc hoặc trường thống kê trước khi chạy lại điều tra.";
        }

        var first = results.get(0);
        return "Phép thống kê " + type + " khớp " + payload.total() + " sự kiện SOC. "
                + "Hệ thống trả về " + results.size() + " bucket kết quả đã giới hạn để phân tích. "
                + "Bucket đứng đầu là " + first.key() + " với giá trị " + first.value() + ".";
    }

    private SummaryBucket firstAvailable(List<SummaryBucket>... candidates) {
        for (var candidate : candidates) {
            var first = first(candidate);
            if (first != null) {
                return first;
            }
        }
        return null;
    }

    private SummaryBucket first(List<SummaryBucket> values) {
        return values == null || values.isEmpty() ? null : values.get(0);
    }

    private boolean isVietnamese(String value) {
        return value != null && value.matches(".*[\\u00C0-\\u1EF9].*");
    }
}
