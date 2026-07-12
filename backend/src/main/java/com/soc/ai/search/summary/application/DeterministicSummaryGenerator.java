package com.soc.ai.search.summary.application;


import java.util.List;

import com.soc.ai.search.search.domain.result.AggregationResultItem;
import org.springframework.stereotype.Component;

import com.soc.ai.search.summary.domain.SummaryBucket;
import com.soc.ai.search.summary.domain.SummaryLanguage;
import com.soc.ai.search.summary.domain.SummaryPayload;
@Component
public class DeterministicSummaryGenerator {

    public String generate(SummaryPayload payload) {
        return generate(payload, SummaryLanguage.EN);
    }

    public String generate(SummaryPayload payload, String originalQuestion) {
        return generate(payload, isVietnamese(originalQuestion) ? SummaryLanguage.VI : SummaryLanguage.EN);
    }

    public String generate(SummaryPayload payload, SummaryLanguage language) {
        if (language == SummaryLanguage.VI) {
            return vietnamese(payload);
        }
        if (payload.mode() == com.soc.ai.search.search.domain.plan.SearchMode.AGGREGATION) {
            return aggregation(payload);
        }
        return search(payload);
    }

    private String vietnamese(SummaryPayload payload) {
        if (payload.mode() == com.soc.ai.search.search.domain.plan.SearchMode.AGGREGATION) {
            return vietnameseAggregation(payload);
        }
        return vietnameseSearch(payload);
    }

    private String search(SummaryPayload payload) {
        if (payload.total() == 0) {
            return "No SOC events matched the validated SearchPlan criteria. "
                    + "Review the search query and SearchPlan before investigating again. ";
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
            return "KhÃ´ng cÃ³ sá»± kiá»‡n SOC nÃ o khá»›p vá»›i Ä‘iá»u kiá»‡n tÃ¬m kiáº¿m Ä‘Ã£ xÃ¡c thá»±c. "
                    + "KhÃ´ng cÃ³ máº«u thá»±c thá»ƒ hoáº·c má»©c Ä‘á»™ nghiÃªm trá»ng ná»•i báº­t cho truy váº¥n nÃ y. "
                    + "HÃ£y kiá»ƒm tra bá»™ lá»c hoáº·c má»Ÿ rá»™ng khoáº£ng thá»i gian trÆ°á»›c khi Ä‘iá»u tra láº¡i.";
        }

        var entity = firstAvailable(payload.topUsers(), payload.topHosts(), payload.topIps());
        var severity = first(payload.severityDistribution());
        return "Truy váº¥n Ä‘Ã£ xÃ¡c thá»±c khá»›p " + payload.total() + " sá»± kiá»‡n SOC. "
                + (entity == null
                        ? "Máº«u dá»¯ liá»‡u giá»›i háº¡n chÆ°a xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c user, host hoáº·c IP ná»•i báº­t. "
                        : "Thá»±c thá»ƒ ná»•i báº­t lÃ  " + entity.key() + " vá»›i " + entity.value() + " sá»± kiá»‡n. ")
                + (severity == null
                        ? "KhÃ´ng cÃ³ má»©c Ä‘á»™ nghiÃªm trá»ng ná»•i báº­t trong dá»¯ liá»‡u tÃ³m táº¯t giá»›i háº¡n."
                        : "Má»©c Ä‘á»™ nghiÃªm trá»ng xuáº¥t hiá»‡n nhiá»u nháº¥t lÃ  " + severity.key() + " vá»›i "
                                + severity.value() + " sá»± kiá»‡n.");
    }

    private String vietnameseAggregation(SummaryPayload payload) {
        var results = payload.aggregationResults() == null ? List.<AggregationResultItem>of() : payload.aggregationResults();
        var type = payload.aggregationType() == null ? "aggregation" : payload.aggregationType().jsonValue();
        if (results.isEmpty()) {
            return "PhÃ©p thá»‘ng kÃª " + type + " khá»›p " + payload.total() + " sá»± kiá»‡n SOC. "
                    + "KhÃ´ng cÃ³ bucket thá»‘ng kÃª nÃ o Ä‘Æ°á»£c tráº£ vá» cho Ä‘iá»u kiá»‡n Ä‘Ã£ xÃ¡c thá»±c. "
                    + "HÃ£y kiá»ƒm tra bá»™ lá»c hoáº·c trÆ°á»ng thá»‘ng kÃª trÆ°á»›c khi cháº¡y láº¡i Ä‘iá»u tra.";
        }

        var first = results.get(0);
        return "PhÃ©p thá»‘ng kÃª " + type + " khá»›p " + payload.total() + " sá»± kiá»‡n SOC. "
                + "Há»‡ thá»‘ng tráº£ vá» " + results.size() + " bucket káº¿t quáº£ Ä‘Ã£ giá»›i háº¡n Ä‘á»ƒ phÃ¢n tÃ­ch. "
                + "Bucket Ä‘á»©ng Ä‘áº§u lÃ  " + first.key() + " vá»›i giÃ¡ trá»‹ " + first.value() + ".";
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
