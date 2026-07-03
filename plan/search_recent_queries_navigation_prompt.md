# Prompt: Move Recent Queries To Search Page Actions And Simplify Investigations Navigation

## Role

Bạn là Senior Frontend Engineer chuyên React, TypeScript, Tailwind CSS và UI/UX cho dashboard SOC/SIEM dark theme.

Hãy thực hiện refactor nhỏ nhưng phải thật sạch về navigation và quick-access history:

1. Sidebar không còn dropdown con cho `Investigations`.
2. `Investigations` trở thành một item đơn, click là mở thẳng trang Investigations.
3. `Recent Queries` không nằm trong sidebar nữa.
4. Ở trang Event Search, đặt nút `Recent Queries` cạnh nút `View queries`.
5. Hai nút `View queries` và `Recent Queries` phải đẹp, đồng bộ, có icon, nổi hơn suggested chips nhưng không phá dark SOC theme.
6. Sau khi sửa phải kiểm tra CI/CD local commands để tránh fail pipeline.

## Context Hiện Tại

Các file liên quan nhiều khả năng gồm:

```text
frontend/src/components/soc/soc-sidebar.tsx
frontend/src/components/soc/search-section.tsx
frontend/src/components/soc/history-sheet.tsx
frontend/src/App.tsx
frontend/src/components/soc/soc-sidebar.test.tsx
frontend/src/components/soc/search-section.test.tsx
frontend/src/App.test.tsx
frontend/src/services/history-api.ts
```

Hiện trạng hiện tại:

- Sidebar có nhóm cha `Investigations`.
- Nhóm này có 2 item con:
  - `All Investigations`
  - `Recent Queries`
- `Recent Queries` đang mở drawer/popup history.
- Search page đã có nút `View queries` cạnh 5 suggested queries.
- `View queries` dẫn tới route `/query-library`.

Yêu cầu mới:

- Sidebar chỉ còn item đơn `Investigations`.
- `Recent Queries` chuyển sang nằm cạnh `View queries` ở trang Search.
- `Recent Queries` vẫn mở drawer/popup hiện tại, không tạo page mới.

## Mục Tiêu UX

Luồng mới mong muốn:

```text
Sidebar
  Dashboard
  Event Search
  Investigations
  Guide
    Query Library
  Admin Tools
    System Audit Logs
```

Trong Event Search:

```text
Suggested: [Failed login] [Critical alerts] ... [View queries] [Recent Queries]
```

Ý nghĩa:

- `View queries`: mở trang Query Library, nơi có nhiều câu hỏi mẫu/playbook.
- `Recent Queries`: mở drawer Recent Queries, nơi xem nhanh các câu vừa search.
- `Investigations`: mở trang lịch sử đầy đủ, có filter, detail, pin, rerun, export.

## Yêu Cầu Chi Tiết

### 1. Refactor Sidebar: Investigations Là Item Đơn

Trong `frontend/src/components/soc/soc-sidebar.tsx`:

1. Xóa hoặc không dùng state:

```ts
const [investigationsOpen, setInvestigationsOpen] = useState(false)
```

2. Xóa cấu trúc dropdown con của `Investigations`, bao gồm:

```text
All Investigations
Recent Queries
```

3. `Investigations` phải là một navigation item giống `Dashboard` hoặc `Event Search`.

Behavior:

- Khi click `Investigations`:

```ts
onPageChange?.('investigations')
```

- Không gọi `onOpenHistory`.
- Không expand/collapse group.
- Khi collapsed sidebar, tooltip vẫn là `Investigations`.
- Khi active page là `investigations`, item có active style:

```text
bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/25
```

4. Giữ permission:

- Chỉ user có quyền xem history/investigation mới thấy item `Investigations`.
- Tôn trọng `canViewHistory(permissionContext)` hiện tại.
- Viewer không được thấy nếu policy hiện tại là không cho viewer thấy.

5. Dọn import:

- Nếu không còn dùng `ChevronDown`, `History`, `ListFilter`, hoặc item con nào thì xóa import thừa.
- Không để ESLint báo unused import.

### 2. Search Page: Thêm Nút Recent Queries Cạnh View Queries

Trong `frontend/src/components/soc/search-section.tsx`:

Hiện tại component có prop:

```ts
onOpenQueryLibrary?: () => void
```

Hãy thêm prop mới:

```ts
onOpenRecentQueries?: () => void
```

Yêu cầu:

1. Render nút `Recent Queries` ngay cạnh `View queries`.
2. Chỉ render nếu `onOpenRecentQueries` tồn tại.
3. Click nút này gọi:

```ts
onOpenRecentQueries()
```

4. Không submit search.
5. Không fill search input.
6. Không tạo audit log.
7. Không gọi search API.

### 3. UI Cho 2 Nút View Queries Và Recent Queries

Hai nút phải đẹp và đồng bộ với SOC dark theme.

#### View queries

Giữ text:

```text
View queries
```

Icon đề xuất:

```ts
BookOpen
```

Style đề xuất:

```text
inline-flex items-center gap-1.5
rounded-full
border border-cyan-400/35
bg-cyan-500/15
px-3 py-1.5
text-xs font-semibold
text-cyan-100
shadow-[0_0_18px_-10px_#22d3ee]
hover:bg-cyan-400/20
hover:border-cyan-300/50
```

#### Recent Queries

Text:

```text
Recent Queries
```

Icon đề xuất:

```ts
History
```

Style đề xuất:

```text
inline-flex items-center gap-1.5
rounded-full
border border-zinc-700
bg-zinc-900/80
px-3 py-1.5
text-xs font-semibold
text-zinc-200
hover:border-cyan-400/35
hover:bg-cyan-500/10
hover:text-cyan-100
```

Lưu ý:

- `View queries` nên nổi hơn một chút vì nó dẫn sang page lớn.
- `Recent Queries` vẫn đủ nổi, nhưng không tranh spotlight.
- Hai nút phải nằm cùng hàng với suggested chips.
- Nếu màn hình nhỏ thì wrap xuống dòng tự nhiên, không vỡ layout.

### 4. App Wiring

Trong `frontend/src/App.tsx`:

1. Truyền prop từ App xuống `SearchSection`:

```tsx
onOpenRecentQueries={...}
```

2. Handler nên dùng lại logic mở `HistorySheet` / Recent Queries drawer hiện có.

Ví dụ nếu App hiện có state:

```ts
const [historyOpen, setHistoryOpen] = useState(false)
```

thì truyền:

```tsx
onOpenRecentQueries={() => setHistoryOpen(true)}
```

Hoặc dùng handler hiện có như:

```tsx
onOpenHistory={...}
```

3. Sidebar không còn mở Recent Queries nữa, nhưng App vẫn cần giữ `HistorySheet` để Search page gọi.

4. Không xóa `HistorySheet`.

### 5. Recent Queries Drawer Giữ Nguyên Chức Năng

Không refactor sâu `history-sheet.tsx` trong task này, trừ khi cần sửa prop/test do đổi entry point.

Yêu cầu drawer vẫn hoạt động:

- Mở được từ Search page button `Recent Queries`.
- Hiển thị danh sách recent query.
- Click item vẫn giữ behavior hiện tại:
  - rerun hoặc fill input tùy logic hiện tại của project.
- Pin/unpin nếu đang có vẫn giữ.
- Không làm mất quyền RBAC hiện tại.

### 6. Route / Query Library Giữ Nguyên

Không thay đổi route `/query-library`.

`View queries` vẫn:

```ts
navigate('/query-library')
```

Không đổi tên page.

Không xóa Guide -> Query Library trong sidebar.

### 7. Tests Cần Cập Nhật

Hãy cập nhật test phù hợp. Tối thiểu kiểm tra:

#### `frontend/src/components/soc/soc-sidebar.test.tsx`

1. User có quyền history thấy `Investigations`.
2. Click `Investigations` gọi:

```ts
onPageChange('investigations')
```

3. Sidebar không còn render text:

```text
All Investigations
Recent Queries
```

trong nhóm Investigations.

4. `Recent Queries` không còn được mở từ sidebar.

Nếu test cũ đang kỳ vọng dropdown con thì cập nhật lại theo behavior mới.

#### `frontend/src/components/soc/search-section.test.tsx`

1. Render `View queries` nếu có `onOpenQueryLibrary`.
2. Render `Recent Queries` nếu có `onOpenRecentQueries`.
3. Click `Recent Queries` gọi callback đúng 1 lần.
4. Click `Recent Queries` không gọi `onSubmitQuestion`.
5. Click `View queries` vẫn gọi callback query library.

#### `frontend/src/App.test.tsx`

Nếu App test kiểm sidebar/history behavior, cập nhật:

1. Mở Recent Queries thông qua Search page button.
2. Không mở Recent Queries thông qua sidebar.

Không bắt buộc thêm test quá nhiều nếu project hiện chưa có coverage cho UI này, nhưng phải sửa test fail.

### 8. Không Được Làm

Không được:

- Xóa trang Investigations.
- Xóa HistorySheet / Recent Queries drawer.
- Xóa Query Library.
- Đổi behavior 5 suggested query mặc định.
- Biến Recent Queries thành page riêng.
- Tự động search khi bấm `Recent Queries`.
- Tự động search khi bấm `View queries`.
- Làm viewer thấy chức năng họ không có quyền.
- Làm dashboard/search/investigations/audit bị đổi route sai.

## Acceptance Criteria

Hoàn thành khi:

1. Sidebar chỉ còn `Investigations` là item đơn.
2. Không còn item con `All Investigations` và `Recent Queries` dưới sidebar.
3. Click `Investigations` mở trang Investigations.
4. Trang Search hiển thị hai nút cạnh nhau:

```text
View queries
Recent Queries
```

5. Click `View queries` đi tới `/query-library`.
6. Click `Recent Queries` mở drawer Recent Queries.
7. UI hai nút đẹp, có icon, màu sắc đồng bộ với dark SOC theme.
8. Không có lỗi ESLint unused import.
9. Tests pass.
10. Build pass.

## CI/CD Check Bắt Buộc

Sau khi sửa, hãy chạy local commands sau:

```bash
cd frontend
npm run lint
npm run test
npm run build
```

Nếu sửa backend là không cần thiết cho task này. Nhưng nếu lỡ động backend thì chạy thêm:

```bash
cd backend
./mvnw test
```

Trước khi kết luận, hãy kiểm tra:

```bash
git status --short
git diff --stat
```

Và ghi rõ:

- Files đã sửa.
- Test/lint/build đã chạy.
- Có warning nào còn lại không.
- Có thay đổi ngoài scope không.

## Gợi Ý Commit Message

```bash
git commit -m "move recent queries to search actions" -m "Simplify sidebar investigations navigation into a single page item and add a Recent Queries action beside View queries on the search page. Preserve the existing recent-query drawer, query library route, RBAC visibility, and update UI tests for the new navigation flow."
```
