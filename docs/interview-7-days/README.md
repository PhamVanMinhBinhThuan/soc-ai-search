# Lộ Trình Ôn Phỏng Vấn 7 Ngày — SOC AI Search (70% BE/AI/Security • 30% FE)

Bộ giáo án này giúp bạn ôn luyện toàn diện đồ án **SOC AI Search** trong **7 ngày** theo trục **Business Flow → Frontend (React/TS) → API Contract → Backend (Java 21/Spring Boot) → AI Pipeline & Guardrails → Elasticsearch / PostgreSQL / Keycloak → CI/CD**.

- **Tỷ trọng chuyên môn:** **~70% Backend Java, AI Engineering & Security/Guardrails** + **~30% Frontend Engineering** (React Hooks, State/Concurrency, OIDC Token Lifecycle, API Client, Vitest).
- **Tổng ngân hàng Q&A:** **~72 câu hỏi phỏng vấn thực chiến** (mỗi câu có đủ: *Ý cốt lõi cần chạm → Câu trả lời mẫu 30–60s → Câu hỏi xoáy Follow-up*).
- **Tài liệu bổ trợ:** [Chiến thuật tổng thể & Lộ trình nâng cấp](../review/interview-prep-and-roadmap.md) | [Kiến trúc hệ thống](../architecture.md) | [Mô hình bảo mật](../security.md).

---

## 1. Lịch Trình 7 Ngày & Checklist Tiến Độ

Mỗi ngày thiết kế cho **2–3 giờ ôn tập chủ động**. Hãy đánh dấu `[x]` khi bạn có thể **gấp tài liệu lại và tự nói miệng được**.

| Ngày | Tài liệu | Trọng tâm (70% BE/AI/Sec • 30% FE) | Số câu Q&A | Tiến độ |
| :---: | :--- | :--- | :---: | :---: |
| **Ngày 1** | [day-01.md](./day-01.md) | Business Problem, Pitch 2p, Kiến trúc FE/BE, Spring Boot Hardening & Thiết kế ES vs PostgreSQL | 10 | [ ] |
| **Ngày 2** | [day-02.md](./day-02.md) | Core Flow #1: Natural Language Search, `useSearchWorkflow` (`AbortController`) & 5 lớp AI Guardrails → ES DSL | 11 | [ ] |
| **Ngày 3** | [day-03.md](./day-03.md) | Core Flow #2: LLM Clients (`RestClient` timeout/retry), `SummaryTextValidator`, Refine, Follow-up & Editable Plan (`/plan`) | 10 | [ ] |
| **Ngày 4** | [day-04.md](./day-04.md) | Security End-to-End: Keycloak OIDC, FE Single-Flight `401` Refresh, Spring Security RBAC & Bảo vệ `raw` log | 11 | [ ] |
| **Ngày 5** | [day-05.md](./day-05.md) | Dashboard (`Promise.allSettled`), Audit/Transactions (`REQUIRES_NEW`, Sanitizer), Safe Replay CSV Export & Events | 11 | [ ] |
| **Ngày 6** | [day-06.md](./day-06.md) | Logging (`MDC`), Error Handling, Testing (JUnit/JaCoCo + Vitest), CI/CD Caddy & Tech Debt Self-Awareness | 10 | [ ] |
| **Ngày 7** | [day-07.md](./day-07.md) | 3 STAR War Stories (90s), 6 Kịch bản Stress-Test, Mock Interview 60 phút + Rubric & Cheat Sheet 1 trang | 9 (3 STAR + 6 Stress) | [ ] |

---

## 2. Phương Pháp Ôn Chủ Động (2.5 Giờ/Ngày)

Đừng chỉ đọc lướt từ trên xuống dưới. Mỗi ngày hãy chia đúng 4 khung giờ:

1. **20 phút — Nắm Business Flow & Vẽ lại sơ đồ:** Nhìn sơ đồ Mermaid đầu ngày, sau đó tự vẽ lại bằng tay trên giấy mạch đi từ **User Action → FE → API → BE → DB/ES/LLM**.
2. **45 phút — Mở code thật theo Code Walkthrough:** Mở từng file được liệt kê trong bài, đọc đúng các method trọng điểm để mắt quen tên class, tên annotation và cấu trúc dữ liệu thật.
3. **60 phút — Luyện bộ Q&A bằng miệng (Active Recall):** Đọc câu hỏi → **che phần đáp án mẫu** → tự trả lời thành tiếng trong 45–60 giây → mở đối chiếu với mục **Ý cốt lõi** và **Follow-up trap**.
4. **25 phút — Tự kiểm tra cuối ngày (Self-Check):** Hoàn thành danh sách Self-Check ở cuối mỗi bài và ghi chú 1–2 chỗ bạn còn ngập ngừng để ôn lại đầu buổi hôm sau.

---

## 3. End-to-End API & Architecture Trace Matrix

Bảng tra cứu nhanh toàn bộ hệ thống từ màn hình Frontend xuống đến tầng lưu trữ Backend:

| Tính năng / Màn hình | FE Entry (Hook / Service) | HTTP Endpoint | RBAC Tối thiểu (BE) | BE Controller → Service | Data Store / External |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Natural Language Search** | `useSearchWorkflow` → `searchEvents` (`search-api.ts`) | `POST /api/v1/search` | `SOC_VIEWER` | `NaturalLanguageSearchController` → `NaturalLanguageSearchService` | LLM → ES (`soc-events-v1`) → PG (`search_query_logs`) |
| **Dashboard / Edit Plan / Filter & Sort Result** | `SocDashboard` / `QueryTransparency` / `ResultControls` → `executeSearchPlan` / `runSearchPlan` | `POST /api/v1/search/plan` (`?audit=&include_summary=`) | `SOC_VIEWER` | `SearchController` → `SearchPlanExecutor` (+ `ResultSummaryService`, `SearchAuditService`) | ES (`soc-events-v1`) (+ LLM/PG tùy flags) |
| **AI Query Refinement** | `QueryTransparency` → `refineQuery` (`query-refinement-api.ts`) | `POST /api/v1/search/refine` | `SOC_VIEWER` | `QueryRefinementController` → `QueryRefinementService` | LLM (không execute ES, không ghi audit) |
| **AI Follow-up Suggestions** | `FollowUpSuggestions` → `getFollowUpSuggestions` | `POST /api/v1/suggestions/follow-up` | `SOC_VIEWER` | `FollowUpSuggestionController` → `FollowUpSuggestionService` | LLM (không execute ES, ẩn êm khi fail) |
| **Event Detail (raw redaction)** | `useEventDetail` → `getEventDetail` (`search-api.ts`) | `GET /api/v1/events/{event_id}` | `SOC_VIEWER` (`raw` cần `SOC_ANALYST`) | `EventController` → `EventDetailService` | ES (`GET /soc-events-v1/_doc/{id}`) |
| **Event Single / Bulk Ingest** | Seed scripts / Integration API | `POST /api/v1/events`, `POST /api/v1/events/bulk` | `SOC_ADMIN` | `EventController` → `EventIngestService` | ES (`index` / `bulk`, tối đa 1.000/batch) |
| **Personal Investigations (History & Pin)** | `InvestigationsPage` / `HistorySheet` → `history-api.ts` | `GET /api/v1/search/history`, `GET .../{queryId}`, `PATCH .../{queryId}/pin` | `SOC_ANALYST` | `AuditQueryController` → `AuditQueryService` | PG (`search_query_logs`, scoped theo `user_identity`) |
| **System Audit Logs & Export** | `AuditLogsPage` → `getAuditLogs`, `exportAuditLogs` | `GET /api/v1/audit-logs`, `GET /api/v1/audit-logs/export` | `SOC_ADMIN` | `AuditQueryController` → `AuditQueryService` + `AuditCsvWriter` | PG (`search_query_logs`, toàn hệ thống, cap 10.000 dòng) |
| **Safe Replay Search CSV Export** | `useSearchExport` → `exportSearchCsv` (`csv-export-api.ts`) | `GET /api/v1/search/{queryId}/export.csv` | `SOC_ANALYST` | `CsvExportController` → `CsvExportService` → `ExportSearchExecutor` → `CsvRowWriter` | PG (load `SearchPlan`) → ES (replay batch 1.000, cap 10.000) |
| **Auth Introspection** | `OidcAuthBridge` (`auth-context.tsx`) | `GET /api/v1/auth/me` | Authenticated | `AuthController` → `CurrentUserService` | Spring SecurityContext (JWT từ Keycloak) |
| **Health Liveness** | Docker healthcheck / CD script / Caddy smoke | `GET /api/v1/health/live` | Public | `HealthController` | In-process (`{"status":"UP"}`) |

---

## 4. Mẹo Sử Dụng Bộ Tài Liệu Khi Phỏng Vấn Thực Tế

- **Khi bị hỏi tổng quan:** Bắt đầu bằng **Trust Boundary** (Ngày 1), sau đó mới đi vào công nghệ. Đừng chỉ liệt kê tech stack.
- **Khi bị hỏi sâu 1 luồng:** Nói rõ **3 tầng** theo thứ tự `FE chuẩn bị & chặn lỗi gì → BE kiểm soát & xử lý gì → ES/PG lưu và truy vấn gì`.
- **Khi bị hỏi điểm yếu / mở rộng:** Dùng thẳng các **Follow-up trap** (Painless sort → `severity_rank`, `from+size` → `PIT + search_after`, synchronous summary → Async/SSE, thiếu Rate Limit/Observability) để cho thấy tư duy kỹ sư production thực thụ.
