# Tối ưu UI Query Result: Đóng bộ lọc mặc định & Đổi tên Tab

Giao diện trang kết quả tìm kiếm (Query Result) hiện tại đang có 2 điểm cần tinh chỉnh để tối ưu không gian và làm cho ngôn từ (copywriting) thân thiện, chuyên nghiệp hơn. Hãy thực hiện các thay đổi sau:

### 1. Thu gọn (Collapse) phần "Filter & Sort" theo mặc định
- **Vấn đề:** Hiện tại, khi người dùng thực hiện xong một câu query, phần bộ lọc (Filter & Sort) đang được mở bung ra theo mặc định. Điều này chiếm khá nhiều diện tích màn hình hiển thị kết quả.
- **Yêu cầu:** Hãy đổi trạng thái mặc định của phần Filter & Sort thành **Đóng (Collapsed)**. Người dùng chỉ mở ra khi họ thực sự có nhu cầu lọc thêm. (Gợi ý: Tìm biến state quản lý việc đóng/mở này trong component kết quả, ví dụ `isExpanded` hoặc `showFilters`, và set giá trị khởi tạo mặc định là `false`).

### 2. Đổi tên Tab "Raw Events"
- **Vấn đề:** Cụm từ "Raw Events" (Sự kiện thô) nghe hơi mang tính kỹ thuật và khô khan đối với một giao diện SOC hiện đại.
- **Yêu cầu:** Hãy tìm tất cả những nơi (UI labels, Tab headers) đang hiển thị chữ "Raw Events" và đổi nó thành một trong các cụm từ chuyên nghiệp hơn dưới đây (hãy sử dụng cụm từ số 1 làm ưu tiên):
  1. **Event Logs** (Khuyến nghị: Ngắn gọn, chuẩn mực trong an toàn thông tin).
  2. **Matched Events** (Nhấn mạnh đây là các sự kiện khớp với câu hỏi).
  3. **Log Entries** (Tập trung vào từng dòng log).
  4. **Event Timeline** (Nếu dữ liệu được sắp xếp theo thời gian).

> **Mục tiêu:** Giúp giao diện kết quả hiển thị được nhiều data nhất có thể ngay từ cái nhìn đầu tiên, đồng thời sử dụng ngôn từ mượt mà hơn. Đừng quên chạy lại các bài test (ví dụ kiểm tra xem các test case có đang assert text "Raw Events" hay không để sửa lại cho đồng bộ).
