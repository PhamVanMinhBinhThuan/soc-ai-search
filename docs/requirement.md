Đề tài: Xây dựng tính năng Tìm kiếm Event bằng AI cho SOC Platform

Mô tả
  Là một thành phần của SOC Platform, giúp analyst tìm kiếm, **thống kê** và điều tra event/alert bằng **ngôn ngữ tự nhiên** thay vì viết query phức tạp (KQL, SQL, Elasticsearch DSL). Hệ thống nhận câu hỏi tự nhiên (tiếng Việt/Anh), tự động sinh query (tìm kiếm hoặc thống kê), thực thi trên kho event, tóm tắt kết quả và gợi ý hướng điều tra tiếp theo.
  
  Đề tài được chia thành **2 mức**:
  - **Mức Bắt buộc (MVP)**: phạm vi tối thiểu cần hoàn thành.
  - **Mức Khuyến khích**: phần mở rộng, khuyến khích hoàn thành.
  
  ---
## I. MỨC BẮT BUỘC (MVP)
  
  ### 1. Lưu trữ và Indexing Event
  - Index event vào **Elasticsearch / OpenSearch / ClickHouse** cho tìm kiếm full-text, phép thống kê / aggregation hiệu năng cao
  - Schema event tối thiểu: `timestamp`, `source`, `severity`, `event_type`, `user`, `host`, `ip`, `message`, `raw`.
  - Có **sample dataset** (≥ 10.000 event) để demo end-to-end.
  - API ingest event qua REST.
  
  ### 2. Tìm kiếm và Thống kê bằng ngôn ngữ tự nhiên (NL → Query)
  - Nhận câu hỏi tự nhiên (tiếng Việt hoặc tiếng Anh) cho cả 2 dạng:
  - **Tìm kiếm**: *"Show me failed login attempts from China in the last 24h"*.
  - **Thống kê**: *"Đếm số lần login thất bại theo từng user trong 7 ngày qua"*, *"Top 10 IP có nhiều alert nhất tháng này"*, *"Số event theo giờ trong 24h qua"*.
  - Sử dụng **LLM** (OpenAI / Claude / Gemini / model local) để chuyển sang **Elasticsearch DSL / KQL/ ClickHouse SQL** (search)
  - Hiển thị **cả query gốc và query đã sinh** cho người dùng (transparency).
  - Hỗ trợ filter cơ bản: khoảng thời gian, severity, event type, user, host, IP.
  - Hỗ trợ phép thống kê cơ bản: `COUNT`, `GROUP BY`, `TOP N`, time bucket (theo phút / giờ / ngày).
  
  ### 3. Thực thi và Hiển thị kết quả
  - Thực thi query sinh ra, tự động chọn engine phù hợp.
  - Kết quả tìm kiếm: bảng có pagination, trang chi tiết 1 event hiển thị toàn bộ field + raw log.
  - Kết quả thống kê: hiển thị bằng **biểu đồ phù hợp** (bar chart, pie chart, time-series line chart) bên cạnh dạng bảng.
  - Cho phép **export kết quả** sang CSV.
  
  ### 4. Tóm tắt kết quả (Summarization)
  - Tóm tắt tập kết quả bằng LLM: số event, top user/host/IP, đặc điểm nổi bật.
  - Trình bày kết quả tóm tắt ngắn gọn (3-5 câu) phía trên bảng kết quả.
  
  ### 5. Giao diện
  - Search box nhập câu hỏi tự nhiên.
  - Hiển thị: tóm tắt LLM → query đã sinh → bảng kết quả.
  - Lịch sử các câu truy vấn gần đây của người dùng.
  
  ### 6. Yêu cầu phi chức năng
  - Đóng gói triển khai với **Docker Compose**.
  - REST API có tài liệu **OpenAPI/Swagger**.
  - **Audit log** mọi truy vấn (ai, khi nào, query gì, kết quả bao nhiêu).
  - Unit test + integration test, coverage tối thiểu **50%**.
  
  ---
  
  ## II. MỨC KHUYẾN KHÍCH (mở rộng)
  
  ### A. Hội thoại đa lượt (Multi-turn)
  - Hỗ trợ câu hỏi nối tiếp có ngữ cảnh, ví dụ: *"Show me failed logins"* → *"Chỉ lọc từ phòng tài chính"* → *"Trong tuần trước thì sao?"*.
  - Lưu lịch sử hội thoại theo session.
  - Cho phép người dùng pin / lưu lại hội thoại quan trọng.
  
  ### B. Tìm kiếm ngữ nghĩa (Semantic Search)
  - Sinh **vector embedding** cho event (text-embedding hoặc model open-source: BGE, E5).
  - Lưu vào **vector database** hoặc Elasticsearch dense_vector field.
  - Tìm event **tương tự** 1 event cho trước (kNN search).
  - Kết hợp **hybrid search** (BM25 + vector) để cải thiện độ chính xác.
  
  ### C. Gợi ý câu truy vấn (Query Suggestion)
  - Auto-complete khi gõ câu hỏi.
  - Gợi ý **câu hỏi tiếp theo** dựa trên kết quả hiện tại (ví dụ: sau khi xem failed login → gợi ý "Xem các host bị ảnh hưởng").
  - Thư viện **template playbook** điều tra: "lateral movement", "data exfiltration", "privilege escalation"...
  
  ### D. Phát hiện bất thường trong kết quả
  - Highlight các outlier (event lệch khỏi pattern bình thường).
  - Phát hiện cụm event (clustering) trong kết quả.
  - Đánh dấu các event nghi ngờ cao kèm lý do.
  
  ### D2. Thống kê và Dashboard nâng cao
  - Hỗ trợ aggregation phức tạp: `percentile`, `cardinality` (distinct count), `avg/sum/min/max`, multi-level group by.
  - **Pivot table** đa chiều (ví dụ: severity × source × ngày).
  - **Saved query** và **saved dashboard**: cho phép người dùng lưu lại câu hỏi / biểu đồ để xem lại.
  - Dashboard tổng quan SOC (top user, top IP, time-series alert, severity distribution) sinh tự động từ câu hỏi tự nhiên.
  - Cập nhật thống kê **real-time** (auto-refresh hoặc streaming).
  
  ### E. Đánh giá chất lượng truy vấn (Query Quality)
  - Tạo **bộ test** ≥ 50 cặp câu hỏi - query mong muốn.
  - Đánh giá độ chính xác của LLM (precision/recall, exact match).
  - Cơ chế feedback: người dùng đánh dấu query đúng/sai, dùng để fine-tune prompt.
  
  ### F. Triển khai production-grade
  - Đóng gói **K8S** (Helm chart hoặc manifest đầy đủ).
  - **Multi-tenant isolation**: cách ly index/dữ liệu giữa các tenant.
  - **Graceful fallback**: khi LLM down, vẫn cho phép search bằng query thường (KQL/DSL).
  - **Rate limit & cost control**: giới hạn số truy vấn LLM theo tenant để kiểm soát chi phí.
  - Health check, readiness/liveness probe.
  
  ### G. Chất lượng và vận hành
  - Unit test + integration test, coverage tối thiểu **80%**.
  - CI/CD pipeline (GitLab CI).
  - Monitoring với Prometheus + Grafana: LLM latency, token usage, query success rate, search latency.
  
  ---

