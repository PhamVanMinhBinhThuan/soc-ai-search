# Prompt: Implement Query Library / More Suggestions

## Role

Bạn là Senior Frontend Engineer chuyên React, TypeScript, Tailwind CSS và UI/UX cho dashboard SOC/SIEM dark theme.

## Bối cảnh

Project hiện tại là SOC AI Search. Trang Event Search đang có 5 suggested queries hiển thị ngay dưới ô search. Tôi muốn giữ 5 gợi ý nhanh đó, nhưng thêm một nút mở rộng để người dùng xem nhiều ví dụ hơn theo từng nhóm điều tra.

File cần tham khảo:

- `frontend/src/lib/mock-data.ts`
- `frontend/src/components/soc/search-section.tsx`
- `frontend/src/App.tsx`
- `frontend/src/types/soc.ts`
- `plan/mini_prompts/query_library_questions.md`

## Mục tiêu

Thêm chức năng **Query Library / More Suggestions**:

- Hiển thị nút `More Suggestions` hoặc `Query Library` bên phải nhóm suggested query hiện tại.
- Khi click, mở modal/drawer chứa nhiều câu hỏi mẫu để người dùng chọn.
- Các câu hỏi phải lấy từ file `plan/mini_prompts/query_library_questions.md` hoặc copy sang một data file phù hợp trong frontend.
- Khi chọn một câu hỏi, modal đóng và hệ thống đưa câu hỏi vào ô search rồi chạy query.
- Không gọi LLM chỉ để sinh suggestions. Suggestions là static/deterministic để demo ổn định và không tốn token.

## Yêu cầu UI

### 1. Nút mở Query Library

Ở khu vực suggested queries hiện tại:

- Giữ lại 5 query nhanh đang có.
- Thêm nút nhỏ bên phải:
  - Text đề xuất: `More Suggestions`
  - Hoặc `Query Library`
  - Icon có thể dùng `Library`, `Sparkles`, `BookOpen`, `Search` từ `lucide-react`.

Style:

- Phù hợp dark SOC theme hiện tại.
- Không làm khu vực suggested bị quá cao.
- Hover state rõ ràng.

### 2. Modal hoặc Drawer

Khi click `More Suggestions`:

- Mở modal/drawer ở giữa hoặc bên phải màn hình.
- Title: `Query Library`
- Subtitle ngắn: `Reusable SOC investigation examples`
- Có ô search/filter nhỏ: `Search examples...`
- Có thể lọc theo category hoặc tag.

Layout gợi ý:

```text
Query Library
Reusable SOC investigation examples

[Search examples...]

[All] [Search] [Aggregation] [Time Series] [Playbook]

-------------------------------------------------------
SEARCH
[SEARCH] Show failed login attempts from China in the last 24h
[SEARCH] Show account lockout events in the last 7 days

AGGREGATION
[GROUP BY] Count failed login attempts by user in the last 7 days
[TOP N] Show top 5 source IPs with the most events in the last 30 days

TIME SERIES
[LINE CHART] Show events by hour in the last 24h

PLAYBOOKS
[PLAYBOOK] Investigate possible brute force activity
```

### 3. Query item card

Mỗi item nên có:

- Query text.
- Badge loại query:
  - `SEARCH`
  - `COUNT`
  - `GROUP BY`
  - `TOP N`
  - `LINE CHART`
  - `PLAYBOOK`
- Optional short hint:
  - `Expected: raw events`
  - `Expected: bar chart`
  - `Expected: line chart`

Khi click item:

1. Đóng modal/drawer.
2. Set query text vào search box.
3. Auto-run query luôn để demo nhanh.

Nếu code hiện tại có handler cho suggested query, hãy reuse handler đó thay vì viết flow mới.

## Data structure đề xuất

Tạo file mới nếu hợp lý:

- `frontend/src/lib/query-library.ts`

Ví dụ type:

```ts
export type QueryLibraryCategory =
  | "search"
  | "aggregation"
  | "time_series"
  | "playbook";

export type QueryLibraryItem = {
  id: string;
  label: string;
  question: string;
  category: QueryLibraryCategory;
  badge: "SEARCH" | "COUNT" | "GROUP BY" | "TOP N" | "LINE CHART" | "PLAYBOOK";
  expected: "raw_events" | "bar_chart" | "line_chart" | "number";
  tags: string[];
};
```

Các câu hỏi phải lấy từ `plan/mini_prompts/query_library_questions.md`, ưu tiên câu hỏi chắc chắn có data từ seed script.

## Ràng buộc quan trọng

1. Không gọi LLM để tạo suggestions.
2. Không thay đổi backend nếu không cần.
3. Không phá 5 suggested queries hiện tại.
4. Không phá flow search hiện tại.
5. Không làm UI rối hoặc chiếm quá nhiều không gian trên trang chính.
6. Nếu người dùng đang ở mock mode/gemini mode, clicking suggestion vẫn đi qua cùng flow search hiện tại.
7. Query Library chỉ là thư viện câu hỏi mẫu, không bypass pipeline Natural Language -> SearchPlan -> Validator -> Compiler -> Elasticsearch.

## Test cần cập nhật/thêm

Cập nhật hoặc thêm test frontend phù hợp:

- Render được nút `More Suggestions` hoặc `Query Library`.
- Click nút mở modal/drawer.
- Modal/drawer hiển thị một vài category/item.
- Search trong modal lọc được item theo text/tag.
- Click một query item gọi đúng handler search hiện tại.
- Modal đóng sau khi chọn query.

Chạy:

```bash
cd frontend
npm run lint
npm run test -- App.test.tsx
npm run build
```

Nếu có test component riêng cho `search-section`, chạy thêm test đó.

## Kỳ vọng cuối cùng

Trang Event Search có:

- 5 suggested queries nhanh như hiện tại.
- Một nút `More Suggestions` / `Query Library`.
- Modal/drawer đẹp, gọn, có nhiều câu hỏi demo theo nhóm.
- Người dùng có thể chọn câu hỏi để chạy ngay.
- Các câu hỏi demo bám sát synthetic dataset nên có xác suất cao ra kết quả.

## Câu giải thích khi bảo vệ

> Query Library là tập playbook/query mẫu deterministic, giúp analyst mới biết cách bắt đầu điều tra. Khi chọn một query, hệ thống vẫn đi qua pipeline Natural Language -> SearchPlan -> Validator -> DSL, nên không bypass guardrail và không tốn thêm token LLM để tạo suggestions.
