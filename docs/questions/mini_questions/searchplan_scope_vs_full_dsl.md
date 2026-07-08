# SearchPlan Có Thay Thế Toàn Bộ Elasticsearch DSL Không?

Tài liệu này dùng để trả lời các câu hỏi phản biện sâu hơn về `SearchPlan`, đặc biệt là:

- Nếu Elasticsearch DSL mạnh hơn SearchPlan thì sao?
- Nếu dùng hết mọi chức năng của DSL thì SearchPlan còn ý nghĩa không?
- Nếu cho AI sinh DSL rồi validate DSL thì có được không?
- Nếu sau này cần query phức tạp thì mở rộng thế nào?

## 1. Câu trả lời ngắn nhất

`SearchPlan` hiện tại **không thay thế 100% Elasticsearch DSL**.

Nó là một **subset có kiểm soát** của DSL, được thiết kế cho các use case SOC chính trong đồ án:

- search event logs,
- filter theo field,
- sort,
- count,
- group by,
- top N,
- time-series/date histogram.

Mục tiêu của `SearchPlan` không phải là mở toàn bộ sức mạnh Elasticsearch cho AI, mà là:

```text
Giới hạn AI vào các intent truy vấn an toàn,
dễ validate,
dễ audit,
và phù hợp với nghiệp vụ SOC của đồ án.
```

## 2. SearchPlan hiện tại bao phủ những gì?

Các nhu cầu hiện tại:

| Nhu cầu | SearchPlan hỗ trợ | DSL backend sinh ra |
|---|---|---|
| Lọc theo thời gian | `filters.timestamp` | `range` |
| Lọc severity/event_type/user/host/ip/country | `filters.*` | `terms` |
| Tìm message đơn giản | `message_query` | `match` |
| Sort mới nhất/cũ nhất | `sort.timestamp` | `sort timestamp` |
| Sort severity | `sort.severity` | `_script sort` cố định |
| Đếm tổng số event | `aggregation.type = count` | `hits.total.value` |
| Group by field | `aggregation.type = group_by` | `terms aggregation` |
| Top N field | `aggregation.type = top_n` | `terms aggregation` |
| Trend theo giờ/ngày | `aggregation.type = date_histogram` | `date_histogram` |

Như vậy, với phạm vi đồ án, `SearchPlan` đủ để trả lời các câu hỏi như:

```text
Show failed login events from China in the last 24h
Top 5 IP có nhiều event nhất trong 30 ngày qua
Số event theo giờ trong 24h qua
Group account_lockout by user in the last 7 days
Count critical events from Vietnam in the last 7 days
```

## 3. SearchPlan hiện tại chưa bao phủ những gì?

SearchPlan hiện tại chưa hỗ trợ một số DSL nâng cao:

| DSL feature | Có trong SearchPlan hiện tại không? | Ghi chú |
|---|---:|---|
| `query_string` | Không | Quá rộng, khó validate. |
| `wildcard` | Không | Có thể query nặng nếu dùng `*` đầu chuỗi. |
| `regexp` | Không | Regex phức tạp, dễ tốn tài nguyên. |
| `script` query | Không | Không cho AI viết code chạy trong Elasticsearch. |
| Runtime fields | Không | Tính field động lúc query, tốn tài nguyên và khó kiểm soát. |
| Nested query/aggregation | Không | Dataset hiện tại là flat document. |
| Scoring/query relevance phức tạp | Không | SOC log search hiện tại ưu tiên exact filter hơn scoring. |
| Correlation/sequence nhiều bước | Không | Nằm ngoài MVP hiện tại. |
| Compare two time ranges | Không | Có thể là hướng mở rộng tương lai. |

Điểm quan trọng:

> Không hỗ trợ không có nghĩa là thiết kế sai. Nó nghĩa là hệ thống đang cố ý giới hạn scope để có guardrail rõ ràng.

## 4. Nếu có nhu cầu query phức tạp thì có mở rộng SearchPlan được không?

Có, nhưng phải mở rộng **có kiểm soát**.

Không nên mở kiểu:

```json
{
  "raw_dsl": {
    "...": "..."
  }
}
```

Vì như vậy `SearchPlan` chỉ còn là DSL trá hình.

Nên mở theo hướng domain-specific:

```json
{
  "pattern_query": {
    "field": "host",
    "type": "prefix",
    "value": "endpoint-"
  }
}
```

Rồi backend thêm:

```text
validator cho pattern_query
compiler cho prefix/wildcard đã kiểm soát
test cho use case mới
prompt update để AI biết field mới
```

## 5. Ví dụ mở rộng wildcard an toàn

Không nên cho AI sinh DSL tự do:

```json
{
  "wildcard": {
    "message": "*login*failed*"
  }
}
```

Có thể thiết kế SearchPlan có kiểm soát:

```json
{
  "pattern_query": {
    "field": "host",
    "type": "wildcard",
    "value": "endpoint-*"
  }
}
```

Validator cần kiểm tra:

- `field` phải nằm trong allowlist, ví dụ `host`, `user`, `source`.
- Không cho wildcard đầu chuỗi như `*endpoint`.
- `value` có độ dài giới hạn.
- Không cho pattern quá rộng như `*`.

Sau đó compiler mới sinh DSL:

```json
{
  "wildcard": {
    "host": "endpoint-*"
  }
}
```

## 6. Ví dụ mở rộng regexp an toàn

Không nên cho AI sinh trực tiếp:

```json
{
  "regexp": {
    "user": ".*admin.*"
  }
}
```

Nếu thật sự cần, SearchPlan có thể là:

```json
{
  "pattern_query": {
    "field": "user",
    "type": "regexp",
    "value": "admin[0-9]+"
  }
}
```

Validator cần:

- giới hạn độ dài regex,
- chặn regex quá rộng,
- chặn pattern nguy hiểm,
- chỉ cho field allowlist.

## 7. Với `script` thì sao?

`script` là trường hợp rủi ro hơn nhiều.

Không nên có:

```json
{
  "script": "doc['message.keyword'].value.length() > 100"
}
```

Vì như vậy gần như cho AI viết code chạy trong Elasticsearch.

Nếu cần logic đặc biệt, nên mở bằng operation cố định:

```json
{
  "computed_filter": {
    "type": "severity_rank_at_least",
    "value": "high"
  }
}
```

Backend tự compile bằng logic đã whitelist.

Trong hệ thống hiện tại, `_script sort` cho severity là ví dụ tốt:

```text
AI chỉ nói: sort by highest severity
SearchPlan chỉ có: sort.field = severity
Backend tự sinh script cố định:
critical = 4, high = 3, medium = 2, low = 1
```

AI không được viết script tự do.

## 8. Nếu cho AI sinh DSL rồi validate DSL thì sao?

Về mặt kỹ thuật, có thể làm:

```text
User question
  -> LLM sinh Elasticsearch DSL
  -> Backend validate DSL
  -> Query Elasticsearch
```

Nhưng validate DSL khó hơn nhiều so với validate SearchPlan.

Vì DSL là một cây JSON rộng và lồng nhiều tầng:

```json
{
  "query": {
    "bool": {
      "should": [
        {
          "query_string": {
            "query": "*:*"
          }
        },
        {
          "script": {
            "script": "doc['message.keyword'].value.length() > 0"
          }
        }
      ]
    }
  }
}
```

Nếu validate DSL, backend phải kiểm tra:

- `query_string` có xuất hiện ở bất kỳ tầng nào không?
- `script` có nằm trong query, sort, runtime field hay aggregation không?
- có wildcard/regexp không?
- có runtime_mappings không?
- có field ngoài allowlist không?
- có aggregation lồng quá sâu không?
- có size/top_n quá lớn không?
- có unknown DSL clause không?

Chỉ cần sót một nhánh là có thể lọt query ngoài guardrail.

Trong khi đó `SearchPlan` có schema nhỏ và cố định:

```json
{
  "mode": "search",
  "filters": {
    "timestamp": { "from": "now-24h", "to": "now" },
    "event_type": ["failed_login"]
  }
}
```

Validator dễ viết, dễ test và dễ giải thích hơn.

## 9. Nếu hệ thống cần dùng gần như toàn bộ DSL thì SearchPlan còn ý nghĩa không?

Nếu một hệ thống đặt mục tiêu giống Kibana Dev Tools, tức là cho power user viết gần như toàn bộ Elasticsearch DSL, thì `SearchPlan` đơn giản sẽ không còn phù hợp.

Ví dụ hệ thống cần:

- arbitrary `query_string`,
- arbitrary `script`,
- nested aggregation nhiều tầng,
- runtime fields,
- pipeline aggregation,
- geo query,
- function_score,
- mọi loại DSL Elasticsearch.

Nếu cố mở rộng `SearchPlan` để bao phủ 100% DSL, nó sẽ trở thành:

```text
SearchPlan ≈ Elasticsearch DSL đổi tên
```

Lúc đó SearchPlan mất nhiều ý nghĩa guardrail.

Nhưng đó là một sản phẩm khác:

```text
Kibana Dev Tools / Expert DSL Console
```

Không phải mục tiêu của SOC AI Search hiện tại.

## 10. Nếu sau này vẫn cần full DSL thì thiết kế thế nào?

Nên tách thành 2 mode:

| Mode | Người dùng | Cách truy vấn |
|---|---|---|
| Analyst Mode | SOC analyst phổ thông | Natural language -> SearchPlan -> DSL |
| Expert DSL Mode | Admin/SRE/power user | Viết DSL trực tiếp, RBAC/audit/sandbox riêng |

`SearchPlan` vẫn có ý nghĩa trong Analyst Mode vì:

- dễ dùng,
- an toàn,
- explain được,
- audit được,
- phù hợp người không chuyên Elasticsearch DSL.

Full DSL nếu có thì nên là tính năng riêng, yêu cầu quyền cao hơn và guardrail khác.

## 11. Câu trả lời mẫu khi hội đồng hỏi

### Câu hỏi: SearchPlan có bao phủ hết Elasticsearch DSL không?

Trả lời:

> Dạ không. SearchPlan của em không nhằm bao phủ toàn bộ Elasticsearch DSL. Nó là một subset có kiểm soát, được thiết kế cho các use case SOC chính trong đồ án như search log, filter theo field, count, group by, top N và time-series. Những DSL nâng cao như wildcard, regexp, script, runtime field hoặc nested aggregation hiện chưa nằm trong phạm vi MVP.

### Câu hỏi: Nếu cần query phức tạp thì sao?

Trả lời:

> Nếu cần use case mới, em sẽ mở rộng SearchPlan contract có chọn lọc, thêm validator và compiler tương ứng. Ví dụ nếu cần pattern search, em có thể thêm `pattern_query` với field/type/value được allowlist, chứ không cho AI sinh raw wildcard/regexp DSL tự do.

### Câu hỏi: Nếu hệ thống cần dùng toàn bộ DSL thì sao?

Trả lời:

> Nếu mục tiêu là dùng gần như toàn bộ Elasticsearch DSL như Kibana Dev Tools thì SearchPlan đơn giản sẽ không còn phù hợp, vì khi đó nó gần như trở thành bản sao của DSL. Nhưng hệ thống của em không hướng tới power user viết mọi DSL. Em hướng tới SOC analyst cần truy vấn các use case điều tra phổ biến một cách an toàn và explain được. Nếu cần full DSL trong tương lai, em sẽ tách thành Expert DSL Mode có RBAC, audit và sandbox riêng.

### Câu hỏi: Tại sao không để AI sinh DSL rồi validate DSL?

Trả lời:

> Có thể làm, nhưng validate DSL tự do phức tạp hơn nhiều vì DSL là cây JSON rộng và lồng nhiều tầng. Backend phải kiểm tra mọi nhánh để chặn query_string, script, wildcard, runtime_mappings, aggregation lạ hoặc field ngoài allowlist. SearchPlan nhỏ hơn, gần nghiệp vụ hơn và dễ validate hơn. Nếu đã phải giới hạn DSL thành một subset an toàn, biểu diễn subset đó bằng SearchPlan sẽ rõ ràng và dễ bảo trì hơn.

## 12. Câu chốt nên nhớ

> SearchPlan không phải bản sao của toàn bộ Elasticsearch DSL. Nó là lớp trừu tượng hóa theo nghiệp vụ SOC, chỉ mở những khả năng cần thiết và kiểm soát được. Khi cần use case mới, mở rộng SearchPlan có chọn lọc; khi cần full DSL, tách thành expert mode riêng.

