# Prompt: Server-side Filtering cho All Investigations và Audit History

**Role:** Bạn là Senior Full-stack Engineer chuyên React, TypeScript, Spring Boot, PostgreSQL/JPA và hệ thống SOC/SIEM.

**Task:** Nâng cấp trang **All Investigations** và **Audit History** từ kiểu filter/search client-side sang **server-side filtering, searching, sorting, pagination** để dữ liệu đúng trên toàn bộ database, không chỉ đúng trên page/list đang được frontend tải về.

## Bối Cảnh Hiện Tại

Project: `SOC AI Search`

Các file cần đọc trước:

- `frontend/src/components/soc/investigations/investigations-page.tsx`
- `frontend/src/components/soc/investigations/investigations-master-list.tsx`
- `frontend/src/components/soc/admin/audit-logs-page.tsx`
- `frontend/src/services/history-api.ts`
- `backend/src/main/java/com/soc/ai/search/audit/AuditQueryController.java`
- `backend/src/main/java/com/soc/ai/search/audit/AuditQueryService.java`
- `backend/src/main/java/com/soc/ai/search/audit/SearchQueryLogRepository.java`
- `backend/src/main/java/com/soc/ai/search/audit/SearchQueryLog.java`
- `backend/src/main/resources/db/migration/V1__create_search_query_logs.sql`
- `backend/src/main/resources/db/migration/V2__add_query_pin_fields.sql`

Hiện trạng quan trọng:

1. Backend `GET /api/v1/search/history` hiện đã hỗ trợ một phần filter server-side:
   - `page`
   - `size`
   - `pinned`
   - `status`
   - `mode`

2. Nhưng `InvestigationsPage` hiện đang gọi:

```ts
getSearchHistory(0, 100, {}, signal)
```

Sau đó filter bằng `useMemo` ở client:

- text search theo `question`;
- `all`;
- `pinned`;
- `SUCCESS`;
- `FAILED`;
- `search`;
- `aggregation`.

Điều này chưa chuẩn vì frontend chỉ lọc trên 100 record vừa tải, không lọc toàn bộ PostgreSQL.

3. Backend `GET /api/v1/audit-logs` hiện chỉ nhận:

- `page`
- `size`

Trang `AuditLogsPage` đang tự filter client-side:

- `All`
- `Success`
- `Failed`
- `Search`
- `Aggregation`
- text search theo `question` và `user_identity`.

Điều này cũng chưa chuẩn vì search/filter chỉ đúng trên page hiện tại.

## Mục Tiêu

Chuyển All Investigations và Audit History sang server-side:

- Search/filter/sort/pagination đều gửi xuống backend.
- Backend query PostgreSQL bằng điều kiện tương ứng.
- Frontend không fetch nhiều record rồi tự lọc nữa.
- Khi đổi filter/search/sort thì reset về page `0`.
- Kết quả `total`, `total_pages`, `page`, `items` phải phản ánh đúng toàn bộ database sau filter.

## Bộ Filter Nên Giữ Và Bổ Sung

### 1. All Investigations

Giữ các filter hiện tại, nhưng gửi xuống backend:

- `All`
- `Pinned`
- `Success`
- `Failed`
- `Search`
- `Aggregation`
- Text search box

Đề xuất cải thiện label để đỡ nhầm:

- `Search` mode nên hiển thị rõ là `Mode: Search` nếu UI có đủ chỗ.
- Text input nên dùng placeholder: `Search questions...`

Nên bổ sung:

- Date range:
  - `Last 24h`
  - `Last 7 days`
  - `Last 30 days`
  - `All time`
- Sort:
  - `Newest first`
  - `Oldest first`

Không cần thêm filter quá phức tạp như severity/event_type ở history, vì history là metadata truy vấn, không phải bảng event raw.

### 2. Audit History / Audit Logs

Giữ:

- `All`
- `Success`
- `Failed`
- `Search`
- `Aggregation`
- Text search box

Nên bổ sung:

- `User identity` filter hoặc để text search tìm được cả `user_identity`.
- Date range:
  - `Last 24h`
  - `Last 7 days`
  - `Last 30 days`
  - `All time`
- Sort:
  - `Newest first`
  - `Oldest first`

Không nên thêm `Pinned` vào Audit History, vì pin là thao tác quản lý investigation cá nhân/team, không phải tiêu chí audit hệ thống chính.

## Backend Requirements

### 1. Mở rộng API history

Cập nhật endpoint:

```http
GET /api/v1/search/history
```

Hỗ trợ query params:

- `page`
- `size`
- `q`
- `pinned`
- `status`
- `mode`
- `from`
- `to`
- `sort`

Gợi ý:

```http
/api/v1/search/history?page=0&size=20&q=failed&status=SUCCESS&mode=search&pinned=true&from=2026-06-01T00:00:00Z&to=2026-07-01T00:00:00Z&sort=created_at,desc
```

Security:

- History thường vẫn scope theo current user identity.
- Không làm lộ query history của user khác nếu requirement hiện tại chưa cho phép.
- Nếu hệ thống đã có logic admin xem tất cả history thì giữ đúng logic hiện tại, không tự mở quyền rộng hơn khi chưa có test.

### 2. Mở rộng API audit logs

Cập nhật endpoint:

```http
GET /api/v1/audit-logs
```

Hỗ trợ query params:

- `page`
- `size`
- `q`
- `status`
- `mode`
- `identity`
- `from`
- `to`
- `sort`

Gợi ý:

```http
/api/v1/audit-logs?page=0&size=50&q=edited&status=SUCCESS&mode=aggregation&identity=analyst.demo&from=2026-06-01T00:00:00Z&to=2026-07-01T00:00:00Z&sort=created_at,desc
```

Audit logs là endpoint admin-only, giữ nguyên:

```java
@PreAuthorize("@rbacPermissionService.authDisabled() or hasRole('SOC_ADMIN')")
```

### 3. Repository / Query Layer

Ưu tiên cách sạch:

- Dùng `JpaSpecificationExecutor<SearchQueryLog>` nếu phù hợp.
- Hoặc tạo custom repository query với optional params.

Điều kiện query:

- `q`:
  - match `question` bằng case-insensitive contains;
  - match `userIdentity` nếu là Audit Logs;
  - match `errorMessage` nếu có;
  - nếu `q` parse được UUID thì có thể match `queryId` chính xác.
- `status`: `SUCCESS` hoặc `FAILED`.
- `mode`: `search` hoặc `aggregation`.
- `pinned`: true/false/null.
- `identity`: case-insensitive contains hoặc exact tùy code style hiện tại.
- `from/to`: lọc theo `createdAt`.
- `sort`: chỉ allowlist field hợp lệ, ví dụ `created_at`.

Guardrail:

- `size` vẫn giới hạn tối đa, ví dụ 100.
- `q` trim và giới hạn độ dài, ví dụ 200 ký tự.
- Reject enum sai bằng 400 có message rõ.
- Không build query bằng nối chuỗi SQL thô.

## Frontend Requirements

### 1. `history-api.ts`

Cập nhật service:

- `getSearchHistory(page, size, filters, signal)`
- `getAuditLogs(page, size, filters, signal)`

Filters nên có type rõ:

```ts
type HistoryFilters = {
  q?: string
  pinned?: boolean
  status?: AuditStatus | 'all'
  mode?: SearchMode | 'all'
  from?: string
  to?: string
  sort?: 'created_at,desc' | 'created_at,asc'
}
```

Audit filters:

```ts
type AuditLogFilters = {
  q?: string
  status?: AuditStatus | 'all'
  mode?: SearchMode | 'all'
  identity?: string
  from?: string
  to?: string
  sort?: 'created_at,desc' | 'created_at,asc'
}
```

Không gửi param `all`, empty string, null xuống backend.

### 2. `InvestigationsPage`

Thay logic hiện tại:

- Không fetch `0, 100` rồi filter client-side nữa.
- Khi `query`, `filter`, `dateRange`, `sort`, `page` thay đổi thì gọi backend.
- Debounce text search khoảng 300ms.
- Khi đổi filter/search/date/sort thì reset `page = 0`.
- Pin/unpin xong cần refetch hoặc update current item đúng với filter hiện tại.

Nếu đang ở filter `Pinned` và user unpin item, item đó nên biến khỏi list sau khi state/refetch cập nhật.

### 3. `AuditLogsPage`

Thay logic hiện tại:

- Không dùng `filteredItems = useMemo(...)` để filter client-side nữa.
- Mọi filter/search gửi xuống backend.
- Text search nên debounce 300ms.
- Khi đổi filter/search/date/sort thì reset `page = 0`.
- Pagination dùng `total_pages` từ backend sau filter.

### 4. UI/UX

Giữ UI hiện tại nếu không cần refactor lớn, nhưng cần:

- Loading state rõ.
- Empty state nói đúng: `No records match current filters`.
- Active filter chip rõ.
- Có nút `Clear filters`.
- Page indicator lấy theo response server.

## Tests Bắt Buộc

### Backend

Thêm/cập nhật test cho:

- History filter by status.
- History filter by mode.
- History filter by pinned.
- History search by question.
- History date range.
- History vẫn scope theo current user.
- Audit logs filter by status/mode.
- Audit logs search by question/user identity/error message.
- Audit logs date range.
- Invalid enum/date/size trả lỗi có kiểm soát.

### Frontend

Thêm/cập nhật test cho:

- InvestigationsPage gọi API với query params khi đổi filter.
- Text search debounce hoặc ít nhất gọi API với `q`.
- Đổi filter reset page về 0.
- AuditLogsPage không còn filter client-side trên page hiện tại.
- Pagination giữ filter params khi chuyển page.
- Clear filters gọi lại API với filter rỗng.

## Verification

Chạy tối thiểu:

```powershell
cd backend
.\mvnw.cmd test
```

```powershell
cd frontend
npm run lint
npm run test
npm run build
```

Nếu CI/CD có smoke test liên quan, chạy thêm:

```powershell
pwsh ./scripts/smoke-test-day-10-regression.ps1
```

Trước khi kết luận xong, kiểm tra:

- All Investigations filter/search đúng dù record nằm ngoài page đầu.
- Audit History filter/search đúng dù record nằm ngoài page đầu.
- Pagination total đúng sau filter.
- Pin/unpin không làm sai list hiện tại.
- Không phá quyền RBAC.

## UI Polish Sau Khi Chuyển Server-side

Sau khi hoàn tất server-side filtering/searching/pagination, hãy polish lại UI của **All Investigations** và **Audit History** để hai màn hình nhìn tương đương nhau, cùng một ngôn ngữ thiết kế SOC/SIEM dark theme.

Yêu cầu cụ thể:

1. Đồng bộ visual style giữa hai trang:
   - Card/table spacing, border, background, badge, typography nên nhất quán.
   - Filter bar, search input, pagination và empty/loading state nên có cảm giác cùng một hệ thống.
   - Không cần làm lại toàn bộ UI, nhưng phải tránh cảm giác hai trang do hai template khác nhau ghép vào.
   - Điều chỉnh cỡ chữ, font weight, line-height và letter spacing của hai UI cho phù hợp với hệ thống hiện tại.
   - Ưu tiên typography giống các màn chính như Event Search / Query Result:
     - title rõ nhưng không quá to;
     - table header nhỏ, uppercase nhẹ;
     - body text dễ đọc;
     - badge status/mode có font-size nhất quán;
     - tránh chữ quá nhỏ, quá mờ hoặc quá dày làm UI lệch khỏi dark SOC theme.

2. Xóa trường `Latency` ở cả hai UI:
   - Không hiển thị cột latency trong All Investigations.
   - Không hiển thị cột latency trong Audit History.
   - Nếu detail panel/modal đang hiển thị latency thì cũng xóa.
   - Backend vẫn có thể lưu latency trong database, chỉ không hiển thị trên UI.

3. Xóa `query_id` khỏi phần hiển thị chi tiết query:
   - Khi user click vào một query để xem detail, không hiển thị `query_id`.
   - `query_id` vẫn được dùng nội bộ cho rerun/export/pin nếu cần, nhưng không show ra UI.
   - Lý do: `query_id` là thông tin kỹ thuật, không hữu ích cho demo/người dùng cuối.

4. AI Summary trong detail:
   - Nếu query không có AI summary hoặc summary rỗng/null thì ẩn toàn bộ section AI Summary.
   - Không hiển thị fallback block trống hoặc câu kiểu `No summary available`.
   - Nếu có summary thì hiển thị gọn, đẹp, cùng style với trang Event Search.

5. Trong trang chi tiết query, xóa các phần sau:
   - Biểu tượng pin trong detail panel/modal.
   - Latency trong detail panel/modal.
   - `query_id`.
   - Pin/unpin nên nằm ở list/table row nếu cần, không đặt nổi bật trong detail.

6. Chuẩn hóa label mode/status:
   - Đổi label `Search` thành `SEARCH`.
   - Đổi label `Aggregation` thành `AGGREGATION`.
   - Giữ `SUCCESS`, `FAILED` như hiện tại.
   - Mode/status badge nên dùng cùng style ở All Investigations và Audit History.

7. Không phá behavior:
   - Rerun query vẫn hoạt động.
   - Export CSV vẫn hoạt động.
   - Pin/unpin vẫn hoạt động nếu user có quyền.
   - Detail vẫn hiển thị SearchPlan và generated DSL.
   - Audit History vẫn admin-only.

8. Audit History export behavior:
   - Xóa nút `Export CSV` khỏi phần detail panel/modal của Audit History.
   - Detail Audit History chỉ dùng để xem audit metadata, SearchPlan và generated DSL.
   - Không export raw event results từ detail Audit History vì dễ gây nhầm với export kết quả truy vấn ở Event Search / All Investigations.
   - Thêm chức năng export audit logs ở cấp trang Audit History, gần search/filter bar.
   - Label nút phải rõ nghĩa, ví dụ: `Export Audit CSV`.
   - Export Audit CSV phải xuất danh sách audit logs theo bộ filter server-side hiện tại, không chỉ page đang hiển thị.
   - CSV audit nên chứa metadata, không chứa raw event results:
     - time / created_at;
     - user_identity;
     - question;
     - mode;
     - status;
     - result_count;
     - error_message nếu có;
     - pinned nếu có ý nghĩa;
     - pinned_at nếu có;
     - summary có thể bỏ qua nếu quá dài.
   - Không đưa `generated_dsl` đầy đủ vào audit CSV mặc định vì có thể dài; nếu cần thì chỉ thêm cột `has_generated_dsl`.
   - Backend nên có endpoint riêng cho export audit, ví dụ:

```http
GET /api/v1/audit-logs/export
```

   - Endpoint này phải:
     - yêu cầu `SOC_ADMIN`;
     - nhận cùng filter params với `/api/v1/audit-logs`;
     - stream CSV response;
     - có giới hạn số dòng export hợp lý, ví dụ 10,000 hoặc config riêng;
     - có header nếu bị truncate, ví dụ `X-Export-Truncated: true`;
     - chống CSV formula injection giống export event CSV nếu đã có helper chung.

9. Tests/UI checks:
   - Cập nhật test snapshot/assertion nếu có.
   - Test rằng query detail không render `query_id`.
   - Test rằng summary section bị ẩn khi summary null/empty.
   - Test mode badge render `SEARCH` và `AGGREGATION`.
   - Test latency không xuất hiện trong list/detail.
   - Test Audit History detail không render nút `Export CSV`.
   - Test Audit History page render nút `Export Audit CSV`.
   - Test export audit gọi đúng endpoint với filter params hiện tại.

## Kỳ Vọng Cuối Cùng

Sau khi hoàn thành:

- All Investigations không còn client-side filtering trên 100 record.
- Audit History không còn client-side filtering trên page hiện tại.
- Backend là nguồn sự thật cho filter/search/sort/pagination.
- UI vẫn giữ bộ lọc dễ hiểu: All, Success, Failed, Search, Aggregation, text search.
- Có thêm date range và sort để hoàn thiện hơn cho đồ án.
- All Investigations và Audit History có UI nhất quán hơn.
- Không còn hiển thị latency/query_id ở những nơi không cần thiết.
- Query detail gọn hơn: chỉ hiển thị thông tin có giá trị cho analyst/admin.
- Hệ thống phù hợp hơn với câu trả lời bảo vệ: “History/Audit được query server-side trên PostgreSQL, không chỉ lọc dữ liệu đã load ở frontend.”
