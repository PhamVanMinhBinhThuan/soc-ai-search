# Mini Prompt - UI Pagination, Logout Polish, and Keycloak Logout Fix

Hãy cải thiện một số điểm UX nhỏ trong SOC AI Search UI và sửa lỗi logout Keycloak đang chặn người dùng đăng xuất.

Mục tiêu:
- Làm bảng kết quả gọn hơn để demo dễ nhìn.
- Làm nút Logout đồng bộ phong cách với nút Secure Login.
- Sửa dứt điểm lỗi logout Keycloak `We are sorry... Invalid redirect uri` khiến user không logout được.

Yêu cầu cụ thể:
1. Giảm pagination mặc định của bảng kết quả search/raw events từ 20 xuống 10 item mỗi trang.
   - Áp dụng cho request mặc định khi user search từ UI.
   - Áp dụng cho pagination state nếu frontend đang giữ `size = 20` mặc định.
   - Không sửa backend max size guardrail 100.
   - Không làm ảnh hưởng export CSV, vì export vẫn dựa trên query_id/backend replay.
2. Với aggregation summary table hoặc bảng hiển thị `aggregation_results`, nếu đang phân trang 20 item mỗi trang thì đổi thành 10 item mỗi trang.
   - Nếu hiện tại table không phân trang mà chỉ render toàn bộ bucket, hãy thêm giới hạn/pagination UI đơn giản 10 item mỗi trang nếu dữ liệu có nhiều hơn 10 item.
   - Chart vẫn có thể dùng toàn bộ `aggregation_results` nếu đang cần vẽ đủ dữ liệu; chỉ bảng summary cần gọn hơn.
3. Recent Investigations/History Sheet đổi pagination từ 20 investigation mỗi trang xuống 5 investigation mỗi trang.
   - Frontend gọi API history với `size = 5`.
   - UI footer/page label phải phản ánh đúng số item/page.
   - Không sửa backend default nếu không cần; ưu tiên đổi ở frontend request.
4. Nút Logout hiện tại chưa đẹp. Hãy restyle nút Logout để đồng bộ với nút `Secure Login` trên landing page:
   - border `border-zinc-700/80` hoặc tương đương;
   - background trong suốt hoặc `bg-zinc-900/40`;
   - text `text-zinc-300`;
   - hover sáng lên với cyan tint: `hover:border-cyan-400/60`, `hover:bg-cyan-400/10`, `hover:text-white`;
   - có icon logout từ `lucide-react`;
   - giữ accessible label rõ ràng.
5. Sửa lỗi logout Keycloak `We are sorry... Invalid redirect uri`.
   - Đây là bug bắt buộc phải sửa, không phải optional.
   - Hiện tại user bấm Logout nhưng Keycloak trả lỗi `Invalid redirect uri`, nên luồng đăng xuất không hoàn tất.
   - Kiểm tra cấu hình frontend OIDC logout redirect đang dùng biến môi trường nào.
   - Đảm bảo `post_logout_redirect_uri` trỏ về URL hợp lệ của app, ví dụ `https://soc-ai-search.app` khi deploy.
   - Với local dev, vẫn hỗ trợ `http://localhost:3000`.
   - Kiểm tra `frontend/src/auth/auth-config.ts`, `frontend/src/auth/auth-context.tsx`, `.env.example`, `frontend/.env.example`, và realm export Keycloak.
   - Client `soc-ai-search-frontend` trong realm export phải cho phép post logout redirect URI tương ứng.
   - Nếu thư viện `react-oidc-context` cần truyền cấu hình khác cho logout redirect, hãy cập nhật đúng theo API của thư viện.
   - Không hardcode domain production trong code React; dùng env var và fallback hợp lý.
6. Không customize giao diện login Keycloak trong task này.
7. Không ghi thêm tài liệu về custom Keycloak theme trong task này.
8. Không sửa backend API contract.
9. Không thay đổi auth/RBAC behavior.
10. Không thay đổi luồng search, history, export ngoài pagination size ở frontend.

Thêm test nếu có thể:
- Search request mặc định từ UI dùng `size = 10`.
- Recent Investigations gọi history API với `size = 5`.
- Logout button vẫn render và gọi `signOut` khi click.
- Auth config dùng đúng `post_logout_redirect_uri` từ env.
- Realm export chứa logout redirect hợp lệ cho local và production.

Chạy verify:
- `npm test` trong frontend.
- `npm run build` trong frontend.

Báo lại:
- File đã sửa.
- Cách test logout redirect trên local.
- Cách test logout redirect trên deploy `https://soc-ai-search.app`.
