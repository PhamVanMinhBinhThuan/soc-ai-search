# P0 - Core Flow & AI Guardrails

Đây là phần bắt buộc nắm chắc. Nếu hội đồng chỉ hỏi vài câu, khả năng rất cao họ sẽ hỏi quanh phần này.

## 1. Bài Toán Và Ý Tưởng Chính

### Bạn cần nói được

- SOC analyst phải xử lý rất nhiều log/cảnh báo bảo mật.
- Viết Elasticsearch DSL thủ công dài, khó, dễ sai.
- SOC AI Search cho phép analyst hỏi bằng ngôn ngữ tự nhiên.
- LLM **không được truy vấn Elasticsearch trực tiếp**.
- LLM chỉ sinh `SearchPlan`.
- Backend validate `SearchPlan`, compile thành Elasticsearch DSL rồi mới execute.

### Câu nói trọng tâm

> AI chỉ hỗ trợ tạo SearchPlan. Backend mới là nơi kiểm soát schema, validate, compile DSL, RBAC và audit. Vì vậy hệ thống dùng AI nhưng vẫn giữ guardrail an toàn.

### Code/tài liệu cần đọc

- `README.md`
- `docs/architecture.md`
- `docs/sequence-flow.md`
- `docs/presentation/presentation-outline.md`
- `backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchService.java`
- `backend/src/main/java/com/soc/ai/search/search/plan/SearchPlan.java`
- `backend/src/main/java/com/soc/ai/search/search/validation/SearchPlanValidator.java`
- `backend/src/main/java/com/soc/ai/search/search/compiler/SearchPlanCompiler.java`

---

## 2. Luồng Natural Language Search

### Bạn cần nói được

Luồng chính khi user search:

1. Frontend gọi `POST /api/v1/search` với `question`, `page`, `size`.
2. Backend build prompt cho LLM.
3. LLM trả raw text chứa SearchPlan JSON.
4. Parser kiểm tra JSON thuần, không markdown/prose.
5. Bean Validation + `SearchPlanValidator` kiểm tra rule nghiệp vụ.
6. Backend override `page/size` từ request.
7. Compiler sinh Elasticsearch DSL.
8. Executor gọi Elasticsearch.
9. Response trả về `search_plan`, `generated_dsl`, `events`, latency, summary.
10. Audit log lưu vào PostgreSQL.

### Code cần đọc

- `backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchController.java`
- `backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchService.java`
- `backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchRequest.java`
- `backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchResponse.java`
- `backend/src/main/java/com/soc/ai/search/llm/LlmClient.java`
- `backend/src/main/java/com/soc/ai/search/llm/prompt/SearchPlanPromptBuilder.java`
- `backend/src/main/java/com/soc/ai/search/llm/prompt/SearchPlanJsonParser.java`
- `backend/src/main/java/com/soc/ai/search/llm/mock/MockLlmClient.java`
- `backend/src/main/java/com/soc/ai/search/llm/gemini/GeminiLlmClient.java`

### Frontend cần đọc

- `frontend/src/services/search-api.ts`
- `frontend/src/App.tsx`
- `frontend/src/components/soc/search-section.tsx`
- `frontend/src/components/soc/query-transparency.tsx`
- `frontend/src/components/soc/result-tabs.tsx`

### Giải thích chi tiết theo code

#### Bước 1 - Frontend gọi `POST /api/v1/search`

Frontend gửi request dạng:

```json
{
  "question": "Show me failed login attempts from China in the last 24h",
  "page": 0,
  "size": 10
}
```

Ý chính:

- Frontend không gọi Elasticsearch.
- Frontend không gọi Gemini.
- Frontend chỉ gọi backend.

Ở backend, `NaturalLanguageSearchController` nhận request:

```java
@PostMapping
public NaturalLanguageSearchResponse search(@Valid @RequestBody NaturalLanguageSearchRequest request) {
    return naturalLanguageSearchService.search(request);
}
```

`NaturalLanguageSearchRequest` có Bean Validation:

- `question` không được rỗng, tối đa 500 ký tự.
- `page >= 0`.
- `size` từ 1 đến 100.

Câu nói khi bảo vệ:

> Ngay từ request đầu vào, backend đã validate question/page/size. User không thể yêu cầu size quá lớn để kéo quá nhiều dữ liệu.

#### Bước 2 - Backend build prompt cho LLM

Code liên quan:

- `NaturalLanguageSearchService.search(...)`
- `SearchPlanPromptBuilder.buildSearchPlanRequest(...)`
- `SearchPlanPromptBuilder.buildSystemPrompt()`

Prompt gửi cho LLM gồm hai phần:

- `systemPrompt`: luật chơi cho LLM.
- `userQuestion`: câu hỏi thật của user.

System prompt yêu cầu LLM:

- Chỉ trả về đúng một JSON object.
- Không markdown.
- Không prose.
- Không code fence.
- Không trả Elasticsearch DSL.
- Không tự thêm field ngoài schema.
- Chỉ dùng field hợp lệ như `timestamp`, `source`, `severity`, `event_type`, `user`, `host`, `ip`, `country_code`, `message_query`.
- Nếu aggregation thì chỉ dùng `count`, `group_by`, `top_n`, `date_histogram`.

Ví dụ user hỏi:

```text
Show me failed login attempts from China in the last 24h
```

LLM được hướng dẫn sinh SearchPlan gần như:

```json
{
  "mode": "search",
  "filters": {
    "timestamp": { "from": "now-24h", "to": "now" },
    "event_type": ["failed_login"],
    "country_code": ["CN"]
  }
}
```

Câu nói khi bảo vệ:

> Prompt giúp LLM sinh output theo contract SearchPlan. Nhưng prompt không phải lớp bảo mật duy nhất. Sau prompt vẫn còn parser, validator và compiler ở backend.

#### Bước 3 - LLM trả raw text chứa SearchPlan JSON

Code liên quan:

- `LlmClient.java`
- `MockLlmClient.java`
- `GeminiLlmClient.java`
- `LlmResponse.java`

`LlmClient` là interface chung:

```java
LlmResponse generateSearchPlan(LlmSearchPlanRequest request);
```

Hiện có hai provider:

- `MockLlmClient`: dùng cho local/test/CI/demo ổn định.
- `GeminiLlmClient`: gọi Gemini API thật.

Điểm cần nhớ:

> `GeminiLlmClient` chỉ gọi Gemini và lấy text output. Nó không parse SearchPlan, không validate, không compile DSL và không gọi Elasticsearch.

#### Bước 4 - Parser kiểm tra JSON thuần

Code liên quan:

- `SearchPlanJsonParser.java`

Parser kiểm tra:

- Output không được rỗng.
- Output phải là một JSON object thuần.
- Không được có markdown code fence.
- Không được có prose kiểu `Sure, here is the JSON:`.
- Không được có trailing token.
- Không được có field lạ.

Parser dùng Jackson strict mode:

- `FAIL_ON_UNKNOWN_PROPERTIES = true`
- `FAIL_ON_TRAILING_TOKENS = true`

Câu nói khi bảo vệ:

> Parser chỉ chấp nhận đúng một JSON object thuần. Nếu LLM trả markdown, prose, nhiều JSON object hoặc field lạ thì backend reject trước khi compile DSL.

#### Bước 5 - Bean Validation + `SearchPlanValidator`

Code liên quan:

- `SearchPlan.java`
- `SearchFilters.java`
- `SearchPlanValidator.java`

Bean Validation kiểm tra constraint cơ bản:

- `page >= 0`.
- `size` từ 1 đến 100.
- `severity` hợp lệ.
- `country_code` uppercase như `CN`, `VN`, `US`.
- `ip` là IPv4 hợp lệ.

`SearchPlanValidator` kiểm tra rule nghiệp vụ:

- `mode` chỉ là `search` hoặc `aggregation`.
- `mode=search` thì không được có `aggregation`.
- `mode=aggregation` thì bắt buộc có `aggregation`.
- Aggregation field phải nằm trong allowlist: `source`, `severity`, `event_type`, `user`, `host`, `ip`, `country_code`.
- `COUNT` không được có `field`, `top_n`, `interval`.
- `TOP_N` bắt buộc có `top_n` từ 1 đến 100.
- `DATE_HISTOGRAM` bắt buộc có `interval`, không được có `field`.
- Time range hỗ trợ `now`, `now-<number>h`, `now-<number>d`, ISO-8601.
- Time range relative bị giới hạn tối đa 720h hoặc 90d.
- Chặn expression lạ như wildcard/script/query_string.

#### Bước 6 - Backend override `page/size`

Code liên quan:

- `SearchPlanJsonParser.parseWithPaginationOverride(...)`

LLM có thể trả `size = 100`, nhưng nếu request frontend gửi `size = 10`, backend sẽ override SearchPlan thành `size = 10`.

Ý nghĩa:

- LLM không có quyền quyết định pagination.
- User/API request mới quyết định page/size.
- Request vẫn bị giới hạn max 100.
- Tránh trường hợp LLM tự tăng size gây tốn tài nguyên.

#### Bước 7 - Compiler sinh Elasticsearch DSL

Code liên quan:

- `SearchPlanCompiler.java`

Compiler validate lại SearchPlan trước khi sinh DSL.

Ví dụ DSL được sinh:

```json
{
  "query": {
    "bool": {
      "filter": [
        { "range": { "timestamp": { "gte": "now-24h", "lte": "now" } } },
        { "terms": { "event_type": ["failed_login"] } },
        { "terms": { "country_code": ["CN"] } }
      ]
    }
  },
  "from": 0,
  "size": 10,
  "sort": [
    { "timestamp": { "order": "desc" } }
  ]
}
```

Với aggregation:

- `count`: `size=0`, không sinh `aggs`.
- `group_by/top_n`: sinh `terms aggregation`.
- `date_histogram`: sinh `date_histogram` trên `timestamp`.

Câu nói khi bảo vệ:

> DSL chỉ được sinh bởi backend compiler. Frontend và LLM không được gửi DSL tự do. Đây là cách hệ thống tránh bypass validator.

#### Bước 8 - Executor gọi Elasticsearch

Code liên quan:

- `SearchPlanExecutor.java`
- `ElasticsearchSearchResponseMapper.java`
- `ElasticsearchAggregationResponseMapper.java`

Executor dùng DSL đã compile, bổ sung:

- `timeout = 3s`.
- `track_total_hits = true`.

Sau đó gọi Elasticsearch:

```text
POST /{index}/_search
```

#### Bước 9 - Response trả về frontend

Response có các field chính:

```json
{
  "query_id": "...",
  "original_question": "...",
  "mode": "search",
  "search_plan": { },
  "generated_dsl": { },
  "total": 178,
  "page": 0,
  "size": 10,
  "total_pages": 18,
  "llm_latency_ms": 4592,
  "search_latency_ms": 14,
  "summary_latency_ms": 3861,
  "latency_ms": 8467,
  "summary": "...",
  "summary_source": "llm",
  "events": []
}
```

Frontend hiển thị:

- SearchPlan trong Query Transparency.
- Generated DSL trong Query Transparency.
- Raw Events hoặc Analytics chart.
- KPI cards và latency.
- Summary nếu có.

#### Bước 10 - Audit log lưu PostgreSQL

Audit lưu:

- `query_id`
- question
- user identity
- mode
- status
- SearchPlan
- generated DSL
- result count
- latency
- summary/error

Ý nghĩa:

- Dùng cho Recent Queries.
- Dùng cho All Investigations.
- Dùng cho Audit Logs.
- Dùng cho CSV export bằng `query_id`.

#### Bước 11 - Nếu LLM output sai thì repair tối đa một lần

Luồng xử lý:

1. Backend gọi LLM lần đầu.
2. Nếu parse/validate fail, backend tạo repair prompt.
3. Gọi LLM repair tối đa một lần.
4. Nếu vẫn fail thì trả lỗi có kiểm soát.
5. Không compile DSL và không query Elasticsearch khi SearchPlan invalid.

### Câu hỏi hội đồng có thể hỏi

**Nếu Gemini lỗi thì sao?**

> `GeminiLlmClient` sẽ throw exception. Service map lỗi thành response có kiểm soát, thường là 502 hoặc 429 nếu rate limit. Để demo ổn định, hệ thống có thể cấu hình `LLM_PROVIDER=mock`.

**Nếu LLM trả markdown thì sao?**

> Parser reject vì output không phải JSON object thuần. Service repair tối đa một lần. Nếu vẫn sai thì trả lỗi, không query Elasticsearch.

**Nếu LLM tự thêm field lạ thì sao?**

> Jackson strict mode bật `FAIL_ON_UNKNOWN_PROPERTIES`, nên field lạ bị reject.

**Vì sao backend override page/size?**

> Để LLM không tự tăng số lượng document trả về. Page/size là quyết định của request và bị backend giới hạn.

**Vì sao không cho LLM sinh Elasticsearch DSL luôn?**

> Nếu LLM sinh DSL trực tiếp thì có thể bypass validator, dùng field/query ngoài allowlist hoặc sinh query nguy hiểm. SearchPlan là contract trung gian an toàn hơn.

### Một câu tóm tắt nên thuộc lòng

> Luồng Natural Language Search của em là: Frontend gửi câu hỏi, backend build prompt cho LLM, LLM trả SearchPlan JSON, parser và validator kiểm tra chặt, backend override pagination, compiler sinh DSL, executor gọi Elasticsearch, response trả kết quả kèm SearchPlan/DSL để minh bạch, cuối cùng audit log lưu vào PostgreSQL.

---

## 3. SearchPlan Contract

### Bạn cần nói được

`SearchPlan` là format trung gian giữa natural language và Elasticsearch DSL.

Ví dụ search:

```json
{
  "mode": "search",
  "filters": {
    "timestamp": { "from": "now-24h", "to": "now" },
    "event_type": ["failed_login"],
    "country_code": ["CN"]
  },
  "page": 0,
  "size": 10
}
```

Ví dụ aggregation:

```json
{
  "mode": "aggregation",
  "filters": {
    "timestamp": { "from": "now-7d", "to": "now" }
  },
  "aggregation": {
    "type": "top_n",
    "field": "ip",
    "top_n": 10
  },
  "page": 0,
  "size": 10
}
```

### Field/filter cần nhớ

- `timestamp`
- `source`
- `severity`
- `event_type`
- `user`
- `host`
- `ip`
- `country_code`
- `message_query`

### Aggregation cần nhớ

| Intent | SearchPlan | Chart |
| --- | --- | --- |
| Đếm số event | `count` | Number |
| Gom nhóm theo field | `group_by` | Bar |
| Top giá trị | `top_n` | Bar |
| Theo thời gian | `date_histogram` | Line |

---

## 4. AI Guardrails

### Bạn cần nói được

Hệ thống dùng nhiều lớp guardrail:

1. Prompt cấm LLM trả prose/markdown/DSL.
2. Parser chỉ nhận JSON object thuần.
3. Jackson reject unknown fields.
4. Bean Validation kiểm tra constraint DTO.
5. `SearchPlanValidator` kiểm tra rule nghiệp vụ.
6. Backend override page/size.
7. Compiler là nơi duy nhất sinh DSL.
8. RBAC chặn quyền theo role.
9. Audit log lưu lại mọi truy vấn.

### Câu hỏi khó

**Nếu user sửa SearchPlan độc hại thì sao?**

> SearchPlan edited by user vẫn đi qua cùng parser/validator/compiler. DSL không cho edit trực tiếp, nên không thể bypass backend guardrails.

**Nếu LLM sinh query xóa dữ liệu thì sao?**

> LLM không được sinh DSL, compiler chỉ sinh search/aggregation DSL đọc dữ liệu. Không có endpoint cho LLM thực hiện write/delete Elasticsearch.

---

## 5. LLM/Gemini Integration

### Bạn cần nói được

- `LlmClient` là interface chung.
- `MockLlmClient` dùng cho local/test/CI/demo ổn định.
- `GeminiLlmClient` dùng để gọi Gemini thật.
- Gemini chỉ trả raw content.
- Parser/validator/compiler nằm ở backend, không nằm trong Gemini client.

### Env cần nhớ

```env
LLM_PROVIDER=gemini
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta
LLM_API_KEY=...
LLM_MODEL=gemini-2.5-flash
LLM_TIMEOUT_MS=10000
LLM_MAX_ATTEMPTS=2
```

### Câu trả lời mẫu

> Em tạo interface `LlmClient` để tách logic gọi LLM khỏi search flow. Hệ thống có provider mock và Gemini. Với Gemini, backend lấy cấu hình từ environment, gọi HTTP API, lấy text output rồi đóng gói vào `LlmResponse`. Gemini client không parse SearchPlan, không sinh DSL và không gọi Elasticsearch.

---

## 6. Demo Flow Phải Thuộc

### Luồng demo 5 phút

1. Login analyst.
2. Mở Dashboard, chỉ nhanh KPI/charts.
3. Vào Event Search.
4. Chạy search:

```text
Show me failed login attempts from China in the last 24h
```

5. Chỉ `SearchPlan` và `Generated DSL`.
6. Chạy aggregation bar:

```text
Show the top 10 source IPs with the most alerts in the last 30 days
```

7. Chạy aggregation line:

```text
Show failed login trend by hour in the last 24 hours
```

8. Mở All Investigations, pin query, xem SearchPlan/DSL detail.
9. Export CSV nếu còn thời gian.
10. Nếu có thời gian, login viewer/admin để chứng minh RBAC.
