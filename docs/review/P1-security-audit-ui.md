# P1 - Security, Audit & Product Features

P1 là phần giúp bạn trả lời chắc hơn khi hội đồng hỏi về bảo mật, vận hành và giá trị thực tế của sản phẩm.

## 1. RBAC Và Keycloak

### Bạn cần nói được

Hệ thống có 3 role:

| Role | Ý nghĩa |
| --- | --- |
| `SOC_VIEWER` | Xem/search cơ bản |
| `SOC_ANALYST` | Điều tra, edit SearchPlan, export, pin |
| `SOC_ADMIN` | Quản trị, audit logs, toàn quyền |

### Capability matrix

| Chức năng | Viewer | Analyst | Admin |
| --- | :---: | :---: | :---: |
| Search | Yes | Yes | Yes |
| Event detail cơ bản | Yes | Yes | Yes |
| Edit SearchPlan | No | Yes | Yes |
| Export CSV | No | Yes | Yes |
| Pin/unpin investigation | No | Yes | Yes |
| Audit logs | No | No | Yes |

### Code cần đọc

- `backend/src/main/java/com/soc/ai/search/security/SecurityConfig.java`
- `backend/src/main/java/com/soc/ai/search/security/RbacPermissionService.java`
- `backend/src/main/java/com/soc/ai/search/security/CurrentUserService.java`
- `backend/src/main/java/com/soc/ai/search/security/RoleNames.java`
- `frontend/src/auth/permissions.ts`
- `infra/keycloak/realm-export/soc-ai-search-realm.json`

### Câu hỏi dễ gặp

**Ẩn button trên UI có đủ bảo mật không?**

> Không. UI chỉ cải thiện UX. Backend vẫn dùng Spring Security và role check để chặn request trái quyền.

---

## 2. Audit, History, Investigations

### Bạn cần nói được

- Mỗi search lưu một record trong PostgreSQL.
- Lưu question, identity, mode, status, SearchPlan, generated DSL, result count, latency, summary/error.
- Recent Queries là quick access.
- All Investigations là workspace đầy đủ để xem history, pin, rerun, export.
- Admin dùng audit logs để truy vết hệ thống.

### Code cần đọc

- `backend/src/main/java/com/soc/ai/search/audit/SearchAuditService.java`
- `backend/src/main/java/com/soc/ai/search/audit/AuditPersistenceService.java`
- `backend/src/main/java/com/soc/ai/search/audit/AuditQueryService.java`
- `backend/src/main/java/com/soc/ai/search/audit/AuditQueryController.java`
- `backend/src/main/java/com/soc/ai/search/audit/SearchQueryLog.java`
- `backend/src/main/resources/db/migration/V1__create_search_query_logs.sql`
- `frontend/src/services/history-api.ts`
- `frontend/src/components/soc/history-sheet.tsx`
- `frontend/src/components/soc/investigations/investigations-page.tsx`

### Câu trả lời mẫu

> Audit/history giúp truy vết: user hỏi gì, hệ thống sinh SearchPlan nào, DSL nào được chạy, kết quả bao nhiêu, latency ra sao và có lỗi gì không.

---

## 3. CSV Export An Toàn

### Bạn cần nói được

- Export không nhận DSL từ client.
- Client chỉ gửi `query_id`.
- Backend lấy SearchPlan đã lưu trong PostgreSQL.
- Backend validate/compile lại rồi query Elasticsearch.
- Export giới hạn tối đa 10,000 rows.
- Có chống CSV formula injection.

### Code cần đọc

- `backend/src/main/java/com/soc/ai/search/csv/CsvExportController.java`
- `backend/src/main/java/com/soc/ai/search/csv/CsvExportService.java`
- `backend/src/main/java/com/soc/ai/search/csv/CsvRowWriter.java`
- `backend/src/main/java/com/soc/ai/search/audit/SearchQueryLogLookupService.java`
- `frontend/src/services/csv-export-api.ts`

### Câu hỏi dễ gặp

**Tại sao không cho frontend gửi DSL để export?**

> Vì DSL tùy ý có thể bypass validator. Export bằng query_id giúp backend replay SearchPlan đã lưu và kiểm soát lại toàn bộ.

---

## 4. Dashboard Và Static Suggestions

### Bạn cần nói được

- Dashboard dùng aggregation API cố định.
- Dashboard không gọi LLM.
- Auto-refresh 10 phút.
- Nếu một card lỗi, các card khác vẫn hiển thị.
- Suggestions/playbooks là static/deterministic, không tốn thêm LLM.

### Code cần đọc

- `frontend/src/components/soc/dashboard/soc-dashboard.tsx`
- `frontend/src/components/soc/dashboard/kpi-cards.tsx`
- `frontend/src/components/soc/dashboard/events-over-time.tsx`
- `frontend/src/components/soc/dashboard/severity-distribution.tsx`
- `frontend/src/components/soc/dashboard/top-source-ips.tsx`
- `frontend/src/lib/investigation-suggestions.ts`
- `frontend/src/services/search-api.ts`

### Câu trả lời mẫu

> Dashboard không cần AI vì nó chạy các SearchPlan aggregation cố định. Điều này giúp dashboard nhanh, ổn định, ít tốn chi phí LLM và không làm nhiễu audit history.

---

## 5. Editable SearchPlan

### Bạn cần nói được

- Nếu AI sinh gần đúng nhưng chưa hoàn hảo, analyst có thể sửa SearchPlan.
- Viewer không được edit.
- DSL vẫn read-only.
- SearchPlan sửa tay vẫn đi qua parser/validator/compiler.
- Nếu sửa sai hoặc độc hại thì backend reject.

### Code/UI cần đọc

- `frontend/src/components/soc/query-transparency.tsx`
- `frontend/src/services/search-api.ts`
- `backend/src/main/java/com/soc/ai/search/search/validation/SearchPlanValidator.java`
- `backend/src/main/java/com/soc/ai/search/search/compiler/SearchPlanCompiler.java`

### Câu trả lời mẫu

> Đây là human-in-the-loop. Analyst không cần hiểu DSL, chỉ chỉnh SearchPlan gần ngôn ngữ tự nhiên hơn. Nhưng quyền kiểm soát vẫn nằm ở backend.
