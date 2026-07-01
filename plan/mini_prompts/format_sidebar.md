# Cập nhật thuật ngữ Sidebar

Dựa trên nguyên tắc thiết kế đồng bộ (Consistency), nút đăng nhập ở trang chủ hiện đang dùng từ **"Sign In"**. Do đó, nút đăng xuất ở thanh điều hướng bên trái (Sidebar) cũng cần được đổi tên tương ứng để tạo sự thống nhất về mặt thuật ngữ (Sign In / Sign Out).

### Yêu cầu thực hiện:
- **Mục tiêu 1:** Đổi chữ "Logout" thành **"Sign Out"** trên thanh Sidebar.
- **Mục tiêu 2 (Làm đẹp UI):** Nâng cấp giao diện của nút Sign Out này để trông nguy hiểm/quan trọng hơn (vì đây là hành động thoát phiên). Ví dụ: 
  - Thay đổi icon hiện tại (đang dùng `LogOut`) thành icon **`Power`** (nhập từ `lucide-react`).
  - Thêm hiệu ứng màu sắc khi di chuột (hover): Đổi màu chữ và icon sang màu đỏ/hồng nhạt (như `hover:text-rose-400 hover:bg-rose-500/10`) để tạo điểm nhấn khác biệt so với các menu thông thường.
- **Vị trí cần sửa:** Bạn hãy tìm thành phần Sidebar (nhiều khả năng nằm ở file `soc-sidebar.tsx`) và áp dụng các thay đổi trên.
- **Cập nhật Test:** Vì đã đổi text hiển thị ở giao diện, bạn NHẤT ĐỊNH phải kiểm tra lại file test tương ứng (ví dụ: `soc-sidebar.test.tsx`) để cập nhật lại các đoạn code bề mặt tìm kiếm phần tử theo text "Logout" thành "Sign Out" (nếu có).

> Sau khi code xong, hãy chạy lại các lệnh `npm run lint` và `npm test -- --run` để đảm bảo không làm gãy bất kỳ test case nào.
