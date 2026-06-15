# agent.py — Tour Image Scraper

Tự động cào ảnh tour, convert WebP, upload Supabase, sinh alt text AI, sync database.

## Yêu cầu

- Python 3.11+
- Virtual environment đã tạo sẵn tại `.venv/` (root project)

## Cài đặt

```bash
# Kích hoạt venv (từ root dự án)
source .venv/bin/activate

# Cài thư viện
pip install -r scripts/requirements_agent.txt
```

## Cấu hình

```bash
# Copy file mẫu và điền thông tin thực
cp scripts/.env.agent.example .env
# Chỉnh sửa .env: SUPABASE_KEY, ANTHROPIC_API_KEY
```

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `SUPABASE_URL` | `--upload` / `--sync-db` | URL Supabase project |
| `SUPABASE_KEY` | `--upload` / `--sync-db` | Service role key (bypass RLS) |
| `SUPABASE_BUCKET` | `--upload` | Tên bucket (default: `tour-galleries`) |
| `ANTHROPIC_API_KEY` | `--gen-alt` | Claude API key |

## Sử dụng

### Xem trước (không tải)
```bash
python scripts/agent.py "https://example.com/tours" --dry-run
```

### Tải ảnh cơ bản (không upload, không AI)
```bash
python scripts/agent.py "https://example.com/tours" \
  --workers 3 \
  --max-tours 10 \
  --max-images 15 \
  --output ./tours \
  --webp
```

### Full pipeline (upload + alt text + sync DB)
```bash
python scripts/agent.py "https://example.com/tours" \
  --workers 3 \
  --max-tours 20 \
  --max-images 20 \
  --output ./tours \
  --webp \
  --upload \
  --gen-alt \
  --sync-db
```

### Resume session bị ngắt giữa chừng
```bash
python scripts/agent.py "https://example.com/tours" \
  --resume \
  --upload \
  --gen-alt \
  --sync-db
```

## Tham số CLI

| Flag | Default | Mô tả |
|------|---------|-------|
| `--workers N` | `3` | Số tour xử lý song song |
| `--max-tours N` | `50` | Giới hạn số tour |
| `--max-images N` | `20` | Giới hạn ảnh mỗi tour |
| `--output PATH` | `tours` | Thư mục lưu kết quả |
| `--resume` | off | Bỏ qua tour đã có `_info.json` |
| `--webp` | on | Convert sang WebP quality=82 |
| `--no-webp` | — | Giữ định dạng gốc |
| `--dry-run` | off | Chỉ liệt kê link, không tải |
| `--upload` | off | Upload lên Supabase Storage |
| `--gen-alt` | off | Sinh alt text bằng Claude AI |
| `--sync-db` | off | Upsert vào bảng `tours` Supabase |

## Cấu trúc output

```
tours/
  ten-tour-slug/
    ten-tour-slug-001.webp
    ten-tour-slug-002.webp
    _info.json          ← metadata đầy đủ
  _summary.csv          ← tổng kết toàn session
agent.log               ← log chi tiết
```

### _info.json
```json
{
  "title": "Tên tour",
  "slug": "ten-tour-slug",
  "source_url": "https://...",
  "crawled_at": "2026-06-15T10:00:00+00:00",
  "db_synced": true,
  "images": [
    {
      "order": 1,
      "local_path": "tours/ten-tour-slug/ten-tour-slug-001.webp",
      "cdn_url": "https://supabase.co/storage/v1/object/public/tour-galleries/...",
      "alt": "Tour Bắc Kinh - Quảng trường Thiên An Môn",
      "caption": "",
      "db_updated": true
    }
  ]
}
```

## Model AI

- **Alt text**: `claude-haiku-4-5-20251001` — nhanh, hỗ trợ vision, chi phí thấp
- Rate limit: sleep 0.5s giữa các lần gọi

## Lưu ý

- Script không crash toàn bộ nếu 1 tour lỗi — log và tiếp tục
- `--upload` bỏ qua ảnh đã tồn tại trên Supabase (no overwrite)
- `--sync-db` merge ảnh mới vào `tours.images`, không xóa ảnh cũ
- Log đầy đủ tại `agent.log` trong thư mục chạy script
