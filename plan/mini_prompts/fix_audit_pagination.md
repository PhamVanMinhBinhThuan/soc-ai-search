# Prompt: Fix Pagination Position in Audit Logs

**Role:** Bạn là Frontend Engineer chuyên React, TypeScript và Tailwind CSS.

**Task:** Sửa lỗi giao diện phân trang (Pagination) ở trang Audit Logs bị đẩy xuống tít dưới cùng của màn hình thay vì nằm ngay sát dưới bảng dữ liệu.

## Bối cảnh & Nguyên nhân lỗi (Bug Context)
- Ở trang `AuditLogsPage` (`frontend/src/components/soc/admin/audit-logs-page.tsx`), hiện tại khi bảng chỉ có vài dòng dữ liệu (ví dụ trang cuối cùng hoặc khi filter ra ít kết quả), thanh điều hướng trang (Page 1 of X) lại nằm bám chặt vào đáy màn hình.
- Lỗi này xảy ra do thẻ bọc phân trang đang nằm **bên ngoài** thẻ `div` chứa class `flex-1 overflow-y-auto`. Vì `flex-1` chiếm toàn bộ khoảng trống còn lại, nó vô tình đẩy thẻ phân trang xuống đáy cục bộ.

## Yêu cầu sửa lỗi

### 1. Ở trang Audit Logs (Pagination nằm tít dưới đáy màn hình)
1. Mở file `frontend/src/components/soc/admin/audit-logs-page.tsx`.
2. Tìm khối code render Pagination (đang nằm bên dưới thẻ đóng `</div>` của thẻ div có class `min-h-0 flex-1 overflow-y-auto`).
3. **Di chuyển toàn bộ khối code `{totalPages > 1 && ( <Pagination /> )}` vào MẶT TRONG của thẻ `<div className="min-h-0 flex-1 overflow-y-auto">`**. 
   - Nhờ vậy, cục phân trang sẽ cuộn (scroll) cùng với bảng và luôn bám dính sát ngay dưới dòng data cuối cùng, thay vì trôi nổi ở đáy màn hình.

### 2. Ở trang Investigations (Pagination bị trôi tuột xuống dưới cùng khi cuộn)
- **Vấn đề:** Trái ngược với Audit, ở trang Investigations khi bấm mở Detail Panel, nếu danh sách dài thì cục phân trang bị trôi tụt hẳn xuống dưới, bắt người dùng phải cuộn (scroll) hết danh sách thì mới thấy phân trang.
- **Yêu cầu:** Mở file `frontend/src/components/soc/investigations/investigations-master-list.tsx`. 
- Sửa lại cấu trúc HTML/CSS để cục phân trang **luôn được ghim (sticky) cố định trên màn hình** (giống như behavior của Audit log lúc trước), tức là người dùng có cuộn danh sách lên xuống thì cục phân trang vẫn đứng yên ở vị trí dưới cùng của danh sách để có thể bấm next page bất cứ lúc nào. (Có thể xử lý bằng cách để Pagination nằm ngoài `overflow-y-auto` hoặc dùng `sticky bottom-0`).

## Verification
- Sau khi code xong, hãy chạy `npm run lint` và test lại giao diện. Đảm bảo khi số lượng log ít (vd: 3 dòng), cục phân trang nằm ngay dưới dòng thứ 3 chứ không tụt xuống cuối màn hình.

### 3. Hiển thị đầy đủ Ngày + Giờ (Timestamp)
- **Vấn đề:** Hiện tại ở phần Detail Panel bên phải (ngay dưới câu hỏi) của cả 2 trang chỉ hiển thị Giờ mà không có Ngày. Tương tự, ở phần danh sách các query bên trái (khi thu gọn màn hình) cũng chỉ đang hiện Giờ.
- **Yêu cầu:** Sửa lại hàm format thời gian ở các vị trí này (trong `investigation-detail-panel.tsx`, `investigations-master-list.tsx`, v.v.) để luôn hiện đầy đủ cả Ngày và Giờ (Ví dụ: `Jul 1 03:25:55 AM`) cho người dùng dễ quan sát.

### 4. Dọn dẹp Text thừa ở trang Audit Logs
- **Vấn đề:** Ở trang Audit Logs, ngay dưới title "System Audit Logs" đang có dòng text phụ hiển thị tổng số lượng (ví dụ: `"432 total queries"`).
- **Yêu cầu:** Mở file `audit-logs-page.tsx` và xóa dòng text (thẻ `<p>`) hiển thị `"432 total queries"` này đi để Header gọn gàng hơn.

### 5. Xóa nút "Back" trên Header
- **Vấn đề:** Ở trên cùng của trang Investigations và trang Audit Logs đang có nút mũi tên quay lại ("Back to search" / icon `ArrowLeft`).
- **Yêu cầu:** Xóa hoàn toàn nút mũi tên quay lại (thường là `<Button variant="ghost">` bọc `<ArrowLeft>`) nằm ở phần `<header>` của cả 2 file `investigations-page.tsx` và `audit-logs-page.tsx`.

### 6. Đồng bộ Kích thước Font chữ của Title Header
- **Vấn đề:** Hiện tại phần text Tiêu đề trang (ví dụ chữ "SOC Console", "Investigations", "System Audit Logs" ở Header) đang có kích thước (font size) to nhỏ không đều nhau giữa các trang.
- **Yêu cầu:** Hãy format lại CSS (class `text-xx` hoặc `text-xl`) cho các thẻ `<h1>` (chứa tiêu đề) ở Header của tất cả các trang này sao cho chúng có cùng một kích cỡ chữ hoàn toàn bằng nhau và đồng nhất.
