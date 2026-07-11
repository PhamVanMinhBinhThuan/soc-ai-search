# Tối ưu giao diện Landing Page (Bản cập nhật mới)

Dựa trên UI hiện tại, phần Tiêu đề đang hiển thị chưa được cân đối và cụm "Zero-Trust Security Intelligence" đang làm phân tán sự tập trung. Hãy thực hiện các điều chỉnh sau trong file `soc-hero.tsx`:

### 1. Xóa Badge "Zero-Trust Security Intelligence"
- **Yêu cầu:** Xóa bỏ hoàn toàn thẻ `motion.div` chứa text "Zero-Trust Security Intelligence" và icon Sparkles nằm ngay phía trên Tiêu đề chính.

### 2. Cân chỉnh lại Tiêu đề chính (Title)
- **Vấn đề:** Chữ hiện tại đang quá to và việc ngắt dòng chưa hợp lý (chữ "Event Search" bị dính vào "for").
- **Yêu cầu:** 
  - **Giảm kích thước font chữ:** Đổi các class `text-5xl sm:text-6xl md:text-7xl` thành `text-4xl sm:text-5xl md:text-6xl` để Tiêu đề trông gọn gàng và cân đối hơn với màn hình.
  - **Để trên cùng 1 dòng duy nhất:** Hãy xóa các thẻ `<br />` hiện có để đưa toàn bộ cụm `AI-Powered Event Search for Security Teams.` lên hiển thị chung trên một dòng (1 hàng) duy nhất.
    *(Lưu ý: Đảm bảo chữ "Security Teams." vẫn giữ được hiệu ứng text gradient màu gradient-to-r từ cyan sang purple như cũ).*

### 3. Xóa nút "Explore Features" (Nếu chưa xóa)
- **Yêu cầu:** Đảm bảo nút CTA thứ hai mang tên "Explore Features" nằm cạnh nút "Access Console" đã bị xóa hoàn toàn.

### 4. Tinh chỉnh nút Đăng nhập góc phải
- **Yêu cầu:** Đảm bảo nút ở góc phải trên cùng đang hiển thị chữ **"Sign In"** (thay vì "Secure Login").

### 5. Tinh chỉnh Màn hình Loading (Sau khi login)
- **Vấn đề:** Màn hình chờ chuyển hướng sau khi đăng nhập bằng SSO/Keycloak đang hiển thị logo chữ "Z" lạ lẫm và dùng từ ngữ kỹ thuật ("Keycloak credentials").
- **Yêu cầu:** 
  - **Đổi Logo:** Thay icon chữ "Z" hiện tại bằng icon cái Khiên (Shield) của SOC AI Search để đồng bộ thương hiệu.
  - **Đổi Tiêu đề (Title):** Thay `Restoring Secure Session` thành **`Securing Your Connection`**
  - **Đổi Subtitle:** Thay `Verifying your Keycloak credentials...` thành **`Verifying your access permissions...`**

> Sau khi thực hiện xong các thay đổi, hãy chạy lại các lệnh lint và test để đảm bảo không có lỗi cú pháp hoặc tag đóng mở bị sai.
