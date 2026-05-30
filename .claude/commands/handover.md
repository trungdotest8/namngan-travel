# System Handover Manifest — Nam Ngân Travel

Xuất bản bàn giao kỹ thuật siêu cô đọng để chuyển tiếp sang phiên chat mới,
**đồng thời ghi đè trực tiếp vào mục `📝 CẬP NHẬT GẦN NHẤT` trong `CLAUDE.md`**.

---

## Bước 1 — Đọc trạng thái thực tế

Chạy song song:
```bash
find src -type f | grep -v .gitkeep | sort
ls supabase/migrations/
pnpm type-check 2>&1 | tail -5
```

---

## Bước 2 — Tạo nội dung Manifest

Dựa trên kết quả Bước 1, điền vào template sau (ngắn gọn tối đa):

---

```
## 📦 NAM NGÂN TRAVEL — SYSTEM HANDOVER MANIFEST
> **Trạng thái:** [1 dòng mô tả tiến độ hiện tại]
> **TypeScript:** [CLEAN / N lỗi — liệt kê ngắn]
> **Ngày:** $CURRENT_DATE

### 1. Child Modules

| Child | Module | Trạng thái | Files chính |
|-------|--------|-----------|-------------|
| A | Search UI | ✅/⏳/❌ | [file path] |
| B | Lịch khởi hành | ✅/⏳/❌ | [file path] |
| C | Itinerary Docs | ✅/⏳/❌ | [file path] |
| D | Hồ sơ khách | ✅/⏳/❌ | [file path] |
| E | Chat & Lead | ✅/⏳/❌ | [file path] |
| F | CMS / RSS | ✅/⏳/❌ | [file path] |
| G | DB Schema | ✅/⏳/❌ | supabase/migrations/ — [đã/chưa push cloud] |

### 2. API Routes

| Route | Method | Trạng thái | Ghi chú |
|-------|--------|-----------|---------|
| /api/leads | POST | ✅/❌ | |
| /api/cms | GET/POST | ✅/❌ | |
| /api/search | POST | ✅/❌ | |
| /api/departures | GET | ✅/❌ | |
| /api/itinerary/[tourId] | GET | ✅/❌ | |
| /api/customer-profile | POST/GET | ✅/❌ | |
| /api/notifications | POST | ✅/❌ | |
| /api/webhooks/n8n | POST | ✅/❌ | |
| /api/webhooks/moda | POST | ✅/❌ | |

### 3. Zustand Stores

[Liệt kê tất cả store đang tồn tại với trạng thái ✅/❌]

### 4. Data Contract Quan Trọng

[Chỉ liệt kê contract/type đã THAY ĐỔI so với CLAUDE.md — bỏ qua những gì không đổi]

### 5. Nguyên tắc chưa implement / cần kiểm tra

- [ ] hoặc [x] từng nguyên tắc trong 8 nguyên tắc bất biến
- [ ] Các vấn đề đang mở khác

### 6. Files Quan Trọng Chưa Tồn Tại

[Liệt kê file cần tạo, ưu tiên cao → thấp]

### 7. Next Steps (3 việc làm ngay khi mở phiên mới)

1. **[Việc 1]** — [lý do ưu tiên]
2. **[Việc 2]** — [lý do ưu tiên]
3. **[Việc 3]** — [lý do ưu tiên]

### Change Log

| Ngày | Giai đoạn | Thay đổi |
|------|-----------|---------|
| [date] | [tên giai đoạn] | [mô tả ngắn] |
[giữ lại các dòng log cũ — chỉ thêm dòng mới lên đầu]
```

---

## Bước 3 — GHI ĐÈ vào CLAUDE.md ⚡

**BẮT BUỘC:** Sau khi tạo xong nội dung Manifest, dùng công cụ Edit để **thay thế toàn bộ** nội dung giữa hai dấu mốc trong `CLAUDE.md`:

- Tìm khối bắt đầu bằng: `## 📝 CẬP NHẬT GẦN NHẤT & HÀNH ĐỘNG TIẾP THEO`
- Thay thế từ dòng đó đến hết file bằng nội dung mới gồm:
  1. Header section `## 📝 CẬP NHẬT GẦN NHẤT & HÀNH ĐỘNG TIẾP THEO` với cảnh báo không sửa tay
  2. Bảng Child Modules (từ mục 1 Manifest)
  3. Bảng API Routes (từ mục 2 Manifest)
  4. Files ưu tiên cao chưa tồn tại (từ mục 6 Manifest)
  5. Next Steps (từ mục 7 Manifest)
  6. Change Log (từ mục Change Log Manifest — **cộng dồn, không xóa log cũ**)

**Format header cố định (không thay đổi):**
```
## 📝 CẬP NHẬT GẦN NHẤT & HÀNH ĐỘNG TIẾP THEO

> ⚙️ **Mục này được tự động ghi đè bởi lệnh `/handover`.**
> Không sửa tay — mọi thay đổi sẽ bị overwrite lần `/handover` tiếp theo.
> Trigger: khi context > 70% HOẶC khi kết thúc một giai đoạn lập trình lớn.
```

---

## Bước 4 — In Manifest ra chat

Sau khi đã ghi vào CLAUDE.md xong, in toàn bộ Manifest ra chat để người dùng copy
cho phiên mới, kèm prompt tái khởi động:

> **Prompt tái khởi động cho phiên mới:**
> ```
> Bạn là Kiến Trúc Sư Trưởng dự án Nam Ngân Travel (namngantravel.com).
> Đọc file CLAUDE.md trong repo, sau đó đọc Manifest dưới đây.
> Xác nhận đã nắm kiến trúc và sẵn sàng tiếp tục.
>
> [DÁN MANIFEST Ở ĐÂY]
> ```

---

## Cơ chế tự động (Auto-Sync)

**Khi nào trigger `/handover` tự động:**
- Khi context window ước tính > 70% (nhận biết qua số lượng turn và độ dài hội thoại)
- Khi vừa hoàn thành một giai đoạn lập trình lớn (ghép xong một Child, tạo xong một API route nhóm, hoàn thành trang mới)
- Khi người dùng ra lệnh "compact", "chuyển phiên", "handover", "lưu trạng thái"

**Thứ tự ưu tiên ghi:**
1. Ghi vào CLAUDE.md TRƯỚC (đảm bảo không mất nếu context bị cắt)
2. Sau đó mới in ra chat

**Quy tắc Change Log:**
- Mỗi lần ghi thêm 1 dòng mới vào đầu bảng Change Log
- Giữ nguyên tối đa 20 dòng log gần nhất — xóa dòng cũ hơn nếu vượt
- Format: `| YYYY-MM-DD | Tên giai đoạn | Mô tả ngắn ≤ 80 ký tự |`
