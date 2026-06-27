# Q7 - Bean Validation Và SearchPlanValidator Kiểm Tra Gì?

File liên quan:

```text
backend/src/main/java/com/soc/ai/search/search/plan/SearchPlan.java
backend/src/main/java/com/soc/ai/search/search/plan/SearchFilters.java
backend/src/main/java/com/soc/ai/search/search/plan/AggregationPlan.java
backend/src/main/java/com/soc/ai/search/search/validation/SearchPlanValidator.java
```

Sau khi `SearchPlanJsonParser` parse raw JSON từ LLM thành object `SearchPlan`, backend cần kiểm tra tiếp:

1. **Bean Validation**: kiểm tra constraint cơ bản bằng annotation.
2. **SearchPlanValidator**: kiểm tra rule nghiệp vụ sâu hơn.

Nói ngắn gọn:

> Bean Validation kiểm tra format cơ bản. `SearchPlanValidator` kiểm tra logic nghiệp vụ để đảm bảo SearchPlan an toàn trước khi compile thành Elasticsearch DSL.

---

## 1. Bean Validation nằm ở đâu?

### `SearchPlan.java`

Code quan trọng:

```java
public record SearchPlan(
        @NotNull SearchMode mode,
        @Valid SearchFilters filters,
        @Valid AggregationPlan aggregation,
        @Size(max = 200)
        @Pattern(regexp = ".*\\S.*") String messageQuery,
        @NotNull @Min(0) Integer page,
        @NotNull @Min(1) @Max(100) Integer size) {
}
```

Ý nghĩa:

| Field | Rule |
| --- | --- |
| `mode` | bắt buộc không null |
| `filters` | nếu có thì validate tiếp bên trong |
| `aggregation` | nếu có thì validate tiếp bên trong |
| `message_query` | tối đa 200 ký tự, không được blank |
| `page` | bắt buộc, `>= 0` |
| `size` | bắt buộc, từ `1` đến `100` |

Ví dụ bị reject:

```json
{
  "mode": "search",
  "page": 0,
  "size": 999
}
```

Lý do:

```text
size phải <= 100
```

---

### `SearchFilters.java`

Code quan trọng:

```java
public record SearchFilters(
        @Valid TimeRange timestamp,
        List<@NotBlank @Pattern(regexp = "^[a-z0-9._-]+$") String> source,
        List<@NotBlank @Pattern(regexp = "low|medium|high|critical") String> severity,
        List<@NotBlank String> eventType,
        @Pattern(regexp = ".*\\S.*") String user,
        @Pattern(regexp = ".*\\S.*") String host,
        @Pattern(regexp = "^((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.|$)){4}$") String ip,
        List<@NotBlank @Pattern(regexp = "^[A-Z]{2}$") String> countryCode) {
}
```

Ý nghĩa:

| Field | Rule |
| --- | --- |
| `source` | lowercase, số, `.`, `_`, `-` |
| `severity` | chỉ `low`, `medium`, `high`, `critical` |
| `event_type` | không blank |
| `user` | nếu có thì không blank |
| `host` | nếu có thì không blank |
| `ip` | IPv4 hợp lệ |
| `country_code` | 2 chữ cái viết hoa như `CN`, `VN`, `US` |

Ví dụ pass:

```json
{
  "severity": ["critical"],
  "country_code": ["CN"],
  "ip": "203.0.113.45"
}
```

Ví dụ fail:

```json
{
  "severity": ["urgent"],
  "country_code": ["china"],
  "ip": "999.999.999.999"
}
```

---

### `AggregationPlan.java`

Code quan trọng:

```java
public record AggregationPlan(
        @NotNull AggregationType type,
        String field,
        Integer topN,
        HistogramInterval interval) {
}
```

Bean Validation chỉ kiểm tra:

- `type` không được null.

Các rule như `COUNT` không được có field, `TOP_N` phải có top_n, `DATE_HISTOGRAM` phải có interval sẽ do `SearchPlanValidator` xử lý.

---

## 2. SearchPlanValidator nằm ở đâu?

File:

```text
backend/src/main/java/com/soc/ai/search/search/validation/SearchPlanValidator.java
```

Hàm chính:

```java
public SearchPlan validate(SearchPlan plan)
```

Code trọng tâm:

```java
collectBeanValidationErrors(plan, errors);
validateMode(plan, errors);
validateFilters(plan.filters(), errors);
rejectDangerousValue("message_query", plan.messageQuery(), errors);
validateAggregation(plan, errors);
```

Ý nghĩa:

1. Chạy Bean Validation.
2. Kiểm tra mode.
3. Kiểm tra filters.
4. Chặn syntax nguy hiểm trong `message_query`.
5. Kiểm tra aggregation.

Nếu có lỗi:

```java
throw new SearchPlanValidationException(errors);
```

---

## 3. Rule mode

Code:

```java
private void validateMode(SearchPlan plan, List<String> errors) {
    if (plan.mode() != null
            && plan.mode() != SearchMode.SEARCH
            && plan.mode() != SearchMode.AGGREGATION) {
        errors.add("mode: only search and aggregation are supported");
    }
}
```

Ý nghĩa:

Mode chỉ được là:

- `search`
- `aggregation`

Trong Java enum là:

- `SearchMode.SEARCH`
- `SearchMode.AGGREGATION`

---

## 4. Rule mode `search`

Code:

```java
if (plan.mode() == SearchMode.SEARCH) {
    if (plan.aggregation() != null) {
        errors.add("aggregation: must be null when mode is search");
    }
    return;
}
```

Ý nghĩa:

Nếu `mode = search`, không được có `aggregation`.

Ví dụ sai:

```json
{
  "mode": "search",
  "aggregation": {
    "type": "top_n",
    "field": "ip",
    "top_n": 10
  }
}
```

Vì `search` là để trả raw events, không phải thống kê.

---

## 5. Rule mode `aggregation`

Code:

```java
if (plan.mode() == SearchMode.AGGREGATION) {
    if (plan.messageQuery() != null) {
        errors.add("message_query: is not supported when mode is aggregation");
    }

    var aggregation = plan.aggregation();
    if (aggregation == null) {
        errors.add("aggregation: must not be null when mode is aggregation");
        return;
    }

    validateAggregationByType(aggregation, errors);
}
```

Ý nghĩa:

Nếu `mode = aggregation`:

- bắt buộc phải có `aggregation`;
- không hỗ trợ `message_query`;
- phải validate theo từng aggregation type.

Ví dụ sai:

```json
{
  "mode": "aggregation",
  "message_query": "failed login"
}
```

Vì aggregation không dùng `message_query` trong MVP.

---

## 6. Aggregation field allowlist

Code:

```java
private static final Set<String> AGGREGATION_FIELD_ALLOWLIST = Set.of(
        "source",
        "severity",
        "event_type",
        "user",
        "host",
        "ip",
        "country_code");
```

Ý nghĩa:

Chỉ các field này được dùng để group/top aggregation.

Ví dụ pass:

```json
{
  "aggregation": {
    "type": "top_n",
    "field": "ip",
    "top_n": 10
  }
}
```

Ví dụ fail:

```json
{
  "aggregation": {
    "type": "top_n",
    "field": "message",
    "top_n": 10
  }
}
```

Lý do:

```text
message không nằm trong aggregation field allowlist.
```

---

## 7. Rule `COUNT`

Code:

```java
private void validateCountAggregation(AggregationPlan aggregation, List<String> errors) {
    if (aggregation.field() != null) {
        errors.add("aggregation.field: must be null for count aggregation");
    }
    if (aggregation.topN() != null) {
        errors.add("aggregation.top_n: must be null for count aggregation");
    }
    if (aggregation.interval() != null) {
        errors.add("aggregation.interval: must be null for count aggregation");
    }
}
```

Ý nghĩa:

`COUNT` chỉ đếm tổng số event match filter, nên không cần:

- `field`
- `top_n`
- `interval`

Ví dụ đúng:

```json
{
  "aggregation": {
    "type": "count"
  }
}
```

Ví dụ sai:

```json
{
  "aggregation": {
    "type": "count",
    "field": "ip"
  }
}
```

---

## 8. Rule `GROUP_BY`

Code:

```java
private void validateGroupByAggregation(AggregationPlan aggregation, List<String> errors) {
    validateRequiredAggregationField(aggregation.field(), errors);
    validateOptionalTopN(aggregation.topN(), errors);
    if (aggregation.interval() != null) {
        errors.add("aggregation.interval: must be null for group_by aggregation");
    }
}
```

Ý nghĩa:

`GROUP_BY`:

- bắt buộc có `field`;
- `field` phải nằm trong allowlist;
- `top_n` có thể có hoặc không;
- nếu có `top_n` thì phải từ 1 đến 100;
- không được có `interval`.

Ví dụ đúng:

```json
{
  "aggregation": {
    "type": "group_by",
    "field": "user",
    "top_n": 10
  }
}
```

---

## 9. Rule `TOP_N`

Code:

```java
private void validateTopNAggregation(AggregationPlan aggregation, List<String> errors) {
    validateRequiredAggregationField(aggregation.field(), errors);
    if (aggregation.topN() == null) {
        errors.add("aggregation.top_n: must not be null for top_n aggregation");
    } else {
        validateOptionalTopN(aggregation.topN(), errors);
    }
    if (aggregation.interval() != null) {
        errors.add("aggregation.interval: must be null for top_n aggregation");
    }
}
```

Ý nghĩa:

`TOP_N`:

- bắt buộc có `field`;
- bắt buộc có `top_n`;
- `top_n` từ 1 đến 100;
- không được có `interval`.

Ví dụ đúng:

```json
{
  "aggregation": {
    "type": "top_n",
    "field": "ip",
    "top_n": 10
  }
}
```

Ví dụ sai:

```json
{
  "aggregation": {
    "type": "top_n",
    "field": "ip"
  }
}
```

Lý do:

```text
TOP_N thiếu top_n.
```

---

## 10. Rule `DATE_HISTOGRAM`

Code:

```java
private void validateDateHistogramAggregation(AggregationPlan aggregation, List<String> errors) {
    if (aggregation.field() != null) {
        errors.add("aggregation.field: must be null for date_histogram aggregation because timestamp is fixed");
    }
    if (aggregation.topN() != null) {
        errors.add("aggregation.top_n: must be null for date_histogram aggregation");
    }
    if (aggregation.interval() == null) {
        errors.add("aggregation.interval: must not be null for date_histogram aggregation");
    }
}
```

Ý nghĩa:

`DATE_HISTOGRAM`:

- không được có `field`;
- không được có `top_n`;
- bắt buộc có `interval`;
- backend luôn dùng `timestamp` làm field thời gian.

Ví dụ đúng:

```json
{
  "aggregation": {
    "type": "date_histogram",
    "interval": "hour"
  }
}
```

Ví dụ sai:

```json
{
  "aggregation": {
    "type": "date_histogram",
    "field": "user",
    "interval": "hour"
  }
}
```

---

## 11. Rule time range

Code quan trọng:

```java
private static final Pattern RELATIVE_TIME_PATTERN = Pattern.compile("^now-(\\d+)(h|d)$");
private static final int MAX_RELATIVE_HOURS = 720;
private static final int MAX_RELATIVE_DAYS = 90;
```

Hàm kiểm tra:

```java
private void validateTimeExpression(String field, String value, List<String> errors) {
    if ("now".equals(value) || isSupportedRelativeTime(value) || parseAbsoluteTime(value).isPresent()) {
        return;
    }

    errors.add(field + ": must be ISO-8601, now, now-<number>h up to now-720h, or now-<number>d up to now-90d");
}
```

Ý nghĩa:

Timestamp hỗ trợ:

- `now`
- `now-<number>h`, tối đa `now-720h`
- `now-<number>d`, tối đa `now-90d`
- ISO-8601 timestamp

Ví dụ pass:

```json
{
  "timestamp": {
    "from": "now-12d",
    "to": "now"
  }
}
```

Ví dụ fail:

```json
{
  "timestamp": {
    "from": "now-9999d",
    "to": "now"
  }
}
```

---

## 12. Chặn wildcard/script/query_string

Code:

```java
private void rejectDangerousValue(String field, String value, List<String> errors) {
    if (value.contains("*") || value.contains("?")) {
        errors.add(field + ": wildcard query syntax is not allowed");
    }

    var normalized = value.toLowerCase(Locale.ROOT);
    if (normalized.contains("script") || normalized.contains("painless")) {
        errors.add(field + ": script query syntax is not allowed");
    }
}
```

Validator áp dụng cho:

```java
rejectDangerousValues("filters.source", filters.source(), errors);
rejectDangerousValues("filters.event_type", filters.eventType(), errors);
rejectDangerousValue("filters.user", filters.user(), errors);
rejectDangerousValue("filters.host", filters.host(), errors);
rejectDangerousValue("message_query", plan.messageQuery(), errors);
```

Ví dụ fail:

```json
{
  "message_query": "script painless"
}
```

Ví dụ fail:

```json
{
  "filters": {
    "user": "adm*"
  }
}
```

---

## 13. Câu trả lời mẫu khi hội đồng hỏi

### Bean Validation khác gì SearchPlanValidator?

> Bean Validation kiểm tra constraint cơ bản bằng annotation như `size <= 100`, `page >= 0`, `country_code` phải uppercase, `ip` phải là IPv4. `SearchPlanValidator` kiểm tra rule nghiệp vụ sâu hơn như mode search không được có aggregation, top_n phải có top_n, count không được có field, date_histogram phải có interval.

### Nếu JSON đúng syntax nhưng aggregation sai thì sao?

> Parser parse được JSON thành SearchPlan, nhưng `SearchPlanValidator` sẽ reject. Ví dụ `count` có field hoặc `top_n` thiếu top_n đều bị chặn.

### Vì sao giới hạn time range 720h/90d?

> Đây là guardrail tài nguyên. User vẫn có thể hỏi thời gian linh hoạt như `now-12d`, nhưng không được kéo range quá lớn như `now-9999d`.

### Vì sao chặn wildcard/script?

> Vì đây là các dạng query có thể nặng hoặc nguy hiểm. MVP chỉ cho phép filter có cấu trúc an toàn, không cho LLM/user đưa wildcard hoặc script syntax vào SearchPlan.

### Validator có sinh DSL không?

> Không. Validator chỉ kiểm tra SearchPlan. Nếu pass, `SearchPlanCompiler` mới sinh Elasticsearch DSL.
