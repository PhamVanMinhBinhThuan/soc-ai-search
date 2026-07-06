# Prompt: Refactor Sidebar Profile And Collapse UI

Role: Bạn là Senior Frontend Engineer chuyên React, TypeScript, Tailwind CSS và UI/UX cho SOC/SIEM dashboard dark theme.

Task: Refactor lại sidebar để nhìn cao cấp, gọn và cân đối hơn theo reference UI:

- `refactor_ui/sidebar.png`

Mục tiêu không phải copy 100%, mà làm sidebar hiện tại đẹp hơn, giống tinh thần trong ảnh: dark enterprise, cyber nhẹ, clean, không quá sặc sỡ.

## File Cần Kiểm Tra

Ưu tiên đọc và sửa các file liên quan sidebar:

- `frontend/src/components/soc/soc-sidebar.tsx`
- `frontend/src/App.tsx` nếu sidebar props/state nằm ở đây
- Các test liên quan nếu có, ví dụ:
  - `frontend/src/components/soc/soc-sidebar.test.tsx`
  - hoặc test render navigation/sidebar trong `App`

Không sửa backend trong task này.

## Vấn Đề Hiện Tại

Sidebar hiện tại đã dùng dark theme nhưng vẫn hơi đơn giản:

- Khu vực user profile và sign out chưa có cấu trúc card rõ.
- Nút Sign Out đang tách rời, chưa nằm trong profile card.
- Chưa có đường gạch/ngăn cách nhẹ phía trên khu vực người dùng như reference.
- Nút collapse sidebar hiện tại chưa đủ đẹp, mong muốn giống kiểu nút collapse của ChatGPT hơn: nhỏ, tinh tế, floating/attached vào cạnh sidebar, hover rõ.
- Màu sắc một số chỗ có thể cân bằng lại để dễ nhìn hơn, không quá chói.

## Yêu Cầu UI

### 1. Sidebar tổng thể

Giữ dark theme hiện tại, nhưng polish thêm:

- Background sidebar nên là navy/black sâu:
  - `bg-[#070b12]`, `bg-[#08111d]`, hoặc tương đương.
- Có border phải rõ hơn một chút để tách sidebar với màn hình chính:
  - `border-r border-cyan-300/15`
  - Có thể thêm glow rất nhẹ ở cạnh phải: `shadow-[8px_0_28px_-26px_#22d3ee]`.
- Không dùng màu quá sặc sỡ; chỉ nhấn cyan nhẹ ở active item, logo, collapse button.

### 2. Header logo SOC Console

Header sidebar giữ:

- Logo shield.
- Text `SOC Console`.
- Subtitle `Events Search`.

Polish:

- Logo có size vừa phải, glow nhẹ.
- Text rõ, đồng bộ với font/cỡ chữ toàn hệ thống.
- Khoảng cách trên/dưới cân đối.
- Khi sidebar collapsed, chỉ giữ icon/logo nếu logic hiện tại có collapsed mode.

### 3. Nút collapse sidebar

Refactor nút collapse để giống kiểu ChatGPT:

- Nằm gần cạnh phải của sidebar, có thể floating hoặc attached vào header area.
- Kích thước nhỏ gọn, ví dụ `size-8`.
- Rounded full hoặc rounded-xl.
- Border mảnh `border-slate-700/70` hoặc `border-cyan-300/20`.
- Background tối `bg-slate-950/80`.
- Icon chevron rõ nhưng không quá sáng.
- Hover:
  - border cyan rõ hơn.
  - background cyan nhẹ.
  - text/icon cyan sáng hơn.
- Có `aria-label` rõ:
  - `Collapse sidebar`
  - `Expand sidebar`

Không phá behavior collapse hiện tại.

### 4. Navigation items

Giữ đầy đủ các item hiện tại, không đổi route/behavior:

- Dashboard
- Event Search
- Investigations
- Query Library
- System Audit Logs

Polish nhẹ:

- Icon cùng kích thước/stroke visual.
- Active item có nền nổi bật nhưng không chói:
  - gradient nhẹ cyan -> transparent/navy.
  - border hoặc ring cyan nhẹ.
  - text cyan/white.
- Inactive item:
  - text slate.
  - hover có cyan background nhẹ.
- Không đổi quyền hiển thị hiện tại.

### 5. Profile card + Sign Out

Đây là phần quan trọng nhất.

Hiện tại user profile và Sign Out còn rời rạc. Hãy refactor thành một khu vực cuối sidebar giống reference:

```text
────────────────────────  đường gạch nhẹ

[AG avatar]  abc@gmail.com
             SOC_ADMIN

[icon logout] Sign Out
```

Yêu cầu:

- Có một đường gạch nhẹ phía trên khu vực profile:
  - `border-t border-cyan-300/10` hoặc `border-t border-slate-800`.
- Profile + sign out nằm trong cùng một card nhỏ.
- Card có:
  - background tối nhẹ: `bg-slate-950/55` hoặc `bg-cyan-950/10`.
  - border mảnh: `border-cyan-300/15`.
  - rounded `rounded-2xl`.
  - padding vừa phải.
- Avatar:
  - circle, chữ viết tắt user hiện tại.
  - cyan border/glow nhẹ.
- User email/name:
  - text chính rõ.
  - role nhỏ hơn, màu slate/cyan nhẹ.
- Sign Out:
  - nằm dưới logo + tên + role trong cùng card.
  - Dạng button full width hoặc inline trong card đều được, nhưng phải cân đối.
  - Có icon logout.
  - Hover:
    - nền rose/red rất nhẹ hoặc cyan subtle.
    - không quá đỏ/chói.
- Nếu sidebar collapsed:
  - Có thể chỉ hiển thị avatar và icon sign out compact.
  - Không làm layout vỡ.

### 6. Responsive / collapsed behavior

Không phá:

- Collapse/expand sidebar.
- Active navigation.
- Role-based visibility.
- Sign out behavior.
- Routing.

Nếu collapsed sidebar hiện tại có width nhỏ:

- Header text ẩn hợp lý.
- Nav labels ẩn hợp lý.
- Profile card chuyển sang compact hoặc chỉ avatar + logout icon.

### 7. Tone màu mong muốn

Ưu tiên palette:

- Background: `#070B12`, `#08111D`, `#0B1220`
- Card: `rgba(15,23,42,0.65)`
- Border: `rgba(34,211,238,0.14)`
- Active cyan: `#22D3EE`
- Text primary: `#F8FAFC`
- Text secondary: `#94A3B8`
- Danger/subtle logout: `#FB7185` hoặc red/rose opacity thấp

Không dùng gradient quá rực. Sidebar phải nhìn cao cấp, sạch, dễ đọc.

## Accessibility

- Collapse button có aria-label đúng.
- Sign out button có aria-label hoặc text rõ.
- Active navigation vẫn có visual state rõ.
- Keyboard focus visible không bị mất.

## Tests

Nếu có test sidebar, cập nhật test tương ứng.

Test tối thiểu nếu khả thi:

1. Render đủ nav item theo quyền hiện tại.
2. Sign Out vẫn gọi handler khi click.
3. Collapse button vẫn gọi toggle/collapse handler.
4. User identity/role vẫn hiển thị khi expanded.

Không cần snapshot test nặng.

## Verification

Chạy:

```bash
cd frontend
npm run lint
npm run test -- sidebar
npm run build
```

Nếu không có test sidebar cụ thể, chạy:

```bash
npm run test
```

hoặc ít nhất:

```bash
npm run lint
npm run build
```

## Kỳ Vọng Cuối Cùng

- Sidebar nhìn cao cấp hơn, giống tinh thần reference `refactor_ui/sidebar.png`.
- Có đường ngăn nhẹ phía trên khu vực user/profile.
- User profile và Sign Out nằm chung trong một card cuối sidebar.
- Sign Out nằm dưới avatar/email/role, không còn rời rạc.
- Collapse button đẹp hơn, tinh tế hơn, giống kiểu ChatGPT.
- Sidebar vẫn dễ nhìn, không quá sặc sỡ, không phá route/permission/collapse/sign out.
