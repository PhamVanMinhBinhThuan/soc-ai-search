# Prompt: Polish Query Breakdown UI

## Role

Bạn là Senior Frontend Engineer chuyên React, TypeScript, Tailwind CSS và UI/UX cho SOC/SIEM dashboard dark theme.

## Bối cảnh

Hiện tại hệ thống đã có tab `Query Breakdown` trong:

- Search page / `Query Transparency`
- All Investigations detail
- System Audit Logs detail

Component chính:

- `frontend/src/components/soc/query-breakdown.tsx`

Các component tích hợp:

- `frontend/src/components/soc/query-transparency.tsx`
- `frontend/src/components/soc/investigations/investigation-detail-panel.tsx`

UI hiện tại hoạt động đúng nhưng chưa đủ đẹp và chưa đồng bộ typography với phần Search/Investigation detail. Tôi muốn polish lại phần này để nhìn enterprise hơn, gọn hơn, và dễ đọc hơn.

## Mục tiêu

Làm `Query Breakdown` nhìn đồng nhất với UI hiện tại của SOC AI Search:

- Cỡ chữ hài hòa với Search page và Investigation detail.
- Font weight vừa phải, không quá to hoặc quá nổi.
- Không làm card bị nặng/rối.
- Country code hiển thị thành tên quốc gia, nếu được thì kèm cờ.

## Files cần đọc trước

- `frontend/src/components/soc/query-breakdown.tsx`
- `frontend/src/components/soc/query-breakdown.test.tsx`
- `frontend/src/components/soc/query-transparency.tsx`
- `frontend/src/components/soc/investigations/investigation-detail-panel.tsx`
- `frontend/src/components/soc/country-code.tsx`
- `frontend/src/components/soc/result-tabs.tsx`
- `frontend/src/types/soc.ts`
- `docs/questions/Q2_synthetic_dataset.md`
- `scripts/seed-events.ps1`

## Yêu cầu UI

### 1. Đồng bộ typography

Điều chỉnh cỡ chữ, font weight, spacing của `Query Breakdown` để giống style tổng thể:

- Title `Query Breakdown`: dùng text size/weight giống title nhỏ trong các card hiện tại.
- Field label: nhỏ hơn value, màu muted, không quá nổi.
- Value: dễ đọc, không quá to, không quá dày.
- Table row spacing gọn hơn nếu hiện tại quá cao.
- Border/background vẫn giữ dark SOC theme.

Ưu tiên cảm giác giống các tab/detail hiện có hơn là tạo một style mới hoàn toàn.

### 2. Xóa subtitle

Xóa dòng:

```text
Human-readable SearchPlan fields
```

Không hiển thị subtitle này nữa ở cả Search page và detail pages.

### 3. Country code formatting

Hiện tại `country_code` đang hiển thị như:

```text
CN
VN
```

Hãy format thành tên quốc gia dễ hiểu hơn, tốt nhất kèm cờ.

Dataset mock hiện tại dùng các country code chính:

| Code | Display |
| --- | --- |
| `VN` | `🇻🇳 Vietnam` |
| `CN` | `🇨🇳 China` |
| `US` | `🇺🇸 United States` |
| `RU` | `🇷🇺 Russia` |
| `SG` | `🇸🇬 Singapore` |
| `DE` | `🇩🇪 Germany` |

Yêu cầu:

- Nếu field `country_code` là array, render dạng:

```text
🇨🇳 China, 🇻🇳 Vietnam
```

- Nếu có code lạ ngoài mapping, fallback:

```text
XX
```

hoặc:

```text
XX (Unknown)
```

Chọn cách gọn hơn, ưu tiên không làm UI xấu.

### 4. Reuse nếu đã có component country code

Kiểm tra file:

```text
frontend/src/components/soc/country-code.tsx
```

Nếu đã có helper/component format country code đẹp, reuse nó hoặc trích helper dùng chung.

Không duplicate mapping quá nhiều nơi nếu có thể tránh.

Nếu component hiện tại chỉ phù hợp table cell, có thể tạo helper riêng:

```ts
formatCountryCode(code: string): string
```

hoặc:

```ts
COUNTRY_DISPLAY
```

đặt ở nơi hợp lý như:

```text
frontend/src/lib/countries.ts
```

Nhưng giữ scope nhỏ, không refactor lan rộng.

### 5. Không phá logic hiện tại

Không được phá:

- Query Breakdown rows hiện có.
- Tab order: `Query Breakdown`, `Validated SearchPlan`, `Compiled DSL`.
- Empty state khi thiếu SearchPlan/DSL.
- SearchPlan edit.
- Compiled DSL view.
- Investigation/Audit detail.
- CSV export.
- Tests hiện có.

Không gọi API mới.
Không gọi LLM.
Không thay đổi backend.

## Test cần cập nhật

Cập nhật:

- `frontend/src/components/soc/query-breakdown.test.tsx`
- các test liên quan nếu bị ảnh hưởng.

Test tối thiểu:

1. `country_code = ["CN"]` hiển thị `China`.
2. `country_code = ["VN", "CN"]` hiển thị `Vietnam` và `China`.
3. Code lạ fallback không crash.
4. Subtitle `Human-readable SearchPlan fields` không còn xuất hiện.
5. Các test cũ về search/aggregation/date_histogram vẫn pass.

## Verification

Chạy:

```bash
cd frontend
npm run lint
npm run test -- query-breakdown.test.tsx query-transparency.test.tsx investigation-detail-panel.test.tsx
npm run build
```

## Kỳ vọng cuối cùng

Sau khi làm:

- Query Breakdown nhìn gọn, đẹp, đồng bộ với Search/Investigation UI.
- Không còn dòng `Human-readable SearchPlan fields`.
- Country hiển thị thân thiện hơn, ví dụ `🇨🇳 China` thay vì chỉ `CN`.
- Không thay đổi hành vi SearchPlan/DSL/audit/export.
