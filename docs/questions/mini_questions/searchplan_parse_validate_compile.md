# Parse, Validate, Compile SearchPlan

Tài liệu này giải thích ngắn gọn luồng backend xử lý `SearchPlan`: từ output của LLM đến Elasticsearch DSL cuối cùng.

## 1. Các file chính cần nhớ

Phần này được trình bày dạng từng mục thay vì bảng lớn để tránh tràn ngang khi export PDF.

### 1.1 Điều phối Natural Language Search

File:

```text
backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchService.java
```

Vai trò:

- Nhận câu hỏi tự nhiên từ frontend.
- Gọi LLM để sinh SearchPlan.
- Gọi parser để parse SearchPlan.
- Gọi executor để chạy query.
- Lưu audit/history sau khi có kết quả.

### 1.2 Parse JSON SearchPlan

File:

```text
backend/src/main/java/com/soc/ai/search/llm/prompt/SearchPlanJsonParser.java
```

Vai trò:

- Ép output LLM phải là JSON object hợp lệ.
- Chặn markdown code fence.
- Chặn prose/text ngoài JSON.
- Chặn field lạ ngoài SearchPlan contract.
- Override `page` và `size` theo request backend nhận được.

### 1.3 Định nghĩa SearchPlan contract

File:

```text
backend/src/main/java/com/soc/ai/search/search/plan/SearchPlan.java
```

Vai trò:

- Định nghĩa cấu trúc SearchPlan bằng Java record.
- Khai báo các constraint cơ bản như `mode`, `page`, `size`, `message_query`.
- Dùng `SnakeCaseStrategy` để JSON dùng `snake_case`, ví dụ `message_query`.

### 1.4 Validate rule nghiệp vụ

File:

```text
backend/src/main/java/com/soc/ai/search/search/validation/SearchPlanValidator.java
```

Vai trò:

- Kiểm tra `mode`.
- Kiểm tra quan hệ giữa `search` và `aggregation`.
- Kiểm tra allowlist field.
- Kiểm tra time range.
- Kiểm tra sort.
- Chặn wildcard, script, painless, query_string.

### 1.5 Compile sang Elasticsearch DSL

File:

```text
backend/src/main/java/com/soc/ai/search/search/compiler/SearchPlanCompiler.java
```

Vai trò:

- Validate lại SearchPlan trước khi compile.
- Sinh DSL cho search mode.
- Sinh DSL cho aggregation mode.
- Chuyển filter thành `range` hoặc `terms`.
- Chuyển aggregation thành `terms` hoặc `date_histogram`.

### 1.6 Execute DSL

File:

```text
backend/src/main/java/com/soc/ai/search/search/execution/SearchPlanExecutor.java
```

Vai trò:

- Gửi DSL sang Elasticsearch.
- Thêm `timeout`.
- Thêm `track_total_hits`.
- Map response Elasticsearch thành response cho frontend.

## 2. Luồng tổng quan

```text
User question
  -> NaturalLanguageSearchService
  -> SearchPlanPromptBuilder tạo prompt
  -> LlmClient sinh raw SearchPlan JSON
  -> SearchPlanJsonParser parse JSON
  -> SearchPlanValidator validate rule nghiệp vụ
  -> SearchPlanCompiler compile Elasticsearch DSL
  -> SearchPlanExecutor gửi request sang Elasticsearch
  -> Mapper chuẩn hóa response
  -> Audit/history lưu vào PostgreSQL
```

Điểm quan trọng:

> LLM không được gửi DSL trực tiếp. LLM chỉ sinh `SearchPlan`, còn DSL cuối cùng do backend tạo ra.

## 3. Parse SearchPlan

Parser dùng strict ObjectMapper:

```java
this.strictObjectMapper = objectMapper.copy()
        .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, true)
        .configure(DeserializationFeature.FAIL_ON_TRAILING_TOKENS, true);
```

Ý nghĩa:

- `FAIL_ON_UNKNOWN_PROPERTIES`: LLM sinh field lạ thì reject.
- `FAIL_ON_TRAILING_TOKENS`: output có JSON/text thừa phía sau thì reject.

Parser cũng chặn markdown/prose:

```java
if (content.contains("```")) {
    throw new SearchPlanJsonParseException(List.of("LLM output must not contain markdown code fences"));
}

if (!content.startsWith("{") || !content.endsWith("}")) {
    throw new SearchPlanJsonParseException(List.of("LLM output must be exactly one JSON object without prose"));
}
```

Câu nói ngắn:

> Parser đảm bảo output của LLM là một JSON object thuần, đúng schema SearchPlan, không markdown, không prose, không field lạ.

## 4. Override pagination từ request

Trong natural-language search:

```java
searchPlanJsonParser.parseWithPaginationOverride(rawContent, request.page(), request.size());
```

Trong parser:

```java
objectNode.put("page", page);
objectNode.put("size", size);
```

Ý nghĩa:

- LLM có thể sinh `page`/`size`, nhưng backend sẽ ghi đè.
- Backend không để LLM tự quyết định phân trang.
- Khi search lần đầu, frontend thường gửi `page = 0`.

## 5. Validate SearchPlan

Validator chạy các lớp kiểm tra:

```java
collectBeanValidationErrors(plan, errors);
validateMode(plan, errors);
validateFilters(plan.filters(), errors);
rejectDangerousValue("message_query", plan.messageQuery(), errors);
validateSort(plan, errors);
validateAggregation(plan, errors);
```

### 5.1 Bean Validation

Trong `SearchPlan.java`:

```java
@NotNull SearchMode mode,
@Valid SearchFilters filters,
@Valid AggregationPlan aggregation,
@Size(max = 200) String messageQuery,
List<@Valid SortPlan> sort,
@NotNull @Min(0) Integer page,
@NotNull @Min(1) @Max(100) Integer size
```

Ý nghĩa:

- `mode` bắt buộc có.
- `page >= 0`.
- `size` từ `1` đến `100`.
- `message_query` tối đa 200 ký tự.

### 5.2 Validate mode và aggregation

Search mode không được có aggregation:

```java
if (plan.mode() == SearchMode.SEARCH) {
    if (plan.aggregation() != null) {
        errors.add("aggregation: must be null when mode is search");
    }
}
```

Aggregation mode bắt buộc có aggregation:

```java
if (aggregation == null) {
    errors.add("aggregation: must not be null when mode is aggregation");
}
```

### 5.3 Validate từng loại aggregation

```java
switch (aggregation.type()) {
    case COUNT -> validateCountAggregation(aggregation, errors);
    case GROUP_BY -> validateGroupByAggregation(aggregation, errors);
    case TOP_N -> validateTopNAggregation(aggregation, errors);
    case DATE_HISTOGRAM -> validateDateHistogramAggregation(aggregation, errors);
}
```

Rule chính:

- `count`: không dùng `field`, `top_n`, `interval`.
- `group_by`: bắt buộc có `field`.
- `top_n`: bắt buộc có `field` và `top_n`.
- `date_histogram`: bắt buộc có `interval`, không nhận field tùy ý vì field cố định là `timestamp`.

### 5.4 Field allowlist

Aggregation chỉ được dùng:

```java
"source", "severity", "event_type", "user", "host", "ip", "country_code"
```

Sort chỉ được dùng:

```java
"timestamp", "severity", "source", "event_type", "user", "host", "ip", "country_code"
```

Ý nghĩa:

> LLM không thể tự ý aggregate hoặc sort trên field ngoài danh sách cho phép.

### 5.5 Validate time range

Validator cho phép:

- `now`
- `now-<number>h`, tối đa `now-720h`
- `now-<number>d`, tối đa `now-90d`
- ISO-8601 absolute time

Code chính:

```java
private static final Pattern RELATIVE_TIME_PATTERN = Pattern.compile("^now-(\\d+)(h|d)$");
private static final int MAX_RELATIVE_HOURS = 720;
private static final int MAX_RELATIVE_DAYS = 90;
```

### 5.6 Chặn giá trị nguy hiểm

```java
if (value.contains("*") || value.contains("?")) {
    errors.add(field + ": wildcard query syntax is not allowed");
}

if (normalized.contains("script") || normalized.contains("painless") || normalized.contains("query_string")) {
    errors.add(field + ": script query syntax is not allowed");
}
```

Ý nghĩa:

- Chặn wildcard query syntax.
- Chặn người dùng/LLM nhét `script`, `painless`, `query_string`.
- Giảm nguy cơ bypass guardrail.

## 6. Compile SearchPlan thành DSL

Compiler luôn validate lại trước khi compile:

```java
public CompiledSearchQuery compile(SearchPlan plan) {
    var validatedPlan = validator.validate(plan);
    if (validatedPlan.mode() == SearchMode.AGGREGATION) {
        return compileAggregation(validatedPlan);
    }

    return compileSearch(validatedPlan);
}
```

Ý nghĩa:

> Dù SearchPlan đến từ LLM, edit, filter/sort hay CSV export, compiler vẫn validate lại trước khi sinh DSL.

## 7. Compile search mode

Code chính:

```java
searchSpec.put("query", Map.of("bool", boolQuery));
searchSpec.put("from", validatedPlan.page() * validatedPlan.size());
searchSpec.put("size", validatedPlan.size());
searchSpec.put("sort", sort(validatedPlan));
```

Mapping:

| SearchPlan | Elasticsearch DSL |
|---|---|
| `filters.timestamp` | `range timestamp gte/lte` |
| `filters.severity`, `event_type`, `user`, `host`, `ip`, `country_code` | `terms` filter |
| `message_query` | `match` trên `message` |
| `page`, `size` | `from = page * size`, `size` |
| `sort` | Elasticsearch `sort` |

Ví dụ timestamp:

```java
filters.add(Map.of("range", Map.of("timestamp", range)));
```

Ví dụ multi-value filter:

```java
filters.add(Map.of("terms", Map.of(field, List.copyOf(values))));
```

## 8. Compile aggregation mode

Code chính:

```java
searchSpec.put("query", Map.of("bool", boolQuery));
searchSpec.put("size", 0);

var aggregations = aggregations(validatedPlan);
if (!aggregations.isEmpty()) {
    searchSpec.put("aggs", aggregations);
}
```

Aggregation không cần trả raw event nên `size = 0`.

## 9. Compile từng loại aggregation

```java
return switch (aggregation.type()) {
    case COUNT -> Map.of();
    case GROUP_BY -> termsAggregation("count_by_field", aggregation.field(), bucketLimit(aggregation), aggregation);
    case TOP_N -> termsAggregation("top_values", aggregation.field(), aggregation.topN(), aggregation);
    case DATE_HISTOGRAM -> dateHistogramAggregation(validatedPlan);
};
```

### 9.1 `top_n` và `group_by`

Cả hai đều dùng `terms aggregation`:

```java
terms.put("field", field);
terms.put("size", size);
terms.put("order", aggregationOrder(aggregation));
```

Ví dụ DSL:

```json
"aggs": {
  "top_values": {
    "terms": {
      "field": "ip",
      "size": 5,
      "order": {
        "_count": "desc"
      }
    }
  }
}
```

### 9.2 `date_histogram`

```java
dateHistogram.put("field", "timestamp");
dateHistogram.put("fixed_interval", fixedInterval(aggregation));
dateHistogram.put("order", Map.of("_key", "asc"));
dateHistogram.put("min_doc_count", 0);
dateHistogram.put("extended_bounds", Map.of(
        "min", timeRange.from(),
        "max", timeRange.to()));
```

Ý nghĩa:

- Luôn group theo `timestamp`.
- `fixed_interval`: `1m`, `1h`, hoặc `1d`.
- `_key asc`: sắp xếp theo thời gian tăng dần.
- `min_doc_count = 0`: trả cả bucket không có event.
- `extended_bounds`: giữ đủ trục thời gian từ `from` đến `to`.

### 9.3 `count`

`count` không tạo `aggs` riêng:

```java
case COUNT -> Map.of();
```

Backend lấy tổng số event từ `hits.total.value`.

## 10. Sort severity

Sort field thường được compile trực tiếp:

```java
return Map.of(sort.field(), Map.of("order", sort.order().name().toLowerCase()));
```

Riêng `severity`, backend dùng `_script` sort:

```java
if ("severity".equals(sort.field())) {
    return severityRankSortClause(sort.order());
}
```

Rule:

```text
critical = 4
high     = 3
medium   = 2
low      = 1
```

## 11. Executor thêm timeout và track total hits

Trong `SearchPlanExecutor.java`:

```java
var requestBody = new LinkedHashMap<>(searchSpec);
requestBody.put("timeout", SEARCH_TIMEOUT);
requestBody.put("track_total_hits", true);
```

Ý nghĩa:

- `timeout = "3s"`: giới hạn thời gian query Elasticsearch.
- `track_total_hits = true`: yêu cầu Elasticsearch đếm chính xác tổng số kết quả.

Hai field này có thể không nằm trong `generated_dsl` trả về UI, nhưng request thật gửi sang Elasticsearch vẫn có.

## 12. Câu trả lời ngắn khi bảo vệ

Backend xử lý SearchPlan theo ba lớp bảo vệ. Thứ nhất, `SearchPlanJsonParser` ép output LLM phải là một JSON object thuần, đúng schema và không có field lạ. Thứ hai, `SearchPlanValidator` kiểm tra rule nghiệp vụ như mode, aggregation type, field allowlist, time range và giá trị nguy hiểm. Thứ ba, `SearchPlanCompiler` chỉ compile SearchPlan đã hợp lệ thành Elasticsearch DSL an toàn như `bool.filter`, `range`, `terms`, `match`, `terms aggregation` và `date_histogram`. Nhờ vậy LLM chỉ hỗ trợ hiểu câu hỏi, còn truy vấn cuối cùng luôn do backend kiểm soát.

## Event ID parse, validate và compile

Với `filters.event_id`, pipeline xử lý như sau:

1. **Parse:** JSON parser map `event_id` từ snake_case vào field `eventId` của `SearchFilters`. Field này có thể nhận một UUID hoặc danh sách UUID nhờ deserializer linh hoạt.
2. **Validate:** `SearchPlanValidator` kiểm tra danh sách không rỗng, từng item không blank, từng item parse được bằng `UUID.fromString(...)`, và tổng số lượng không vượt quá 20.
3. **Compile:** `SearchPlanCompiler` chuyển `filters.event_id` thành Elasticsearch `terms` query trên field `event_id`.

Ví dụ lỗi bị reject:

```json
{
  "filters": {
    "event_id": ["not-a-uuid"]
  }
}
```

Lý do: `event_id` phải là UUID đầy đủ, không hỗ trợ partial ID, wildcard hoặc regexp.
