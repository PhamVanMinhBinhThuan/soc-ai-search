# Q5 - Flow Hoạt Động Tổng Thể Natural Language Search

Tài liệu này giải thích luồng hoạt động từ lúc user nhập câu hỏi trên UI đến lúc backend trả kết quả về UI. Mỗi bước đều có ví dụ input/output để dễ hình dung khi ôn vấn đáp.

Ví dụ xuyên suốt:

```text
Show me failed login attempts from China in the last 24h
```

---

## 1. User nhập câu hỏi trên UI

User nhập câu hỏi ở ô search:

```text
Show me failed login attempts from China in the last 24h
```

Ý định của user:

- Tìm event đăng nhập thất bại.
- Từ China.
- Trong 24 giờ gần nhất.
- Trả danh sách raw events.

Trên UI, user bấm Search.

---

## 2. Frontend gọi `POST /api/v1/search`

File liên quan:

```text
frontend/src/services/search-api.ts
frontend/src/components/soc/search-section.tsx
```

Frontend gửi request tới backend:

```http
POST /api/v1/search
Content-Type: application/json
Authorization: Bearer <jwt-token>
```

Body ví dụ:

```json
{
  "question": "Show me failed login attempts from China in the last 24h",
  "page": 0,
  "size": 10
}
```

Ý nghĩa:

- `question`: câu hỏi tự nhiên của user.
- `page`: trang backend sẽ lấy.
- `size`: số dòng event muốn trả về.

Lưu ý quan trọng:

> Page/size trong request API mới là nguồn chính thức. Nếu LLM tự sinh page/size khác, backend sẽ override.

---

## 3. `NaturalLanguageSearchController` nhận request

File liên quan:

```text
backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchController.java
backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchRequest.java
```

Controller nhận request:

```java
@PostMapping
public NaturalLanguageSearchResponse search(@Valid @RequestBody NaturalLanguageSearchRequest request) {
    return naturalLanguageSearchService.search(request);
}
```

`NaturalLanguageSearchRequest` kiểm tra:

- `question` không rỗng.
- `question` tối đa 500 ký tự.
- `page >= 0`.
- `size` từ 1 đến 100.

Nếu request sai:

```json
{
  "question": "",
  "page": 0,
  "size": 10
}
```

Backend trả lỗi 400.

Nếu request đúng, controller chuyển sang service:

```java
naturalLanguageSearchService.search(request)
```

---

## 4. `NaturalLanguageSearchService` điều phối flow

File liên quan:

```text
backend/src/main/java/com/soc/ai/search/search/nl/NaturalLanguageSearchService.java
```

Service là lớp điều phối chính. Nó làm nhiều việc:

1. Tạo `query_id`.
2. Build prompt cho LLM.
3. Gọi LLM.
4. Parse output LLM.
5. Validate SearchPlan.
6. Route theo mode `search` hoặc `aggregation`.
7. Gọi executor.
8. Sinh summary nếu có.
9. Lưu audit log.
10. Trả response.

Ví dụ service tạo:

```text
query_id = 5f0ddf18-87a8-4e0c-8c95-6e5fc4ceefaa
```

---

## 5. `SearchPlanPromptBuilder` tạo system prompt + user question

File liên quan:

```text
backend/src/main/java/com/soc/ai/search/llm/prompt/SearchPlanPromptBuilder.java
backend/src/main/java/com/soc/ai/search/llm/LlmSearchPlanRequest.java
```

Service gọi:

```java
promptBuilder.buildSearchPlanRequest(request.question())
```

Kết quả là một `LlmSearchPlanRequest`:

```java
new LlmSearchPlanRequest(systemPrompt, userQuestion)
```

Ví dụ:

```text
systemPrompt =
"You convert a natural language SOC event search question into one JSON SearchPlan.
 Return exactly one raw JSON object.
 Do not return markdown.
 Do not return Elasticsearch DSL.
 Supported modes are search and aggregation.
 ..."
```

```text
userQuestion =
"Show me failed login attempts from China in the last 24h"
```

Ý nghĩa:

- `systemPrompt` là luật chơi.
- `userQuestion` là câu hỏi thật.

Nói khi bảo vệ:

> Backend không gửi raw log hoặc search result vào LLM. Backend chỉ gửi system prompt và câu hỏi user để LLM sinh SearchPlan.

---

## 6. `LlmClient.generateSearchPlan(...)`

File liên quan:

```text
backend/src/main/java/com/soc/ai/search/llm/LlmClient.java
```

Service gọi qua interface:

```java
llmClient.generateSearchPlan(llmSearchPlanRequest)
```

`LlmClient` chỉ là interface:

```java
public interface LlmClient {
    LlmResponse generateSearchPlan(LlmSearchPlanRequest request);
    LlmResponse generateSummary(LlmSummaryRequest request);
}
```

Tùy config:

- `LLM_PROVIDER=mock` thì dùng `MockLlmClient`.
- `LLM_PROVIDER=gemini` thì dùng `GeminiLlmClient`.

---

## 7A. Nếu `LLM_PROVIDER=mock`

File liên quan:

```text
backend/src/main/java/com/soc/ai/search/llm/mock/MockLlmClient.java
```

`MockLlmClient` không gọi API bên ngoài. Nó normalize câu hỏi rồi match keyword.

Ví dụ câu hỏi:

```text
Show me failed login attempts from China in the last 24h
```

Mock nhận ra:

- có `failed login`;
- có `China` hoặc `CN`;

nên trả JSON hardcode:

```json
{
  "mode": "search",
  "filters": {
    "timestamp": {
      "from": "now-24h",
      "to": "now"
    },
    "event_type": ["failed_login"],
    "country_code": ["CN"]
  },
  "page": 0,
  "size": 20
}
```

Điểm cần nhớ:

> Mock LLM dùng cho local/test/CI/demo ổn định. Nó không tốn tiền, không cần mạng, không phụ thuộc quota Gemini.

---

## 7B. Nếu `LLM_PROVIDER=gemini`

File liên quan:

```text
backend/src/main/java/com/soc/ai/search/llm/gemini/GeminiLlmClient.java
```

`GeminiLlmClient` gọi Gemini API thật.

Nó gửi request gần như:

```json
{
  "systemInstruction": {
    "parts": [
      {
        "text": "<system prompt from SearchPlanPromptBuilder>"
      }
    ]
  },
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "Show me failed login attempts from China in the last 24h"
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.1,
    "responseMimeType": "application/json"
  }
}
```

Gemini có thể trả response JSON từ provider, bên trong có text:

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "{\n  \"mode\": \"search\",\n  \"filters\": {\n    \"timestamp\": { \"from\": \"now-24h\", \"to\": \"now\" },\n    \"event_type\": [\"failed_login\"],\n    \"country_code\": [\"CN\"]\n  }\n}"
          }
        ]
      }
    }
  ],
  "modelVersion": "gemini-2.5-flash"
}
```

`GeminiLlmClient` extract text này ra.

Điểm cực kỳ quan trọng:

> `GeminiLlmClient` không tự tạo SearchPlan bằng Java code. Gemini là bên sinh JSON text. `GeminiLlmClient` chỉ gọi API, lấy text, đo latency và trả `LlmResponse`.

---

## 8. `LlmResponse(content, model, latencyMs)`

File liên quan:

```text
backend/src/main/java/com/soc/ai/search/llm/LlmResponse.java
```

Sau khi gọi mock hoặc Gemini, backend nhận:

```java
new LlmResponse(content, model, latencyMs)
```

Ví dụ:

```json
{
  "content": "{\n  \"mode\": \"search\",\n  \"filters\": {\n    \"timestamp\": { \"from\": \"now-24h\", \"to\": \"now\" },\n    \"event_type\": [\"failed_login\"],\n    \"country_code\": [\"CN\"]\n  }\n}",
  "model": "gemini-2.5-flash",
  "latencyMs": 1234
}
```

Lưu ý:

> `content` lúc này vẫn là String. Nó chưa phải `SearchPlan` object.

---

## 9. `SearchPlanJsonParser` parse content

File liên quan:

```text
backend/src/main/java/com/soc/ai/search/llm/prompt/SearchPlanJsonParser.java
```

Parser nhận:

```text
LlmResponse.content
```

Ví dụ content:

```json
{
  "mode": "search",
  "filters": {
    "timestamp": {
      "from": "now-24h",
      "to": "now"
    },
    "event_type": ["failed_login"],
    "country_code": ["CN"]
  },
  "page": 0,
  "size": 20
}
```

Parser kiểm tra:

- Có phải JSON object thuần không.
- Có markdown/code fence không.
- Có prose không.
- Có field lạ không.
- Có trailing tokens không.

Sau đó parser override pagination từ request API.

Nếu request API là:

```json
{
  "page": 0,
  "size": 10
}
```

thì SearchPlan sau parse sẽ là:

```json
{
  "mode": "search",
  "filters": {
    "timestamp": {
      "from": "now-24h",
      "to": "now"
    },
    "event_type": ["failed_login"],
    "country_code": ["CN"]
  },
  "page": 0,
  "size": 10
}
```

Mặc dù LLM trả `size = 20`, backend đổi thành `size = 10`.

---

## 10. `SearchPlanValidator` validate rule nghiệp vụ

File liên quan:

```text
backend/src/main/java/com/soc/ai/search/search/validation/SearchPlanValidator.java
```

Validator kiểm tra:

- `mode` hợp lệ.
- `filters` hợp lệ.
- time range hợp lệ.
- `event_type` hợp lệ.
- `source` hợp lệ.
- aggregation rule hợp lệ.
- không có field nguy hiểm.
- không có wildcard/script/query_string.

Với SearchPlan ví dụ:

```json
{
  "mode": "search",
  "filters": {
    "timestamp": {
      "from": "now-24h",
      "to": "now"
    },
    "event_type": ["failed_login"],
    "country_code": ["CN"]
  },
  "page": 0,
  "size": 10
}
```

Validator pass.

Ví dụ validator reject:

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

Lý do:

```text
message không nằm trong aggregation field allowlist.
```

---

## 11. `SearchPlanCompiler` compile Elasticsearch DSL

File liên quan:

```text
backend/src/main/java/com/soc/ai/search/search/compiler/SearchPlanCompiler.java
```

Compiler nhận SearchPlan object đã validate.

Input SearchPlan:

```json
{
  "mode": "search",
  "filters": {
    "timestamp": {
      "from": "now-24h",
      "to": "now"
    },
    "event_type": ["failed_login"],
    "country_code": ["CN"]
  },
  "page": 0,
  "size": 10
}
```

Compiler sinh DSL:

```json
{
  "query": {
    "bool": {
      "filter": [
        {
          "range": {
            "timestamp": {
              "gte": "now-24h",
              "lte": "now"
            }
          }
        },
        {
          "terms": {
            "event_type": ["failed_login"]
          }
        },
        {
          "terms": {
            "country_code": ["CN"]
          }
        }
      ]
    }
  },
  "from": 0,
  "size": 10,
  "sort": [
    {
      "timestamp": {
        "order": "desc"
      }
    }
  ]
}
```

Điểm cần nhớ:

> DSL chỉ được sinh ở backend compiler. LLM và frontend không được tự gửi DSL.

---

## 12. `SearchPlanExecutor` gọi Elasticsearch

File liên quan:

```text
backend/src/main/java/com/soc/ai/search/search/execution/SearchPlanExecutor.java
```

Executor gửi DSL tới Elasticsearch:

```http
POST /soc-events-v1/_search
Content-Type: application/json
```

Body gần như:

```json
{
  "query": {
    "bool": {
      "filter": [
        {
          "range": {
            "timestamp": {
              "gte": "now-24h",
              "lte": "now"
            }
          }
        },
        {
          "terms": {
            "event_type": ["failed_login"]
          }
        },
        {
          "terms": {
            "country_code": ["CN"]
          }
        }
      ]
    }
  },
  "from": 0,
  "size": 10,
  "sort": [
    {
      "timestamp": {
        "order": "desc"
      }
    }
  ],
  "timeout": "3s",
  "track_total_hits": true
}
```

Elasticsearch trả response ví dụ:

```json
{
  "hits": {
    "total": {
      "value": 178
    },
    "hits": [
      {
        "_id": "event-000001",
        "_source": {
          "timestamp": "2026-06-20T08:39:32Z",
          "source": "windows-auth",
          "severity": "high",
          "event_type": "failed_login",
          "user": "admin",
          "host": "vpn-gw-01",
          "ip": "203.0.113.45",
          "country_code": "CN",
          "message": "Possible brute force: failed login from CN targeting admin"
        }
      }
    ]
  }
}
```

Backend mapper chuyển response này thành event DTO.

---

## 13. Response trả về UI

Backend trả response cuối cùng:

```json
{
  "query_id": "5f0ddf18-87a8-4e0c-8c95-6e5fc4ceefaa",
  "original_question": "Show me failed login attempts from China in the last 24h",
  "mode": "search",
  "search_plan": {
    "mode": "search",
    "filters": {
      "timestamp": {
        "from": "now-24h",
        "to": "now"
      },
      "event_type": ["failed_login"],
      "country_code": ["CN"]
    },
    "page": 0,
    "size": 10
  },
  "generated_dsl": {
    "query": {
      "bool": {
        "filter": [
          {
            "range": {
              "timestamp": {
                "gte": "now-24h",
                "lte": "now"
              }
            }
          },
          {
            "terms": {
              "event_type": ["failed_login"]
            }
          },
          {
            "terms": {
              "country_code": ["CN"]
            }
          }
        ]
      }
    },
    "from": 0,
    "size": 10
  },
  "total": 178,
  "page": 0,
  "size": 10,
  "total_pages": 18,
  "llm_latency_ms": 1234,
  "search_latency_ms": 14,
  "latency_ms": 1248,
  "events": [
    {
      "event_id": "event-000001",
      "timestamp": "2026-06-20T08:39:32Z",
      "source": "windows-auth",
      "severity": "high",
      "event_type": "failed_login",
      "user": "admin",
      "host": "vpn-gw-01",
      "ip": "203.0.113.45",
      "country_code": "CN",
      "message": "Possible brute force: failed login from CN targeting admin"
    }
  ]
}
```

UI render:

- KPI cards.
- AI Summary nếu có.
- SearchPlan tab.
- Compiled DSL tab.
- Raw Events table.
- Pagination.

---

## 14. Flow tóm tắt một dòng

```text
Question
  -> Prompt
  -> LLM raw JSON text
  -> LlmResponse
  -> Parser
  -> SearchPlan
  -> Validator
  -> Compiler
  -> Elasticsearch DSL
  -> Executor
  -> Elasticsearch response
  -> UI response
```

---

## 15. Câu trả lời mẫu khi hội đồng hỏi

### GeminiLlmClient có tạo JSON SearchPlan không?

> Không. `GeminiLlmClient` không tự tạo SearchPlan bằng code Java. Nó gửi system prompt và câu hỏi user lên Gemini API. Gemini sinh raw JSON text. Sau đó backend dùng `SearchPlanJsonParser` parse text đó thành `SearchPlan` object.

### `LlmResponse.content` có phải SearchPlan object chưa?

> Chưa. `content` chỉ là String do LLM trả về. Nó phải đi qua parser và validator trước khi được dùng.

### Vì sao cần `MockLlmClient`?

> Mock LLM giúp local, CI và demo ổn định. Nó không gọi mạng, không tốn tiền và không phụ thuộc quota Gemini.

### Vì sao backend cần compiler?

> Vì LLM không được sinh DSL. Backend compiler là nơi duy nhất chuyển SearchPlan đã validate thành Elasticsearch DSL an toàn.

### Nếu LLM sinh sai thì sao?

> Parser hoặc validator sẽ reject. Service có thể repair tối đa một lần. Nếu vẫn sai thì trả lỗi có kiểm soát và không query Elasticsearch.
