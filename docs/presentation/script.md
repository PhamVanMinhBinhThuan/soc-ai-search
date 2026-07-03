# Script Thuyết Trình - SOC AI Search (v2)

File này là script để bạn nói theo từng slide. Mục tiêu là giữ nhịp trình bày trong khoảng **7-8 phút slide** trước khi chuyển sang demo.

## Tổng Chiến Lược

- Nói ngắn, rõ, không đọc slide chữ
- Mỗi slide chỉ nói 2-4 câu
- Nhắc lại thông điệp chính của đồ án:
  `AI hỗ trợ điều tra, backend giữ quyền kiểm soát an toàn`

---

## Slide 1 - Title

**Bạn nói:**

"Đề tài của em là SOC AI Search, một hệ thống hỗ trợ tìm kiếm và thống kê sự kiện bảo mật bằng ngôn ngữ tự nhiên. Mục tiêu của hệ thống là giúp SOC analyst không phải viết Elasticsearch DSL thủ công, nhưng vẫn đảm bảo an toàn và khả năng truy vết."

---

## Slide 2 - Hiện Trạng Và Bài Toán

**Bạn nói:**

"Trong thực tế, SOC analyst phải xử lý hàng triệu log mỗi ngày. Vấn đề đầu tiên là Elasticsearch DSL rất phức tạp, người mới rất dễ viết sai. Thứ hai, mỗi lần điều tra phải lặp lại từ đầu, không có lịch sử. Thứ ba, khó biết ai đã query gì, dữ liệu có bị truy xuất tùy tiện không. Những vấn đề này làm chậm tốc độ phản ứng và tăng rủi ro bảo mật."

---

## Slide 3 - Mục Tiêu

**Bạn nói:**

"Mục tiêu em đặt ra là: Analyst có thể hỏi bằng tiếng tự nhiên, hệ thống tự sinh query (LLM sinh SearchPlan), nhưng backend luôn là người kiểm soát cuối cùng — AI không bao giờ tự ý truy vấn dữ liệu (Không cho sinh DSL vì có thể quét dữ liệu, làm hỏng server, hoặc bị hacker dùng prompt injection tấn công). Kèm theo đó là RBAC phân quyền rõ ràng (AI được xem audit, export CSV) và audit đầy đủ để truy vết."

---

## Slide 4 - Kiến Trúc Tổng Thể

**Bạn nói:**

"Về kiến trúc, frontend được xây dựng bằng React và TypeScript. Backend là Spring Boot đóng vai trò trung tâm xử lý (guardrail). Backend gọi Gemini LLM để sinh SearchPlan, sau đó tự động compile và truy vấn Elasticsearch. Dữ liệu audit được lưu vào PostgreSQL. Hệ thống dùng Keycloak để xác thực, phân quyền và được deploy bằng Docker Compose + Caddy."

**Câu nhấn mạnh:**

"Frontend không truy cập trực tiếp Elasticsearch hay LLM. Backend là lớp guardrail trung tâm bảo vệ an toàn."

---

## Slide 5 - Thiết Kế Dữ Liệu

**Bạn nói:**

"Dữ liệu của hệ thống được tách theo mục đích sử dụng. Sự kiện bảo mật được lưu trong Elasticsearch để tối ưu tốc độ search và aggregation. Lịch sử truy vấn và audit được lưu trong PostgreSQL để phục vụ investigations, replay và truy vết. User và role do Keycloak quản lý."

**Nếu hội đồng hỏi thêm:**

"Đây là cách tách đúng trách nhiệm: search engine cho log, relational database cho audit, IAM cho auth."

---

## Slide 6 - Core Flow + Guardrail

**Bạn nói:**

"Đây là luồng chính và cũng là điểm ăn tiền nhất của đồ án. Đầu tiên, user nhập câu hỏi. Backend tạo prompt, LLM sinh SearchPlan dạng JSON. Tuy nhiên, JSON này phải qua Parser và Validator của backend. Hệ thống sẽ chặn (reject) các field lạ, giá trị sai chuẩn hoặc các query vượt quyền. Cuối cùng, chính tay backend mới biên dịch (compile) thành Elasticsearch DSL và truy vấn. Hệ thống tuyệt đối không cho LLM sinh thẳng DSL và chạy trực tiếp."

---

## Slide 7 - Các Chức Năng Hệ Thống + Phân Quyền

**Bạn nói:**

"Hệ thống có 11 chức năng chính, được phân chia theo 3 role: Viewer, Analyst và Admin.

Mọi người dùng — kể cả Viewer — đều có thể search, xem kết quả, xem Query Transparency (gồm Query Breakdown, SearchPlan, DSL), xem AI Summary, gợi ý bước điều tra tiếp theo, và còn có thể Correct or Refine Query — tức là sửa lại SearchPlan nếu kết quả chưa đúng ý. Analyst có thêm quyền pin query, export CSV lịch sử và quản lý Investigations. Admin mới có quyền xem Audit Logs & Export CSV toàn bộ — tức là lịch sử query của tất cả mọi người.

Bảng này thể hiện rõ từng chức năng ai được làm gì."

---

## Slide 8 - Search Và Aggregation Flow

**Bạn nói:**

"Ở hệ thống này, từ một câu hỏi bằng ngôn ngữ tự nhiên ban đầu, luồng xử lý sẽ được rẽ thành 2 nhánh chính tùy thuộc vào mục đích của Analyst: nhánh Search hoặc nhánh Aggregation.

Với nhánh Search, hệ thống trả về bảng kết quả event logs chi tiết. Tại đây, Analyst có thể tiếp tục filter các trường như severity, user, IP... và cuối cùng là Export CSV ra báo cáo.

Với nhánh Aggregation, hệ thống vẽ biểu đồ trực quan. Hỗ trợ 3 dạng: Top N vẽ Bar chart (như Top 10 IP đăng nhập xịt), Trend vẽ Line chart (như số lượng sự kiện theo giờ), và Count cho ra một con số tổng duy nhất (như tổng số failed login hôm nay)."

---

## Slide 9 - Screenshots Thực Tế

**Bạn nói:**

"Đây là một số màn hình thực tế của hệ thống: giao diện Event Search trực quan, Aggregation dashboard, màn hình Query Transparency minh bạch cách AI suy luận, và màn hình Investigations."

---

## Slide 10 - Kết Quả Đạt Được

**Bạn nói:**

"Hệ thống của em đã được deploy public thực tế trên DigitalOcean VPS với HTTPS, chạy với tập dữ liệu mẫu gần 10000 event. Hệ thống có CI/CD pipeline tự động test và deploy. Em cũng viết backend unit test, report JaCoCo coverage, frontend unit test, smoke test và có Swagger UI doc đầy đủ cho API."

---

## Slide 11 - Demo Flow

**Bạn nói:**

"Tiếp theo em xin phép demo trực tiếp luồng chính của hệ thống. Em sẽ bắt đầu từ góc nhìn của một Analyst."

---

## Slide 12 - Hướng Phát Triển

**Bạn nói:**

"Đồ án của em hiện tại đã giải quyết được bài toán query tự nhiên và kiểm soát an toàn. Hướng phát triển tiếp theo của hệ thống là multi-turn investigation (hỏi tiếp theo trong context cũ), advanced aggregation và real-time streaming."

**Câu kết trình bày:**

"Tổng kết lại, hệ thống tập trung giải quyết bài toán SOC analyst truy vấn log bằng ngôn ngữ tự nhiên, nhưng backend luôn giữ quyền kiểm soát tuyệt đối thông qua SearchPlan, validator, compiler, RBAC và audit."

---

## Nhịp Demo Gợi Ý (6-7 phút)

- 1 phút: Login + search tình huống failed login from China
- 1.5 phút: Mở Query Breakdown + SearchPlan + DSL
- 1 phút: Khởi chạy aggregation line/bar chart
- 1 phút: Correct or Refine Query (sửa SearchPlan)
- 1 phút: Mở Investigations / Audit
- 1 phút: Export CSV + kết lại buổi demo
