# Day 12 Demo Checklist - SOC AI Search MVP

Tài liệu này dùng để kiểm tra nhanh bản demo trước khi review với mentor hoặc hội đồng. Credential demo được gửi riêng, không lưu trong repository.

## 1. Thông tin demo public

| Hạng mục | Giá trị |
| --- | --- |
| Frontend | `https://soc-ai-search.app` |
| Backend health | `https://api.soc-ai-search.app/api/v1/health/live` |
| Swagger/OpenAPI | `https://api.soc-ai-search.app/swagger-ui.html` |
| Keycloak | `https://auth.soc-ai-search.app` |
| Dataset tối thiểu | `10.000` event synthetic trong Elasticsearch index `soc-events-v1` |

## 2. Tài khoản và role cần chuẩn bị

Credential demo gửi riêng cho mentor/hội đồng.

| Role | Mục đích demo |
| --- | --- |
| `SOC_VIEWER` | Chứng minh user chỉ xem/search, bị khóa export và audit |
| `SOC_ANALYST` | Chạy search, xem event detail/raw log, export CSV |
| `SOC_ADMIN` | Kiểm tra audit log và quyền cao nhất |

Checklist tài khoản:

- [ ] Có ít nhất một user `SOC_VIEWER`.
- [ ] Có ít nhất một user `SOC_ANALYST`.
- [ ] Có ít nhất một user `SOC_ADMIN`.
- [ ] User đã verified/enabled trong Keycloak.
- [ ] Realm roles đã nằm trong token sau khi login lại.

## 3. Câu hỏi demo bắt buộc

### Search tiếng Anh

```text
Show me failed login attempts from China in the last 24h
```

Kỳ vọng:

- [ ] `mode = search`.
- [ ] Có `search_plan` dạng JSON object.
- [ ] Có `generated_dsl` dạng JSON object, không phải JSON string escaped.
- [ ] `generated_dsl` có filter `event_type = failed_login`, `country_code = CN`, time range `now-24h`.
- [ ] Nếu có result, event đầu tiên có `event_id` không rỗng.

### Search tiếng Việt

```text
Tìm alert critical trong 7 ngày qua
```

Kỳ vọng:

- [ ] `mode = search`.
- [ ] Filter severity `critical`.
- [ ] Có summary hoặc fallback summary.

### Aggregation group_by

```text
Đếm số lần login thất bại theo từng user trong 7 ngày qua
```

Kỳ vọng:

- [ ] `mode = aggregation`.
- [ ] `aggregation_type = group_by`.
- [ ] `search_plan.aggregation.field = user`.
- [ ] `search_plan.aggregation.top_n = 10`.
- [ ] `chart_metadata.chart_type = BAR`.
- [ ] `aggregation_results` tồn tại.

### Aggregation top_n

```text
Top 10 IP có nhiều alert nhất tháng này
```

Kỳ vọng:

- [ ] `mode = aggregation`.
- [ ] `aggregation_type = top_n`.
- [ ] Field aggregation là `ip`.
- [ ] Số bucket không vượt quá `10`.

### Aggregation date_histogram

```text
Số event theo giờ trong 24h qua
```

Kỳ vọng:

- [ ] `mode = aggregation`.
- [ ] `aggregation_type = date_histogram`.
- [ ] `generated_dsl` dùng `fixed_interval = 1h`.
- [ ] `chart_metadata.chart_type = LINE`.

## 4. UI checklist

- [ ] Search box nhập câu hỏi và chạy được bằng nút Search.
- [ ] Suggested queries chạy được.
- [ ] Pipeline/inspection panel thể hiện Question -> SearchPlan -> Validation -> DSL -> Results.
- [ ] SearchPlan hiển thị rõ ở UI.
- [ ] Generated DSL hiển thị rõ ở UI.
- [ ] Search mode tự mở tab Raw Events.
- [ ] Aggregation mode tự mở tab Analytics View.
- [ ] Aggregation chart và summary table dùng cùng `aggregation_results`.
- [ ] Summary hiển thị rõ `summary_source` nếu UI có badge.
- [ ] Recent Investigations mở được.
- [ ] Run Again từ history chạy lại query.

## 5. Event detail và raw log

Dùng user `SOC_ANALYST` hoặc `SOC_ADMIN`:

- [ ] Chạy search có result.
- [ ] Click event row hoặc View.
- [ ] Drawer mở event detail.
- [ ] Formatted fields có timestamp/source/severity/event_type/user/host/ip/country_code/message.
- [ ] Raw log hiển thị trong tab Raw Log.
- [ ] `event_id` trong UI map từ Elasticsearch `_id`.

## 6. RBAC checklist

### Viewer

- [ ] Login bằng `SOC_VIEWER`.
- [ ] Có thể xem dashboard và chạy search nếu policy hiện tại cho phép viewer search.
- [ ] Export CSV bị khóa hoặc bị backend trả 403.
- [ ] Audit log bị khóa hoặc backend trả 403.
- [ ] Nếu UI khóa raw/event detail theo policy demo, viewer không mở được raw log. Nếu hiện policy cho viewer xem detail, cần nói rõ với mentor rằng backend đang cho viewer read-only detail và chỉ khóa export/audit.

### Analyst

- [ ] Login bằng `SOC_ANALYST`.
- [ ] Export CSV chạy được với query có `query_id`.
- [ ] File CSV tải về có header đúng.
- [ ] Nếu kết quả vượt 10.000 row, UI cảnh báo `X-Export-Truncated`.

### Admin

- [ ] Login bằng `SOC_ADMIN`.
- [ ] Mở audit log được.
- [ ] Có thể thấy query gần đây, status, mode, result count, latency.

## 7. Summary best-effort/fallback

- [ ] Khi Gemini hoạt động, summary có nội dung 3-5 câu hoặc ngắn gọn hợp lý.
- [ ] Nếu Gemini timeout/lỗi, search result vẫn trả về.
- [ ] Response/UI có fallback summary deterministic.
- [ ] Có thể giải thích với mentor: summary là enhancement, không phải dependency bắt buộc của search.

Fallback nhanh nếu Gemini lỗi trên local/dev:

```env
LLM_PROVIDER=mock
LLM_API_KEY=
```

Sau khi đổi `.env`, restart backend/container tương ứng. Với production demo, API key thật chỉ nằm trên VPS `.env`, không commit Git.

## 8. Swagger/OpenAPI checklist

Nếu cần demo API trực tiếp:

- [ ] Mở `https://api.soc-ai-search.app/swagger-ui.html`.
- [ ] Kiểm tra endpoint `POST /api/v1/search`.
- [ ] Kiểm tra endpoint `POST /api/v1/search/plan`.
- [ ] Kiểm tra endpoint `GET /api/v1/events/{event_id}`.
- [ ] Kiểm tra endpoint `GET /api/v1/search/history`.
- [ ] Kiểm tra endpoint `GET /api/v1/audit-logs`.
- [ ] Kiểm tra endpoint `GET /api/v1/search/{query_id}/export.csv`.

## 9. Vận hành nhanh trên VPS

SSH vào VPS:

```bash
ssh root@178.128.111.251
cd ~/soc-ai-search
```

Xem container status:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy ps
```

Xem logs:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy logs --tail=120 backend
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy logs --tail=120 caddy
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy logs --tail=120 keycloak
```

Deploy lại bằng command SSH nếu không dùng GitHub Actions:

```bash
git fetch --prune origin main
git reset --hard origin/main
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy config --quiet
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy up -d --build
```

Rollback bằng commit SHA hoặc reflog:

```bash
git reflog --date=iso
git reset --hard <previous_commit_sha>
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy up -d --build
```

Không dùng lệnh sau trừ khi chủ ý xóa dữ liệu:

```bash
docker compose down -v
```

## 10. Smoke checklist

Local regression:

```powershell
.\scripts\smoke-test-day-10-regression.ps1
```

Public domain smoke:

```powershell
.\scripts\smoke-test-day-11-domain.ps1
```

Kỳ vọng Day 11 domain smoke:

- [ ] Frontend HTTPS trả 2xx.
- [ ] Backend health HTTPS trả 2xx.
- [ ] Keycloak OIDC configuration HTTPS trả 2xx.
- [ ] CORS preflight tới `POST /api/v1/search` trả 2xx.
- [ ] Các port `3000`, `8081`, `8082`, `9200`, `5433`, `5601` không public.

## 11. Checklist trước khi mentor vào xem

- [ ] `https://soc-ai-search.app` mở được.
- [ ] Login analyst được.
- [ ] Search tiếng Anh chạy được.
- [ ] Search tiếng Việt chạy được.
- [ ] Aggregation chạy được.
- [ ] SearchPlan và Generated DSL hiển thị được.
- [ ] Event detail/raw log mở được.
- [ ] CSV export analyst chạy được.
- [ ] Viewer bị khóa export/audit.
- [ ] Admin audit log mở được.
- [ ] README/docs không chứa credential thật.
- [ ] Có sẵn plan nói nếu Gemini lỗi thì dùng mock/fallback.