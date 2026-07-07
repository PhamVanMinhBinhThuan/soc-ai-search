# AI Summary Prompt

Tài liệu này giải thích cách hệ thống tạo **AI Summary** sau khi có kết quả search hoặc aggregation.

Mục tiêu mới của summary:

- Không dựa vào `original_question` để suy luận nội dung.
- Dùng `SearchPlan` đã validate làm nguồn sự thật cho ngữ cảnh truy vấn.
- Gửi payload đã cô đọng, giới hạn dữ liệu và có thống kê rõ ràng.
- Nói rõ sample events chỉ là ví dụ gần nhất, không phải toàn bộ kết quả.
- Backend tự phát hiện ngôn ngữ và truyền explicit vào prompt.

## 1. Code liên quan

| File | Vai trò |
|---|---|
| `ResultSummaryService.java` | Điều phối build payload, build prompt, gọi LLM, validate output và fallback. |
| `SummaryLanguageDetector.java` | Detect ngôn ngữ summary từ câu hỏi ban đầu. |
| `SummaryPayloadBuilder.java` | Tạo payload tóm tắt từ `SearchPlan`, search response hoặc aggregation response. |
| `SummaryPayload.java` | Record dữ liệu gửi vào prompt summary. |
| `SummaryQueryContext.java` | Ngữ cảnh truy vấn lấy từ `SearchPlan` đã validate. |
| `SummaryAggregationStats.java` | Thống kê aggregation trên toàn bộ bucket. |
| `SummaryPromptBuilder.java` | Tạo system prompt và user content cho LLM summary. |
| `SummaryTextValidator.java` | Kiểm tra output summary đúng format. |
| `DeterministicSummaryGenerator.java` | Sinh fallback summary nếu LLM lỗi hoặc output không hợp lệ. |

## 2. Khi nào gọi AI Summary?

`POST /api/v1/search`:

- Search câu hỏi tự nhiên mới.
- Backend gọi LLM sinh `SearchPlan`.
- Backend chạy query.
- Backend gọi AI Summary.

`POST /api/v1/search/plan`:

- Chạy SearchPlan có sẵn, dùng cho edit/filter/rerun.
- Chỉ gọi summary nếu request có `include_summary=true`.

Quy ước hiện tại:

- Search câu hỏi mới: có summary.
- Edit/refine: có summary nếu frontend gửi `include_summary=true`.
- Filter/sort: không gọi summary lại và UI ẩn AI Summary để tránh tốn token, tránh summary lệch ngữ cảnh.
- Pagination: không gọi summary lại.

## 3. SummaryPayload hiện tại gồm gì?

`SummaryPayload` là JSON nhỏ, đã được backend giới hạn trước khi đưa vào prompt.

Các nhóm field chính:

| Field | Ý nghĩa |
|---|---|
| `output_language` | Ngôn ngữ summary do backend detect, ví dụ `vi` hoặc `en`. |
| `query_context` | Ngữ cảnh truy vấn lấy từ `SearchPlan`: mode, time range, filters, sort, aggregation. |
| `mode` | `search` hoặc `aggregation`. |
| `total` | Tổng số event phù hợp với truy vấn. |
| `top_users`, `top_hosts`, `top_ips` | Top entity lấy từ kết quả search. |
| `severity_distribution` | Phân bố severity trong kết quả search. |
| `recent_sample_events` | Tối đa 5 event gần nhất, chỉ là ví dụ. |
| `aggregation_type` | Loại aggregation: `top_n`, `group_by`, `date_histogram`, `count`. |
| `chart_metadata` | Metadata để frontend biết dạng chart. |
| `aggregation_stats` | Thống kê trên toàn bộ bucket aggregation. |
| `aggregation_results` | Bucket aggregation rút gọn, chỉ giữ với `top_n`/`group_by`. |

## 4. Query context lấy như thế nào?

File:

```text
backend/src/main/java/com/soc/ai/search/summary/SummaryPayloadBuilder.java
```

Backend gọi `queryContext(plan)` để chuyển `SearchPlan` đã validate thành dữ liệu dễ tóm tắt.

Ví dụ SearchPlan:

```json
{
  "mode": "search",
  "filters": {
    "timestamp": { "from": "now-7d", "to": "now" },
    "event_type": ["account_lockout"],
    "user": ["admin", "vpn.user"],
    "country_code": ["CN"]
  },
  "message_query": null
}
```

Payload sẽ có `query_context` tương ứng:

```json
{
  "mode": "search",
  "time_from": "now-7d",
  "time_to": "now",
  "event_type": ["account_lockout"],
  "user": ["admin", "vpn.user"],
  "country_code": ["CN"],
  "sort_field": "timestamp",
  "sort_order": "desc"
}
```

Ý nghĩa:

- LLM không cần đọc lại câu hỏi gốc để đoán time range/filter.
- Nếu user edit SearchPlan từ `7h` sang `4h`, summary sẽ nhìn `query_context.time_from = now-4h`, không bị bám câu hỏi cũ.
- Nếu user sort lại kết quả, summary nhìn `sort_field` và `sort_order` từ SearchPlan hiện tại.
- Field `null` hoặc không dùng sẽ không cần đưa vào payload thật.

## 5. Ngôn ngữ summary detect thế nào?

File:

```text
backend/src/main/java/com/soc/ai/search/summary/SummaryLanguageDetector.java
```

Rule hiện tại:

- Nếu câu hỏi có ký tự tiếng Việt có dấu trong range Unicode `\u00C0-\u1EF9` thì output là `vi`.
- Nếu không có dấu tiếng Việt thì output là `en`.

Ví dụ:

| Câu hỏi | Output language |
|---|---|
| `Số event theo giờ trong 24h qua` | `vi` |
| `Show failed_login events from China` | `en` |
| `tim failed_login trong 24h qua` | `en` |

Trade-off:

> Tiếng Việt không dấu sẽ bị xem là English. Đây là chủ đích để tránh detect nhầm các câu tiếng Anh có technical term.

Sau khi detect, backend truyền rõ vào prompt:

```text
Output language: Vietnamese.
```

hoặc:

```text
Output language: English.
```

## 6. Search payload lấy dữ liệu ở đâu?

Với search mode, backend không đưa toàn bộ raw events vào prompt.

Luồng chính:

1. `ResultSummaryService` nhận `SearchPlan` và kết quả search.
2. `ElasticsearchSummaryQueryService` chạy một truy vấn tóm tắt có giới hạn.
3. Payload lấy các thống kê như:
   - top users,
   - top hosts,
   - top IPs,
   - severity distribution,
   - recent sample events.
4. `SummaryPayloadBuilder` giới hạn số lượng item và cắt ngắn value dài.

Giới hạn quan trọng:

```java
MAX_SAMPLE_EVENTS = 5
MAX_VALUE_LENGTH = 160
MAX_MESSAGE_LENGTH = 300
MAX_PAYLOAD_CHARACTERS = 5_000
```

`recent_sample_events` chỉ là các event gần nhất để minh họa. Prompt đã dặn LLM:

```text
recent_sample_events/sample_events are only the most recent bounded examples,
not the full result set.
Do not infer global trends, majority, highest, lowest, or distribution from sample events.
```

Vì vậy LLM không được nói kiểu:

> Tất cả event đều từ host A

nếu thông tin đó chỉ xuất hiện trong sample events.

## 7. Aggregation payload lấy dữ liệu ở đâu?

Với aggregation mode, backend lấy dữ liệu từ `AggregationSearchResponse` của truy vấn chính.

Backend tính `aggregation_stats` trên **toàn bộ bucket**, không chỉ 10 bucket hiển thị trong prompt.

`aggregation_stats` gồm:

| Field | Ý nghĩa |
|---|---|
| `total_buckets` | Tổng số bucket aggregation trả về. Ví dụ line chart 24h có thể có 25 bucket. |
| `sum` | Tổng value của tất cả bucket. |
| `max_bucket` | Bucket có value lớn nhất. |
| `min_bucket` | Bucket có value nhỏ nhất. |

Ví dụ:

```json
{
  "aggregation_stats": {
    "total_buckets": 25,
    "sum": 1223,
    "max_bucket": { "key": "2026-07-07T13:00:00Z", "value": 88 },
    "min_bucket": { "key": "2026-07-07T23:00:00Z", "value": 0 }
  }
}
```

Lý do cần field này:

- Tránh LLM chỉ nhìn 10 bucket đầu rồi kết luận sai.
- Với `date_histogram`, prompt có thể không nhận `aggregation_results`, nhưng vẫn biết tổng bucket, tổng value, max/min toàn cục.

## 8. Khi nào gửi aggregation_results?

Quy ước hiện tại:

| Aggregation type | Có gửi `aggregation_results` không? | Lý do |
|---|---:|---|
| `top_n` | Có, tối đa 10 bucket | Bucket chính là kết quả cần summary. |
| `group_by` | Có, tối đa 10 bucket | Bucket chính là phân bố cần summary. |
| `count` | Có thể không cần nhiều bucket | Summary chủ yếu dựa vào total/count. |
| `date_histogram` | Không | Time-series có thể nhiều bucket; dùng `aggregation_stats` để tránh sai lệch. |

Ví dụ `top_n`:

```json
{
  "aggregation_type": "top_n",
  "query_context": {
    "aggregation_type": "top_n",
    "aggregation_field": "ip",
    "top_n": 5
  },
  "aggregation_stats": {
    "total_buckets": 5,
    "sum": 650,
    "max_bucket": { "key": "203.0.113.45", "value": 180 },
    "min_bucket": { "key": "192.168.20.55", "value": 80 }
  },
  "aggregation_results": [
    { "key": "203.0.113.45", "value": 180 },
    { "key": "10.10.1.15", "value": 160 }
  ]
}
```

Ví dụ `date_histogram`:

```json
{
  "aggregation_type": "date_histogram",
  "query_context": {
    "aggregation_type": "date_histogram",
    "interval": "hour",
    "time_from": "now-24h",
    "time_to": "now"
  },
  "aggregation_stats": {
    "total_buckets": 25,
    "sum": 1223,
    "max_bucket": { "key": "2026-07-07T13:00:00Z", "value": 88 },
    "min_bucket": { "key": "2026-07-07T23:00:00Z", "value": 0 }
  }
}
```

## 9. Prompt hiện tại quy định gì?

File:

```text
backend/src/main/java/com/soc/ai/search/summary/SummaryPromptBuilder.java
```

Các rule quan trọng:

```text
Use query_context as the source of truth for mode, time range, filters, sort, and aggregation.
Do not infer query scope from original user wording.
Output language: <language>.
Write only in the requested output language.
recent_sample_events/sample_events are only the most recent bounded examples, not the full result set.
If aggregation_stats is present, use max_bucket, min_bucket, sum, and total_buckets for global aggregation observations.
For date_histogram, aggregation_results may be omitted intentionally; summarize using aggregation_stats and query_context.
```

Điểm quan trọng:

> Prompt không còn đưa `original_question` vào user content. Câu hỏi gốc chỉ dùng để detect ngôn ngữ, không dùng làm nguồn sự thật để tóm tắt.

## 10. Nếu LLM lỗi thì sao?

Nếu LLM timeout, lỗi provider, hoặc trả output sai format, hệ thống dùng deterministic fallback.

File:

```text
backend/src/main/java/com/soc/ai/search/summary/DeterministicSummaryGenerator.java
```

Fallback này:

- Không phải mock data.
- Không gọi LLM.
- Sinh câu summary theo form cố định từ payload thật.
- Dùng language đã detect từ backend.

Response sẽ có:

```json
{
  "summary_source": "fallback"
}
```

Nếu LLM thành công:

```json
{
  "summary_source": "llm"
}
```

## 11. Vì sao cách mới an toàn và chính xác hơn?

Trước đây summary dễ sai trong các trường hợp:

- Câu hỏi gốc là 24h nhưng user edit SearchPlan thành 12h.
- LLM nhìn 5 sample events và tưởng đó là toàn bộ kết quả.
- `date_histogram` có 25 bucket nhưng prompt chỉ gửi 10 bucket, LLM kết luận max/min sai.
- Câu hỏi tiếng Anh nhưng summary đôi khi ra tiếng Việt do prompt thiếu explicit language.

Cách mới xử lý bằng:

- `query_context` lấy từ SearchPlan hiện tại.
- `output_language` do backend detect và truyền rõ vào prompt.
- `recent_sample_events` được mô tả rõ là ví dụ gần nhất.
- `aggregation_stats` tính trên toàn bộ bucket.
- `date_histogram` không ép LLM nhìn danh sách bucket rút gọn.

## 12. Nếu hội đồng hỏi: "AI Summary em làm như thế nào?"

Câu trả lời ngắn gọn:

> AI Summary của em không đưa toàn bộ raw log vào LLM. Backend trước tiên chạy SearchPlan để lấy kết quả thật, sau đó tạo một `SummaryPayload` đã giới hạn dữ liệu. Payload này gồm query context từ SearchPlan, tổng số kết quả, top user/host/IP, phân bố severity, một vài event gần nhất làm ví dụ, hoặc thống kê aggregation như tổng bucket, tổng value, bucket cao nhất và thấp nhất. Sau đó backend build prompt, gọi LLM để sinh summary 3-5 câu. Nếu LLM lỗi hoặc trả format không hợp lệ, hệ thống dùng deterministic fallback summary từ payload thật.

Câu trả lời đầy đủ hơn:

1. Người dùng search hoặc edit/refine query.
2. Backend có `SearchPlan` đã validate và kết quả từ Elasticsearch.
3. `SummaryLanguageDetector` xác định summary nên là tiếng Việt hay tiếng Anh.
4. `SummaryPayloadBuilder` tạo payload nhỏ:
   - Với search: lấy `total`, `top_users`, `top_hosts`, `top_ips`, `severity_distribution`, `recent_sample_events`.
   - Với aggregation: lấy `aggregation_type`, `chart_metadata`, `aggregation_stats`, và chỉ giữ `aggregation_results` khi phù hợp.
5. `SummaryPromptBuilder` tạo prompt cho LLM:
   - Dùng `query_context` làm nguồn sự thật.
   - Không dùng câu hỏi gốc để suy luận phạm vi.
   - Không được suy luận toàn cục từ sample events.
   - Với time-series dùng `aggregation_stats` thay vì chỉ nhìn vài bucket.
6. `SummaryTextValidator` kiểm tra output:
   - Không Markdown/HTML/JSON.
   - Không quá dài.
   - Đúng khoảng 3-5 câu.
7. Nếu output hợp lệ thì trả `summary_source = llm`; nếu lỗi thì fallback và trả `summary_source = fallback`.

Điểm bảo vệ quan trọng:

- LLM chỉ tóm tắt payload đã được backend kiểm soát.
- LLM không tự truy vấn Elasticsearch.
- LLM không nhận DSL tự do từ client.
- Dữ liệu log và message được xem là untrusted data, không phải instruction.
- Sample events chỉ là ví dụ gần nhất, không dùng để kết luận toàn bộ kết quả.

Code cần nhớ:

| File | Ý nghĩa |
|---|---|
| `ResultSummaryService.java` | Điều phối toàn bộ luồng summary. |
| `SummaryLanguageDetector.java` | Detect ngôn ngữ output. |
| `SummaryPayloadBuilder.java` | Build payload từ SearchPlan và response. |
| `SummaryPromptBuilder.java` | Build prompt gửi LLM. |
| `SummaryTextValidator.java` | Validate summary text. |
| `DeterministicSummaryGenerator.java` | Fallback nếu LLM lỗi. |
