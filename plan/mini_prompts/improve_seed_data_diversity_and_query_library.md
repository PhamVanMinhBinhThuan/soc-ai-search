# Prompt: Improve Synthetic SOC Seed Data Diversity And Align Query Library

## Bối cảnh

Dự án hiện tại là SOC AI Search. Event logs được seed vào Elasticsearch bằng script:

- `scripts/seed-events.ps1`

Query Library và tài liệu câu hỏi demo liên quan nằm ở:

- `frontend/src/lib/query-library.ts`
- `plan/mini_prompts/query_library_questions.md`
- `docs/questions/Q2_synthetic_dataset.md`
- `docs/questions/mini_questions/dataset_mock_info.md`

Hiện tại khi search một số câu hỏi demo, ví dụ:

```text
Show me failed login attempts from China in the last 24h
```

bảng `Event Logs` trả về nhiều dòng quá giống nhau:

- cùng `severity`
- cùng `source`
- cùng `event_type`
- cùng `user`
- cùng `host`
- cùng `ip`
- cùng `country_code`
- cùng `message`
- timestamp chỉ lệch vài giây

Về mặt logic search thì đúng, nhưng khi demo nhìn dữ liệu hơi giả và thiếu tự nhiên.

Mục tiêu của task này là **làm synthetic dataset tự nhiên hơn theo nhiều SOC scenario**, đồng thời **bổ sung/căn chỉnh Query Library** để các câu hỏi demo khai thác đúng các scenario đã seed.

## Nguyên tắc rất quan trọng

Không thay đổi kiến trúc hệ thống.

Không thay đổi các phần sau nếu không thật sự bắt buộc:

- Không đổi schema Elasticsearch hiện tại, trừ khi repo đã có field mới cần seed như `event_id`.
- Không đổi SearchPlan schema.
- Không đổi prompt tạo SearchPlan.
- Không đổi prompt AI Summary.
- Không đổi backend API.
- Không đổi frontend UI.
- Không đổi DSL compiler/validator.

Task này chủ yếu là:

1. Cải thiện logic seed data trong `scripts/seed-events.ps1`.
2. Đảm bảo các câu trong Query Library có dữ liệu đẹp để demo.
3. Cập nhật tài liệu liên quan đến synthetic dataset và query library.
4. Chạy test/validation phù hợp.

## Mục tiêu dữ liệu sau khi cải thiện

Dataset vẫn phải deterministic/stable để demo. Không random quá mạnh làm kết quả mỗi lần seed khác nhau không kiểm soát được.

Nếu script hiện có dùng random, hãy đảm bảo có seed cố định hoặc logic phân bổ có kiểm soát để mỗi lần seed lại vẫn ra dataset cùng tinh thần/cùng phân bố.

Khi search các câu hỏi phổ biến, bảng kết quả phải tự nhiên hơn:

- Có nhiều user khác nhau.
- Có nhiều host khác nhau.
- Có nhiều IP khác nhau.
- Message không bị copy-paste 100%.
- Severity phân bổ hợp lý.
- Timestamp không chỉ lệch vài giây đều đều, mà có campaign/window và background noise.
- Aggregation top N có chênh lệch đẹp.
- Time series có peak/low hợp lý, không quá phẳng.

## Thiết kế scenario diversity

Hãy refactor/extend seed data theo hướng **scenario library**. Không chỉ sửa riêng `failed_login from China`.

Mỗi nhóm scenario nên có:

- weighted users
- weighted hosts
- weighted IPs
- weighted country codes
- message templates
- severity rules
- timestamp campaign windows + jitter

Ví dụ các scenario nên có:

### 1. Failed Login / Brute Force

Event type:

```text
failed_login
```

Nên đa dạng:

- users: `jdoe`, `admin`, `vpn.user`, `finance.user`, `alice`, `bob`, `svc.backup`
- hosts: `vpn-gw-01`, `vpn-gw-02`, `dc-01`, `firewall-edge-01`
- IPs: `203.0.113.45`, `203.0.113.77`, `203.0.113.88`, `198.51.100.200`, `192.0.2.88`
- country_code: ưu tiên `CN`, có thêm `RU`, `VN`, `US`, `SG`
- severity: đa số `medium/high`, một phần nhỏ `critical` khi target là `admin`, `svc.backup`, hoặc IP đáng ngờ

Message templates ví dụ:

```text
Failed login from {country_code} targeting {user}
Possible brute force from {ip} against {user}
Invalid password attempt for {user} via {host}
Repeated authentication failure from {country_code} source {ip}
Suspicious login failure burst against {user} on {host}
```

### 2. Account Lockout

Event type:

```text
account_lockout
```

Nên đa dạng:

- users: `admin`, `vpn.user`, `finance.user`, `jdoe`
- host: `vpn-gw-01`, `dc-01`, `finance-ws-07`
- IP: có IP chính và IP phụ
- country_code: `CN`, `RU`, `VN`
- severity: `medium/high`, `critical` cho admin/service account

Message templates:

```text
Account lockout after repeated failed login attempts for {user}
User {user} locked out after authentication failures from {ip}
Lockout detected on {host} for {user}
```

### 3. Malware Detected

Event type:

```text
malware_detected
```

Nên đa dạng:

- source: `edr`
- hosts: `endpoint-014`, `endpoint-023`, `finance-ws-07`, `srv-app-02`
- users: `alice`, `bob`, `finance.user`, `jdoe`
- severity: `high/critical`
- country_code có thể là `VN`, `US`, `SG`, hoặc null nếu không hợp ngữ cảnh

Message templates:

```text
EDR detected malware family {family} on {host}
Malware quarantine triggered for {host}
Suspicious binary execution detected on {host} by {user}
```

### 4. Firewall Block

Event type:

```text
firewall_block
```

Nên đa dạng:

- source: `firewall`
- hosts: `firewall-edge-01`, `proxy-01`
- IPs/countries: `CN`, `RU`, `US`, `SG`, `DE`
- severity: `low/medium/high`

Message templates:

```text
Firewall blocked connection from {ip} ({country_code})
Inbound connection denied by firewall policy
Blocked suspicious network traffic from {country_code}
```

### 5. Privilege Escalation

Event type:

```text
privilege_escalation
```

Nên đa dạng:

- source: `edr`, `windows-auth`
- users: `admin`, `svc.backup`, `finance.user`, `jdoe`
- hosts: `dc-01`, `srv-app-02`, `endpoint-014`
- severity: `high/critical`

Message templates:

```text
Privilege escalation attempt detected for {user} on {host}
Suspicious admin privilege assignment observed on {host}
User {user} attempted elevated operation on {host}
```

### 6. Suspicious Outbound / Data Exfiltration / Large Transfer

Event types:

```text
suspicious_outbound
data_exfiltration
large_transfer
```

Nên đa dạng:

- source: `proxy`, `firewall`
- users: `finance.user`, `svc.backup`, `alice`
- hosts: `finance-ws-07`, `proxy-01`, `srv-app-02`
- countries: `SG`, `DE`, `US`, `RU`
- severity: `medium/high/critical`

Message templates:

```text
Suspicious outbound connection from {host} to {country_code}
Large transfer detected from {host} by {user}
Potential data exfiltration from {host} to external destination
```

### 7. Normal Noise

Giữ các event bình thường để dataset giống môi trường thật:

```text
successful_login
dns_query
process_start
file_access
```

Nên chiếm tỷ lệ đáng kể để hệ thống có noise, nhưng vẫn đảm bảo scenario demo có đủ dữ liệu.

## Yêu cầu về timestamp

Không nên để các event cùng scenario chỉ lệch nhau vài giây liên tục.

Hãy tạo dữ liệu theo kiểu:

- Một số campaign burst trong 10-30 phút.
- Một số event rải trong 24h/7d/30d.
- Có peak và low để line chart đẹp.
- Với query `last 24h`, phải có dữ liệu gần hiện tại.
- Với query `last 7 days` và `last 30 days`, phải có dữ liệu đủ trải dài.

Ví dụ:

```text
Failed login CN campaign A: last 24h, burst 10-20 phút
Account lockout campaign: last 7d, nhiều cụm nhỏ
Malware campaign: last 7d/30d, rải theo host
Firewall block: nhiều noise xuyên suốt 30d
```

## Yêu cầu về Query Library

Sau khi cải thiện seed, hãy rà soát và cập nhật:

- `frontend/src/lib/query-library.ts`
- `plan/mini_prompts/query_library_questions.md`

Mục tiêu:

1. Các câu hỏi cũ vẫn nên có kết quả.
2. Thêm câu hỏi mới nếu seed mới tạo ra scenario tốt hơn.
3. Câu hỏi phải bám sát dữ liệu đã seed, không thêm câu hỏi không chắc có kết quả.
4. Giữ đủ nhóm query:
   - Search/raw events
   - Count
   - Top N
   - Group by
   - Line chart/time series
   - Bar chart
   - Multi-filter
   - Playbook

Gợi ý câu hỏi nên có:

### Search

```text
Show me failed login attempts from China in the last 24h
Show account lockout events for admin or vpn.user in the last 7 days
Show malware detected events in the last 7 days
Show firewall block events from China in the last 30 days
Show privilege escalation events by admin in the last 30 days
Show suspicious outbound activity for finance.user in the last 30 days
```

### Count

```text
Count failed login events in the last 24h
Count account lockout events in the last 7 days
Count critical events in the last 7 days
Count malware detected events in the last 30 days
```

### Top N / Bar Chart

```text
Show the top 5 source IPs with the most failed login events in the last 24h
Show the top 7 hosts with the most events in the last 30 days
Show top users affected by account lockout in the last 7 days
Show top hosts with malware detections in the last 30 days
```

### Group By

```text
Group failed login events by user in the last 24h
Group events by severity in the last 7 days
Group account lockout events by user in the last 7 days
Group firewall block events by country_code in the last 30 days
```

### Time Series / Line Chart

```text
Show failed login trend by hour in the last 24 hours
Show account lockout trend by hour in the last 7 days
Show events by hour in the last 24h
Show malware detected trend by day in the last 30 days
```

### Multi-filter

```text
Show high or critical failed login events from China in the last 24h
Show failed login events for admin or vpn.user from China in the last 7 days
Show critical malware detected events on endpoint hosts in the last 30 days
```

## Yêu cầu đảm bảo không làm hỏng Mock LLM

Nếu `MockLlmClient.java` có hardcoded patterns cho demo/test, hãy kiểm tra xem các câu mới trong Query Library có cần thêm pattern mock không.

Không bắt buộc support mọi câu mới trong mock provider, nhưng:

- Các câu quan trọng dùng để demo nên chạy tốt với Gemini/Anthropic.
- Nếu project dùng `LLM_PROVIDER=mock` trong test/demo local, hãy cập nhật `MockLlmClient` cho các câu chính để tránh query không ra SearchPlan đúng.
- Không làm test hiện có fail.

## Yêu cầu docs

Cập nhật các file docs liên quan:

- `docs/questions/mini_questions/dataset_mock_info.md`
- `docs/questions/Q2_synthetic_dataset.md` nếu nội dung hiện tại không còn đúng
- `plan/mini_prompts/query_library_questions.md`

Nội dung docs cần nói rõ:

- Synthetic data được seed bằng scenario có kiểm soát.
- Dataset không phải random hoàn toàn.
- Có anchor scenarios để demo ổn định.
- Có noise/normal events để giống SOC thực tế.
- Có diversity trong user/host/IP/message/severity/timestamp.
- Query Library được chọn dựa trên dữ liệu đã seed để demo có kết quả.

## Acceptance Criteria

Sau khi hoàn thành, cần đạt các tiêu chí:

1. Search `Show me failed login attempts from China in the last 24h` không còn trả 10 dòng gần như giống hệt nhau.
2. Event logs có nhiều user/IP/host/message hơn nhưng vẫn giữ đúng intent query.
3. Các câu Query Library chính có kết quả.
4. Top N bar chart nhìn có phân bố tự nhiên, không quá đều.
5. Line chart/time series có peak/low hợp lý.
6. Severity distribution có đủ nhiều mức độ để biểu đồ đẹp.
7. Không đổi SearchPlan schema/prompt/DSL compiler nếu không cần.
8. Không làm hỏng test hiện có.
9. Docs được cập nhật khớp với logic seed mới.

## Validation đề xuất

Chạy các lệnh phù hợp với repo:

```powershell
# Nếu chỉ sửa frontend query library
cd frontend
npm test -- --run
npm run build
```

```powershell
# Nếu sửa backend mock/test liên quan
cd backend
./mvnw test
```

Nếu có script seed local/VPS, hãy ghi rõ cách re-seed sau khi deploy. Ví dụ:

```powershell
pwsh scripts/seed-events.ps1
```

Hoặc nếu script yêu cầu env/API endpoint cụ thể, hãy ghi rõ trong final note.

## Final response mong muốn

Khi hoàn thành, hãy báo cáo:

- Đã sửa file nào.
- Seed data đã đa dạng hơn như thế nào.
- Query Library đã thêm/cập nhật những nhóm câu hỏi nào.
- Có cần re-seed Elasticsearch trên VPS không.
- Đã chạy test/build gì.

