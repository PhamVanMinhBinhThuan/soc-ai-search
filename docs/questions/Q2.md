# Q2 - Mock data, Mock LLM và schema event

## Câu hỏi chính

**Hiện tại hệ thống đang mock data ở đâu? Mock LLM ở đâu? Dữ liệu demo có những loại event nào và schema event gồm những field gì?**

## Câu trả lời ngắn

Trong project có hai khái niệm mock khác nhau:

1. **Mock data / synthetic events** là dữ liệu log giả lập được sinh bởi script PowerShell rồi seed vào Elasticsearch.
   - File chính: `scripts/seed-events.ps1`
   - Mapping index: `infra/elasticsearch/soc-events-v1-index.json`

2. **Mock LLM** là provider giả lập LLM, dùng để map một số câu hỏi demo thành `SearchPlan` JSON deterministic.
   - File chính: `backend/src/main/java/com/soc/ai/search/llm/mock/MockLlmClient.java`

Nói với hội đồng:

> Dữ liệu log demo không hardcode trong backend. Nó được sinh bằng script seed rồi index vào Elasticsearch. Mock LLM chỉ dùng để test/demo không cần API key, nó nhận câu hỏi tự nhiên và trả về `SearchPlan` JSON theo rule cố định.

## Schema event đang dùng

Elasticsearch index `soc-events-v1` có mapping cố định:

| Field | Type | Ý nghĩa |
| --- | --- | --- |
| `timestamp` | `date` | Thời điểm event |
| `source` | `keyword` | Nguồn log, ví dụ `windows-auth`, `edr`, `firewall` |
| `severity` | `keyword` | Mức độ: `low`, `medium`, `high`, `critical` |
| `event_type` | `keyword` | Loại event, ví dụ `failed_login`, `malware_detected` |
| `user` | `keyword` | User liên quan |
| `host` | `keyword` | Host liên quan |
| `ip` | `ip` | IP liên quan |
| `country_code` | `keyword` | Mã quốc gia: `VN`, `CN`, `US`, `RU`, `SG`, `DE` |
| `message` | `text` | Message để full-text search |
| `raw` | `text`, `index: false` | Raw log chỉ để xem chi tiết, không dùng để search |

Điểm cần nhấn mạnh:

> Field `raw` không được index để search. Search/aggregation chỉ chạy trên các field đã kiểm soát như `timestamp`, `severity`, `event_type`, `user`, `host`, `ip`, `country_code`, `message`.

## Raw log được sinh như thế nào?

Trong `seed-events.ps1`, mỗi event có field `raw` được build từ các field còn lại:

```text
ts=<timestamp> source=<source> event_type=<event_type> severity=<severity>
user=<user> host=<host> ip=<ip> country_code=<country_code>
message="<message>" synthetic=true
```

Điểm nói khi bảo vệ:

> `raw` mô phỏng log gốc phục vụ event detail, còn bảng raw events và search response dùng field đã parse để dễ filter, sort, export và audit.

## Rule seed dữ liệu demo

Script `scripts/seed-events.ps1` sinh dữ liệu theo hai phần:

1. **Anchor scenarios**: 40 event đầu được tạo cố định để đảm bảo demo luôn có dữ liệu.
2. **Random synthetic events**: từ event 41 trở đi, script random theo tỉ lệ để tạo dataset lớn hơn, mặc định thường seed 10.000 event.

### 40 event đầu

| Khoảng event | Rule |
| --- | --- |
| 1-20 | `failed_login`, `country_code=CN`, `severity=high`, `source=windows-auth`, trong 24h gần nhất |
| 21-24 | `account_lockout`, `country_code=CN`, `source=vpn` |
| 25-28 | `firewall_block`, `country_code=CN`, `source=firewall` |
| 29-32 | `malware_detected`, `severity=critical`, `source=edr` |
| 33-35 | `privilege_escalation`, `severity=critical`, `source=windows-auth` |
| 36-38 | `suspicious_outbound`, `severity=high`, `source=proxy` |
| 39-40 | `data_exfiltration`, `severity=critical`, `source=proxy` |

### Random synthetic events

Sau 40 event đầu, script random theo tỉ lệ:

| Điều kiện random | Event sinh ra |
| --- | --- |
| `<18%` | `failed_login` từ `CN` |
| `<28%` | `firewall_block` |
| `<38%` | `malware_detected` |
| `<47%` | `suspicious_outbound` hoặc `large_transfer` |
| `<53%` | `privilege_escalation` |
| `<60%` | `account_lockout` |
| còn lại | event bình thường: `successful_login`, `dns_query`, `process_start`, `file_access` |

## Các giá trị mock data chính

### User

```text
admin
vpn.user
finance.user
svc.backup
alice
bob
analyst1
guest01
jdoe
unknown
```

`unknown` xuất hiện trong các event như `firewall_block`.

### Host

```text
dc-01
vpn-gw-01
finance-ws-07
endpoint-014
endpoint-023
proxy-01
dns-01
srv-app-02
firewall-edge-01
```

### Country code

```text
VN
CN
US
RU
SG
DE
```

### IP mẫu

Attacker/demo IP:

```text
203.0.113.45
203.0.113.77
198.51.100.200
192.0.2.88
```

Internal/normal IP:

```text
10.10.1.15
10.10.2.24
10.20.5.33
172.16.10.42
192.168.20.55
```

## Distribution khi seed 10.000 event

Với seed mặc định `20260604`, khi generate thử 10.000 event, distribution xấp xỉ như sau.

### Theo severity

| Severity | Số event |
| --- | ---: |
| `high` | 3376 |
| `low` | 2928 |
| `medium` | 2723 |
| `critical` | 973 |

### Theo event_type

| Event type | Số event |
| --- | ---: |
| `failed_login` | 1806 |
| `process_start` | 1054 |
| `malware_detected` | 1046 |
| `dns_query` | 1022 |
| `firewall_block` | 976 |
| `successful_login` | 965 |
| `file_access` | 941 |
| `account_lockout` | 697 |
| `privilege_escalation` | 608 |
| `suspicious_outbound` | 443 |
| `large_transfer` | 440 |
| `data_exfiltration` | 2 |

### Theo source

| Source | Số event |
| --- | ---: |
| `windows-auth` | 3379 |
| `edr` | 3041 |
| `dns` | 1022 |
| `firewall` | 976 |
| `proxy` | 885 |
| `vpn` | 697 |

### Theo country_code

| Country code | Số event |
| --- | ---: |
| `VN` | 4827 |
| `CN` | 2989 |
| `RU` | 1331 |
| `US` | 495 |
| `SG` | 186 |
| `DE` | 172 |

## Scenario counter quan trọng cho demo

Khi seed 10.000 event, script in ra một số counter để biết dataset có đủ tình huống demo:

| Scenario | Số event |
| --- | ---: |
| `failed_login` từ `CN` trong 24h | 343 |
| `malware_detected` critical | 363 |
| Event từ repeated attacker IP | 4364 |
| `firewall_block` | 976 |
| `privilege_escalation` | 608 |
| `account_lockout` | 697 |
| `suspicious_outbound` | 443 |
| `data_exfiltration` hoặc `large_transfer` | 442 |

## Mock LLM đang hỗ trợ rule nào?

Mock LLM nằm trong `MockLlmClient.java`. Nó không sinh event, mà sinh `SearchPlan`.

### Search mode

| Nhóm câu hỏi | SearchPlan trả về |
| --- | --- |
| `failed login` + `China/CN/Trung Quốc` | `event_type=["failed_login"]`, `country_code=["CN"]`, `timestamp=now-24h..now` |
| `failed login` + `admin` | `event_type=["failed_login"]`, `user="admin"`, `timestamp=now-30d..now` |
| `critical` + `7 days/7 ngày` | `severity=["critical"]`, `timestamp=now-7d..now` |
| Có chữ `malware` | `message_query="malware detected"`, `timestamp=now-7d..now` |
| `firewall block` + `CN/China/Trung Quốc` | `event_type=["firewall_block"]`, `country_code=["CN"]`, `timestamp=now-30d..now` |
| `privilege escalation` + `admin` | `event_type=["privilege_escalation"]`, `user="admin"`, `timestamp=now-30d..now` |
| `account lockout` | `event_type=["account_lockout"]`, `timestamp=now-7d..now` |

### Aggregation mode

| Câu hỏi | SearchPlan aggregation |
| --- | --- |
| Đếm login thất bại theo từng user | `mode=aggregation`, `type=group_by`, `field=user`, `top_n=10`, filter `failed_login`, `timestamp=now-7d..now` |
| Top IP có nhiều alert nhất | `mode=aggregation`, `type=top_n`, `field=ip`, `top_n=10`, `timestamp=now-30d..now` |
| Số event theo giờ trong 24h qua | `mode=aggregation`, `type=date_histogram`, `interval=hour`, `timestamp=now-24h..now` |

## Nếu câu hỏi không nằm trong Mock LLM thì sao?

Mock LLM trả về:

```json
{
  "mode": "search",
  "unsupported_question": true
}
```

Sau đó backend parser/validator reject vì `unsupported_question` là field ngoài schema.

Nói với hội đồng:

> Khi dùng mock provider, hệ thống chỉ hỗ trợ một tập câu hỏi demo/regression cố định. Nếu hỏi ngoài tập này, backend sẽ reject rõ ràng thay vì đoán mò. Khi dùng Gemini, LLM thật có thể hiểu nhiều câu hơn nhưng vẫn bị ràng buộc bởi parser, validator và compiler.

## Câu demo nên dùng

Search:

```text
Show me failed login attempts from China in the last 24h
```

```text
Show critical alerts in the last 7 days
```

```text
Show failed login events for user admin
```

```text
Show malware detected events in the last 7 days
```

Aggregation bar:

```text
Top 10 IP có nhiều alert nhất tháng này
```

Aggregation line:

```text
Số event theo giờ trong 24h qua
```

Group by:

```text
Đếm số lần login thất bại theo từng user trong 7 ngày qua
```

## Câu trả lời mẫu khi bị hỏi khó

### Mock data nằm ở đâu?

> Mock data nằm trong `scripts/seed-events.ps1`. Script sinh synthetic SOC events rồi bulk index vào Elasticsearch index `soc-events-v1`. Schema mapping nằm ở `infra/elasticsearch/soc-events-v1-index.json`.

### Mock LLM nằm ở đâu?

> Mock LLM nằm ở `MockLlmClient.java`. Nó không sinh dữ liệu log, chỉ map một số câu hỏi demo thành `SearchPlan` JSON để hệ thống chạy không cần API key.

### Có bao nhiêu loại event?

> Với seed hiện tại có 12 `event_type`: `failed_login`, `process_start`, `malware_detected`, `dns_query`, `firewall_block`, `successful_login`, `file_access`, `account_lockout`, `privilege_escalation`, `suspicious_outbound`, `large_transfer`, `data_exfiltration`.

### Country code có những gì?

> Có 6 country code chính: `VN`, `CN`, `US`, `RU`, `SG`, `DE`. Trong đó `CN` được dùng nhiều cho scenario brute force/failed login demo.

### Vì sao dùng synthetic data?

> Vì log bảo mật thật thường nhạy cảm và không thể đưa vào đồ án. Synthetic data giúp demo đủ tình huống SOC phổ biến như failed login, malware, account lockout, firewall block, privilege escalation mà không lộ dữ liệu thật.

## Search tiếng Việt với dữ liệu seed tiếng Anh

### Vấn đề

Dataset synthetic hiện tại có nhiều field dạng structured như:

```text
event_type
severity
country_code
user
host
ip
```

Nhưng field `message` chủ yếu là tiếng Anh, ví dụ:

```text
Possible brute force: failed login from CN targeting admin
Malware detected by EDR on endpoint-014
Privilege escalation attempt detected for admin on domain controller
```

Vì vậy cần phân biệt hai loại truy vấn:

1. **Truy vấn theo field có cấu trúc**: tiếng Việt vẫn có thể đúng nếu LLM map intent sang `SearchPlan`.
2. **Truy vấn full-text trên `message`**: tiếng Việt có thể trả ít hoặc không có kết quả nếu LLM không dịch keyword sang tiếng Anh.

### Trường hợp tiếng Việt vẫn chạy tốt

Ví dụ user hỏi:

```text
Tìm login thất bại từ Trung Quốc trong 24 giờ qua
```

Nếu LLM sinh đúng `SearchPlan`:

```json
{
  "mode": "search",
  "filters": {
    "timestamp": { "from": "now-24h", "to": "now" },
    "event_type": ["failed_login"],
    "country_code": ["CN"]
  }
}
```

Thì Elasticsearch search theo field:

```text
event_type = failed_login
country_code = CN
timestamp range
```

Kết quả không phụ thuộc vào việc `message` là tiếng Anh hay tiếng Việt.

### Trường hợp dễ sai hơn

Ví dụ user hỏi:

```text
Tìm mã độc được phát hiện trong 7 ngày qua
```

Nếu LLM sinh:

```json
{
  "message_query": "mã độc được phát hiện"
}
```

thì Elasticsearch sẽ search trong `message`, nhưng data seed lại là:

```text
Malware detected by EDR ...
```

Khi đó kết quả có thể thấp hoặc bằng 0.

Muốn đúng, LLM cần map intent tiếng Việt sang keyword tiếng Anh:

```json
{
  "message_query": "malware detected"
}
```

### Với Mock LLM

Mock LLM không hiểu tiếng Việt thật như Gemini. Nó chỉ check keyword trong `MockLlmClient.java`.

Ví dụ mock đang hỗ trợ các câu/rule như:

```text
Tìm login thất bại từ Trung Quốc trong 24 giờ qua
Tìm alert critical trong 7 ngày qua
Tìm malware detected trong 7 ngày qua
```

Nhưng câu quá thuần Việt như:

```text
Tìm mã độc trong 7 ngày qua
```

có thể không chạy nếu mock rule không check cụm `ma doc`.

### Cách trả lời khi hội đồng hỏi

Nếu hội đồng hỏi:

> Vì sao có câu tiếng Việt search không ra?

Có thể trả lời:

> Dataset demo hiện tại là synthetic SOC log và phần `message` chủ yếu bằng tiếng Anh, giống nhiều hệ thống SIEM thực tế vì log thường sinh từ sản phẩm quốc tế. Hệ thống không search trực tiếp câu tiếng Việt trên toàn bộ raw log, mà dùng LLM để chuyển câu hỏi sang `SearchPlan`. Với các truy vấn structured như `event_type`, `severity`, `country_code`, `user`, `host`, `ip`, tiếng Việt vẫn chạy tốt nếu LLM map đúng intent. Trường hợp full-text như “mã độc” thì cần cơ chế synonym/translation để map sang keyword tiếng Anh như `malware detected`.

### Cách demo tiếng Việt an toàn

Nên dùng câu tiếng Việt có keyword kỹ thuật rõ:

```text
Tìm login thất bại từ Trung Quốc trong 24 giờ qua
Tìm alert critical trong 7 ngày qua
Tìm malware detected trong 7 ngày qua
Đếm số lần login thất bại theo từng user trong 7 ngày qua
Top 10 IP có nhiều alert nhất tháng này
Số event theo giờ trong 24h qua
```

Hạn chế demo các câu thuần Việt chưa test kỹ:

```text
Tìm mã độc được phát hiện trong tuần qua
Tìm các hành vi leo thang đặc quyền
Tìm các kết nối ra ngoài đáng ngờ
```

## Hướng tối ưu để hỗ trợ tiếng Việt tốt hơn

Có nhiều cách tối ưu, tùy mức độ đầu tư.

### Cách 1 - Tăng rule synonym trong prompt và mock

Thêm synonym map vào prompt/Mock LLM:

| Tiếng Việt | Field/keyword chuẩn |
| --- | --- |
| `đăng nhập thất bại`, `login thất bại` | `event_type = failed_login` |
| `mã độc`, `phần mềm độc hại` | `message_query = malware detected` hoặc `event_type = malware_detected` |
| `leo thang đặc quyền` | `event_type = privilege_escalation` |
| `khóa tài khoản` | `event_type = account_lockout` |
| `chặn firewall`, `tường lửa chặn` | `event_type = firewall_block` |
| `kết nối ra ngoài đáng ngờ` | `event_type = suspicious_outbound` |

Ưu điểm:

- Làm nhanh.
- Hợp MVP.
- Không cần đổi Elasticsearch mapping.

Nhược điểm:

- Phải maintain synonym thủ công.

### Cách 2 - Ưu tiên map tiếng Việt sang structured field thay vì message_query

Với câu:

```text
Tìm mã độc trong 7 ngày qua
```

Nên map thành:

```json
{
  "filters": {
    "event_type": ["malware_detected"],
    "timestamp": { "from": "now-7d", "to": "now" }
  }
}
```

thay vì:

```json
{
  "message_query": "mã độc"
}
```

Đây là hướng tốt nhất cho SOC vì field có cấu trúc ổn định và chính xác hơn full-text.

### Cách 3 - Seed thêm message song ngữ

Có thể thêm field mới như:

```text
message_vi
```

hoặc seed `message` song ngữ:

```text
Malware detected / Phát hiện mã độc trên endpoint-014
```

Ưu điểm:

- Search full-text tiếng Việt dễ ra kết quả hơn.

Nhược điểm:

- Dataset demo kém giống log thật hơn, vì log sản phẩm bảo mật thường dùng tiếng Anh.
- Phải cập nhật mapping, seed script, compiler nếu muốn search field mới.

### Cách 4 - Elasticsearch analyzer / synonym filter

Có thể cấu hình analyzer/synonym để map:

```text
mã độc => malware
đăng nhập thất bại => failed login
```

Ưu điểm:

- Hỗ trợ full-text tốt hơn.
- Đúng hướng search engine.

Nhược điểm:

- Phức tạp hơn cho MVP.
- Cần quản lý synonym file hoặc analyzer config.
- Phải reindex dữ liệu nếu đổi analyzer.

### Cách 5 - Translation layer trước khi build SearchPlan

Có thể thêm bước normalize/translate intent:

```text
Vietnamese question
-> normalized security intent
-> SearchPlan
```

Ví dụ:

```text
"mã độc" -> "malware detected"
"leo thang đặc quyền" -> "privilege escalation"
```

Ưu điểm:

- Tách rõ logic ngôn ngữ khỏi search.

Nhược điểm:

- Thêm một lớp logic mới.
- Cần test nhiều hơn.

### Khuyến nghị cho MVP

Trong MVP hiện tại, hướng tối ưu hợp lý nhất là:

1. **Ưu tiên structured field**: tiếng Việt nên được LLM map sang `event_type`, `severity`, `country_code`, `user`, `host`, `ip`.
2. **Bổ sung synonym map nhỏ** trong prompt và mock cho các cụm SOC phổ biến.
3. **Không vội thêm analyzer tiếng Việt** vì sẽ làm phức tạp mapping/reindex.

Câu trả lời tốt khi bảo vệ:

> Với MVP, em ưu tiên SearchPlan dựa trên structured fields thay vì search full-text tiếng Việt trực tiếp. Điều này ổn định hơn cho SOC vì event type, severity, country code, user, host, IP là các field chuẩn. Nếu mở rộng, em sẽ bổ sung synonym/translation layer để map các cụm tiếng Việt như “mã độc”, “leo thang đặc quyền”, “khóa tài khoản” sang event type chuẩn hoặc keyword tiếng Anh tương ứng.

## Bộ câu hỏi để test LLM và demo trước hội đồng

Mục này dùng để test nhanh cả Gemini thật và Mock LLM trước buổi bảo vệ. Khi demo chính thức, nên ưu tiên các câu đã test trước trên môi trường deploy.

### Nhóm Search - nên demo

#### 1. Failed login từ China trong 24h

```text
Show me failed login attempts from China in the last 24h
```

Kỳ vọng `SearchPlan`:

```text
mode = search
event_type = failed_login
country_code = CN
timestamp.from = now-24h
timestamp.to = now
```

Ý nghĩa demo:

- Chứng minh natural language search.
- Có dữ liệu chắc vì seed có anchor scenario và random failed login CN.
- Dễ giải thích với hội đồng.

#### 2. Login thất bại từ Trung Quốc trong 24h

```text
Tìm login thất bại từ Trung Quốc trong 24 giờ qua
```

Kỳ vọng:

```text
mode = search
event_type = failed_login
country_code = CN
timestamp.from = now-24h
timestamp.to = now
```

Ý nghĩa demo:

- Chứng minh hệ thống nhận câu hỏi tiếng Việt.
- Đây là câu tiếng Việt an toàn vì vẫn chứa keyword gần với field structured.

#### 3. Critical alerts trong 7 ngày

```text
Show critical alerts in the last 7 days
```

Kỳ vọng:

```text
mode = search
severity = critical
timestamp.from = now-7d
timestamp.to = now
```

Ý nghĩa demo:

- Chứng minh filter theo severity.
- Có dữ liệu vì seed có `critical` cho malware, privilege escalation và data exfiltration.

#### 4. Alert critical bằng tiếng Việt

```text
Tìm alert critical trong 7 ngày qua
```

Kỳ vọng:

```text
mode = search
severity = critical
timestamp.from = now-7d
timestamp.to = now
```

#### 5. Malware detected trong 7 ngày

```text
Show malware detected events in the last 7 days
```

Kỳ vọng:

```text
mode = search
message_query = malware detected
timestamp.from = now-7d
timestamp.to = now
```

Hoặc Gemini có thể map tốt hơn thành:

```text
event_type = malware_detected
timestamp.from = now-7d
timestamp.to = now
```

Cả hai hướng đều hợp lý nếu backend validator chấp nhận.

#### 6. Malware detected tiếng Việt lai keyword Anh

```text
Tìm malware detected trong 7 ngày qua
```

Kỳ vọng:

```text
mode = search
message_query = malware detected
timestamp.from = now-7d
timestamp.to = now
```

#### 7. Failed login của user admin

```text
Show failed login events for user admin
```

Kỳ vọng:

```text
mode = search
event_type = failed_login
user = admin
timestamp.from = now-30d
timestamp.to = now
```

Ý nghĩa demo:

- Chứng minh filter theo `user`.
- Dùng được để mở event detail và export CSV.

#### 8. Firewall block từ CN

```text
Tìm firewall block từ CN
```

Kỳ vọng:

```text
mode = search
event_type = firewall_block
country_code = CN
timestamp.from = now-30d
timestamp.to = now
```

Ý nghĩa demo:

- Chứng minh hệ thống không chỉ có login/malware mà còn có firewall scenario.

#### 9. Privilege escalation by admin

```text
Show privilege escalation by admin
```

Kỳ vọng:

```text
mode = search
event_type = privilege_escalation
user = admin
timestamp.from = now-30d
timestamp.to = now
```

Ý nghĩa demo:

- Tình huống SOC quan trọng: leo thang đặc quyền.

#### 10. Account lockout trong 7 ngày

```text
Tìm account lockout trong 7 ngày qua
```

Kỳ vọng:

```text
mode = search
event_type = account_lockout
timestamp.from = now-7d
timestamp.to = now
```

### Nhóm Aggregation - nên demo

#### 11. Group by user

```text
Đếm số lần login thất bại theo từng user trong 7 ngày qua
```

Kỳ vọng:

```text
mode = aggregation
filters.event_type = failed_login
filters.timestamp.from = now-7d
aggregation.type = group_by
aggregation.field = user
aggregation.top_n = 10
```

Chart kỳ vọng:

```text
BAR
```

Ý nghĩa demo:

- Chứng minh hệ thống có aggregation.
- Chứng minh LLM sinh `SearchPlan`, còn backend compile `terms aggregation`.

#### 12. Top IP có nhiều alert

```text
Top 10 IP có nhiều alert nhất tháng này
```

Hoặc tiếng Anh:

```text
Show the top 10 source IPs with the most alerts in the last 30 days
```

Kỳ vọng:

```text
mode = aggregation
aggregation.type = top_n
aggregation.field = ip
aggregation.top_n = 10
timestamp.from = now-30d
timestamp.to = now
```

Chart kỳ vọng:

```text
BAR
```

Ý nghĩa demo:

- Chứng minh top-N aggregation.
- Dữ liệu seed có repeated attacker IP nên biểu đồ dễ có ý nghĩa.

#### 13. Events by hour - biểu đồ đường

```text
Số event theo giờ trong 24h qua
```

Hoặc tiếng Anh:

```text
Show event count by hour in the last 24 hours
```

Kỳ vọng:

```text
mode = aggregation
aggregation.type = date_histogram
aggregation.interval = hour
timestamp.from = now-24h
timestamp.to = now
```

Chart kỳ vọng:

```text
LINE
```

Ý nghĩa demo:

- Đây là câu quan trọng để demo biểu đồ đường.
- Backend compile thành `date_histogram` trên field `timestamp` với `fixed_interval = 1h`.

### Nhóm câu để test Gemini thật

Các câu dưới đây có thể dùng với Gemini thật để kiểm tra khả năng hiểu ngoài Mock LLM. Nên test trước, không nên dùng lần đầu ngay khi bảo vệ.

```text
Find high severity events for user admin in the last 2 days
```

Kỳ vọng:

```text
severity = high
user = admin
timestamp.from = now-2d
```

```text
Show events from host vpn-gw-01 in the last 24 hours
```

Kỳ vọng:

```text
host = vpn-gw-01
timestamp.from = now-24h
```

```text
Show events from IP 203.0.113.45 in the last 7 days
```

Kỳ vọng:

```text
ip = 203.0.113.45
timestamp.from = now-7d
```

```text
Count all failed login events in the last 7 days
```

Kỳ vọng:

```text
mode = aggregation
aggregation.type = count
filters.event_type = failed_login
timestamp.from = now-7d
```

```text
Group events by severity in the last 7 days
```

Kỳ vọng:

```text
mode = aggregation
aggregation.type = group_by
aggregation.field = severity
timestamp.from = now-7d
```

### Nhóm câu nên tránh nếu chưa test kỹ

Các câu này nghe tự nhiên nhưng dễ phụ thuộc vào synonym/translation hoặc full-text tiếng Việt:

```text
Tìm mã độc được phát hiện trong tuần qua
Tìm các hành vi leo thang đặc quyền
Tìm các kết nối ra ngoài đáng ngờ
Tìm các dấu hiệu rò rỉ dữ liệu
```

Lý do:

- Dataset `message` chủ yếu bằng tiếng Anh.
- Mock LLM hiện không có đầy đủ synonym tiếng Việt như `mã độc`, `leo thang đặc quyền`, `rò rỉ dữ liệu`.
- Gemini có thể hiểu, nhưng cần test trước để chắc nó sinh `SearchPlan` đúng.

### Checklist trước khi demo LLM

Trước buổi bảo vệ, nên chạy nhanh:

1. Search failed login China.
2. Search critical alerts.
3. Search failed login by admin.
4. Aggregation top IP.
5. Aggregation events by hour.
6. Mở Query Transparency để xem `SearchPlan` và `generated_dsl`.
7. Mở All Investigations để chứng minh query được audit.
8. Export CSV bằng account analyst.
9. Login viewer để chứng minh viewer không được export/edit.

Nếu dùng Gemini thật, nên chuẩn bị fallback:

```text
Nếu Gemini lỗi hoặc quota/network lỗi, chuyển LLM_PROVIDER=mock để demo ổn định.
```

## Cập nhật: `source` hiện đã là search filter chính thức

Trước đây `source` chủ yếu được dùng cho aggregation, ví dụ:

```json
{
  "mode": "aggregation",
  "aggregation": {
    "type": "group_by",
    "field": "source"
  }
}
```

Hiện tại `SearchPlan.filters` đã hỗ trợ thêm:

```json
{
  "mode": "search",
  "filters": {
    "timestamp": { "from": "now-7d", "to": "now" },
    "source": ["edr"]
  }
}
```

Ý nghĩa:

- `source` là nguồn sinh log, ví dụ `windows-auth`, `vpn`, `firewall`, `edr`, `proxy`, `dns`.
- `source` khác `host`:
  - `source`: hệ thống/sản phẩm sinh log, ví dụ `edr`.
  - `host`: máy hoặc thiết bị liên quan tới event, ví dụ `endpoint-014`.
- Backend compile `filters.source` thành Elasticsearch `terms` filter trên field `source`.
- Backend không thêm `.keyword` vì mapping hiện tại đã khai báo `source` là `keyword`.

Ví dụ câu hỏi demo:

```text
Show EDR events in the last 7 days
```

Kỳ vọng:

```text
mode = search
filters.source = ["edr"]
filters.timestamp.from = now-7d
filters.timestamp.to = now
```

```text
Show windows-auth events for admin in the last 24h
```

Kỳ vọng:

```text
mode = search
filters.source = ["windows-auth"]
filters.user = admin
filters.timestamp.from = now-24h
filters.timestamp.to = now
```

```text
Group events by source in the last 7 days
```

Kỳ vọng:

```text
mode = aggregation
aggregation.type = group_by
aggregation.field = source
filters.timestamp.from = now-7d
```

```text
Show top 5 log sources in the last 30 days
```

Kỳ vọng:

```text
mode = aggregation
aggregation.type = top_n
aggregation.field = source
aggregation.top_n = 5
filters.timestamp.from = now-30d
```

## Các câu hỏi/case dùng để chứng minh hệ thống xử lý LLM trả sai

Mục tiêu của nhóm này không phải để demo kết quả đẹp, mà để chứng minh hệ thống có guardrail khi LLM hoặc user tạo `SearchPlan` sai.

### 1. LLM thêm field ngoài schema

Raw output sai:

```json
{
  "mode": "search",
  "filters": {},
  "unsupported_question": true
}
```

Kỳ vọng:

```text
Parser reject vì unsupported_question không thuộc schema SearchPlan.
```

Câu trả lời trước hội đồng:

> Backend dùng Jackson strict parsing, không ignore unknown field. Nếu LLM tự thêm field ngoài schema, request bị reject có kiểm soát.

### 2. LLM trả Elasticsearch DSL thay vì SearchPlan

Raw output sai:

```json
{
  "query": {
    "match_all": {}
  }
}
```

Kỳ vọng:

```text
Parser/validator reject vì đây không phải SearchPlan.
```

Câu trả lời:

> LLM không được phép sinh DSL. DSL chỉ được backend compiler sinh ra sau khi SearchPlan đã pass validator.

### 3. LLM sinh wildcard/script/query_string

Raw output sai:

```json
{
  "mode": "search",
  "filters": {
    "event_type": ["failed*login"]
  },
  "page": 0,
  "size": 20
}
```

Hoặc:

```json
{
  "mode": "search",
  "filters": {
    "source": ["edr*"]
  },
  "page": 0,
  "size": 20
}
```

Kỳ vọng:

```text
Validator reject wildcard query syntax.
```

Câu trả lời:

> Hệ thống không cho phép wildcard/script/query_string từ LLM hoặc user-edited SearchPlan để tránh query tốn tài nguyên hoặc bypass guardrail.

### 4. LLM sinh source sai format

Raw output sai:

```json
{
  "mode": "search",
  "filters": {
    "source": ["EDR"]
  },
  "page": 0,
  "size": 20
}
```

Kỳ vọng:

```text
Bean Validation reject vì source filter phải dùng lowercase format như edr, windows-auth, firewall.
```

Câu trả lời:

> Các field dạng keyword trong SearchPlan được chuẩn hóa theo format cụ thể. Nếu LLM trả sai hoa/thường, backend reject để tránh query lệch mapping.

### 5. LLM sinh time range ngoài guardrail

Raw output sai:

```json
{
  "mode": "search",
  "filters": {
    "timestamp": { "from": "now-9999d", "to": "now" }
  },
  "page": 0,
  "size": 20
}
```

Kỳ vọng:

```text
Validator reject vì relative day tối đa là 90d.
```

Câu trả lời:

> Time range linh hoạt nhưng vẫn có giới hạn: tối đa 720h hoặc 90d để tránh truy vấn quá rộng.

### 6. LLM sinh aggregation field nguy hiểm

Raw output sai:

```json
{
  "mode": "aggregation",
  "filters": {
    "timestamp": { "from": "now-7d", "to": "now" }
  },
  "aggregation": {
    "type": "top_n",
    "field": "message",
    "top_n": 10
  },
  "page": 0,
  "size": 20
}
```

Kỳ vọng:

```text
Validator reject vì aggregation.field phải nằm trong allowlist.
```

Câu trả lời:

> Aggregation chỉ được chạy trên field allowlist như source, severity, event_type, user, host, ip, country_code. Không cho group/top trên message/raw/password/script.
