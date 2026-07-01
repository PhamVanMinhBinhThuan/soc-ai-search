# Cải thiện UI cho Popup Recent Queries

Dựa trên ảnh chụp hiện tại, giao diện của popup **Recent Queries** đã gọn gàng nhưng các phần tử bên trong thẻ (card) đang bị rời rạc, khoảng cách dọc quá lớn, và thiếu điểm nhấn (premium feel). Hãy thực hiện refactor UI theo các yêu cầu chi tiết dưới đây:

### 1. Tái cấu trúc bố cục (Layout) của Card `HistoryItem`
- **Vấn đề:** Hiện tại Câu hỏi, Badges (SEARCH/SUCCESS) và Metadata (Thời gian/Kết quả) đang nằm trên 3 dòng khác nhau với khoảng cách khá lỏng lẻo, tạo cảm giác thẻ bị rỗng và rời rạc.
- **Yêu cầu:** 
  - Giảm thiểu khoảng cách dọc (`gap-y`) giữa các thành phần.
  - Gom các Badges (Mode & Status) và Metadata (Ngày giờ, số lượng kết quả) lại cho liền mạch hơn. Có thể cho Badges nằm ngay sát dưới tiêu đề, và Metadata nằm dưới cùng với font chữ mờ hơn một chút để phân cấp thông tin rõ ràng.

### 2. Tinh chỉnh Typography và Nút "Play" (Run again)
- **Tiêu đề (Question):** Hãy cho tiêu đề nổi bật hơn (ví dụ: `text-zinc-100` hoặc sáng lên khi hover).
- **Nút Play:** Biểu tượng Play hiện tại hơi nhỏ và chìm. Hãy thiết kế lại nút này: có thể tạo một vùng bao quanh tròn mờ (background circle) khi hover vào, màu sắc chuyển sang `text-cyan-400` để tăng tính kêu gọi hành động (Call-to-Action).

### 3. Nâng cấp hiệu ứng tương tác (Hover & Micro-interactions)
- **Hover Thẻ:** Thêm các hiệu ứng chuyển động mượt mà khi người dùng di chuột vào thẻ. Thay vì chỉ đổi màu nền đơn điệu, hãy thêm một chút viền sáng nhẹ (`hover:border-zinc-600` hoặc viền gradient) để tạo cảm giác "glassmorphism" hiện đại.
- **Scale:** Có thể thêm hiệu ứng `active:scale-[0.98]` khi click vào thẻ để tạo cảm giác bấm vật lý.

### 4. Thiết kế lại phần Footer (View all investigations)
- **Vấn đề:** Phần footer chứa nút "View all investigations" hiện tại có nền đen thui hòa lẫn vào danh sách, trông rất nặng nề và cũ kỹ.
- **Yêu cầu:** 
  - Chuyển phần nền của Footer thành hiệu ứng kính mờ (Ví dụ: `bg-zinc-950/80 backdrop-blur-md`).
  - Thiết kế lại nút "View all" thành dạng Outline hoặc Ghost hiện đại hơn (có border sáng nhẹ, chữ khi hover phát sáng) thay vì một khối chữ nhật xám mờ nhạt.

### 5. Ánh sáng và Viền (Borders)
- Làm dịu các đường viền cứng (hard borders) của container. Sử dụng `border-zinc-800/50` thay vì các viền quá rõ nét để tạo không gian mở.
- Đảm bảo thanh cuộn (scrollbar) được style mỏng và tối giản để không làm rối mắt giao diện tổng thể.

> **Mục tiêu cuối cùng:** Giao diện phải mang lại cảm giác cực kỳ cao cấp (premium), mượt mà, sống động (dynamic) theo đúng chuẩn thiết kế UI/UX hiện đại năm 2026. Tận dụng tối đa TailwindCSS để tạo ra các tiểu tiết tinh tế nhất.
