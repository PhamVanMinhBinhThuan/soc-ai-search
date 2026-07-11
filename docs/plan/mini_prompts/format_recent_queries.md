# Prompt: Cải thiện giao diện (UI) cho Popup Recent Queries

**Role:** Bạn là Frontend Engineer chuyên React, TypeScript và Tailwind CSS. Bạn rất giỏi trong việc thiết kế UI tinh tế, tối giản (minimal) và đồng bộ.

**Task:** Refactor lại giao diện của popup "Recent Queries" (nằm trong file `history-sheet.tsx`) để gọn gàng hơn và đồng bộ với trang Investigations.

## Bối cảnh & Yêu cầu chi tiết

Hãy mở file `frontend/src/components/soc/history-sheet.tsx` và thực hiện các thay đổi sau:

### 1. Xóa Subtitle thừa ở Header
- **Vấn đề:** Hiện tại dưới tiêu đề "Recent Queries" đang có 2 dòng text giải thích rất dài: `"Quick access to recent history"` và `"Select an investigation to rerun it with the current page size."` làm cho popup trông chật chội.
- **Yêu cầu:** Hãy tìm và xóa hẳn 2 dòng chữ này đi để phần Header gọn gàng và tinh giản hơn.

### 2. Xóa Icon thừa & Thông số Latency
- **Vấn đề:** Trong mỗi thẻ (card) lịch sử query, đang có một cục Icon lịch sử to đùng ở bên trái tên câu hỏi. Bên cạnh đó, ở dòng thông số phía dưới còn hiển thị thêm thời gian phản hồi (latency, ví dụ `195ms`).
- **Yêu cầu:** 
  - Xóa bỏ Icon bên trái của câu hỏi (thường là cục tròn chứa icon History/Clock).
  - Xóa bỏ hiển thị thông số độ trễ (latency) ở góc dưới của mỗi thẻ (như cái đoạn có `ms` ấy).

### 3. Đồng bộ Typography với trang Investigations
- **Vấn đề:** Phông chữ, cỡ chữ (font size) và màu sắc của các câu hỏi trong popup chưa giống với danh sách ở trang Investigations, làm mất tính đồng nhất của ứng dụng.
- **Yêu cầu:** Hãy tham khảo cách style của list bên trang Investigations (ví dụ thẻ câu hỏi dùng `font-medium`, `text-sm`, `text-zinc-200`, hiển thị ngày giờ `font-mono text-xs text-zinc-500` có `Jul 1 03:25:55 AM`...). Chỉnh lại typography (class CSS của chữ) trong `history-sheet.tsx` sao cho y chang với style bên Investigations.

### 4. Nâng cấp tổng thể UI (Polish)
- **Yêu cầu:** Tối ưu hóa padding, border và các hiệu ứng hover của từng thẻ (card). 
- Đảm bảo popup trông thanh lịch, khoảng cách thoáng đãng và có cảm giác hiện đại hơn (bỏ đi các khối viền quá thô, dùng màu nền nhẹ nhàng khi hover giống như trang Investigations đang làm).

## Verification
- Sau khi chỉnh sửa, hãy chạy `npm run lint` và `npm test -- --run` để đảm bảo code vẫn pass các bài kiểm tra (lưu ý có thể cần sửa test nếu file test đang expect cái đoạn text bị xóa).
