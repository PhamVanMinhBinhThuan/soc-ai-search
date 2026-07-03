# Hướng Dẫn Test API Qua Swagger UI

Tài liệu này hướng dẫn cách kiểm thử trực tiếp các API quan trọng của hệ thống bằng công cụ Swagger UI, giúp bạn dễ dàng demo cho hội đồng thấy hệ thống backend hoạt động độc lập và hoàn chỉnh như thế nào.

## 1. Cách Lấy Token (Authentication Token)
Hệ thống sử dụng Keycloak để bảo mật API. Để gọi API trên Swagger, bạn cần có một `access_token` hợp lệ. Cách dễ nhất để lấy token là thông qua giao diện Web Frontend:

1. Mở trang web ứng dụng của bạn (VD: `http://localhost:3000` hoặc domain thật).
2. Đăng nhập bằng tài khoản **Analyst** hoặc **Admin**.
3. Nhấn phím **F12** để mở Developer Tools của trình duyệt.
4. Chuyển sang tab **Network** (Mạng) và thử thực hiện một thao tác bất kỳ (như gõ một câu tìm kiếm).
5. Bấm vào một Request gửi đi (ví dụ request `/api/v1/search/query`).
6. Tìm mục **Request Headers**, bạn sẽ thấy dòng:
   `Authorization: Bearer eyJhbGciOiJSUzI1Ni...`
7. Hãy copy toàn bộ đoạn mã dài ngoằng đằng sau chữ `Bearer ` (Bắt đầu từ chữ `ey...`). Đây chính là token của bạn.

## 2. Xác Thực Trên Swagger UI
1. Truy cập vào trang Swagger UI của Backend (VD: `http://localhost:8080/swagger-ui/index.html` hoặc link API public của bạn).
2. Tìm và bấm vào nút **Authorize** (biểu tượng ổ khóa) ở góc phải trên cùng.
3. Dán (Paste) đoạn token vừa copy ở Bước 1 vào ô trống. *(Lưu ý: Thường Swagger chỉ cần dán token, nhưng nếu báo lỗi, hãy thử gõ chữ `Bearer ` rồi dán khoảng trắng và token vào)*.
4. Bấm nút **Authorize** → **Close**. Giờ thì toàn bộ các API bên dưới đã được cấp quyền của bạn!

---

## 3. Các API Quan Trọng Nên Test Demo

Dưới đây là 3 API quan trọng nhất thể hiện rõ nghiệp vụ của hệ thống:

### API 1: Truy vấn ngôn ngữ tự nhiên (Natural Language Search)
- **Endpoint:** `POST /api/v1/search/query`
- **Mục đích:** Gửi câu hỏi vào và xem AI phân tích, Backend trả về kết quả.
- **Cách test:**
  1. Bấm vào API `POST /api/v1/search/query` → Chọn **Try it out**.
  2. Điền JSON payload vào khung Request body:
     ```json
     {
       "question": "Show me failed login attempts from China in the last 24h",
       "use_mock_llm": false 
     }
     ```
  3. Bấm **Execute**.
- **Kết quả kỳ vọng:** Kéo xuống phần Response, bạn sẽ thấy JSON trả về gồm 3 phần cực kỳ rõ ràng để giải thích cho hội đồng:
  - `"search_plan"`: JSON do AI sinh ra.
  - `"generated_dsl"`: Câu lệnh Elastic mà Backend tự dịch.
  - `"events"`: Danh sách kết quả lấy từ Database.

### API 2: Lấy lịch sử điều tra (Audit Logs / History)
- **Endpoint:** `GET /api/v1/search/history`
- **Mục đích:** Lấy lịch sử những gì user đã query.
- **Cách test:**
  1. Bấm vào `GET /api/v1/search/history` → Chọn **Try it out**.
  2. Điền thông số phân trang (ví dụ `page = 0`, `size = 10`).
  3. Bấm **Execute**.
- **Kết quả kỳ vọng:** Danh sách các query đã được lưu lại trong PostgreSQL. Hội đồng sẽ thấy các record kèm thời gian và thông tin user, chứng minh hệ thống có tính năng Audit chuẩn xác. Nhớ copy một cái `id` trong danh sách này để test API số 3 nhé.

### API 3: Xuất File CSV (Export) an toàn
- **Endpoint:** `GET /api/v1/search/export/{queryId}`
- **Mục đích:** Export dữ liệu an toàn dựa trên ID truy vấn, thay vì gửi câu DSL từ Frontend (Chống hack).
- **Cách test:**
  1. Bấm vào `GET /api/v1/search/export/{queryId}` → Chọn **Try it out**.
  2. Ở tham số `queryId`, dán vào cái `id` (chuỗi UUID) mà bạn vừa copy ở API thứ 2.
  3. Bấm **Execute**.
- **Kết quả kỳ vọng:** Swagger sẽ trả về một Response báo file đang được download (Media type: `text/csv`). Việc chỉ truyền `queryId` chứng minh hệ thống bắt Backend phải tự động móc (replay) lại SearchPlan cũ để đảm bảo an toàn tuyệt đối, chứ không phụ thuộc dữ liệu từ Client gửi lên.

---
*Mẹo khi Demo: Nếu hội đồng muốn kiểm chứng xem hệ thống có chống AI bậy bạ không, hãy thử nhét các mã độc SQL Injection vào ô "question" ở API số 1. API sẽ vẫn chạy mượt mà và trả về "Không có kết quả" do cơ chế Validate và Elastic Client đã xử lý escape ký tự.*
