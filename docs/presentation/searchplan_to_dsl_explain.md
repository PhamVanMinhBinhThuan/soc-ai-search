# Giải Thích Quy Trình Chuyển Đổi: SearchPlan → Elasticsearch DSL

Tài liệu này giải thích cách hệ thống biên dịch (compile) bản nháp `SearchPlan` (do AI sinh ra) thành câu lệnh `Elasticsearch DSL` thực thi cuối cùng. Đây là lõi kỹ thuật quan trọng nhất (Guardrail) để bảo vệ an toàn cho hệ thống.

## 1. Tại sao phải qua bước trung gian SearchPlan?
Thay vì bảo LLM: *"Hãy viết cho tôi câu lệnh Elasticsearch DSL"*, chúng ta bảo LLM: *"Hãy trích xuất ý định của người dùng thành một định dạng JSON đơn giản (SearchPlan)"*.

**Lý do:**
1. **Chống tấn công (Prompt Injection):** Nếu LLM sinh thẳng DSL, kẻ xấu có thể lừa LLM sinh ra câu lệnh quét toàn bộ database (vd: `match_all` với size 1 triệu) làm sập (crash) server.
2. **Dễ kiểm duyệt (Validate):** Backend (Java Spring Boot) rất dễ đọc hiểu SearchPlan để kiểm tra xem AI có chế ra các trường (fields) lạ không, từ đó gạt bỏ những câu lệnh không an toàn.
3. **Tính độc lập:** Nếu sau này không dùng Elasticsearch mà chuyển sang dùng cơ sở dữ liệu khác (vd: Splunk, SQL), ta chỉ cần viết lại bộ dịch (Compiler) ở backend, còn phần prompt cho AI sinh SearchPlan vẫn giữ nguyên.

## 2. Quy trình dịch (Compilation Pipeline)

Khi `SearchPlan` được AI sinh ra và vượt qua bước kiểm duyệt, Backend sẽ dùng thư viện (vd: Elasticsearch Java Client) để "lắp ráp" thành DSL theo nguyên tắc:

### Mapping các điều kiện Lọc (Filters)
- **`timestamp`** (vd: `now-24h` đến `now`) → Chuyển thành **`range` query** trong DSL.
- **`event_type`, `country_code`, `user`, `severity`** (là mảng danh sách) → Chuyển thành **`terms` query** trong DSL (tìm chính xác).
- **`message_query`** (tìm kiếm chữ tự do) → Chuyển thành **`match` query** để search full-text.

Tất cả các điều kiện trên sẽ được gói gọn vào trong một khối **`bool -> must`** hoặc **`bool -> filter`** của Elasticsearch để kết hợp điều kiện (Toán tử AND).

### Phân trang & Giới hạn dữ liệu (Bắt buộc)
Backend sẽ tự động chèn thêm thông số `from` (trang số mấy) và `size` (bao nhiêu record/trang) lấy từ request của Frontend.
👉 **Tác dụng:** Chặn đứng tình trạng AI tự ý truy xuất quá nhiều dữ liệu gây quá tải RAM.

## 3. Ví dụ thực tế

**Câu hỏi từ người dùng:**
> *"Tìm các lượt đăng nhập thất bại từ Trung Quốc trong 24h qua"*

### Bước 1: AI sinh ra SearchPlan (Trung gian)
```json
{
  "mode": "search",
  "filters": {
    "timestamp": {
      "from": "now-24h",
      "to": "now"
    },
    "event_type": ["failed_login"],
    "country_code": ["CN"]
  }
}
```

### Bước 2: Backend dịch thành Elasticsearch DSL (Thực thi)
Backend lắp ráp SearchPlan trên và tự thêm phân trang (`size: 50`) để tạo ra câu lệnh gửi xuống Database:

```json
{
  "size": 50,
  "from": 0,
  "query": {
    "bool": {
      "filter": [
        {
          "range": {
            "timestamp": {
              "gte": "now-24h",
              "lte": "now"
            }
          }
        },
        {
          "terms": {
            "event_type": ["failed_login"]
          }
        },
        {
          "terms": {
            "country_code": ["CN"]
          }
        }
      ]
    }
  }
}
```

## 4. Cách trả lời nếu Hội đồng phản biện
**Hội đồng hỏi:** *"Quá trình convert từ SearchPlan sang DSL diễn ra như thế nào?"*

**Bạn trả lời:**
> *"Dạ, quá trình này được thực hiện hoàn toàn bằng code Java ở dưới Backend. Backend sẽ parse cái JSON SearchPlan mà AI trả về, duyệt qua từng field (như timestamp, event_type). Với mỗi field, backend sẽ sử dụng thư viện Elasticsearch Client để ánh xạ (map) tương ứng — ví dụ timestamp map thành `range query`, event_type map thành `terms query`. Tất cả được bọc trong một khối `bool filter`. Đặc biệt, đoạn phân trang (pagination) là do backend tự động áp đặt thêm vào DSL chứ không cho phép AI tự quyết định, giúp hệ thống luôn an toàn không bị quá tải do query lấy quá nhiều dữ liệu."*
