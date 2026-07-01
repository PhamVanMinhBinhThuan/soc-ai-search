# Tối ưu giao diện Landing Page

Dựa trên review UI, hãy thực hiện các thay đổi sau trên trang chủ (Landing Page) để giao diện trông tối giản (minimalist) và tạo sự tập trung tối đa cho người dùng:

### 1. Xóa nút "Explore Features"
- **Yêu cầu:** Hãy xóa bỏ hoàn toàn nút CTA thứ hai mang tên "Explore Features" nằm cạnh nút "Access Console".
- **Mục đích:** Tạo ra một lời kêu gọi hành động (Call-to-Action) duy nhất ở giữa màn hình, giúp luồng trải nghiệm của người dùng tập trung 100% vào việc truy cập hệ thống thay vì bị phân tâm bởi một nút không có tác dụng.

### 2. Tinh chỉnh tên các nút Đăng nhập
- **Nút ở góc phải trên cùng:** Hãy đổi chữ "Secure Login" thành **"Sign In"** để đảm bảo sự ngắn gọn, quen thuộc và chuẩn mực.
- **Nút chính giữa màn hình:** Đảm bảo nút này vẫn giữ nguyên tên là **"Access Console"** (nếu đang là tên khác thì hãy đổi lại cho đúng).

### 3. Cập nhật Tiêu đề và Mô tả (Subtitle)
- **Vấn đề:** Các dòng text hiện tại hơi dài dòng và chưa tập trung thẳng vào chức năng Event Search bằng AI của hệ thống.
- **Yêu cầu:** Hãy thay đổi các dòng chữ như sau:
  - **Tiêu đề chính (Title):** Thay `Intelligent Event Search for Modern SOC Teams.` thành **`AI-Powered Event Search for Security Teams.`**
  - **Dòng mô tả (Subtitle):** Thay `Scale your security operations. AI-powered log analysis...` thành **`Search events using natural language. Fast, intelligent, and secure.`**
- **Mục đích:** Giúp thiết kế Hero section mang đậm phong cách cao cấp, với thông điệp súc tích, đi thẳng vào vấn đề.

> Hãy tìm component tương ứng (thường là `landing-page.tsx`, `hero.tsx` hoặc tương tự), thực hiện các thay đổi trên, và chạy các lệnh kiểm tra (lint/test) để đảm bảo không bị lỗi giao diện.
