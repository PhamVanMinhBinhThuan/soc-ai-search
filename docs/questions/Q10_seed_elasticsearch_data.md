# Q10 - Seed Dữ Liệu Demo Vào Elasticsearch Như Thế Nào?

## Câu trả lời ngắn

Dữ liệu demo của project là **synthetic SOC events**. Em seed dữ liệu vào Elasticsearch index:

```text
soc-events-v1
```

Quy trình seed gồm 2 bước:

1. Tạo lại Elasticsearch index bằng mapping trong `infra/elasticsearch/soc-events-v1-index.json`.
2. Sinh và bulk index các event giả lập bằng script `scripts/seed-events.ps1`.

---

## File liên quan

```text
infra/elasticsearch/soc-events-v1-index.json
scripts/bootstrap-elasticsearch.ps1
scripts/seed-events.ps1
```

Ý nghĩa:

- `soc-events-v1-index.json`: định nghĩa mapping field như `timestamp`, `source`, `severity`, `event_type`, `user`, `host`, `ip`, `country_code`, `message`, `raw`.
- `bootstrap-elasticsearch.ps1`: đợi Elasticsearch ready và tạo index.
- `seed-events.ps1`: sinh synthetic SOC events và bulk index vào Elasticsearch.

---

## Lệnh seed trên VPS

Vào thư mục project:

```bash
cd ~/soc-ai-search
```

Nếu muốn xóa index cũ để seed lại từ đầu:

```bash
curl -X DELETE http://localhost:9200/soc-events-v1
```

Tạo lại index:

```bash
pwsh ./scripts/bootstrap-elasticsearch.ps1
```

Seed 10,000 events:

```bash
pwsh ./scripts/seed-events.ps1 -Count 10000
```

---

## Lệnh seed trên máy local Windows

Ở root project:

```powershell
.\scripts\bootstrap-elasticsearch.ps1
.\scripts\seed-events.ps1 -Count 10000
```

Nếu muốn xóa index trước:

```powershell
Invoke-RestMethod -Method Delete -Uri http://localhost:9200/soc-events-v1
```

---

## Khi chạy seed sẽ thấy gì?

Ví dụ output:

```text
Seeded 1000/10000 events into soc-events-v1
Seeded 2000/10000 events into soc-events-v1
...
Seeded 10000/10000 events into soc-events-v1

Seed summary
requested_count: 10000
indexed_count: 10000
failed_count: 0
elapsed_ms: 9453
scenario_counters:
  failed_login_cn_24h: 343
  malware_critical: 363
  repeated_attacker_ip_events: 4364
  firewall_block: 976
  privilege_escalation: 608
  account_lockout: 697
  suspicious_outbound: 443
  data_exfiltration: 442
```

Ý nghĩa:

- `requested_count`: số event yêu cầu sinh.
- `indexed_count`: số event đã index thành công vào Elasticsearch.
- `failed_count`: số event index lỗi.
- `elapsed_ms`: thời gian seed.
- `scenario_counters`: số event thuộc các kịch bản demo chính.

Ví dụ:

```text
failed_login_cn_24h: 343
```

nghĩa là có 343 event thuộc kịch bản failed login từ China trong 24h gần nhất.

---

## Dữ liệu seed là dữ liệu gì?

Script sinh synthetic SOC events, không phải dữ liệu thật.

Mỗi event có các field chính:

```text
timestamp
source
severity
event_type
user
host
ip
country_code
message
raw
```

Ví dụ event:

```json
{
  "timestamp": "2026-06-20T08:39:32Z",
  "source": "windows-auth",
  "severity": "high",
  "event_type": "failed_login",
  "user": "admin",
  "host": "vpn-gw-01",
  "ip": "203.0.113.45",
  "country_code": "CN",
  "message": "Possible brute force: failed login from CN targeting admin"
}
```

---

## Vì sao seed theo scenario?

Seed script không chỉ random hoàn toàn. Nó có các scenario cố ý để demo:

- failed login từ China;
- malware critical;
- repeated attacker IP;
- firewall block;
- privilege escalation;
- account lockout;
- suspicious outbound;
- data exfiltration.

Nhờ vậy khi demo các câu hỏi như:

```text
Show me failed login attempts from China in the last 24h
```

hoặc:

```text
Show the top 10 source IPs with the most alerts in the last 30 days
```

hệ thống có dữ liệu để trả kết quả đẹp và ổn định.

---

## Câu trả lời mẫu khi hội đồng hỏi

**Hỏi:** Dữ liệu demo của em lấy từ đâu?

**Trả lời:**

> Dữ liệu demo là synthetic SOC events do script seed sinh ra, không phải dữ liệu thật. Script tạo index `soc-events-v1` trong Elasticsearch theo mapping đã định nghĩa, sau đó sinh các event giả lập như failed login, firewall block, malware, privilege escalation và bulk index vào Elasticsearch.

**Hỏi:** Em seed dữ liệu bằng lệnh gì?

**Trả lời:**

> Trên VPS em vào thư mục project, chạy `pwsh ./scripts/bootstrap-elasticsearch.ps1` để tạo index, sau đó chạy `pwsh ./scripts/seed-events.ps1 -Count 10000` để seed 10,000 SOC events. Nếu muốn seed lại từ đầu thì xóa index cũ bằng `curl -X DELETE http://localhost:9200/soc-events-v1` trước.

**Hỏi:** Vì sao cần seed theo scenario?

**Trả lời:**

> Vì demo cần có dữ liệu phù hợp với các truy vấn SOC phổ biến. Seed script tạo một số scenario có chủ đích như failed login từ China, malware critical, repeated attacker IP, firewall block để khi demo search/aggregation có kết quả rõ ràng.

---

## Một câu cực ngắn để nhớ

> Em tạo index `soc-events-v1` bằng bootstrap script, sau đó dùng `seed-events.ps1` sinh synthetic SOC events và bulk index vào Elasticsearch để phục vụ demo search và aggregation.
