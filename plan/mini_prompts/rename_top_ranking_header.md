# Prompt: Rename Top Ranking Header

Role: Bạn là Senior Frontend Engineer chuyên React, TypeScript, Tailwind CSS và UI/UX cho SOC/SIEM dashboard dark theme.

Task: Sửa text header trong phần chart ranking của trang Search để UI dễ hiểu hơn và không dùng thuật ngữ kỹ thuật.

File chính:

- `frontend/src/components/soc/aggregation-chart.tsx`

## Bối cảnh

Hiện tại khi query aggregation dạng `top_n` hoặc `group_by` theo các entity như `ip`, `user`, `host`, `source`, UI đang hiển thị ranking card với title/subtitle kiểu:

```text
Threat Ranking
Top buckets by ip
```

Text này chưa phù hợp vì:

- `Threat Ranking` có thể làm người dùng hiểu nhầm rằng hệ thống kết luận entity đó chắc chắn là threat.
- `Top buckets by ...` là thuật ngữ kỹ thuật của aggregation/Elasticsearch, không thân thiện với analyst.
- Khi field là `user`, `host`, `source`, title cũ càng dễ gây hiểu nhầm.

## Yêu cầu thay đổi

1. Đổi title của ranking card thành:

```text
Top Results
```

2. Xóa hoàn toàn subtitle:

```text
Top buckets by ...
```

Không thay bằng subtitle khác.

3. Giữ nguyên các phần còn lại:

- Danh sách rank `#1`, `#2`, ...
- Entity key, ví dụ IP/user/host/source.
- Count value.
- Progress bar.
- Màu sắc, border, glow, hover state.
- Logic chỉ dùng ranking card cho các field `ip`, `user`, `host`, `source`.

4. Không dùng thanh cuộn riêng trong card `Top Results`.

Hiện tại ranking card có thể đang dùng chiều cao cố định và `overflow-y-auto`, làm xuất hiện scrollbar bên trong chart. Hãy bỏ scrollbar nội bộ này.

Yêu cầu:

- Card `Top Results` tự giãn chiều cao theo số lượng item.
- Không dùng `h-80` nếu nó làm card bị cắt nội dung.
- Có thể dùng `min-h-80` để giữ chiều cao tối thiểu đẹp.
- Không dùng `overflow-y-auto` cho danh sách ranking.
- Không dùng `overflow-hidden` nếu nó làm mất item hoặc cắt shadow/glow.
- Với Top 5, Top 10 hoặc Top 20, hiển thị toàn bộ item trong flow của trang.

Lý do:

- Tránh UX cuộn hai tầng: cuộn trang + cuộn trong card.
- Khi demo, người dùng nhìn được toàn bộ ranking rõ ràng hơn.
- `Top Results` là kết quả chính của aggregation, nên không nên bị giấu trong scrollbar nhỏ.

5. Không thay đổi behavior của:

- Line chart.
- Number/count card.
- Bar chart dọc cho `severity`, `event_type`, `country_code`, ...
- Summary Table.
- Export CSV.
- Pagination.

## Test/Verification

Nếu có test đang assert text cũ, cập nhật lại:

- Không còn `Threat Ranking`.
- Không còn `Top buckets by`.
- Có `Top Results`.

Chạy:

```bash
cd frontend
npm run lint
npm run test -- aggregation-chart result-tabs
npm run build
```

Kỳ vọng cuối cùng:

- Ranking card chỉ hiển thị title `Top Results`.
- UI không còn dùng chữ `Threat Ranking` hoặc `bucket`.
- Card `Top Results` không có scrollbar riêng và hiển thị toàn bộ ranking item.
- Không làm thay đổi dữ liệu hoặc logic chart.
