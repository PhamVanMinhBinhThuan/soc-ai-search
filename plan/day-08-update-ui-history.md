# Day 08 - Prompt Cải Thiện UI Recent Investigations

```text
Tiếp tục cải thiện frontend SOC AI Search MVP.

Mục tiêu:
Nâng cấp UI/UX cho component Recent Investigations, ví dụ `HistorySheet` hoặc `HistoryList`, để panel history trông hiện đại, dễ quét thông tin và phù hợp Enterprise Dark Theme/SOC Console hiện tại.

Phạm vi:
- Chỉ thay đổi JSX/UI/CSS class của phần Recent Investigations.
- Giữ nguyên logic gọi API hiện tại:
  - `GET /api/v1/search/history?page=0&size=20`;
  - pagination;
  - loading/error/empty state;
  - click item để rerun query;
  - mock mode dùng history local.
- Không đổi backend API.
- Không đổi DTO contract.
- Không thêm dependency mới.
- Không thêm router hoặc state management library.

Đọc trước:
- `frontend/src/components/soc/history-sheet.tsx`
- `frontend/src/App.tsx`
- `frontend/src/types/soc.ts`
- `frontend/src/components/ui/sheet.tsx`
- `frontend/src/components/ui/button.tsx`
- `frontend/src/components/ui/badge.tsx`
- `frontend/src/components/ui/skeleton.tsx`

Yêu cầu UI/UX:

1. Sheet Layout
   - Giữ `Sheet`/Radix hiện tại để không phá focus management và accessibility.
   - Header cần rõ ràng:
     - title: `Recent Investigations`;
     - subtitle: mô tả ngắn rằng đây là query history của demo analyst;
     - icon lịch sử hoặc clock từ `lucide-react`.
   - Giữ footer pagination cố định ở đáy Sheet nếu phù hợp.
   - Danh sách history ở giữa phải scroll mượt, dùng `scrollbar-thin` nếu project đang có utility này.
   - Không gây horizontal overflow ở desktop hoặc mobile.

2. History Card Design
   - Mỗi history item là một card có thể click toàn bộ.
   - Dùng dark glass/card style:
     - background gần `bg-zinc-900/50` hoặc token tương đương trong theme hiện tại;
     - border `border-zinc-800` hoặc `border-border`;
     - rounded-xl;
     - padding đủ thoáng, ví dụ `p-4`.
   - Hover/focus:
     - `hover:bg-zinc-800/80` hoặc tương đương;
     - `hover:border-zinc-700` hoặc border cyan nhẹ;
     - `transition-all duration-200`;
     - `cursor-pointer`;
     - focus-visible ring rõ để dùng keyboard.
   - Có thể thêm active/selected visual nhẹ nếu item vừa rerun, nhưng không bắt buộc.

3. Information Hierarchy
   - Question là nội dung chính:
     - đặt trên cùng;
     - font semibold;
     - màu sáng, ví dụ `text-zinc-100` hoặc `text-foreground`;
     - `line-clamp-2` để câu dài không phá layout.
   - Metadata đặt phía dưới:
     - text nhỏ `text-xs`;
     - màu mờ `text-zinc-500` hoặc `text-muted-foreground`;
     - gồm created_at, result_count và latency_ms.
   - Dùng icon nhỏ từ `lucide-react`:
     - `Clock3` hoặc `Clock` cho thời gian;
     - `Zap`, `Timer` hoặc `Gauge` cho latency;
     - `List`, `Database`, `Rows3` hoặc `BarChart3` cho result count.
   - Giãn cách metadata bằng `flex`, `gap`, hoặc dấu chấm nhỏ `•`.
   - Với FAILED record, các field nullable phải render an toàn:
     - `mode = null` -> `UNKNOWN MODE` hoặc `N/A`;
     - `result_count = null` -> `No result count`;
     - `latency_ms = null` -> `latency n/a`.

4. Badges
   - Mode badge:
     - `SEARCH`: nền xanh/cyan mờ, ví dụ `bg-blue-500/10 text-blue-400 border border-blue-500/20`;
     - `AGGREGATION`: nền violet/cyan mờ khác SEARCH để dễ phân biệt;
     - mode null dùng badge trung tính.
   - Status badge:
     - `SUCCESS`: `bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`;
     - `FAILED`: `bg-rose-500/10 text-rose-400 border border-rose-500/20`.
   - Badge nhỏ gọn:
     - `text-[10px]` hoặc `text-xs`;
     - `px-2 py-0.5`;
     - `rounded-full` hoặc `rounded-md`.

5. Run Again Action
   - Không để icon Play trơ trọi.
   - Tạo ghost icon button ở góc phải card:
     - màu mặc định mờ, ví dụ `text-zinc-500`;
     - `hover:bg-zinc-700/70`;
     - `hover:text-zinc-100` hoặc cyan;
     - rounded-full hoặc rounded-lg;
     - transition mượt.
   - Button phải có:
     - `title="Run this query again"`;
     - `aria-label="Run this query again: {question}"`.
   - Click vào card hoặc button đều rerun query, nhưng tránh double-trigger bằng `event.stopPropagation()` nếu button nằm trong card.

6. Loading State
   - Khi đang fetch history, hiển thị skeleton card thay vì chỉ text.
   - Skeleton nên mô phỏng hình dạng history card:
     - icon circle;
     - 1-2 dòng question;
     - badge placeholder;
     - metadata placeholder.
   - Dùng `animate-pulse` hoặc component `Skeleton` sẵn có.
   - Vẫn có text nhỏ `Loading recent investigations...` với `aria-live` để accessibility tốt hơn.

7. Empty State
   - Empty state cần đẹp và hữu ích hơn:
     - icon `SearchX`, `History` hoặc `Inbox`;
     - title ngắn: `No investigations yet`;
     - mô tả: chạy một search để history xuất hiện ở đây.
   - Giữ tone dark, border dashed nhẹ.

8. Error State
   - Giữ Alert hiện tại nhưng làm rõ hơn:
     - title `History could not be loaded`;
     - hiển thị message/errors từ `UiError`;
     - nút Retry rõ ràng.
   - Không lộ stack trace, secret hoặc API key trong UI.

9. Pagination Footer
   - Footer hiển thị:
     - `Page X of Y`;
     - tổng số queries nếu có;
     - nút previous/next dạng icon button.
   - Disabled state rõ ràng khi ở trang đầu/cuối hoặc đang loading.
   - Footer không bị che mất nội dung trên mobile.

10. Responsive
   - Desktop: card thoáng, metadata có thể nằm một dòng.
   - Mobile: card vẫn đọc tốt, metadata wrap nhiều dòng nếu cần.
   - Không tạo horizontal scroll mới.
   - Sheet width giữ trong giới hạn hiện tại; không làm panel quá rộng.

11. Accessibility
   - Giữ keyboard navigation:
     - item focusable;
     - Enter/Space hoặc button click rerun query.
   - Focus ring rõ.
   - Loading area có `aria-live` hoặc text trạng thái.
   - Icon trang trí dùng `aria-hidden` nếu phù hợp.

12. Verification
   - Chạy:
     - `cd frontend`
     - `npm run lint`
     - `npm run build`
   - Nếu Docker đang chạy, mở `http://localhost:3000`, bấm Investigations và kiểm tra:
     - loading skeleton;
     - list card đẹp hơn;
     - SUCCESS/FAILED badges;
     - nullable field render an toàn;
     - rerun query hoạt động;
     - pagination hoạt động;
     - mobile layout không overflow.

Không triển khai:
- Không sửa backend.
- Không đổi API/history contract.
- Không thêm saved query.
- Không thêm filter/search trong history.
- Không thêm animation nặng hoặc dependency mới.
- Không sửa các màn hình khác ngoài phạm vi cần thiết của Recent Investigations.
```

