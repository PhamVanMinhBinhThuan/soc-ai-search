# Synthetic Dataset Mock Info

File này tóm tắt dữ liệu mock đang dùng cho SOC AI Search để chuẩn bị demo và vấn đáp. Trọng tâm là: hệ thống có những event nào, user/host/IP/country nào, và nên hỏi những câu gì để chắc có dữ liệu.

## 1. Dữ liệu được seed ở đâu?

Event logs không hardcode trong backend. Dữ liệu được sinh bằng script:

```text
scripts/seed-events.ps1
```

Sau đó script seed dữ liệu vào Elasticsearch index:

```text
soc-events-v1
```

Script hỗ trợ:

- Seed trực tiếp vào Elasticsearch.
- Generate-only ra NDJSON.
- Chọn số lượng event bằng `-Count`.
- Chọn thời gian gốc bằng `-BaseTimeUtc`.
- Chọn seed random cố định bằng `-Seed`.

Ví dụ:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/seed-events.ps1 `
  -Count 10000 `
  -ElasticsearchUrl http://localhost:9200 `
  -Index soc-events-v1
```

## 2. Schema event hiện tại

Mỗi event có các field chính:

| Field | Ý nghĩa | Ví dụ |
| --- | --- | --- |
| `event_id` | UUID nghiệp vụ của event, cũng được dùng làm Elasticsearch `_id` khi seed | `35ab6ceb-5666-4469-967d-39abf5925ee0` |
| `timestamp` | Thời điểm event xảy ra | `2026-07-09T23:19:00Z` |
| `source` | Nguồn log | `windows-auth`, `vpn`, `firewall`, `edr`, `proxy`, `dns` |
| `severity` | Mức độ nghiêm trọng | `low`, `medium`, `high`, `critical` |
| `event_type` | Loại event | `failed_login`, `account_lockout`, `malware_detected` |
| `user` | User liên quan | `admin`, `vpn.user`, `finance.user` |
| `host` | Máy/chủ thể liên quan | `vpn-gw-01`, `dc-01`, `endpoint-014` |
| `ip` | IP nguồn hoặc IP liên quan | `203.0.113.45`, `10.10.1.15` |
| `country_code` | Mã quốc gia | `CN`, `VN`, `RU`, `US`, `SG`, `DE` |
| `message` | Mô tả event, dùng cho full-text search | `Possible brute force from 203.0.113.45 against admin` |
| `raw` | Raw log mô phỏng, chỉ analyst/admin xem đầy đủ | `ts=... source=... synthetic=true` |

## 3. Các giá trị mock quan trọng

### Users

| Nhóm | Giá trị |
| --- | --- |
| Privileged/service | `admin`, `svc.backup` |
| VPN/finance | `vpn.user`, `finance.user` |
| Normal users | `alice`, `bob`, `jdoe`, `analyst1`, `guest01` |
| Unknown actor | `unknown` |

### Hosts

| Nhóm | Giá trị |
| --- | --- |
| Identity/VPN | `dc-01`, `vpn-gw-01`, `vpn-gw-02` |
| Endpoints | `endpoint-014`, `endpoint-023`, `finance-ws-07` |
| Network/services | `firewall-edge-01`, `proxy-01`, `dns-01`, `srv-app-02` |

### IPs

| Nhóm | Giá trị | Ghi chú |
| --- | --- | --- |
| Suspicious external | `203.0.113.45`, `203.0.113.77`, `203.0.113.88`, `198.51.100.200`, `192.0.2.88` | Dùng cho failed login, firewall block, outbound |
| Internal/normal | `10.10.1.15`, `10.10.2.24`, `10.20.5.33`, `172.16.10.42`, `192.168.20.55` | Dùng cho event nội bộ/normal |

### Countries

| Country code | Ý nghĩa demo |
| --- | --- |
| `CN` | China, thường dùng trong failed login/brute force/firewall block |
| `RU` | Dùng cho suspicious outbound/data exfiltration/firewall block |
| `VN` | Nội bộ hoặc user activity bình thường |
| `US`, `SG`, `DE` | Noise hoặc outbound/firewall scenario |

## 4. Event types hiện có

| Event type | Có dữ liệu không? | Nên demo bằng |
| --- | :---: | --- |
| `failed_login` | Có nhiều | Search, multi-filter, top IP, group by user, line chart |
| `account_lockout` | Có | Search, top users, trend by hour |
| `firewall_block` | Có | Search by China, group by country, top IP |
| `malware_detected` | Có | Search, top hosts, trend by day/hour |
| `privilege_escalation` | Có | Search by admin, critical/high events |
| `suspicious_outbound` | Có | Search finance.user, playbook data exfil |
| `large_transfer` | Có | Search/playbook outbound |
| `data_exfiltration` | Có | Search/playbook outbound |
| `successful_login` | Có | Normal noise |
| `dns_query` | Có | Normal noise |
| `process_start` | Có | Normal/EDR noise |
| `file_access` | Có | Normal noise |

## 5. Seed scenario chính

Dataset không random hoàn toàn. Script dùng các SOC scenario có kiểm soát để demo ổn định.

| Scenario | Dữ liệu được mock như thế nào | Câu hỏi nên dùng |
| --- | --- | --- |
| Failed login / brute force | Nhiều user, host, IP, message, severity; ưu tiên `country_code=CN` | `Show me failed login attempts from China in the last 24h` |
| Account lockout | `admin`, `vpn.user`, `finance.user`, `jdoe`; nhiều host/IP | `Show account lockout events for admin or vpn.user in the last 7 days` |
| Malware detected | Nhiều endpoint, user, malware family; source `edr` | `Show malware detected events in the last 7 days` |
| Firewall block | Nhiều IP/country, source `firewall` | `Show firewall block events from China in the last 30 days` |
| Privilege escalation | `admin`, `svc.backup`, `finance.user`; host `dc-01`, `srv-app-02` | `Show privilege escalation events by admin in the last 30 days` |
| Suspicious outbound / exfiltration | `finance.user`, `svc.backup`, `proxy`, `large_transfer`, `data_exfiltration` | `Show suspicious outbound activity for finance.user in the last 30 days` |
| Normal noise | `successful_login`, `dns_query`, `process_start`, `file_access` | Dùng để dashboard/aggregation có dữ liệu nền |

## 6. Vì sao dữ liệu sau khi seed tự nhiên hơn?

Trước đây một số query có thể trả về nhiều dòng gần giống hệt nhau. Hiện tại seed script đã đa dạng hơn:

- Failed login từ China không chỉ có một user, một host, một IP.
- Message có nhiều template khác nhau.
- Severity phân bổ `medium/high/critical` theo rule.
- Timestamp có các campaign burst và background noise.
- Top N có phân bố tự nhiên hơn.
- Line chart có peak/low thay vì quá phẳng.

Ví dụ cùng query:

```text
Show me failed login attempts from China in the last 24h
```

kết quả có thể gồm:

| User | Host | IP | Severity | Message style |
| --- | --- | --- | --- | --- |
| `admin` | `firewall-edge-01` | `203.0.113.88` | `high` | Invalid password attempt |
| `vpn.user` | `dc-01` | `203.0.113.45` | `high` | Failed login from CN |
| `jdoe` | `vpn-gw-02` | `203.0.113.45` | `critical` | Suspicious login burst |
| `finance.user` | `vpn-gw-01` | `192.0.2.88` | `medium` | Possible brute force |

## 7. Câu hỏi demo nên dùng

### Search / raw events

```text
Show me failed login attempts from China in the last 24h
Show high or critical failed login events from China in the last 24h
Show account lockout events for admin or vpn.user in the last 7 days
Show malware detected events in the last 7 days
Show firewall block events from China in the last 30 days
Show privilege escalation events by admin in the last 30 days
Show suspicious outbound activity for finance.user in the last 30 days
Show large transfer events for finance.user in the last 30 days
Show data exfiltration events in the last 30 days
Show DNS query events in the last 24 hours
Show process start events from EDR in the last 7 days
```

### Count

```text
Count failed login events in the last 24h
Count account lockout events in the last 7 days
Count critical events in the last 7 days
Count malware detected events in the last 30 days
Count large transfer events in the last 30 days
Count successful login events in the last 24 hours
```

### Top N / bar chart

```text
Show the top 5 source IPs with the most failed login events in the last 24h
Show top users affected by account lockout in the last 7 days
Show top hosts with malware detections in the last 30 days
Show the top 7 hosts with the most events in the last 30 days
Show top countries for suspicious outbound activity in the last 30 days
Show top users with large transfer events in the last 30 days
```

### Group by

```text
Group failed login events by user in the last 24h
Group events by severity in the last 7 days
Group account lockout events by user in the last 7 days
Group firewall block events by country_code in the last 30 days
Group suspicious outbound events by country code in the last 30 days
Group large transfer events by user in the last 30 days
```

### Line chart / time series

```text
Show failed login trend by hour in the last 24 hours
Show account lockout trend by hour in the last 7 days
Show malware detected trend by day in the last 30 days
Show suspicious outbound trend by day in the last 30 days
Show process start trend by hour in the last 24 hours
Show events by hour in the last 24h
```

## 8. Nếu hội đồng hỏi "dữ liệu có cái này không?"

Trả lời theo checklist:

- Nếu hỏi login/authentication: có `failed_login`, `successful_login`, `account_lockout`, source `windows-auth`, `vpn`.
- Nếu hỏi malware/endpoint: có `malware_detected`, `process_start`, `file_access`, source `edr`.
- Nếu hỏi network/firewall: có `firewall_block`, `suspicious_outbound`, `large_transfer`, `data_exfiltration`, source `firewall`, `proxy`.
- Nếu hỏi user cụ thể: nên dùng `admin`, `vpn.user`, `finance.user`, `jdoe`, `alice`, `bob`.
- Nếu hỏi host cụ thể: nên dùng `vpn-gw-01`, `dc-01`, `finance-ws-07`, `endpoint-014`, `endpoint-023`.
- Nếu hỏi country: nên dùng `CN`, `RU`, `VN`, `US`, `SG`, `DE`; demo đẹp nhất là `CN`.
- Nếu hỏi IP: nên dùng `203.0.113.45`, `203.0.113.77`, `203.0.113.88`, `198.51.100.200`, `192.0.2.88`.

## 9. Câu trả lời ngắn khi bảo vệ

> Dữ liệu trong hệ thống là synthetic dataset được seed vào Elasticsearch bằng script riêng, không hardcode trong backend. Em thiết kế dữ liệu theo các SOC scenario có kiểm soát như brute force, account lockout, malware, firewall block, privilege escalation và suspicious outbound. Trong mỗi scenario, dữ liệu được đa dạng hóa theo user, host, IP, country, severity, message và timestamp để demo search/aggregation tự nhiên hơn, nhưng vẫn deterministic để kết quả bảo vệ ổn định.
