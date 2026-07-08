# Prompt: Add Event ID Field, Advanced Filter, and Detail Trace Support

Role: Bạn là Senior Full-stack Engineer chuyên Spring Boot, Elasticsearch, React, TypeScript và SOC/SIEM dashboard.

Task: Bổ sung hỗ trợ `event_id` theo hướng production-like nhưng giữ UI gọn. Hiện tại hệ thống dùng Elasticsearch `_id` làm `event_id` trả về frontend. Yêu cầu mới là lưu thêm `event_id` vào `_source`, cho phép filter theo `event_id` bằng SearchPlan/DSL, hiển thị `event_id` trong Event Detail modal, nhưng không làm nhiễu bảng Event Logs.

Các file có thể liên quan:

- `infra/elasticsearch/soc-events-v1-index.json`
- `scripts/seed-events.ps1`
- `backend/src/main/java/com/soc/ai/search/search/plan/*`
- `backend/src/main/java/com/soc/ai/search/llm/prompt/SearchPlanPromptBuilder.java`
- `backend/src/main/java/com/soc/ai/search/search/validation/SearchPlanValidator.java`
- `backend/src/main/java/com/soc/ai/search/search/compiler/SearchPlanCompiler.java`
- `backend/src/main/java/com/soc/ai/search/search/execution/ElasticsearchSearchResponseMapper.java`
- `backend/src/main/java/com/soc/ai/search/event/EventDetailService.java`
- `backend/src/main/java/com/soc/ai/search/event/EventDetailResponse.java`
- `frontend/src/types/soc.ts`
- `frontend/src/components/soc/result-tabs.tsx`
- `frontend/src/components/soc/event-detail-drawer.tsx` hoặc component Event Detail modal hiện tại
- Test backend/frontend liên quan.

## Bối cảnh hiện tại

Hiện tại `event_id` trên UI/API được map từ Elasticsearch `_id`:

- Search response lấy `hit._id` và trả thành `event_id`.
- Event detail dùng `GET _doc/{event_id}` để lấy document.
- Seed script đã sinh UUID bằng `[System.Guid]::NewGuid().ToString()` và dùng làm Elasticsearch `_id`.

Yêu cầu mới:

- Vẫn giữ `_id` là UUID.
- Đồng thời đưa cùng UUID đó vào `_source.event_id`.
- Mapping khai báo `event_id` là `keyword`.
- SearchPlan có thể filter theo `event_id` bằng `terms` query.
- UI không thêm `event_id` vào bảng chính.
- Event Detail modal có hiển thị `event_id` để trace/copy.
- Filter Event ID nằm trong advanced filter, không đặt như sort chính.
- Không hỗ trợ sort theo `event_id`.

## 1. Elasticsearch mapping

Trong `infra/elasticsearch/soc-events-v1-index.json`, thêm field:

```json
"event_id": {
  "type": "keyword"
}
```

Lý do:

- `event_id` là định danh chính xác, không cần full-text search.
- Dùng `keyword` để filter exact match bằng `terms`.
- Không dùng `text` vì UUID không cần tokenizer.

## 2. Seed data

Trong `scripts/seed-events.ps1`, hiện tại script tạo:

```powershell
$eventId = [System.Guid]::NewGuid().ToString()
```

và dùng `$EventId` làm `_id` trong bulk action.

Hãy sửa để event `_source` cũng chứa:

```powershell
event_id = $EventId
```

Yêu cầu:

- `_id` và `_source.event_id` phải giống nhau.
- Không phá các field hiện tại như `timestamp`, `source`, `severity`, `event_type`, `user`, `host`, `ip`, `country_code`, `message`, `raw`.
- Nếu `raw` hiện chưa chứa event_id thì có thể thêm `event_id=$EventId` vào raw log nếu hợp lý, nhưng không bắt buộc nếu làm tăng rủi ro test snapshot.

Lưu ý: Vì mapping/source thay đổi, sau khi deploy cần recreate/reindex index:

```powershell
curl -X DELETE http://localhost:9200/soc-events-v1
.\scripts\bootstrap-elasticsearch.ps1
.\scripts\seed-events.ps1 -Count 10000
```

## 3. SearchPlan contract

Mở rộng `filters` để hỗ trợ `event_id`.

Yêu cầu type:

- `event_id` là danh sách string UUID.
- Nếu codebase hiện hỗ trợ single string hoặc array cho một số filter, vẫn ưu tiên normalize thành list.
- Không tự biến sort thành event_id.

Ví dụ SearchPlan hợp lệ:

```json
{
  "mode": "search",
  "filters": {
    "event_id": [
      "6f1d4c8e-1d93-4a27-9e87-9b7a9e9d8a12"
    ],
    "timestamp": {
      "from": "now-7d",
      "to": "now"
    }
  },
  "aggregation": null,
  "message_query": null,
  "sort": [
    { "field": "timestamp", "order": "desc" }
  ],
  "page": 0,
  "size": 10
}
```

## 4. Prompt cho LLM

Cập nhật `SearchPlanPromptBuilder.java` để LLM biết `event_id` là filter hợp lệ.

Prompt nên nói rõ:

```text
event_id: optional array of UUID strings for exact event lookup. Use only when the user explicitly provides one or more event IDs. Do not invent event IDs.
```

Yêu cầu quan trọng:

- Chỉ dùng `event_id` khi user thật sự đưa ID.
- Không tự bịa UUID.
- Không dùng wildcard/partial event_id.
- Nếu user chỉ nói “event detail” nhưng không đưa ID, không tạo filter `event_id`.

## 5. Validator rule

Cập nhật validator để bảo vệ `event_id`.

Rule bắt buộc:

- `event_id` nếu có thì mỗi item phải là UUID hợp lệ.
- Không chấp nhận wildcard, regexp, partial ID, empty string.
- Giới hạn tối đa 20 event IDs trong một SearchPlan.
- Nếu > 20 thì reject với message rõ ràng, ví dụ: `event_id supports at most 20 values`.
- `event_id` chỉ nên dùng trong `search` mode. Nếu aggregation mode có `event_id`, chỉ cho phép nếu codebase hiện cho filter chung trước aggregation. Nếu không chắc, giữ đơn giản: cho phép filter trước aggregation nhưng vẫn validate UUID và limit 20.

Gợi ý Java validation:

- Dùng `UUID.fromString(value)` để kiểm tra format.
- Trim trước khi validate.
- Reject blank/null item.

## 6. Compiler SearchPlan -> Elasticsearch DSL

Cập nhật `SearchPlanCompiler` để compile `event_id` thành `terms` query trên `_source.event_id`:

```json
{
  "terms": {
    "event_id": [
      "6f1d4c8e-1d93-4a27-9e87-9b7a9e9d8a12"
    ]
  }
}
```

Yêu cầu:

- Dùng `terms`, không dùng `ids query` trong task này.
- Lý do: vì đã đưa `event_id` vào `_source` như một field `keyword`, cách này đồng nhất với các filter keyword khác như `user`, `host`, `ip`, `country_code`.
- Không thêm sort theo `event_id`.

## 7. Search response mapper

Cập nhật mapper theo hướng backward-compatible:

- Ưu tiên `_source.event_id` nếu có.
- Nếu `_source.event_id` không có, fallback về `hit._id`.

Pseudo:

```java
var eventId = text(source.path("event_id"));
if (eventId == null || eventId.isBlank()) {
    eventId = text(hit.path("_id"));
}
```

Yêu cầu:

- Không làm hỏng dữ liệu cũ chưa reindex.
- API response vẫn là `event_id` như trước.

## 8. Event Detail modal

UI yêu cầu:

- Thêm `Event ID` vào Event Detail modal.
- Có thể đặt ở header/subheader hoặc metadata row đầu tiên.
- Nên có nút copy nhỏ cạnh Event ID nếu codebase đã có pattern copy icon.
- Event ID có thể hiển thị bằng monospace, truncate giữa nếu dài, nhưng copy phải copy full UUID.
- Không hiển thị event_id ở bảng Event Logs chính.

Ví dụ UI:

```text
Event ID     6f1d4c8e-1d93-4a27-9e87-9b7a9e9d8a12   [Copy]
Timestamp    09/07/2026, 10:30 AM
Severity     High
...
```

## 9. Event Logs table

Không thêm cột `event_id` vào bảng Event Logs chính.

Lý do:

- UUID dài, làm bảng rối.
- Bảng chính ưu tiên trường điều tra: timestamp, severity, source, event_type, user, host, ip, country, message.
- Event ID phù hợp hơn trong detail modal.

## 10. Filter & Sort Results UI

Thêm filter `Event ID` nhưng đặt dạng advanced/subtle, không làm layout chính rối.

Yêu cầu:

- Không thêm sort theo `event_id`.
- Có input `Event ID` hoặc `Event IDs`.
- Placeholder gợi ý: `Paste up to 20 UUIDs, separated by commas`.
- Người dùng có thể nhập một hoặc nhiều UUID, phân tách bằng comma hoặc newline nếu dễ làm.
- Frontend normalize thành array string trong `filters.event_id`.
- Nếu người dùng clear input thì xóa `event_id` khỏi SearchPlan filters.
- Nếu nhập quá 20 ID, frontend nên disable Apply hoặc hiển thị validation message nhẹ. Backend vẫn là lớp validate bắt buộc.
- Event ID filter có thể nằm dưới nhóm advanced filters hoặc cuối grid, không đặt trước severity/event_type.

## 11. Query Breakdown

Nếu SearchPlan có `event_id`, Query Breakdown nên hiển thị:

```text
Event ID    6f1d4c8e-... , 8a9b...
```

Nếu không có thì không render field này.

## 12. Tests bắt buộc

Cập nhật hoặc thêm test phù hợp.

Backend tests:

- SearchPlan parse/model chấp nhận `event_id`.
- Validator chấp nhận UUID hợp lệ.
- Validator reject event_id blank/invalid UUID.
- Validator reject > 20 event IDs.
- Compiler convert `filters.event_id` thành `terms event_id`.
- Mapper ưu tiên `_source.event_id` và fallback `_id` nếu thiếu.
- Event detail response có event_id.

Frontend tests:

- Event Detail modal hiển thị Event ID.
- Event Logs table không có cột Event ID.
- Filter UI có Event ID advanced input.
- Apply filter tạo SearchPlan có `filters.event_id` array.
- Clear filter xóa `event_id` khỏi filters.
- Không có option sort theo event_id.

## 13. Documentation update

Cập nhật các tài liệu mini questions nếu phù hợp:

- `docs/questions/mini_questions/searchplan_structure.md`
- `docs/questions/mini_questions/elasticsearch_dsl_structure.md`
- `docs/questions/mini_questions/searchplan_parse_validate_compile.md`

Nội dung nên giải thích:

- `_id` là document id kỹ thuật của Elasticsearch.
- `event_id` là field keyword trong `_source` để filter/trace.
- Trong hệ thống này `_id` và `event_id` cùng giá trị UUID.
- SearchPlan filter `event_id` được compile thành `terms event_id`.
- Giới hạn tối đa 20 IDs để tránh request quá lớn.

## 14. Verification

Chạy tối thiểu:

```powershell
cd backend
./mvnw test

cd ../frontend
npm run lint
npm run test -- result-tabs.test.tsx event-detail-drawer.test.tsx query-breakdown.test.tsx
npm run build
```

Nếu tên test khác, chạy nhóm test liên quan trong repo.

## 15. Kỳ vọng cuối cùng

Sau khi hoàn thành:

- Elasticsearch mapping có `event_id: keyword`.
- Seed data ghi UUID vào cả `_id` và `_source.event_id`.
- SearchPlan có thể filter theo `event_id`.
- Compiler sinh `terms event_id`.
- Event Detail modal hiển thị Event ID đẹp và dễ copy.
- Event Logs table vẫn gọn, không thêm cột Event ID.
- Filter & Sort có Event ID trong phần advanced, giới hạn tối đa 20 UUID.
- Không hỗ trợ sort theo Event ID.
- Hệ thống backward-compatible với dữ liệu cũ bằng fallback `_id`.
