# Trình tạo Tên Thương Hiệu & Slogan bằng AI

> Đồ án cuối kỳ môn Công nghệ Web — ứng dụng frontend thuần HTML/CSS/JavaScript, dùng Google Gemini API để sinh ý tưởng thương hiệu.

---

## 1) Giới thiệu

Ứng dụng nhận thông tin doanh nghiệp từ người dùng và tạo ra:
- Danh sách tên thương hiệu (Brand Name)
- Danh sách khẩu hiệu (Slogan)
- Mỗi mục có mô tả ngắn ý nghĩa

Dự án chạy hoàn toàn phía frontend, không có backend.

---

## 2) Tính năng hiện có

- Sinh ý tưởng bằng AI qua Google Gemini (`gemini-2.5-flash`)
- Form nhập liệu gồm:
  - Ngành kinh doanh
  - Từ khóa chính
  - Khách hàng mục tiêu
- Mẫu điền nhanh (Quick Fill Templates): Coffee, Tech, Fashion, Food, Fitness, Beauty
- Tùy chọn nâng cao:
  - Chọn phong cách thương hiệu (6 tone)
  - Chọn ngôn ngữ đầu ra (English / Tiếng Việt / Song ngữ)
  - Chọn số lượng kết quả mỗi nhóm (5–15)
- Nút tạo lại kết quả (`Regenerate`) từ dữ liệu gần nhất
- Sao chép nhanh từng ý tưởng (`Copy`)
- Đánh dấu yêu thích (`Favorites`) + lưu vào `localStorage`
- Xuất kết quả ra file `.txt` (`Export`)
- Loading khi gọi API, kèm thông báo tiến trình
- Kiểm tra dữ liệu đầu vào + hiển thị lỗi rõ ràng
- Giao diện responsive cho desktop/tablet/mobile

---

## 3) Công nghệ sử dụng

| Lớp | Công nghệ |
|---|---|
| Giao diện | HTML5, CSS3 |
| Xử lý logic | Vanilla JavaScript (ES6+) |
| AI API | Google Gemini REST API |
| Container | Docker + Nginx |

---

## 4) Cấu trúc dự án

```text
web-btl/
├── .env.example
├── Dockerfile
├── README.md
├── index.html
├── script.js
├── style.css
└── imgs/
```

---

## 5) Cấu hình biến môi trường (`.env`)

Tạo file `.env` ở thư mục gốc dự án:

```bash
cp .env.example .env
```

Sau đó sửa giá trị API key:

```env
GEMINI_API_KEY="YOUR_REAL_GEMINI_API_KEY"
```

---

## 6) Chạy cục bộ (Local)

### Bước 1: Chạy static server

```bash
python3 -m http.server 8000
```

### Bước 2: Mở trình duyệt

```text
http://localhost:8000
```

> Lưu ý: Ứng dụng đọc key bằng cách tải file `/.env` từ static server.

---

## 7) Chạy bằng Docker

### Build image

```bash
docker build -t ai-brand-generator .
```

### Run container

```bash
docker run -dit --name ai-brand-generator \
  -p 8000:80 \
  -e GEMINI_API_KEY="YOUR_REAL_GEMINI_API_KEY" \
  ai-brand-generator
```

Mở trình duyệt tại:

```text
http://localhost:8000
```

### Dừng và xóa container

```bash
docker stop ai-brand-generator
docker rm ai-brand-generator
```

---

## 8) Cách ứng dụng lấy API key (đúng với project hiện tại)

- `script.js` sẽ gọi `fetch('./.env')`
- Parse biến `GEMINI_API_KEY` từ nội dung file `.env`
- Trong Docker, `CMD` sẽ tự tạo `/usr/share/nginx/html/.env` từ biến môi trường `GEMINI_API_KEY`

Nếu thiếu key, ứng dụng sẽ báo lỗi cấu hình API key.

---

## 9) Các hàm JavaScript chính

| Hàm | Vai trò |
|---|---|
| `generateIdeas(inputs)` | Điều phối chính: tạo prompt, gọi API, render kết quả |
| `buildPrompt(industry, keywords, target, options)` | Tạo prompt theo style/ngôn ngữ/số lượng |
| `callAIAPI(prompt)` | Gửi request đến Gemini API |
| `getApiKeyFromEnvFile()` | Đọc `GEMINI_API_KEY` từ `/.env` |
| `parseAIResponse(rawText)` | Chuẩn hóa và parse JSON từ phản hồi AI |
| `renderResults(data)` | Render danh sách Brand Name và Slogan |
| `createIdeaCard(item, type)` | Tạo card kết quả + nút Copy/Favorite |
| `renderFavorites()` | Render mục yêu thích từ `localStorage` |
| `exportResults()` | Xuất kết quả hiện tại ra file `.txt` |

---

## 10) Xử lý lỗi

| Tình huống | Cách xử lý |
|---|---|
| Thiếu trường input | Hiển thị lỗi ngay dưới từng ô |
| Thiếu hoặc sai API key | Banner lỗi toàn cục |
| Timeout mạng | Báo hết thời gian chờ request |
| API trả lỗi (401/403/429/500...) | Hiển thị thông báo theo mã lỗi |
| AI trả sai định dạng | Báo lỗi parse JSON |

---

## 11) Lưu ý bảo mật

Vì đây là ứng dụng frontend-only, API key có thể bị nhìn thấy từ phía client. Cách hiện tại phù hợp để học tập/demo. Nếu triển khai production thực tế, nên bổ sung backend/proxy để ẩn API key.

---

## 12) Ảnh chụp màn hình

Thêm ảnh demo vào thư mục `imgs/` và cập nhật liên kết tại đây khi cần.

---

## 13) Giấy phép

MIT.
