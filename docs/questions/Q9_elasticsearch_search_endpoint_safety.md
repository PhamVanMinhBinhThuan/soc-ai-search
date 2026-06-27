# Q9 - `POST /{index}/_search` Có Chặn Update/Delete Không?

## Câu hỏi

`POST /{index}/_search` là do Elasticsearch quy định hay do mình tự định nghĩa? Nếu đó là endpoint do Elasticsearch quy định thì mới chắc chắn không update/delete đúng không?

---

## Câu trả lời ngắn

`POST /{index}/_search` là **API endpoint do Elasticsearch quy định**, không phải endpoint mình tự đặt tên.

Endpoint này dùng để **search/read dữ liệu**. Backend của project chỉ gọi endpoint này khi query event, nên không có đường thực thi update/delete qua executor hiện tại.

---

## Elasticsearch có nhiều endpoint khác nhau

Search/read:

```http
POST /soc-events-v1/_search
```

Xóa index:

```http
DELETE /soc-events-v1
```

Xóa document theo query:

```http
POST /soc-events-v1/_delete_by_query
```

Update document theo query:

```http
POST /soc-events-v1/_update_by_query
```

Bulk insert/update/delete:

```http
POST /_bulk
```

Vì backend chỉ gọi:

```http
POST /{index}/_search
```

nên về mặt HTTP API, request đi vào endpoint search của Elasticsearch, không đi vào các endpoint ghi/xóa.

---

## Vậy có cần guardrail nữa không?

Có.

Dù `_search` không xóa dữ liệu, search query vẫn có thể gây hại về tài nguyên nếu cho LLM/client gửi DSL tùy ý.

Ví dụ rủi ro:

- query quá nặng;
- wildcard rộng;
- script query;
- query_string phức tạp;
- aggregation quá lớn;
- kéo quá nhiều data;
- timeout làm backend chậm hoặc treo.

Vì vậy hệ thống vẫn cần nhiều guardrail:

- LLM không được sinh Elasticsearch DSL trực tiếp.
- Parser reject field lạ như `query`, `aggs`, `delete`, `script`.
- Validator chặn wildcard/script syntax.
- Backend giới hạn `size <= 100`.
- Aggregation `top_n <= 100`.
- Executor thêm `timeout = 3s`.
- Compiler chỉ sinh DSL an toàn từ SearchPlan đã validate.

---

## Câu trả lời khi bảo vệ

> `POST /{index}/_search` là endpoint search/read do Elasticsearch cung cấp. Backend của em chỉ gọi endpoint này, không có code gọi các endpoint ghi/xóa như `_delete_by_query`, `_update_by_query`, `_bulk` hay `DELETE /index`. Vì vậy LLM không có đường thực thi delete/update. Tuy nhiên search query vẫn có thể gây tốn tài nguyên nếu không kiểm soát, nên em vẫn dùng SearchPlan, parser, validator, compiler, giới hạn size/top_n và timeout để bảo vệ hệ thống.

---

## Nếu LLM sinh query xóa dữ liệu thì sao?

Đây là câu hội đồng rất dễ hỏi.

Câu trả lời ngắn:

> LLM không có đường xóa dữ liệu vì output của LLM không được execute trực tiếp. Output phải đi qua parser, validator, compiler, rồi executor chỉ gọi `_search`.

Chi tiết theo từng lớp:

### 1. Prompt đã cấm LLM sinh Elasticsearch DSL

Trong `SearchPlanPromptBuilder`, system prompt yêu cầu:

```text
Do not return Elasticsearch DSL.
Do not return Elasticsearch DSL fields such as query, aggs, dsl, script, wildcard, or query_string.
```

Nên LLM được yêu cầu chỉ sinh:

```json
{
  "mode": "search",
  "filters": {}
}
```

không được sinh:

```json
{
  "delete": true
}
```

hoặc:

```json
{
  "query": {
    "match_all": {}
  }
}
```

### 2. Parser reject field lạ hoặc DSL field

`SearchPlanJsonParser` bật:

```java
FAIL_ON_UNKNOWN_PROPERTIES = true
FAIL_ON_TRAILING_TOKENS = true
```

Nếu LLM trả:

```json
{
  "delete": true
}
```

hoặc:

```json
{
  "query": {
    "match_all": {}
  }
}
```

thì `SearchPlan` không có field `delete` hoặc `query`, nên parser reject.

### 3. Validator chỉ cho mode an toàn

`SearchPlanValidator` chỉ chấp nhận:

```text
search
aggregation
```

Không có mode:

```text
delete
update
index
bulk
```

Validator cũng chặn các value nguy hiểm:

- wildcard `*`;
- wildcard `?`;
- `script`;
- `painless`.

Ví dụ bị reject:

```json
{
  "message_query": "script painless delete"
}
```

### 4. Compiler chỉ sinh DSL đọc dữ liệu

`SearchPlanCompiler` chỉ có hai nhánh:

```java
compileSearch(...)
compileAggregation(...)
```

Compiler chỉ sinh các DSL dạng đọc:

- `bool.filter`
- `range`
- `term`
- `terms`
- `match`
- `terms aggregation`
- `date_histogram`

Compiler không có code sinh:

- delete;
- update;
- index;
- bulk write;
- delete by query.

### 5. Executor chỉ gọi endpoint `_search`

`SearchPlanExecutor` gửi request tới:

```http
POST /{index}/_search
```

Nó không gọi:

```http
DELETE /{index}
POST /{index}/_delete_by_query
POST /{index}/_update_by_query
POST /_bulk
```

Vì vậy, ngay cả nếu LLM cố sinh ý định xóa dữ liệu, hệ thống vẫn không có đường execute delete/update.

### Câu trả lời mẫu hoàn chỉnh

> Nếu LLM sinh query xóa dữ liệu thì backend không execute trực tiếp. Prompt đã cấm LLM sinh DSL. Parser chỉ nhận JSON đúng schema SearchPlan và reject field lạ như `delete`, `query`, `aggs`. Validator chỉ cho mode `search` hoặc `aggregation`, đồng thời chặn wildcard/script syntax. Compiler chỉ sinh DSL đọc dữ liệu như filter, range, terms, match, aggregation. Cuối cùng executor chỉ gọi endpoint `POST /{index}/_search`, không có code gọi `_delete_by_query`, `_update_by_query`, `_bulk` hay `DELETE /index`. Vì vậy LLM không có đường xóa dữ liệu.

---

## Một câu cực ngắn để nhớ

> `_search` không xóa dữ liệu, nhưng query search vẫn cần guardrail để tránh query nặng hoặc DSL nguy hiểm.
