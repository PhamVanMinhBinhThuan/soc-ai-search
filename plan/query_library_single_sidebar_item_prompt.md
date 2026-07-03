# Prompt: Make Query Library A Single Sidebar Item

## Role

Bạn là Senior Frontend Engineer chuyên React, TypeScript, Tailwind CSS và UI/UX cho dashboard SOC/SIEM dark theme.

Hãy refactor sidebar navigation để `Guide` không còn là dropdown nữa. Thay vào đó, hiển thị trực tiếp một item tên:

```text
Query Library
```

Item này click vào route/page `/query-library`.

Sau khi sửa phải kiểm tra luồng CI/CD local để tránh làm fail pipeline.

## Context Hiện Tại

Các file liên quan nhiều khả năng gồm:

```text
frontend/src/components/soc/soc-sidebar.tsx
frontend/src/components/soc/soc-sidebar.test.tsx
frontend/src/App.tsx
frontend/src/App.test.tsx
frontend/src/components/soc/query-library-page.tsx
```

Hiện trạng hiện tại:

- Sidebar có group `Guide`.
- Group `Guide` có child item `Query Library`.
- Click `Guide` để expand/collapse.
- Click child `Query Library` mới đi tới `/query-library`.

Yêu cầu mới:

- Không còn dropdown/group `Guide`.
- Sidebar có item đơn `Query Library`.
- Click `Query Library` đi thẳng tới page `/query-library`.

## Mục Tiêu UX

Sidebar mong muốn sau refactor:

```text
Dashboard
Event Search
Investigations
Query Library
Admin Tools
  System Audit Logs
```

Nếu sidebar đang collapsed:

- Item `Query Library` chỉ hiện icon.
- Tooltip là `Query Library`.

Nếu sidebar đang expanded:

- Item hiển thị icon + text `Query Library`.

Khi page hiện tại là `query-library`:

- Item `Query Library` có active style giống các item chính khác:

```text
bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/25
```

## Yêu Cầu Chi Tiết

### 1. Refactor `soc-sidebar.tsx`

Trong `frontend/src/components/soc/soc-sidebar.tsx`:

1. Xóa hoặc không dùng state:

```ts
const [guideOpen, setGuideOpen] = useState(false)
```

2. Xóa block dropdown/group `Guide`, bao gồm:

```text
Guide
  Query Library
```

3. Thêm `Query Library` như một item đơn ngang cấp với:

```text
Dashboard
Event Search
Investigations
```

4. Behavior:

```ts
onPageChange?.('query-library')
```

5. Không tạo route mới.

6. Không đổi tên route `/query-library`.

7. Không đổi tên page title nếu page hiện đang là `Query Library`.

8. Dọn import thừa:

- Nếu không còn dùng `ChevronDown` cho Guide thì chỉ xóa nếu không dùng ở group khác.
- Nếu không còn dùng `BookOpen` hoặc `Library` thì dùng một icon phù hợp, đừng để unused import.

### 2. Icon Cho Query Library

Nên dùng một trong các icon sau từ `lucide-react`:

```ts
Library
BookOpen
BookMarked
```

Khuyến nghị:

- Dùng `Library` nếu muốn giữ cảm giác “thư viện query”.
- Dùng `BookOpen` nếu muốn mềm hơn, giống tài liệu hướng dẫn.

Trong task này ưu tiên dùng:

```ts
Library
```

### 3. Giữ Search Page Button `View queries`

Không thay đổi nút `View queries` ở trang Event Search.

Nút đó vẫn dẫn tới `/query-library`.

Task này chỉ đổi sidebar navigation, không đổi Search page unless test import/typing cần cập nhật.

### 4. Giữ Query Library Page

Không refactor UI trang Query Library trong task này.

Không đổi:

```text
frontend/src/components/soc/query-library-page.tsx
frontend/src/lib/query-library.ts
```

Trừ khi có lỗi import/type do sidebar đổi.

### 5. RBAC / Permission

`Query Library` nên hiển thị cho tất cả user đã vào app, vì đây là trang hướng dẫn/câu hỏi mẫu.

Không cần kiểm role `SOC_ANALYST` hay `SOC_ADMIN`.

Nếu hiện tại `Guide` luôn hiển thị cho mọi role thì giữ nguyên behavior đó.

Nếu viewer có thể vào Event Search thì viewer cũng nên thấy `Query Library`.

### 6. Tests Cần Cập Nhật

Hãy cập nhật test phù hợp.

#### `frontend/src/components/soc/soc-sidebar.test.tsx`

Kiểm tra tối thiểu:

1. Sidebar render item:

```text
Query Library
```

2. Không còn render group:

```text
Guide
```

3. Không cần click `Guide` để thấy `Query Library`.

4. Click `Query Library` gọi:

```ts
onPageChange('query-library')
```

5. Khi `activePage="query-library"` item có trạng thái active.

Nếu test cũ còn kỳ vọng `Guide` expand/collapse, hãy cập nhật theo behavior mới.

#### `frontend/src/App.test.tsx`

Nếu App test kiểm sidebar route:

1. Click `Query Library`.
2. App chuyển sang page Query Library hoặc gọi navigate đúng route tùy kiến trúc hiện tại.

Không thêm test quá mức nếu project không có coverage cho phần này, nhưng phải sửa test fail.

### 7. Không Được Làm

Không được:

- Đổi tên `Query Library` thành tên khác.
- Đổi route `/query-library`.
- Xóa page Query Library.
- Xóa nút `View queries` ở Search page.
- Xóa data query library.
- Thay đổi `Admin Tools`.
- Thay đổi quyền của `Investigations` hoặc `Audit Logs`.
- Làm sidebar collapsed bị mất tooltip.
- Để ESLint báo unused import/state.

## Acceptance Criteria

Hoàn thành khi:

1. Sidebar không còn item/group `Guide`.
2. Sidebar có item đơn `Query Library`.
3. Click `Query Library` mở `/query-library`.
4. Active state của `Query Library` đúng khi đang ở page đó.
5. Tooltip collapsed sidebar vẫn hoạt động.
6. Search page `View queries` vẫn hoạt động.
7. Không có lỗi TypeScript/ESLint.
8. Tests pass.
9. Build pass.

## CI/CD Check Bắt Buộc

Sau khi sửa, hãy chạy:

```bash
cd frontend
npm run lint
npm run test
npm run build
```

Nếu có sửa backend ngoài ý muốn thì chạy thêm:

```bash
cd backend
./mvnw test
```

Trước khi kết luận, hãy kiểm tra:

```bash
git status --short
git diff --stat
```

Khi báo cáo kết quả, ghi rõ:

- File đã sửa.
- Test/lint/build đã chạy.
- Có warning nào còn lại không.
- Có thay đổi ngoài scope không.

## Gợi Ý Commit Message

```bash
git commit -m "simplify query library sidebar navigation" -m "Replace the Guide dropdown with a single Query Library sidebar item that routes directly to /query-library. Preserve the existing search-page View queries action, collapsed tooltip behavior, and update sidebar tests for the simplified navigation."
```
