# Q3 - Relative time linh hoạt trong SearchPlan

## Câu hỏi chính

**Vì sao trước đây `now-12d` bị lỗi? Hệ thống đã xử lý như thế nào để LLM có thể sinh `now-10d`, `now-11d`, `now-12d` theo đúng câu hỏi người dùng?**

## Bối cảnh

Trước khi mở rộng validator, backend chỉ cho phép một số relative time cố định:

```text
now
now-24h
now-7d
now-30d
```

Vì vậy khi user hỏi:

```text
Show the top 3 source IPs with the most alerts in the last 12 days
```

Nếu SearchPlan có:

```json
{
  "timestamp": {
    "from": "now-12d",
    "to": "now"
  }
}
```

backend sẽ reject với lỗi kiểu:

```text
filters.timestamp.from: must be ISO-8601 or one of now, now-24h, now-7d, now-30d
```

Nguyên nhân không phải do Elasticsearch không hỗ trợ, mà do **SearchPlanValidator của backend cố tình allowlist hẹp** để tránh LLM sinh date math tùy ý.

## Cách đã sửa

Backend được mở rộng để hỗ trợ relative time linh hoạt nhưng vẫn có guardrail:

```text
now
now-<number>h
now-<number>d
ISO-8601 absolute timestamp
```

Ví dụ hợp lệ:

```text
now-12h
now-24h
now-36h
now-10d
now-11d
now-12d
now-30d
```

Ví dụ không hợp lệ:

```text
now-0d
now-0h
now-9999d
now+7d
now-1y
now/d
now-7d||/d
```

## Vì sao giới hạn 720h và 90d?

Quy định hiện tại:

```text
hour tối đa: 720h
day tối đa: 90d
```

Ý nghĩa:

- `720h = 30 ngày`
- `90d = 90 ngày`

Lý do chọn giới hạn này:

1. **Đủ linh hoạt cho demo và MVP**
   - User có thể hỏi 10 ngày, 11 ngày, 12 ngày, 30 ngày.
   - User có thể hỏi theo giờ như 12h, 24h, 36h.

2. **Không để LLM tự mở range quá lớn**
   - Nếu cho `now-9999d`, query có thể quét dữ liệu cực lớn.
   - Điều này gây tốn tài nguyên Elasticsearch và làm API chậm.

3. **Giữ nguyên nguyên tắc guardrail**
   - Hệ thống không cho LLM sinh Elasticsearch date math tùy ý.
   - Chỉ cho pattern đơn giản, dễ kiểm soát: `now-<number>h` và `now-<number>d`.

4. **Dễ giải thích với hội đồng**
   - Backend linh hoạt hơn nhưng vẫn có giới hạn an toàn.

Nói ngắn:

> `720h` và `90d` là guardrail để cân bằng giữa trải nghiệm người dùng và an toàn tài nguyên. User có thể hỏi thời gian linh hoạt, nhưng không thể khiến hệ thống query range quá lớn.

## Code liên quan

Validator:

```text
backend/src/main/java/com/soc/ai/search/search/validation/SearchPlanValidator.java
```

Prompt builder:

```text
backend/src/main/java/com/soc/ai/search/llm/prompt/SearchPlanPromptBuilder.java
```

Mock LLM:

```text
backend/src/main/java/com/soc/ai/search/llm/mock/MockLlmClient.java
```

Tests:

```text
backend/src/test/java/com/soc/ai/search/search/validation/SearchPlanValidatorTest.java
backend/src/test/java/com/soc/ai/search/llm/mock/MockLlmClientTest.java
backend/src/test/java/com/soc/ai/search/llm/prompt/SearchPlanPromptBuilderTest.java
```

## Logic validator mới

Validator dùng pattern:

```text
^now-(\d+)(h|d)$
```

Sau đó kiểm tra:

```text
number >= 1
h <= 720
d <= 90
```

Vì vậy:

```text
now-12d
```

được chấp nhận vì:

```text
12 >= 1
12 <= 90
unit = d
```

Còn:

```text
now-9999d
```

bị reject vì:

```text
9999 > 90
```

## Prompt LLM được cập nhật như thế nào?

`SearchPlanPromptBuilder` được cập nhật để LLM biết phải giữ đúng thời lượng user hỏi:

```text
last 12 hours -> now-12h
last 10 days -> now-10d
last 11 days -> now-11d
last 12 days -> now-12d
```

Điểm quan trọng:

> Backend không chỉ nới validator. Prompt cũng phải hướng dẫn LLM sinh đúng format mới.

## Mock LLM được cập nhật như thế nào?

Mock LLM được bổ sung khả năng đọc:

```text
top 3
last 12 days
```

Ví dụ câu:

```text
Show the top 3 source IPs with the most alerts in the last 12 days
```

Kỳ vọng SearchPlan:

```json
{
  "mode": "aggregation",
  "filters": {
    "timestamp": {
      "from": "now-12d",
      "to": "now"
    }
  },
  "aggregation": {
    "type": "top_n",
    "field": "ip",
    "top_n": 3
  }
}
```

## Test đã thêm

Valid cases:

```text
now-10d
now-11d
now-12d
now-36h
ISO-8601 timestamp
```

Invalid cases:

```text
now-0d
now-0h
now-9999d
now+7d
now-1y
now-7d||/d
```

Mock LLM test:

```text
Show the top 3 source IPs with the most alerts in the last 12 days
```

Kỳ vọng:

```text
aggregation.type = top_n
aggregation.field = ip
aggregation.top_n = 3
timestamp.from = now-12d
```

## Câu trả lời mẫu khi hội đồng hỏi

### Nếu user hỏi 12 ngày thì hệ thống có xử lý được không?

> Có. Ban đầu MVP chỉ allow một số mốc cố định như `now-7d`, `now-30d`. Sau đó em mở rộng validator để hỗ trợ relative time dạng `now-<number>h` và `now-<number>d`. Vì vậy câu “last 12 days” sẽ được LLM sinh thành `now-12d` và backend chấp nhận.

### Vậy có nguy cơ LLM sinh khoảng thời gian quá lớn không?

> Có thể có nếu không kiểm soát, nên backend vẫn đặt guardrail. Số giờ tối đa là `720h`, số ngày tối đa là `90d`. Các expression như `now-9999d`, `now+7d`, `now-1y`, `now-7d||/d` đều bị reject.

### Vì sao không cho toàn bộ Elasticsearch date math?

> Vì nếu cho LLM sinh date math tùy ý thì có thể khó kiểm soát và gây query quá rộng. MVP chỉ cho format đơn giản `now-<number>h/d` và ISO-8601 absolute timestamp để cân bằng giữa linh hoạt và an toàn.

### Nếu cần search xa hơn 90 ngày thì sao?

> Có thể mở rộng config sau, ví dụ biến môi trường `SEARCH_MAX_RELATIVE_DAYS`. Nhưng với MVP/demo SOC, 90 ngày là đủ và giúp bảo vệ tài nguyên Elasticsearch.

## Câu demo sau khi sửa

```text
Show the top 3 source IPs with the most alerts in the last 12 days
```

Kỳ vọng trên UI:

```text
mode = aggregation
aggregation_type = top_n
field = ip
top_n = 3
timestamp.from = now-12d
chart = BAR
```

