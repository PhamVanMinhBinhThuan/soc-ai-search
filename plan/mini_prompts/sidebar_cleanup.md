# Mini Prompt - Sidebar Cleanup

Hãy tối giản sidebar của SOC AI Search UI.

Mục tiêu:
- Giữ sidebar gọn hơn, chỉ hiển thị những mục đang có luồng sử dụng thật trong MVP.
- Xóa các mục thừa hoặc chưa có chức năng.
- Không thay đổi layout tổng thể, dark mode, logic auth, hoặc luồng điều hướng hiện tại.

Yêu cầu cụ thể:
1. Loại bỏ toàn bộ các menu item không còn dùng trong MVP hiện tại, bao gồm:
   - Overview
   - Alerts
   - Network Map
   - AI Analyst
   - Settings
   - Help & Support
2. Chỉ giữ lại những mục điều hướng còn thực sự được dùng trên UI hiện tại.
3. Nếu còn badge đếm số lượng như Alerts thì xóa luôn cùng với menu item đó.
4. Khi sidebar đang collapsed, giữ nguyên hành vi hiện có.
5. Không thêm menu mới.
6. Không sửa API, không sửa auth, không sửa backend.
7. Không thay đổi icon set hiện có trừ khi cần để xóa mục thừa.
8. Giữ khoảng cách, căn lề và phong cách hiện có của sidebar sau khi rút gọn.
9. Nếu có component hoặc dữ liệu menu riêng, hãy xóa luôn phần cấu hình không còn được render để code sạch hơn.
10. Sau khi xóa các mục thừa, rút gọn luôn khoảng trống dọc trong sidebar để phần còn lại không bị lệch hoặc để trống quá nhiều.
11. Nếu sidebar đang có spacer/flex spacer hoặc margin-bottom quá lớn để đẩy các mục xuống dưới, hãy điều chỉnh lại cho cân đối hơn.
12. Đảm bảo khu vực logo, các item còn lại, và footer user block vẫn thẳng hàng đẹp mắt sau khi cleanup.

Thêm test nếu có thể:
- Sidebar không còn hiển thị Overview.
- Sidebar không còn hiển thị Alerts.
- Sidebar không còn hiển thị Network Map.
- Sidebar không còn hiển thị AI Analyst.
- Sidebar không còn hiển thị Settings.
- Sidebar không còn hiển thị Help & Support.
- Các mục còn lại vẫn hiển thị bình thường.
- Sidebar sau cleanup không còn khoảng trống dọc thừa quá lớn.

Chỉ tập trung vào sidebar cleanup, không refactor toàn bộ frontend.
