# Query Library Questions For Demo

File này liệt kê các câu hỏi nên dùng cho `Query Library / More Suggestions`.

Các câu hỏi được chọn dựa trên synthetic dataset trong:

- `scripts/seed-events.ps1`
- `backend/src/main/java/com/soc/ai/search/llm/mock/MockLlmClient.java`

Mục tiêu: câu hỏi phải bám sát data đã seed để khi demo có khả năng cao ra kết quả.

## Dataset Notes

Synthetic dataset hiện có các field/event nổi bật:

- `event_type`: `failed_login`, `account_lockout`, `firewall_block`, `malware_detected`, `privilege_escalation`, `suspicious_outbound`, `large_transfer`, `successful_login`, `dns_query`, `process_start`, `file_access`
- `severity`: `critical`, `high`, `medium`, `low`
- `source`: `windows-auth`, `vpn`, `firewall`, `edr`, `proxy`, `dns`
- users hay gặp: `admin`, `vpn.user`, `finance.user`, `svc.backup`, `alice`, `bob`, `analyst1`, `guest01`, `jdoe`
- hosts hay gặp: `vpn-gw-01`, `dc-01`, `finance-ws-07`, `endpoint-014`, `endpoint-023`, `proxy-01`, `dns-01`, `srv-app-02`
- attacker IP hay gặp: `203.0.113.45`, `203.0.113.77`, `198.51.100.200`, `192.0.2.88`
- country nổi bật: `CN`, `VN`, `RU`, `US`, `SG`, `DE`

Lưu ý:

- Nếu đang dùng `LLM_PROVIDER=mock`, chỉ các pattern đã được `MockLlmClient` hỗ trợ chắc chắn trả SearchPlan đúng.
- Nếu dùng Gemini, các câu hỏi dưới đây nên sinh SearchPlan tốt vì prompt đã mô tả schema và field allowlist.

---

## 1. Quick Search - Raw Events

Các câu hỏi này nên trả về bảng raw events.

| Label | Question | Expected |
| --- | --- | --- |
| Failed login from China | `Show me failed login attempts from China in the last 24h` | Raw events: `failed_login`, `country_code=CN` |
| Critical events | `Show critical events in the last 7 days` | Raw events: `severity=critical` |
| Account lockout | `Show account lockout events in the last 7 days` | Raw events: `event_type=account_lockout` |
| Malware detected | `Show malware detected events in the last 7 days` | Raw events: malware-related events |
| Admin failed login | `Show failed login attempts by admin in the last 30 days` | Raw events: `failed_login`, `user=admin` |
| Firewall blocks from China | `Show firewall block events from China in the last 30 days` | Raw events: `firewall_block`, `country_code=CN` |
| Privilege escalation by admin | `Show privilege escalation events by admin in the last 30 days` | Raw events: `privilege_escalation`, `user=admin` |
| EDR events | `Show EDR events in the last 7 days` | Raw events from `source=edr` |
| Windows auth admin | `Show windows-auth events for admin in the last 24h` | Raw events from `source=windows-auth`, `user=admin` |
| Suspicious outbound finance | `Show suspicious outbound activity for finance.user in the last 30 days` | Raw events: proxy/outbound activity |

Recommended tags:

- `SEARCH`
- `RAW EVENTS`
- `AUTH`
- `EDR`
- `FIREWALL`

---

## 2. Count Queries

Các câu hỏi này nên trả về số lượng hoặc aggregation count.

| Label | Question | Expected |
| --- | --- | --- |
| Count critical events | `Count critical events in the last 24h` | Number/count |
| Count failed logins | `Count failed login events in the last 7 days` | Number/count |
| Count account lockouts | `Count account lockout events in the last 7 days` | Number/count |
| Count malware events | `Count malware detected events in the last 30 days` | Number/count |
| Count firewall blocks | `Count firewall block events in the last 30 days` | Number/count |

Recommended tags:

- `COUNT`
- `AGGREGATION`

Ghi chú:

- Nếu Gemini sinh `mode=search` thay vì `mode=aggregation/count`, kết quả vẫn có `total` trên UI.
- Với mock provider, count pattern có thể chưa được hỗ trợ đầy đủ. Nên dùng Gemini để demo nhóm này nếu cần.

---

## 3. Group By / Bar Chart

Các câu hỏi này nên trả về bar chart.

| Label | Question | Expected |
| --- | --- | --- |
| Failed login by user | `Count failed login attempts by user in the last 7 days` | Bar chart by `user` |
| Events by severity | `Group events by severity in the last 24h` | Bar/pie depending UI context |
| Events by event type | `Group events by event type in the last 7 days` | Bar chart by `event_type` |
| Events by country | `Group events by country code in the last 30 days` | Bar chart by `country_code` |
| Events by host | `Group security events by host in the last 30 days` | Bar chart by `host` |
| Account lockout by user | `Group account lockout events by user in the last 7 days` | Bar chart by `user` |
| Malware by host | `Group malware detected events by host in the last 30 days` | Bar chart by `host` |

Recommended tags:

- `GROUP BY`
- `BAR CHART`
- `AGGREGATION`

---

## 4. Top N / Bar Chart

Các câu hỏi này nên trả về top buckets dạng bar chart.

| Label | Question | Expected |
| --- | --- | --- |
| Top 5 source IPs | `Show the top 5 source IPs with the most events in the last 30 days` | Bar chart by `ip` |
| Top 3 source IPs | `Show the top 3 source IPs with the most alerts in the last 12 days` | Bar chart by `ip`, `top_n=3`, `now-12d` |
| Top users | `Show the top 5 users with the most events in the last 30 days` | Bar chart by `user` |
| Top hosts | `Show the top 5 hosts with the most events in the last 30 days` | Bar chart by `host` |
| Top countries | `Show the top 5 countries with the most events in the last 30 days` | Bar chart by `country_code` |
| Top event types | `Show the top 5 event types in the last 30 days` | Bar chart by `event_type` |

Recommended tags:

- `TOP N`
- `BAR CHART`
- `AGGREGATION`

Demo-safe note:

- Dataset hiện có khoảng 9 IP thường gặp, nên `Top 5` nhìn gọn hơn `Top 10`.

---

## 5. Time Series / Line Chart

Các câu hỏi này nên trả về line chart.

| Label | Question | Expected |
| --- | --- | --- |
| Events by hour | `Show events by hour in the last 24h` | Line chart by hour |
| Failed login trend | `Show failed login trend by hour in the last 24h` | Line chart with `failed_login` filter |
| Critical trend | `Show critical event trend by hour in the last 24h` | Line chart with `severity=critical` |
| Firewall trend | `Show firewall block trend by hour in the last 24h` | Line chart with `event_type=firewall_block` |
| Malware trend | `Show malware detected events by hour in the last 24h` | Line chart with `event_type=malware_detected` |
| 12 hour events | `Show events by hour in the last 12 hours` | Line chart, `now-12h` |
| 36 hour events | `Show events by hour in the last 36 hours` | Line chart, `now-36h` |

Recommended tags:

- `LINE CHART`
- `TIME SERIES`
- `DATE HISTOGRAM`

Demo note:

- Nếu chart có đoạn 0 ở cuối, đó là do seed data bám theo thời điểm seed và `extended_bounds` giữ đủ trục thời gian 24h.

---

## 6. SOC Playbooks

Các câu hỏi này dùng như kịch bản điều tra, không nhất thiết chỉ là một filter đơn giản.

| Label | Question | Expected |
| --- | --- | --- |
| Brute force investigation | `Investigate possible brute force activity from China in the last 24h` | Failed login/account lockout related results |
| Privilege escalation investigation | `Investigate privilege escalation activity by admin in the last 30 days` | Privilege escalation raw events |
| Malware investigation | `Investigate malware detected by EDR in the last 7 days` | EDR/malware raw events |
| Data exfiltration investigation | `Investigate suspicious outbound and large transfer activity from finance.user in the last 30 days` | Proxy/exfiltration related raw events |
| Firewall investigation | `Investigate firewall blocks from suspicious source IPs in the last 30 days` | Firewall block raw events |
| Account lockout investigation | `Investigate account lockouts after failed logins in the last 7 days` | Account lockout events |

Recommended tags:

- `PLAYBOOK`
- `INVESTIGATION`
- `SEARCH`

Ghi chú:

- Playbook static chỉ là câu hỏi mẫu. Khi user chọn, backend vẫn gọi pipeline NL -> SearchPlan -> Validator -> DSL.
- Không nên nói đây là rule correlation hoàn chỉnh. Đây là thư viện điểm bắt đầu điều tra.

---

## 7. Vietnamese Demo Questions

Một số câu tiếng Việt nên giữ để demo khả năng hỏi bằng tiếng Việt.

| Label | Question | Expected |
| --- | --- | --- |
| Event theo giờ | `Số event theo giờ trong 24h qua` | Line chart |
| Top IP | `Top 5 IP có nhiều event nhất tháng này` | Bar chart by IP |
| Account lockout | `Tìm account lockout trong 7 ngày qua` | Raw events |
| Critical events | `Tìm sự kiện critical trong 7 ngày qua` | Raw events |
| Failed login by user | `Đếm số lần login thất bại theo từng user trong 7 ngày qua` | Bar chart by user |

Ghi chú:

- Gemini thường hiểu tiếng Việt tốt hơn mock provider.
- Nếu dùng mock provider, nên ưu tiên các câu tiếng Việt đã được mock support hoặc các câu suggested hiện tại.

---

## 8. Recommended Default Query Library Set

Nếu chỉ muốn đưa vào modal khoảng 20 câu đầu tiên, chọn bộ này:

1. `Show me failed login attempts from China in the last 24h`
2. `Show critical events in the last 7 days`
3. `Show account lockout events in the last 7 days`
4. `Show malware detected events in the last 7 days`
5. `Show failed login attempts by admin in the last 30 days`
6. `Show firewall block events from China in the last 30 days`
7. `Show privilege escalation events by admin in the last 30 days`
8. `Count critical events in the last 24h`
9. `Count failed login events in the last 7 days`
10. `Count failed login attempts by user in the last 7 days`
11. `Group events by severity in the last 24h`
12. `Group events by event type in the last 7 days`
13. `Show the top 5 source IPs with the most events in the last 30 days`
14. `Show the top 5 users with the most events in the last 30 days`
15. `Show events by hour in the last 24h`
16. `Show failed login trend by hour in the last 24h`
17. `Show critical event trend by hour in the last 24h`
18. `Investigate possible brute force activity from China in the last 24h`
19. `Investigate suspicious outbound and large transfer activity from finance.user in the last 30 days`
20. `Top 5 IP có nhiều event nhất tháng này`
21. `Find failed login events for admin or vpn.user in the last 24 hours`
22. `Show failed login events for admin or finance.user from China in the last 24 hours`
23. `Show account lockout events for admin or vpn.user in the last 7 days`
24. `Show windows-auth or vpn events in the last 24 hours`
25. `Show malware detected events on endpoint-014 or endpoint-023 in the last 30 days`
26. `Find activity from IP 203.0.113.45 or 198.51.100.200 in the last 30 days`
27. `Group failed login events by user in the last 7 days`
28. `Show failed login trend by hour in the last 24 hours`
29. `Group windows-auth or vpn events by event type in the last 24 hours`
30. `Show the top 5 users from IP 203.0.113.45 or 198.51.100.200 in the last 30 days`
31. `Count events from host vpn-gw-01 or dc-01 in the last 24 hours`
32. `Show failed login trend by hour for admin or vpn.user in the last 24 hours`

## 9. Multi-value Entity Filter Demo Set

Các câu hỏi dưới đây dùng để test chức năng `source`, `user`, `host`, `ip` nhận nhiều giá trị. Nên đưa một vài câu vào popup `Show more suggestions` để mentor thấy hệ thống không chỉ filter một giá trị đơn.

| Category | Question | Expected SearchPlan / UI result |
| --- | --- | --- |
| Multi-user search | `Find failed login events for admin or vpn.user in the last 24 hours` | `event_type=["failed_login"]`, `user=["admin","vpn.user"]`, raw event table |
| Multi-user + country | `Show failed login events for admin or finance.user from China in the last 24 hours` | `event_type=["failed_login"]`, `user=["admin","finance.user"]`, `country_code=["CN"]` |
| Multi-user account lockout | `Show account lockout events for admin or vpn.user in the last 7 days` | `event_type=["account_lockout"]`, `user=["admin","vpn.user"]` |
| Multi-source search | `Show windows-auth or vpn events in the last 24 hours` | `source=["windows-auth","vpn"]` |
| Multi-host search | `Show events from host vpn-gw-01 or dc-01 in the last 24 hours` | `host=["vpn-gw-01","dc-01"]` |
| Multi-IP search | `Find activity from IP 203.0.113.45 or 198.51.100.200 in the last 30 days` | `ip=["203.0.113.45","198.51.100.200"]` |
| EDR malware endpoints | `Show malware detected events on endpoint-014 or endpoint-023 in the last 30 days` | `event_type=["malware_detected"]`, `host=["endpoint-014","endpoint-023"]` |
| SOC source comparison | `Show EDR or proxy events in the last 30 days` | `source=["edr","proxy"]` |

## 10. Chart / Diagram Query Set

Các câu hỏi này nên đưa vào Query Library popup theo category để người dùng chọn nhanh khi muốn xem biểu đồ. Tất cả đều bám vào synthetic dataset hiện tại.

### Group by - bar chart

| Category | Question | Expected |
| --- | --- | --- |
| Severity distribution | `Group events by severity in the last 24 hours` | Bar chart by `severity` |
| Event type distribution | `Group events by event type in the last 7 days` | Bar chart by `event_type` |
| Failed login by user | `Group failed login events by user in the last 7 days` | Bar chart by `user` |
| Events by source | `Group events by source in the last 7 days` | Bar chart by `source` |
| China events by type | `Group China events by event type in the last 24 hours` | Bar chart by `event_type`, filtered `CN` |
| Malware by host | `Group malware detected events by host in the last 30 days` | Bar chart by `host` |

### Top N - ranked bar chart

| Category | Question | Expected |
| --- | --- | --- |
| Top source IPs | `Show the top 5 source IPs with the most events in the last 30 days` | Top 5 bar chart by `ip` |
| Top users | `Show the top 5 users with the most events in the last 30 days` | Top 5 bar chart by `user` |
| Top hosts | `Show the top 5 hosts with the most events in the last 30 days` | Top 5 bar chart by `host` |
| Top event types from China | `Show the top 5 event types from China in the last 24 hours` | Top 5 bar chart by `event_type` |
| Top failed-login IPs | `Show the top 5 source IPs for failed login events in the last 7 days` | Top 5 bar chart by `ip`, filtered `failed_login` |

### Count - KPI / number result

| Category | Question | Expected |
| --- | --- | --- |
| Count all events | `Count all events in the last 24 hours` | Count result |
| Count critical events | `Count critical events in the last 24 hours` | Count filtered by `critical` |
| Count failed logins | `Count failed login events in the last 7 days` | Count filtered by `failed_login` |
| Count China events | `Count events from China in the last 24 hours` | Count filtered by `CN` |
| Count account lockouts | `Count account lockout events in the last 7 days` | Count filtered by `account_lockout` |

### Time series - line chart

| Category | Question | Expected |
| --- | --- | --- |
| Events by hour | `Show events by hour in the last 24 hours` | Line chart |
| Failed login trend | `Show failed login trend by hour in the last 24 hours` | Line chart filtered by `failed_login` |
| Critical trend | `Show critical event trend by hour in the last 24 hours` | Line chart filtered by `critical` |
| Multi-user failed-login trend | `Show failed login trend by hour for admin or vpn.user in the last 24 hours` | Line chart with `user=["admin","vpn.user"]` |

### Multi-filter chart questions

| Category | Question | Expected |
| --- | --- | --- |
| Multi-user top IP | `Group failed login events for admin or vpn.user by source IP in the last 24 hours` | Bar chart by `ip`, filtered by two users |
| Multi-source group by type | `Group windows-auth or vpn events by event type in the last 24 hours` | Bar chart by `event_type`, filtered by two sources |
| Multi-IP top users | `Show the top 5 users from IP 203.0.113.45 or 198.51.100.200 in the last 30 days` | Top 5 users from two IPs |
| Multi-host count | `Count events from host vpn-gw-01 or dc-01 in the last 24 hours` | Count with two hosts |
| Multi-source count | `Count EDR or proxy events in the last 30 days` | Count with two sources |

Recommended tags:

- `MULTI-FILTER`
- `SEARCH`
- `ENTITY`
- `GROUP_BY`
- `TOP_N`
- `COUNT`
- `LINE_CHART`

Ghi chú demo:

- Trong cùng một field, nhiều giá trị là OR, ví dụ `admin OR vpn.user`.
- Giữa các field khác nhau vẫn là AND, ví dụ `failed_login AND (admin OR vpn.user)`.
- `message_query` vẫn là một chuỗi đơn, không dùng để demo multi-value ở task này.

## 11. Demo Tips

- Dùng `Top 5` thay vì `Top 10` vì dataset có số IP hữu hạn, chart nhìn gọn hơn.
- Dùng `last 24h`, `last 7 days`, `last 30 days` để bám sát seed.
- Với câu line chart, ưu tiên `events by hour in the last 24h`.
- Với câu search raw events, ưu tiên:
  - failed login + CN;
  - account lockout;
  - privilege escalation + admin;
  - malware + EDR;
  - suspicious outbound + finance.user.

## 12. Câu trả lời khi hội đồng hỏi

**Query Library có phải LLM sinh không?**

> Không. Query Library là thư viện câu hỏi/playbook tĩnh để analyst có điểm bắt đầu điều tra. Khi chọn query, hệ thống vẫn chạy qua pipeline LLM -> SearchPlan -> Validator -> DSL như câu hỏi bình thường.

**Tại sao không để LLM tự gợi ý?**

> Có thể mở rộng sau. Trong bản hiện tại, static library ổn định hơn cho demo, không tốn token, không phụ thuộc mạng và tránh gợi ý ra câu không phù hợp dataset.

**Nếu câu hỏi trong library không có kết quả thì sao?**

> UI vẫn xử lý empty state. Tuy nhiên các câu trong library được chọn dựa trên synthetic dataset nên khi seed đúng sẽ có khả năng cao ra kết quả.
