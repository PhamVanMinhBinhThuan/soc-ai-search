# Prompt: Refactor SOC Sidebar Layout & Styling

**Role:** Bạn là Frontend Engineer chuyên React, TypeScript, Tailwind CSS và tối ưu UI/UX cho hệ thống SOC/SIEM.

**Task:** Nâng cấp cấu trúc và giao diện của thanh điều hướng (Sidebar) trong file `soc-sidebar.tsx`. Trọng tâm là thay đổi vị trí của "Admin Tools", đồng bộ hóa CSS với các mục khác, chỉnh lại thụt lề cho menu con, và đổi các ký tự đóng/mở thủ công sang Icon chuẩn.

## Bối Cảnh Hiện Tại

Project: `SOC AI Search`

File cần đọc và sửa:
- `frontend/src/components/soc/soc-sidebar.tsx`
- Tham khảo style từ: `frontend/src/components/soc/query-transparency.tsx` hoặc `frontend/src/components/soc/metrics-summary.tsx` (để xem cách dùng icon `ChevronUp`, `ChevronDown`).

Hiện trạng:
1. "Admin Tools" đang nằm ở dưới cùng của sidebar (`mt-auto`). Nút này được code cứng các class màu vàng (`bg-amber-400/8`, `border-amber-400/15`), làm cho nó lệch tông so với "Dashboard" hay "Investigations".
2. Các menu con (sub-menus) như "All Investigations", "Recent Queries", "System Audit Logs" và "Keycloak Console" đang dùng class `ml-9 border-l border-border/50 pl-2` để thụt lề, nhưng giao diện hiển thị chưa được mượt mà và tinh tế.
3. Các nút để đóng/mở (expand/collapse) của menu "Investigations" và "Admin Tools" đang dùng các ký tự chữ thủ công `'▼' : '▶'` trông khá thô, không giống chuẩn giao diện hiện tại của dự án.

## Mục Tiêu & Yêu Cầu Cụ Thể

### 1. Dời Vị Trí "Admin Tools"
- Cắt toàn bộ block code của "Admin Tools" từ vị trí dưới cùng (`mt-auto`).
- Dán nó lên nằm ngay bên dưới phần "Investigations", lọt lòng bên trong thẻ `<nav>` chính.
- Logic kiểm tra quyền (`adminVisible`) vẫn giữ nguyên.

### 2. Đồng Bộ Giao Diện (Styling)
- Xóa các class màu `amber` riêng biệt của "Admin Tools".
- Đưa nó về dùng chung bộ class chuẩn như "Dashboard" và "Investigations":
  - Mặc định: `text-muted-foreground hover:bg-secondary hover:text-foreground`.
  - Khi được chọn (active): `bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/25`.
- Xóa class `border border-amber-400/15` ra khỏi Admin Tools để nó không có viền thừa thãi.

### 3. Làm Đẹp Thụt Lề Sub-menu (Indentation)
- Hiện tại thẻ `div` bọc các menu con đang dùng `ml-9 mt-1 flex flex-col gap-1 border-l border-border/50 pl-2`. Điều này làm menu con bị thụt vào quá sâu (tổng offset = ml-9(36px) + pl-2(8px) + button px-3(12px) = 56px).
- Thay thế class của thẻ `div` bọc menu con thành: `ml-8 mt-1 flex flex-col gap-1`.
- Tại sao là `ml-8`? Vì menu cha có `px-3` (12px) + icon `size-5` (20px) + margin text `ml-3` (12px) = 44px. Khi thẻ `div` dùng `ml-8` (32px) và nút bên trong dùng `px-3` (12px) thì tổng cộng là 44px. Điều này giúp **Icon của menu con nằm thẳng hàng tuyệt đối với Chữ của menu cha**, tạo cảm giác phân cấp (hierarchy) cực kỳ tinh tế và đẹp mắt.
- Xóa bỏ cái viền (border-l) vì nó làm UI bị rườm rà.
- Đảm bảo các nút sub-menu vẫn giữ hiệu ứng hover mượt mà: `text-muted-foreground hover:bg-secondary hover:text-foreground`.

### 4. Cập Nhật Icon Đóng/Mở (Expand/Collapse)
- Loại bỏ hoàn toàn các chuỗi ký tự `'▼'` và `'▶'`.
- Import và sử dụng các icon từ `lucide-react`:
  - `ChevronDown` (khi đang mở - open)
  - `ChevronRight` hoặc `ChevronUp` (khi đang đóng - collapsed) tùy bạn thấy phù hợp nhất với chuẩn của hệ thống, nhưng nên tham khảo `AiSummaryCard` để cho đồng bộ.
- Kích thước icon nên vừa phải (`size-4` hoặc `size-3.5`).
- Nếu có thể, thêm hiệu ứng animation/transition mượt mà khi icon xoay/đổi trạng thái.

## Verification
- Chạy test frontend (`npm test` ở thư mục `frontend`) để đảm bảo không phá vỡ bất kỳ Unit Test nào liên quan đến Sidebar.
- Nếu test fail do selector query không tìm thấy "Admin Tools" vì đổi cấu trúc HTML, hãy cập nhật lại test cho đúng (ví dụ: `soc-sidebar.test.tsx`).
- Review giao diện thực tế bằng cách mở Sidebar và click vào các menu để xem trạng thái đóng/mở có mượt không, màu sắc active có đồng bộ là màu `cyan` không.
