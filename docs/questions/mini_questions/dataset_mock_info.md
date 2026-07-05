# Thông Tin Về Dữ Liệu Demo (Synthetic Dataset)

Tài liệu này tóm tắt ngắn gọn về dữ liệu giả lập (mock data) đang được sử dụng trong hệ thống SOC AI Search, giúp bạn dễ dàng trả lời hội đồng khi được hỏi về nguồn gốc dữ liệu.

## 1. Dữ liệu được mock ở đâu?
- **Không hardcode trong backend:** Dữ liệu log không bị gắn chết vào mã nguồn. Nó được sinh ra bởi một script độc lập (`scripts/seed-events.ps1`) và được đẩy thẳng (seed) vào Elasticsearch (Index: `soc-events-v1`).
- **Mock LLM:** Ngoài ra, project có một Mock LLM (`MockLlmClient.java`) chỉ dùng để test/demo nhằm map các câu hỏi thành `SearchPlan` JSON ổn định mà không tốn phí gọi API LLM thật.

## 2. Chi tiết các giá trị được Mock (Mock Values)
Để log sinh ra giống môi trường thực tế, hệ thống đã hardcode một tập các giá trị ngẫu nhiên như sau:
- **`user`:** `admin`, `vpn.user`, `finance.user`, `svc.backup`, `alice`, `bob`, `unknown`...
- **`host`:** `dc-01`, `vpn-gw-01`, `finance-ws-07`, `endpoint-014`, `firewall-edge-01`...
- **`country_code`:** 6 quốc gia chính gồm `VN`, `CN`, `US`, `RU`, `SG`, `DE` (Trong đó `CN` và `RU` thường đi kèm các log tấn công).
- **`event_type` (12 loại):** `failed_login`, `successful_login`, `malware_detected`, `firewall_block`, `privilege_escalation`, `account_lockout`, `data_exfiltration`, `suspicious_outbound`, `large_transfer`, `dns_query`, `process_start`, `file_access`.

## 3. Quy luật sinh dữ liệu (Seeding Rules)
Hệ thống tạo ra một tập dữ liệu tổng hợp khoảng **10.000 events** theo 2 bước:

### Bước 1: 40 Sự kiện "Neo" (Anchor Scenarios)
40 event đầu tiên được tạo theo bộ quy tắc CỐ ĐỊNH để đảm bảo khi lên demo thực tế luôn có sẵn dữ liệu chuẩn để minh họa:
- **Event 1 - 20:** `failed_login` (Mức độ: High, Từ: CN - Trung Quốc, Nguồn: windows-auth)
- **Event 21 - 24:** `account_lockout` (Bị khóa tài khoản do login sai quá nhiều, Từ: CN)
- **Event 25 - 28:** `firewall_block` (Tường lửa chặn kết nối, Từ: CN)
- **Event 29 - 32:** `malware_detected` (Mức độ: Critical, Nguồn: EDR)
- **Event 33 - 35:** `privilege_escalation` (Leo thang đặc quyền, Mức độ: Critical)
- **Event 36 - 38:** `suspicious_outbound` (Kết nối mạng ra ngoài đáng ngờ)
- **Event 39 - 40:** `data_exfiltration` (Rò rỉ dữ liệu, Mức độ: Critical)

### Bước 2: Sinh ngẫu nhiên theo xác suất (Random Synthetic)
Từ event thứ 41 đến 10.000, script sẽ áp dụng rule Random (tỉ lệ %) để mô phỏng giống hệt môi trường SOC thật, nơi đa số là log bình thường, còn log cảnh báo chiếm tỉ lệ nhỏ:
- **~18%:** Sinh log `failed_login` (từ CN)
- **~10%:** Sinh log `firewall_block`
- **~10%:** Sinh log `malware_detected`
- **~15%:** Các cảnh báo nguy hiểm khác (`suspicious_outbound`, `privilege_escalation`, `account_lockout`...)
- **Còn lại (~47%):** Sinh các log hoạt động bình thường, không nguy hiểm (`successful_login`, `dns_query`, `process_start`, `file_access`).

*Nhờ quy luật này, khi show cho hội đồng, bạn có thể tự tin nói rằng hệ thống không chỉ rình rập bắt lỗi mà còn chứa rất nhiều "Noise" (log rác/bình thường) giống như ngoài đời thật, và AI vẫn lọc ra được các cảnh báo chính xác.*

## 4. Schema Event (Cấu trúc dữ liệu)
Mỗi sự kiện bảo mật được tạo ra gồm các trường (field) có cấu trúc rõ ràng:
- `timestamp`: Thời điểm xảy ra sự kiện
- `severity`: Mức độ nghiêm trọng (`low`, `medium`, `high`, `critical`)
- `event_type`: Loại sự kiện 
- `user`, `host`, `ip`: Thực thể liên quan 
- `country_code`: Mã quốc gia
- `message`: Thông tin mô tả chi tiết bằng tiếng Anh (Full-text search)
- `raw`: Dữ liệu thô nguyên bản (không được index để search)

## 4. Trả lời hội đồng (Mẫu)
> *"Dạ, dữ liệu trong hệ thống hiện tại là Synthetic Data do em tự viết script mô phỏng và nạp vào Elasticsearch (~10.000 log). Lý do em dùng dữ liệu giả lập là vì log bảo mật thực tế rất nhạy cảm và không được phép mang ra ngoài. Tuy nhiên, tập dữ liệu của em đã được mô phỏng bám sát phân phối thực tế của một hệ thống SOC, bao gồm đầy đủ các kịch bản tấn công phổ biến như dò mật khẩu (Brute force), phát hiện mã độc (Malware), hay leo thang đặc quyền (Privilege Escalation) để đảm bảo tính thực tiễn cho đồ án."*
