# Prompt: Giao diện và Bố cục cho Investigations & Audit Logs

**Role:** Bạn là Frontend Engineer chuyên React, TypeScript, Tailwind CSS và UI/UX cho hệ thống SOC.

**Task:** Đồng bộ hóa giao diện giữa hai trang `InvestigationsPage` và `AuditLogsPage`, đồng thời điều chỉnh lại một số text, định dạng thời gian và layout chia màn hình để tạo trải nghiệm đồng nhất và đẹp mắt nhất.

## Các Yêu Cầu Cụ Thể

### 1. Dọn dẹp Text thừa ở trang Investigations
- **File:** `frontend/src/components/soc/investigations/investigations-page.tsx`
- **Yêu cầu:** Xóa dòng text subtitle `"Audit-backed query history and playbooks"` (nằm dưới title `Investigations`). Xóa thẻ `<p>` chứa dòng text này để phần header gọn gàng hơn.

### 2. Thêm ký hiệu bóng đèn (Tip) ở trang Audit
- **Vấn đề:** Ở trang Audit Logs, dòng text `"Tip: Click on any row to view full details"` đang thiếu biểu tượng bóng đèn.
- **Yêu cầu:** Thêm ký hiệu bóng đèn (emoji `💡` hoặc dùng icon `Lightbulb` từ `lucide-react`) vào trước chữ Tip ở trang `AuditLogsPage` sao cho giống hệt với trang `All Investigations`.

### 3. Đồng bộ Typography (Phông chữ, cỡ chữ)
- User rất thích font chữ và cỡ chữ của trang **Investigations**.
- **Yêu cầu:** Review lại các thẻ table header `<thead>`, thẻ row `<tr>`, các đoạn text hiển thị thông tin ở trang `AuditLogsPage` và format lại toàn bộ typography (kích thước `text-sm`, `text-xs`, màu sắc `text-zinc-400`, `font-medium`, `font-mono`...) sao cho **giống hệt** với style của list bên trang `Investigations`.

### 4. Chuẩn hóa Cột Thời gian (Timestamp)
- **File:** `frontend/src/components/soc/investigations/investigations-master-list.tsx`
- **Yêu cầu:** 
  - Đổi tên cột hiển thị thời gian (nếu có nhãn) hoặc khái niệm thời gian thành **"Timestamp"** giống như bên Audit.
  - Cập nhật hàm format thời gian bên Investigations để hiển thị **cả Ngày tháng và Giờ** (Ví dụ: `Jul 1 03:25:55 AM`). Hiện tại có thể nó chỉ đang hiển thị giờ (ví dụ `03:25:55 AM`) hoặc format chưa đẹp.
  - Đảm bảo cột Timestamp ở cả hai trang (Investigations và Audit) dùng chung style `font-mono text-xs text-zinc-500` (hoặc tương tự) để nhìn chuyên nghiệp.

### 5. Vị trí và Hiển thị Pagination (Phân trang)
- **Vấn đề 1:** Hiện tại cục phân trang (`Page 1 of ...`) bị ghim sát vào đáy màn hình, trông rất rời rạc.
- **Yêu cầu 1:** Sửa lại CSS để cục Pagination này nằm **ngay sát dưới bảng (Table)** thay vì bị đẩy xuống đáy tuyệt đối.
- **Vấn đề 2:** Khi bấm xem chi tiết (Mở Detail panel) ở trang **Investigations**, phần phân trang lại bị biến mất (do logic check `expanded`). Trong khi ở trang Audit, phân trang vẫn hiện.
- **Yêu cầu 2:** Đảm bảo **phân trang luôn hiện** ở cả 2 trang ngay cả khi màn hình bị chia đôi (Detail panel đang mở).

### 6. Cấu trúc chia đôi màn hình (Split Layout) ở Audit Logs
- **Vấn đề:** Khi click xem chi tiết:
  - Ở trang **Investigations**: Màn hình chia 2 phần **ngay từ thanh Search Question** (thanh search thu hẹp lại).
  - Ở trang **Audit Logs**: Màn hình chỉ chia 2 phần **ở bên dưới thanh Filter** (thanh search vẫn dài 100%).
- **Yêu cầu:** 
  - Cắt toàn bộ cụm **Search input và Filter dropdowns** ở trang Audit và di chuyển nó **vào bên trong cột bên trái** (cột chứa table, đang chiếm 35% khi mở detail).
  - Mục tiêu để khi mở Detail Panel, thanh Search/Filter của Audit Logs cũng bị thu hẹp lại nằm trọn trong 35% bên trái y như `InvestigationsPage`.

### 7. Thanh cuộn (Scrollbar) ở Cột danh sách bên trái (Investigations)
- **Vấn đề:** Khi mở Detail Panel ở trang **Investigations**, cột danh sách bên trái (chứa các record) bị mất thanh cuộn (không thể scroll) và cũng bị mất luôn cục phân trang (Pagination). Trong khi đó, ở trang Audit History thì cột bên trái vẫn cuộn được bình thường.
- **Yêu cầu:** Cấu trúc lại CSS của cột danh sách bên trái trong file `investigations-master-list.tsx` (hoặc `investigations-page.tsx`) sao cho cột này **luôn có thanh cuộn độc lập (overflow-y-auto)** và **luôn giữ lại phần phân trang** ngay cả khi Detail Panel đang mở (khi màn hình bị chia đôi).

## Verification
- Chạy `npm run lint` và `npm test -- --run` để đảm bảo code không bị lỗi.
- Đảm bảo sau khi sửa, cả 2 trang mở lên có cảm giác như "anh em sinh đôi", chung 1 bộ CSS và behavior khi bấm xem chi tiết.
