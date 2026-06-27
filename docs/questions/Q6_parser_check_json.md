# Q6 - Parser Check JSON LLM Output Như Thế Nào?

File liên quan:

```text
backend/src/main/java/com/soc/ai/search/llm/prompt/SearchPlanJsonParser.java
```

`SearchPlanJsonParser` là lớp đứng ngay sau LLM. Nó nhận raw text từ Gemini/mock, kiểm tra output có đúng JSON `SearchPlan` hay không, rồi parse thành object Java.

Luồng ngắn:

```text
LLM raw text
  -> SearchPlanJsonParser
  -> SearchPlan object
  -> SearchPlanValidator
  -> SearchPlanCompiler
```

---

## 1. Parser dùng để làm gì?

LLM trả về `String`, ví dụ:

```json
{
  "mode": "search",
  "filters": {
    "event_type": ["failed_login"]
  }
}
```

Nhưng backend không thể tin ngay chuỗi này. Parser phải kiểm tra:

- Output có null không.
- Output có rỗng không.
- Output có markdown code fence không.
- Output có prose/explanation không.
- Output có phải đúng một JSON object không.
- JSON có field lạ ngoài schema không.
- JSON có text/token dư sau object không.
- JSON parse thành `SearchPlan` được không.
- SearchPlan có pass rule nghiệp vụ không.

Nói khi bảo vệ:

> LLM chỉ trả raw text, nên em có parser riêng để ép output phải là đúng một JSON SearchPlan object. Parser reject markdown, prose, field lạ và text dư trước khi hệ thống compile DSL.

---

## 2. Constructor bật Jackson strict mode

Trong constructor:

```java
public SearchPlanJsonParser(ObjectMapper objectMapper, SearchPlanValidator searchPlanValidator) {
    this.strictObjectMapper = objectMapper.copy()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, true)
            .configure(DeserializationFeature.FAIL_ON_TRAILING_TOKENS, true);
    this.strictSearchPlanReader = strictObjectMapper.readerFor(SearchPlan.class);
    this.searchPlanValidator = searchPlanValidator;
}
```

Ý nghĩa:

Backend tạo một `ObjectMapper` riêng cho LLM output và bật strict mode.

---

## 3. `FAIL_ON_UNKNOWN_PROPERTIES`

Code:

```java
.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, true)
```

Ý nghĩa:

> Nếu LLM trả field không có trong class `SearchPlan`, Jackson sẽ reject.

Ví dụ LLM trả sai:

```json
{
  "mode": "search",
  "unsupported_question": true
}
```

`SearchPlan` không có field `unsupported_question`, nên backend reject.

Ví dụ LLM trả DSL sai:

```json
{
  "query": {
    "bool": {
      "filter": []
    }
  }
}
```

`SearchPlan` không có field `query`, nên backend reject.

Câu nói khi bảo vệ:

> Nếu LLM tự thêm field lạ hoặc sinh Elasticsearch DSL như `query`, `aggs`, thì Jackson strict mode sẽ reject nhờ `FAIL_ON_UNKNOWN_PROPERTIES`.

---

## 4. `FAIL_ON_TRAILING_TOKENS`

Code:

```java
.configure(DeserializationFeature.FAIL_ON_TRAILING_TOKENS, true)
```

Ý nghĩa:

> Nếu sau JSON object còn text/token dư, Jackson sẽ reject.

Ví dụ sai:

```text
{
  "mode": "search"
}
Here is the SearchPlan.
```

Nếu không bật strict mode, parser có thể parse object đầu tiên rồi bỏ qua phần sau. Nhưng với `FAIL_ON_TRAILING_TOKENS`, backend reject.

Câu nói khi bảo vệ:

> `FAIL_ON_TRAILING_TOKENS` giúp backend không chấp nhận output kiểu JSON kèm lời giải thích phía sau. LLM phải trả đúng một JSON object thuần.

---

## 5. Hàm `parse(rawContent)`

Code chính:

```java
public SearchPlan parse(String rawContent) {
    var content = normalizeInput(rawContent);
    rejectNonJsonObjectShape(content);

    try {
        var plan = (SearchPlan) strictSearchPlanReader.readValue(content);
        return searchPlanValidator.validate(plan);
    } catch (SearchPlanValidationException exception) {
        throw new SearchPlanJsonParseException(exception.errors());
    } catch (JsonProcessingException exception) {
        throw new SearchPlanJsonParseException(List.of("LLM output must be a valid SearchPlan JSON object"));
    }
}
```

Hàm này làm 4 bước:

1. `normalizeInput`
2. `rejectNonJsonObjectShape`
3. Jackson parse JSON thành `SearchPlan`
4. Gọi `SearchPlanValidator`

---

## 6. `normalizeInput`

Code:

```java
private String normalizeInput(String rawContent) {
    if (rawContent == null) {
        throw new SearchPlanJsonParseException(List.of("LLM output must not be null"));
    }

    return rawContent.trim();
}
```

Ý nghĩa:

- Nếu LLM output là `null` thì reject.
- Nếu có khoảng trắng đầu/cuối thì trim.

Ví dụ:

```text
   { "mode": "search" }   
```

Sau `trim()` thành:

```json
{ "mode": "search" }
```

---

## 7. `rejectNonJsonObjectShape`

Code:

```java
private void rejectNonJsonObjectShape(String content) {
    if (content.isEmpty()) {
        throw new SearchPlanJsonParseException(List.of("LLM output must not be blank"));
    }

    if (content.contains("```")) {
        throw new SearchPlanJsonParseException(List.of("LLM output must not contain markdown code fences"));
    }

    if (!content.startsWith("{") || !content.endsWith("}")) {
        throw new SearchPlanJsonParseException(List.of("LLM output must be exactly one JSON object without prose"));
    }
}
```

Hàm này reject các lỗi output phổ biến của LLM.

### 7.1. Reject blank output

Sai:

```text

```

Lỗi:

```text
LLM output must not be blank
```

### 7.2. Reject markdown code fence

Sai:

````text
```json
{
  "mode": "search"
}
```
````

Lỗi:

```text
LLM output must not contain markdown code fences
```

### 7.3. Reject prose trước/sau JSON

Sai:

```text
Sure, here is the JSON:
{
  "mode": "search"
}
```

Vì output không bắt đầu bằng `{`.

Sai:

```text
{
  "mode": "search"
}
Explanation: this searches events.
```

Vì output không kết thúc bằng `}` hoặc có trailing tokens.

### 7.4. Reject array

Sai:

```json
[
  {
    "mode": "search"
  }
]
```

Vì output phải là object, không phải array.

---

## 8. `parseWithPaginationOverride`

Code chính:

```java
public SearchPlan parseWithPaginationOverride(String rawContent, int page, int size) {
    var content = normalizeInput(rawContent);
    rejectNonJsonObjectShape(content);

    try {
        var root = strictObjectMapper.readTree(content);
        if (!root.isObject()) {
            throw new SearchPlanJsonParseException(List.of("LLM output must be exactly one JSON object without prose"));
        }

        var objectNode = (ObjectNode) root;
        objectNode.put("page", page);
        objectNode.put("size", size);

        var plan = strictObjectMapper.treeToValue(objectNode, SearchPlan.class);
        return searchPlanValidator.validate(plan);
    } catch (SearchPlanValidationException exception) {
        throw new SearchPlanJsonParseException(exception.errors());
    } catch (JsonProcessingException exception) {
        throw new SearchPlanJsonParseException(List.of(
                "LLM output must be a valid SearchPlan JSON object: " + exception.getOriginalMessage()));
    }
}
```

Hàm này giống `parse`, nhưng thêm một bước rất quan trọng:

> Override `page` và `size` từ API request.

Ví dụ LLM trả:

```json
{
  "mode": "search",
  "filters": {
    "event_type": ["failed_login"]
  },
  "page": 99,
  "size": 100
}
```

Frontend request thật:

```json
{
  "page": 0,
  "size": 10
}
```

Backend gọi:

```java
parseWithPaginationOverride(rawContent, 0, 10)
```

SearchPlan sau parser:

```json
{
  "mode": "search",
  "filters": {
    "event_type": ["failed_login"]
  },
  "page": 0,
  "size": 10
}
```

Nói khi bảo vệ:

> LLM không được quyết định pagination. Parser override `page/size` bằng giá trị từ API request để kiểm soát tài nguyên.

---

## 9. Parser có validate nghiệp vụ không?

Có, parser gọi:

```java
return searchPlanValidator.validate(plan);
```

Nghĩa là parser không chỉ parse JSON syntax. Nó còn đưa SearchPlan qua validator.

Ví dụ JSON syntax đúng nhưng rule sai:

```json
{
  "mode": "aggregation",
  "aggregation": {
    "type": "top_n",
    "field": "message",
    "top_n": 10
  }
}
```

Parser parse được JSON, nhưng `SearchPlanValidator` reject vì:

```text
message không nằm trong aggregation field allowlist.
```

---

## 10. Parser không làm gì?

Parser **không**:

- gọi Gemini;
- sinh prompt;
- sinh DSL;
- gọi Elasticsearch;
- map event result;
- lưu audit log.

Parser chỉ:

1. nhận raw text;
2. kiểm tra JSON shape;
3. parse thành `SearchPlan`;
4. override pagination nếu cần;
5. gọi validator.

---

## 11. Ví dụ lỗi và kết quả

### Lỗi 1 - LLM trả markdown

Output:

````text
```json
{
  "mode": "search"
}
```
````

Kết quả:

```text
Reject: LLM output must not contain markdown code fences
```

### Lỗi 2 - LLM trả field lạ

Output:

```json
{
  "mode": "search",
  "unsupported_question": true
}
```

Kết quả:

```text
Reject: unknown property
```

### Lỗi 3 - LLM trả DSL

Output:

```json
{
  "query": {
    "match_all": {}
  }
}
```

Kết quả:

```text
Reject: query không phải field của SearchPlan
```

### Lỗi 4 - LLM trả JSON + giải thích

Output:

```text
{
  "mode": "search"
}
This plan searches events.
```

Kết quả:

```text
Reject: output must be exactly one JSON object without prose
```

### Lỗi 5 - JSON đúng nhưng rule sai

Output:

```json
{
  "mode": "aggregation",
  "aggregation": {
    "type": "count",
    "field": "ip"
  }
}
```

Kết quả:

```text
Reject: count must not include field
```

---

## 12. Câu trả lời mẫu khi hội đồng hỏi

### Nếu LLM trả markdown thì sao?

> `SearchPlanJsonParser` kiểm tra output không được chứa code fence. Nếu có markdown thì parser reject, service repair tối đa một lần. Nếu vẫn sai thì request fail an toàn và không query Elasticsearch.

### Nếu LLM trả field lạ thì sao?

> Parser dùng Jackson strict mode với `FAIL_ON_UNKNOWN_PROPERTIES = true`, nên field ngoài SearchPlan schema bị reject.

### Nếu LLM trả JSON rồi thêm giải thích phía sau thì sao?

> Parser bật `FAIL_ON_TRAILING_TOKENS = true`, nên output có text/token dư sau JSON object sẽ bị reject.

### Nếu JSON đúng syntax nhưng sai rule nghiệp vụ thì sao?

> Parser parse thành SearchPlan, sau đó gọi `SearchPlanValidator`. Nếu sai rule như field không allowlist, top_n quá lớn hoặc count có field thì validator reject.

### Vì sao phải override page/size trong parser?

> Vì LLM không được quyết định tài nguyên truy vấn. Backend lấy page/size từ API request và override lại SearchPlan để tránh LLM tự tăng size.

### Parser có sinh Elasticsearch DSL không?

> Không. Parser chỉ tạo SearchPlan hợp lệ. DSL được sinh ở `SearchPlanCompiler`.
