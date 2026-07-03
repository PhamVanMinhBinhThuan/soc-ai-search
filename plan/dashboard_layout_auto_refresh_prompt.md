# Prompt: Refine Dashboard Layout And Add 3-Minute Auto Refresh

## Role

Bạn là Senior Frontend Engineer chuyên React, TypeScript, Tailwind CSS và dashboard SOC/SIEM dark theme.

Hãy chỉnh lại trang Dashboard để layout đẹp hơn, đồng nhất hơn và có auto-refresh mỗi 3 phút khi người dùng vẫn đang ở trang Dashboard.

## File cần đọc kỹ

Frontend:

- `frontend/src/components/soc/dashboard/soc-dashboard.tsx`
- `frontend/src/components/soc/dashboard/kpi-cards.tsx`
- `frontend/src/components/soc/dashboard/events-over-time.tsx`
- `frontend/src/components/soc/dashboard/severity-distribution.tsx`
- `frontend/src/components/soc/dashboard/top-source-ips.tsx`
- `frontend/src/components/soc/dashboard/soc-dashboard.test.tsx`
- `frontend/src/App.tsx`
- `frontend/src/services/search-api.ts`
- `frontend/src/services/api-client.ts`
- `frontend/src/types/soc.ts`

Không cần thay backend.

## Bối cảnh hiện tại

Dashboard đang có:

- 4 KPI cards ở hàng đầu:
  - Events
  - Critical / High Events
  - Top Source IP
  - Failed Logins
- Bên dưới:
  - Events Over Time
  - Severity Distribution
  - Top Source IPs
- Header có:
  - `Last updated: 1:38:34 AM`
  - nút `Refresh`

Tôi muốn chỉnh layout:

1. `Top Source IP` và `Failed Logins` KPI card đi xuống hàng dưới.
2. Đẩy `Severity Distribution` lên để cùng nhóm với KPI cards, tạo cảm giác 5 khối thông tin cùng nằm trong một vùng tổng quan.
3. `Events Over Time` và `Top Source IPs` chiếm toàn chiều ngang màn hình.
4. Thêm dòng chữ kế bên trái `Last updated: ...`:

```text
Auto refresh every 3 minutes
```

5. Nếu người dùng vẫn ở Dashboard thì sau mỗi 3 phút tự refresh dữ liệu.

## Yêu cầu layout chi tiết

### 1. Header

Trong `SocDashboard`, khu vực header bên phải hiện có:

```text
Last updated: 1:38:34 AM   [Refresh]
```

Hãy đổi thành:

```text
Auto refresh every 3 minutes   Last updated: 1:38:34 AM   [Refresh]
```

Yêu cầu UI:

- Dòng `Auto refresh every 3 minutes` dùng text nhỏ, màu muted/zinc-500.
- Có thể thêm icon nhỏ `RefreshCcw`, `Clock`, hoặc `TimerReset` từ `lucide-react` nếu đẹp.
- Không làm header bị rối.
- Trên màn hình nhỏ, các text này có thể wrap hoặc ẩn bớt, nhưng nút `Refresh` vẫn dễ bấm.

### 2. Vùng overview phía trên

Thiết kế lại vùng overview để có 5 khối chính:

```text
Row 1:
[ Events ] [ Critical / High Events ] [ Severity Distribution ]

Row 2:
[ Top Source IP ] [ Failed Logins ] [ Severity Distribution continues if card spans rows ]
```

Gợi ý layout desktop:

```tsx
<section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:col-span-2">
    <Events KPI />
    <Critical High KPI />
    <Top Source IP KPI />
    <Failed Logins KPI />
  </div>

  <div className="xl:col-span-1">
    <SeverityDistribution />
  </div>
</section>
```

Ý nghĩa:

- Bên trái là 4 KPI cards theo lưới 2x2.
- Bên phải là `Severity Distribution`.
- Như vậy `Top Source IP` và `Failed Logins` nằm hàng dưới.
- `Severity Distribution` đứng cùng vùng overview với 4 KPI cards.

Yêu cầu:

- 4 KPI cards vẫn dùng component/pattern hiện tại nếu có thể.
- Không làm card quá cao/thấp lệch nhau.
- `Severity Distribution` nên có chiều cao tương đương tổng chiều cao 2 hàng KPI cards trên desktop.
- Trên tablet/mobile, layout stack dọc vẫn đẹp.

### 3. Events Over Time full width

`Events Over Time` phải nằm dưới vùng overview và chiếm toàn chiều ngang content container.

Ví dụ:

```text
[ Events Over Time full width ]
```

Yêu cầu:

- Không còn nằm cùng hàng với `Severity Distribution`.
- Chart có chiều cao đẹp, ví dụ `min-h-[340px]` hoặc tương đương.
- Giữ fix tránh Recharts warning:

```text
The width(-1) and height(-1) of chart should be greater than 0
```

Không xóa các guard `min-w-0`, `min-h`, `initialDimension` nếu đang có.

### 4. Top Source IPs full width

`Top Source IPs` cũng phải nằm dưới `Events Over Time` và chiếm toàn chiều ngang content container.

Ví dụ:

```text
[ Top Source IPs full width ]
```

Yêu cầu:

- Card có thể hiển thị top 5 IP thoáng hơn.
- Không bị bó hẹp 2/3 width như hiện tại.
- Nếu danh sách dài thì có scroll hợp lý, nhưng không làm trang nhảy layout xấu.
- Giữ style SOC dark theme hiện tại.

## Yêu cầu auto-refresh 3 phút

### 1. Tự refresh mỗi 3 phút

Trong `SocDashboard`, thêm interval:

```ts
const DASHBOARD_REFRESH_INTERVAL_MS = 3 * 60 * 1000
```

Khi người dùng vẫn ở Dashboard và `canFetchDashboard === true`, cứ mỗi 3 phút gọi lại `fetchData`.

Yêu cầu:

- Không gọi auto-refresh khi auth/token chưa sẵn sàng.
- Không gọi auto-refresh nếu component đã unmount.
- Không tạo nhiều interval khi re-render.
- Cleanup interval trong `useEffect`.
- Nếu request trước đang chạy (`refreshing === true`) thì không bắn thêm request mới chồng lên.
- Nút manual `Refresh` vẫn hoạt động như cũ.

Gợi ý:

```tsx
useEffect(() => {
  if (!canFetchDashboard) return

  const intervalId = window.setInterval(() => {
    if (refreshingRef.current) return
    const controller = new AbortController()
    void fetchData(controller.signal)
  }, DASHBOARD_REFRESH_INTERVAL_MS)

  return () => window.clearInterval(intervalId)
}, [canFetchDashboard, fetchData])
```

Nếu dùng `refreshing` trong interval, tránh stale closure bằng `useRef`.

### 2. Abort và cleanup

Nếu component unmount khi auto-refresh request đang chạy:

- Abort request nếu có thể.
- Không set state sau unmount.

Nếu đã có `AbortController` trong initial fetch, mở rộng pattern đó cho auto-refresh.

### 3. Last updated

Sau mỗi lần refresh thành công:

- Cập nhật `lastUpdated`.

Nếu refresh lỗi toàn bộ:

- Không cần cập nhật `lastUpdated` như thành công.
- Có thể giữ last updated cũ.
- Nếu lỗi 401 thì giữ behavior hiện tại: hiển thị unauthorized/session message.

## Không được làm

- Không thay đổi backend.
- Không xóa auth readiness gate đã fix trước đó.
- Không xóa token refresh retry ở `api-client.ts`.
- Không làm Dashboard gọi API khi user chưa authenticated/token chưa ready.
- Không làm interval chạy ở các page khác.
- Không tạo nhiều interval song song.
- Không làm Recharts warning width/height quay lại.

## Tests cần cập nhật

Cập nhật `frontend/src/components/soc/dashboard/soc-dashboard.test.tsx`.

Test tối thiểu:

1. Dashboard vẫn không fetch khi auth loading.
2. Dashboard vẫn không fetch khi access token chưa ready.
3. Dashboard fetch khi auth/token ready.
4. Hiển thị text:

```text
Auto refresh every 3 minutes
```

5. Auto-refresh gọi `executeSearchPlan` lại sau 3 phút khi Dashboard còn mounted.
   - Dùng fake timers của Vitest:

```ts
vi.useFakeTimers()
vi.advanceTimersByTime(3 * 60 * 1000)
```

6. Auto-refresh không gọi thêm nếu auth chưa ready.
7. Nếu component unmount, interval được cleanup.

Nếu test layout bằng DOM khó, chỉ cần assert các section/card title vẫn render:

- `Events`
- `Critical / High Events`
- `Top Source IP`
- `Failed Logins`
- `Severity Distribution`
- `Events Over Time`
- `Top Source IPs`

## Verification cần chạy

```bash
cd frontend
npm run lint
npm run test -- soc-dashboard.test.tsx
npm run build
```

Nếu thay đổi component dashboard nhiều, nên chạy thêm:

```bash
npm run test
```

## Acceptance Criteria

- Header hiển thị `Auto refresh every 3 minutes` cạnh `Last updated`.
- Sau mỗi 3 phút ở Dashboard, dữ liệu tự refresh.
- `Top Source IP` và `Failed Logins` KPI nằm hàng dưới trên desktop.
- `Severity Distribution` nằm cùng vùng overview với KPI cards.
- `Events Over Time` chiếm toàn chiều ngang.
- `Top Source IPs` chiếm toàn chiều ngang.
- Không còn warning Recharts `width(-1) and height(-1)`.
- Lint/test/build pass.

