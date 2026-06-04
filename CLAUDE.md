# NAM NGÂN TRAVEL — CLAUDE PROJECT MEMORY

## Tên dự án
**Nam Ngân Travel** — Website du lịch trọn gói.
Tên miền: `namngantravel.com`
Tên miền tham chiếu thiết kế: `trieuhaotravel.vn_ (1).jpg` (file ảnh trong repo).

> **⚠️ LƯU Ý TÊN THƯƠNG HIỆU:** Domain là `namngantravel.com` → "Nam Ngân" (ngân = bạc).
> Nếu đúng tên là "Nam Ngạn" (ngạn = bờ/proverb) hãy báo Orchestrator để cập nhật.

## Mô hình phát triển
**Multi-Agent Assembly** — nhiều Claude Child (A, B, C, D, E, F, G) phát triển độc lập từng module.
Claude Orchestrator (Senior) ghép và kiểm tra tính nhất quán toàn hệ thống.

---

## Tech Stack

| Lớp | Công nghệ |
|-----|-----------|
| Framework | Next.js 14, App Router, TypeScript strict |
| Styling | Tailwind CSS v3 — KHÔNG dùng MUI / Ant Design |
| State | Zustand — store riêng mỗi module, `ui.store.ts` làm event bus |
| Database | Supabase (PostgreSQL + Auth + Realtime) |
| Realtime Pub/Sub | Supabase Realtime Channels — admin notification stream |
| Email Service | **Resend** (`resend` npm package) — xác nhận booking, lead notify |
| File Storage | Supabase Storage — ảnh hồ sơ khách hàng (Child D) |
| Validation | Zod — BẮT BUỘC với mọi form và API route |
| Package manager | pnpm |
| Deploy | Vercel |

---

## Màu sắc thương hiệu

```
Brand Blue:    #005BAA   ← header, button CTA  [THIẾT KẾ HỆ THỐNG]
Light Blue:    #0078D7   ← hover state
Accent Orange: #FF6B00   ← giá tiền, badge khuyến mãi
Background:    #F0F7FF   ← section nền nhạt
Text Primary:  #1A1A2E
Text Muted:    #666666
```

> **⚠️ XUNG ĐỘT MÀU — Child A:** CHANGELOG.md ghi Child A dùng Green `#16a34a`.
> Quyết định: **Giữ Brand Blue `#005BAA` là chuẩn hệ thống.**
> Khi ghép Child A, Orchestrator sẽ patch màu `green-600` → `brand-blue` trong SearchBar.
> Child A cũng dùng `lucide-react` và font `Plus Jakarta Sans` — chấp nhận lucide-react,
> font sẽ được chuẩn hóa về `Be Vietnam Pro` ở layout tổng thể.

---

## Phân công Child Agents

| Child | Module | Folder chính | API Route | Store |
|-------|--------|-------------|-----------|-------|
| A | Search Engine UI | `src/components/search/` | `/api/search` | `search.store.ts` |
| B | Lịch khởi hành (SeaStar) + PDF Indexer | `src/components/calendar/` | `/api/departures` + `/api/pdf-index` | `calendar.store.ts` |
| C | Lịch trình chi tiết (Google Docs) | `src/components/itinerary/` | `/api/itinerary/[tourId]` | local state |
| **D** | **Hồ sơ khách hàng** (ảnh upload + Google Drive link) | `src/components/customer-profile/` | `/api/customer-profile` | `customer-profile.store.ts` |
| E | Chat Widget & Lead | `src/components/chat/` | `/api/leads` | `chat.store.ts` |
| F | CMS & RSS / TikTok Feed | `src/components/cms/` | `/api/cms/` | `cms.store.ts` |
| G | Database Schema (Supabase) | `supabase/` | — định nghĩa schema | N/A |
| **H+** | **Slot mở tương lai** | `src/components/_future/` | `/api/[module]` | thêm mới |

> **Quy tắc thêm Child mới:** Tạo folder `components/<tên-module>/`, store trong `store/`, API route trong `app/api/`, type trong `types/`. KHÔNG sửa code module đã deploy.

---

## 8 Nguyên tắc bất biến (KHÔNG được vi phạm)

1. **KHÔNG** tự ý xóa file hoặc module — chỉ patch/extend
2. **KHÔNG** dùng third-party UI library nặng (MUI, Ant Design, Chakra...)
3. **KHÔNG** merge code Child nào nếu chưa kiểm tra type contract
4. Mỗi module **phải bọc `<ErrorBoundary>`** — lỗi 1 module không crash toàn trang
5. Mọi form/input **phải validate bằng Zod** trước khi ghi Supabase
6. Mọi API fetch **phải có `try/catch`** và UI fallback khi lỗi mạng
7. **Luồng kép bắt buộc:** Khi có Lead mới hoặc Booking xác nhận → phải kích hoạt ĐỒNG THỜI cả Email (Resend) VÀ Realtime notification (Supabase Channel). Không được chỉ làm một.
8. **Upload/Drive Error UI:** Mọi tính năng upload ảnh (Child D) và kết nối Google Drive đều phải có UI thông báo lỗi rõ ràng — KHÔNG để màn hình trống khi lỗi.

---

## Data Contract cốt lõi (v1.0.0 — cập nhật 2025-05-30)

> Schema nguồn: `supabase/migrations/20250530000001_initial_schema.sql`
> Docs: `nam_ngan_schema_docs.md`

```typescript
// ── Quy ước chung ────────────────────────────────────────────
Tour.id               → string UUID (uuid_generate_v4())
Tour.code             → string "NN-HN-001" (mã tour nội bộ)
Tour.name             → string (tên tour — KHÔNG dùng .title)
Tour.category         → string "trong nước" | "nước ngoài"
Tour.itinerary        → TourItineraryDay[] | null (JSONB)

TourSchedule          → bảng `tour_schedules` (thay thế Departure cũ)
TourSchedule.departure_date → string "YYYY-MM-DD"
TourSchedule.return_date    → string "YYYY-MM-DD"
TourSchedule.price_adult    → number VND
TourSchedule.price_child    → number VND
TourSchedule.status         → 'open' | 'full' | 'cancelled' | 'completed'

Booking.code          → string "NN-20250001"
Booking.total_price   → GENERATED (adults×price_adult + children×price_child)
Booking.final_price   → GENERATED (total_price - discount_amount)
Booking.payment_method → 'wallet' | 'bank_transfer' | 'cash' | 'online'

Lead.lead_source      → 'popup' | 'chat' | 'fb_ads' | 'web_ads' | 'organic' | 'other'
Lead.status           → 'new' | 'contacted' | 'consulting' | 'deposited' | 'converted' | 'lost'
Lead.image_attachments → string[] (Supabase Storage URLs — hồ sơ đính kèm)
Lead.google_drive_url  → string | null (Google Drive folder của khách)
Lead.utm_source / utm_medium / utm_campaign → string (UTM tracking)

Mọi timestamp         → string ISO 8601 UTC, UI hiển thị convert sang UTC+7
Mọi giá tiền          → number VND (KHÔNG lưu chuỗi "1.000.000đ")

// ── Child A — SearchCriteria ──────────────────────────────────
SearchCriteria.destination → string (tên điểm đến tự do)
SearchCriteria.route       → string (tên tuyến, ví dụ "Tokyo – Osaka")
SearchCriteria.departure   → string (thành phố xuất phát)
SearchCriteria.date        → string "YYYY-MM-DD"
SearchCriteria.passengers  → { adults: number; children: number; infants: number }

// ── Child D — CustomerProfile (maps to leads table) ──────────
CustomerProfile.image_attachments → string[] (Supabase Storage URLs)
CustomerProfile.google_drive_url  → string | null
CustomerProfile.drive_synced      → boolean

// ── Child B — TourPdfIndex (bảng tour_pdf_index) ─────────────
// Crawler: crawlAndIndexTourPDF.js (Node.js Cron job, KHÔNG phải Next.js API)
// Fault Isolation: crawler chạy hoàn toàn tách biệt, lỗi crawler ≠ lỗi frontend
TourPdfIndex.tour_code         → string | null (liên kết mềm với tours.code)
TourPdfIndex.original_url      → string UNIQUE (check trùng lặp)
TourPdfIndex.google_drive_link → string | null (iframe src cho Child C embed)
TourPdfIndex.google_drive_id   → string | null (build URL thay thế)
TourPdfIndex.extracted_text    → string | null (GIN FTS index — Child A search)
TourPdfIndex.summary           → string | null (300 ký tự đầu — preview)

// ── Child C — ItineraryResponse (từ /api/itinerary/[tourId]) ──
ItineraryResponse.structured → TourItineraryDay[] | null  (từ tours.itinerary JSONB)
ItineraryResponse.pdf        → { drive_link, drive_id, title, summary } | null
// Ưu tiên: structured nếu có → PDF embed nếu không có JSON → 404 nếu cả hai null

// ── Child A — PdfSearchResult (từ /api/pdf-index?q=...) ───────
PdfSearchResult.rank         → number (ts_rank PostgreSQL FTS)
// Kết hợp search tours + search tour_pdf_index.extracted_text song song
```

### Bảng → TypeScript type mapping

| Bảng SQL         | TypeScript type  | File                          |
|-----------------|-----------------|-------------------------------|
| `tours`          | `Tour`           | `src/types/tour.types.ts`     |
| `tour_schedules` | `TourSchedule`   | `src/types/tour.types.ts`     |
| `users`          | `User`           | `src/types/user.types.ts`     |
| `wallets`        | `Wallet`         | `src/types/user.types.ts`     |
| `wallet_transactions` | `WalletTransaction` | `src/types/user.types.ts` |
| `bookings`       | `Booking`        | `src/types/booking.types.ts`  |
| `articles`       | `Article`        | `src/types/news.types.ts`     |
| `leads`          | `Lead`           | `src/types/lead.types.ts`     |
| `tour_pdf_index` | `TourPdfIndex`   | `src/types/pdf-index.types.ts` |

---

## Tích hợp ngoài

| Service | Endpoint | Ghi chú |
|---------|----------|---------|
| n8n | `POST /api/webhooks/n8n` | Verify header `x-webhook-secret` = `WEBHOOK_SECRET` |
| Moda | `POST /api/webhooks/moda` | Booking/payment callbacks |
| Tương lai | `POST /api/webhooks/[provider]` | Zalo OA, VNPAY, GHN... |

**n8n use-cases:**
- Lead từ Zalo/Facebook → tạo bản ghi `leads` trong Supabase
- Cron đồng bộ Google Sheets → trigger `/api/departures/sync`
- Publish bài viết mới → trigger CMS cache refresh

---

## Hệ thống Thông báo (Notification System)

### Luồng kép bắt buộc khi có Lead/Booking
```
API Route nhận Lead/Booking
       │
       ├──► Supabase INSERT (lưu dữ liệu)
       │
       ├──► Resend.send() ──► Email khách hàng (xác nhận)
       │                  └──► Email admin     (thông báo mới)
       │
       └──► Supabase Realtime BROADCAST
                 channel: 'admin-notifications'
                 event:   'new_lead' | 'new_booking'
                 └──► Admin Dashboard cập nhật real-time
```

### Pub/Sub Channels (Supabase Realtime)
| Channel | Event | Subscriber |
|---------|-------|-----------|
| `admin-notifications` | `new_lead` | Admin dashboard toast |
| `admin-notifications` | `new_booking` | Admin dashboard + badge count |
| `admin-notifications` | `booking_confirmed` | Admin dashboard |

### Email Templates (Resend)
| Template | Trigger | Recipient |
|----------|---------|-----------|
| `lead-received` | Lead mới từ chat/form | Admin |
| `booking-confirmation` | Booking xác nhận | Khách hàng + Admin |
| `itinerary-updated` | Lịch trình thay đổi | Khách hàng |
| `promo-notify` | Khuyến mãi | Khách hàng đăng ký |

---

## Quy trình ghép code (Assembly Protocol)

Khi nhận code từ Child, Orchestrator kiểm tra theo thứ tự:
1. Type contract — so sánh interface với `src/types/`
2. Import path — phải dùng `@/` alias
3. Error handling — mọi `fetch()` có `try/catch` + UI fallback
4. Validation — form dùng Zod từ `src/lib/validations/`
5. Đặt đúng folder — theo bảng phân công trên
6. Wrap `<ErrorBoundary>` nếu Child chưa có
7. Ghi Change Log vào cuối câu trả lời

---

## Lệnh thường dùng

```bash
pnpm dev              # Dev server
pnpm build            # TypeScript check + build
pnpm lint             # ESLint
supabase db reset     # Reset + chạy lại migrations
supabase gen types    # Tái tạo TypeScript types từ schema
```

---

## Biến môi trường cần thiết

Xem file `.env.example` tại root. Các biến bắt buộc:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_SHEETS_API_KEY
GOOGLE_SHEETS_SPREADSHEET_ID
GOOGLE_DOCS_API_KEY
WEBHOOK_SECRET
RESEND_API_KEY              ← Email service (thay SendGrid)
RESEND_FROM_EMAIL           ← VD: noreply@namngantravel.com
ADMIN_NOTIFY_EMAIL          ← Email nhận thông báo nội bộ
MODA_API_KEY                (khi tích hợp Moda)
N8N_WEBHOOK_URL             (khi tích hợp n8n)
GOOGLE_DRIVE_FOLDER_ID      ← ID thư mục Drive chứa PDF lịch trình (crawlAndIndexTourPDF)
GOOGLE_SA_JSON              ← Service Account JSON (stringify) — crawler dùng để upload Drive
```

---

## Cấu trúc thư mục nhanh

```
src/
├── app/
│   ├── (public)/          ← routes công khai
│   ├── (admin)/           ← CMS internal
│   └── api/
│       ├── search/        ← Child A
│       ├── departures/    ← Child B (SeaStar sync)
│       ├── pdf-index/     ← Child B (PDF FTS search)  ← MỚI
│       ├── itinerary/     ← Child C (✅ dùng tour_pdf_index)  ← MỚI
│       ├── customer-profile/ ← Child D  ← MỚI
│       ├── leads/         ← Child E
│       ├── cms/           ← Child F
│       ├── notifications/ ← Notification trigger  ← MỚI
│       └── webhooks/      ← n8n, moda, slot mở
├── components/
│   ├── ui/                ← atoms: Button, Card, ErrorBoundary...
│   ├── layout/            ← Header, Footer
│   ├── search/            ← Child A (có SearchBar từ temp.jsx)
│   ├── calendar/          ← Child B
│   ├── itinerary/         ← Child C
│   ├── customer-profile/  ← Child D  ← MỚI
│   ├── chat/              ← Child E
│   ├── cms/               ← Child F
│   ├── notifications/     ← Admin notification panel  ← MỚI
│   ├── home/              ← trang chủ
│   └── _future/           ← slot Child H+
├── lib/
│   ├── supabase/          ← client + server + admin
│   ├── google/            ← sheets + docs
│   ├── email/             ← Resend client + templates  ← MỚI
│   ├── integrations/      ← n8n, moda, seastar, slot mở
│   ├── crawlers/          ← crawlAndIndexTourPDF.js (Node.js, chạy ngoài Next.js)  ← MỚI
│   └── validations/       ← Zod schemas
├── store/
│   ├── ui.store.ts        ← toast, modal, loading
│   ├── notification.store.ts ← admin realtime  ← MỚI
│   └── index.ts
├── types/                 ← TypeScript interfaces
└── hooks/                 ← Custom hooks
supabase/                  ← Child G: migrations + schema + RLS
```

---

## Child A — Ghi chú ghép SearchBar

File gốc: `CHANGELOG.md` (Downloads) + `temp.jsx` (chưa ghép)
- Rename `temp.jsx` → `src/components/search/TourSearchBar.tsx`
- Patch màu: tất cả `green-600` / `#16a34a` → `brand-blue` / `#005BAA`  
- Giữ nguyên `lucide-react` (chấp nhận), `onSearch(SearchCriteria)` callback
- Thêm `<ErrorBoundary moduleName="SearchBar">` wrapper khi ghép vào page

---

## 📝 CẬP NHẬT GẦN NHẤT & HÀNH ĐỘNG TIẾP THEO

> ⚙️ **Mục này được tự động ghi đè bởi lệnh `/handover`.**
> Không sửa tay — mọi thay đổi sẽ bị overwrite lần `/handover` tiếp theo.
> Trigger: khi context > 70% HOẶC khi kết thúc một giai đoạn lập trình lớn.

### Trạng thái Child Modules

| Child | Module | Trạng thái | Files chính |
|-------|--------|-----------|-------------|
| A | Search UI | ✅ v2.0.0 | `src/components/search/TourSearchBar.tsx` + `SearchResults.tsx` |
| B | Lịch khởi hành (SeaStar) + PDF Indexer | ✅ v1.2.0 | `src/lib/integrations/seastar.ts` + migrations #6+#7+#8 |
| C | Itinerary + PDF Embed | ✅ v2.1.0 | `TourDetail.tsx` (gallery lightbox + hashtag chips) + `PdfViewer.tsx` |
| D | Hồ sơ khách | ✅ v1.1.0 | `src/components/customer-profile/CustomerProfileDrawer.tsx` + `CustomerTable.tsx` |
| E | Chat & Lead | ✅ v2.0.0 | `src/components/chat/ChatWidget.tsx` + `AutoPopup.tsx` |
| F | CMS / RSS | ✅ v1.2.0 | `src/components/cms/ArticleFeed.tsx` |
| G | DB Schema | ✅ **13/13 cloud** | `supabase/migrations/` — Supabase: indjoegnsvcteaozmgrg |
| CRM | Admin CRM | ✅ v4.1.0 | `crm/page.tsx` + `ArticlesTab.tsx` (Tiptap) + `ToursTab.tsx` (upload) — 6 tabs |
| AUTH | Admin Auth | ✅ v2.0.0 | `src/app/(admin)/login/page.tsx` + `src/middleware.ts` + `/api/admin/auth` |
| STAFF | Quản lý nhân viên | ✅ v1.0.0 | `crm/StaffTab.tsx` + `/api/admin/users` + `/api/admin/me` |
| TOURS-ADMIN | Admin Tour (CRM tab) | ✅ v1.1.0 | `ToursTab.tsx` — upload ảnh base64 + URL paste |
| TOURS-LIST | /tours listing | ✅ v1.2.0 | `ToursClient.tsx` + hashtag filter + stagger animation |
| NAV | Mega-menu Navigation | ✅ v1.0.0 | `Header.tsx` + `src/lib/mega-menu-data.ts` — 2 dropdown 3 cột |
| ANIM | Animations | ✅ v1.1.0 | `globals.css` — @keyframes defined trực tiếp (fix Tailwind purge bug) |
| GALLERY | Gallery seed | ✅ v1.0.0 | migration #13 — Unsplash placeholder 3 ảnh/tour, 20 quốc gia |
| DOMESTIC | /tour-trong-nuoc | ✅ v2.1.0 | `DomesticToursClient.tsx` — hashtag flex-wrap |
| INTL | /tour-nuoc-ngoai | ✅ v2.2.0 | `InternationalToursClient.tsx` — hashtag flex-wrap + country filter |
| BOOKING | Booking form | ✅ v1.0.0 | `src/components/booking/BookingModal.tsx` — modal + floating CTA |
| UPLOAD | Image Upload API | ✅ v1.0.0 | `/api/admin/upload-image` — base64 → Supabase Storage `tour-galleries` |
| TIPTAP | WYSIWYG Editor | ✅ v1.0.0 | `src/components/cms/TiptapLiteEditor.tsx` — @tiptap/react v3.25 |
| TIN-TUC | Blog Tin Tức | ✅ v1.2.0 | `TinTucClient.tsx` — pagination 6/trang + NewsPagination component |
| EDGE | Edge Functions | ✅ v1.1.0 | `supabase/functions/google-drive/` — 23 folders created |
| PDF | PDF Crawler & Indexer | ✅ v1.3.0 | `/api/pdf-index` + migration #6+#7 |
| CRON | Vercel Cron | ✅ v1.0.0 | `/api/cron/crawl-pdf` + `vercel.json` |
| HOME | Trang chủ | ✅ v1.0.0 | `src/app/page.tsx` |
| LICH | Lịch Khởi Hành | ✅ v1.1.0 | `src/app/lich-khoi-hanh/page.tsx` |
| DIRECTUS | CMS Integration | ✅ v1.1.0 | `src/lib/directus.ts` — Supabase fallback hoạt động |

### Trạng thái API Routes

| Route | Method | Trạng thái | Ghi chú |
|-------|--------|-----------|---------|
| `/api/leads` | POST | ✅ | Zod + luồng kép Email+Realtime; `pax` field |
| `/api/cms` | GET/POST | ✅ | pagination: `?page=N&limit=6&category=X`; legacy `?status=all&limit=200` |
| `/api/cms/[id]` | PATCH/DELETE | ✅ | Auth: cookie hoặc x-admin-secret |
| `/api/tours` | GET/POST | ✅ | filter category/country/is_active/search |
| `/api/tours/[id]` | PATCH/DELETE | ✅ | Auth: cookie hoặc x-admin-secret; ?hard=true |
| `/api/customer-profile` | GET/PATCH | ✅ | Auth: cookie hoặc x-admin-secret |
| `/api/admin/auth` | POST/DELETE | ✅ | Login {username,password} → HttpOnly cookie 24h; DELETE = logout |
| `/api/admin/users` | GET/POST | ✅ | List + tạo admin users; bcrypt hash |
| `/api/admin/users/[id]` | PATCH/DELETE | ✅ | Update + soft deactivate |
| `/api/admin/me` | GET | ✅ | Trả AdminUser từ httpOnly cookie |
| `/api/admin/upload-image` | POST | ✅ | Auth kép; base64 → `tour-galleries` bucket; ≤5MB |
| `/api/search` | POST | ✅ | category filter |
| `/api/notifications` | POST | ✅ | Auth: x-webhook-secret |
| `/api/webhooks/n8n` | POST | ✅ | Auth: x-webhook-secret |
| `/api/webhooks/moda` | POST | ✅ | luồng kép nếu confirmed |
| `/api/departures` | GET/POST | ✅ | POST: cookie OR x-webhook-secret |
| `/api/itinerary/[tourId]` | GET | ✅ | Cache 5min; trả gallery_urls + hashtags |
| `/api/pdf-index` | GET | ✅ | FTS RPC |
| `/api/cron/crawl-pdf` | GET | ✅ | Auth kép |
| `/api/admin/setup-drive-folders` | POST | ✅ | 23 folders đã tạo |
| Edge: `google-drive` | POST | ✅ v1.1.0 | private_key fix; 3 actions |

### Zustand Stores

```
useUIStore              (store/ui.store.ts)               ✅
useNotificationStore    (store/notification.store.ts)      ✅ admin realtime
useSearchStore          (store/search.store.ts)            ✅
useCalendarStore        (store/calendar.store.ts)          ✅ fetchSchedules()
useChatStore            (store/chat.store.ts)              ✅
useCmsStore             (store/cms.store.ts)               ✅
useCustomerProfileStore (store/customer-profile.store.ts)  ✅
```

### Data Contract — Delta phiên #23

```typescript
// ── Domain chính thức (phiên #23) ─────────────────────────────────────────────
// PRIMARY DOMAIN: namngantravel.site (DNS đã cấu hình tại TenTen.vn, đang propagate)
// OLD DOMAIN:     namngantravel.com  (không có DNS, Resend domain status: not_started)
// Vercel: namngantravel.site đã alias → namngan-travel production deployment
// RESEND_FROM_EMAIL hiện vẫn là noreply@namngantravel.com → CẦN cập nhật (xem Next Steps)

// ── /api/cms GET — Pagination mode (phiên #23) ────────────────────────────────
// Khi có ?page=N: trả { articles, pagination: { page, limit, totalItems, totalPages } }
// Khi không có ?page: giữ nguyên legacy { articles } (admin panel dùng ?status=all&limit=200)
// PAGE_SIZE mặc định = 6 bài/trang (TinTucClient.tsx)

// ── Upload ảnh (phiên #23) ────────────────────────────────────────────────────
// POST /api/admin/upload-image: { base64Data, fileName, fileType } → { url }
// Bucket: 'tour-galleries' — CẦN TẠO trong Supabase Dashboard nếu chưa có
// Path: tours/{timestamp}-{random}-{filename}
// ImageUploadInput component inline trong ToursTab.tsx (≤5MB, loading state, error UI)

// ── TiptapLiteEditor (phiên #23) ──────────────────────────────────────────────
// ArticlesTab.tsx dùng dynamic import (ssr: false) để tránh SSR issues
// setContent dùng { emitUpdate: false } (Tiptap v3 API — không phải boolean false)
// Toolbar: Bold, Italic, H2, H3, Bullet, Ordered, Blockquote, Undo, Redo

// ── TinTucClient.tsx (phiên #23) ──────────────────────────────────────────────
// Client component tách riêng, page.tsx giữ server component để export metadata
// Fetch /api/cms?page=N&limit=6&status=published — reset trang 1 khi đổi category
// scroll-to-top khi đổi trang (window.scrollTo)
```

### Hạ tầng & Tích hợp bên ngoài

```
GitHub  : https://github.com/trungdotest8/namngan-travel (branch: main)
Vercel  : namngan-travel — ✅ deployed
          Domain: namngantravel.site (alias set ✅, DNS propagating ~1-3h)
          ⚠️ CẦN THÊM: DIRECTUS_URL + DIRECTUS_STATIC_TOKEN
Supabase: indjoegnsvcteaozmgrg — ✅ 13/13 migrations cloud; 49 tours có gallery + hashtags
          ⚠️ CẦN TẠO: bucket 'tour-galleries' (Public) cho upload-image API
Edge Fn : ✅ deployed v1.1.0 — 23 Drive folders đã tạo
Directus: ⚠️ CHƯA setup — /tin-tuc dùng Supabase fallback (6 bài mẫu)
Vercel Cron: "0 2 * * *" /api/cron/crawl-pdf — ✅ CRON_SECRET đã có
Resend  : ⚠️ PENDING MIGRATION
          - namngantravel.com (ID: 4cf3c8a2) — status: not_started, chưa verify bao giờ
          - CẦN: xóa .com → tạo .site → thêm DNS → cập nhật RESEND_FROM_EMAIL
          - RESEND_API_KEY: xem .env.local (đã xác nhận hoạt động)
SeaStar : ✅ 49 tours tổng (41 nước ngoài + 8 trong nước)
Drive   : ✅ 23 folders created — root/domestic/international/[20 countries]
TenTen  : namngantravel.site — DNS records đã thêm:
          @ A → 76.76.21.21 | www CNAME → cname.vercel-dns.com
```

### Files ưu tiên cao chưa tồn tại / chưa hoàn chỉnh

```
# ƯU TIÊN CAO — CẦN LÀM NGAY:
1. Supabase bucket 'tour-galleries': Dashboard → Storage → New bucket → Public
   (cần có trước khi upload-image API hoạt động)
2. Resend migration .com → .site:
   a) DELETE /domains/4cf3c8a2-d600-43a6-bef8-03182924c30b (namngantravel.com)
   b) POST /domains { name: "namngantravel.site" } → lấy DNS records
   c) Thêm DNS records vào TenTen.vn
   d) Vercel: cập nhật RESEND_FROM_EMAIL → noreply@namngantravel.site
3. Vercel env: DIRECTUS_URL + DIRECTUS_STATIC_TOKEN (khi setup Directus instance)

# CÓ THỂ TIẾP (feature):
Gallery thực: 49 tours có Unsplash placeholder → admin upload qua /crm → tab Tour (bucket cần tạo trước)
CRM ArticlesTab: thumbnail upload (tương tự ImageUploadInput — chỉ 1 ảnh)
/tin-tuc: open graph meta tags per article
```

### Next Steps (3 việc làm ngay khi mở phiên mới)

1. **Tạo Supabase bucket `tour-galleries`** — Dashboard Supabase → Storage → New bucket → đặt tên `tour-galleries`, chọn Public → Save. Sau đó upload-image API mới hoạt động.
2. **Migrate Resend về `.site`** — Xác nhận xóa domain `.com` → tôi tự động gọi API Resend tạo `.site`, lấy DNS records, hướng dẫn thêm TenTen, update Vercel env `RESEND_FROM_EMAIL`
3. **Verify DNS namngantravel.site** — Sau ~1-3h propagate, kiểm tra tại whatsmydns.net → khi có A record `76.76.21.21` là xong

### Change Log

| Ngày | Giai đoạn | Thay đổi |
|------|-----------|---------|
| 2026-06-05 | Handover #23 — CRM Upload + Tiptap + Pagination | upload-image API ✅; ImageUploadInput ToursTab ✅; TiptapLiteEditor ✅; /api/cms pagination ✅; TinTucClient ✅ |
| 2026-06-05 | Domain Migration | namngantravel.site DNS→TenTen ✅; Vercel alias ✅; Resend pending migration |
| 2026-06-04 | Handover #22 — Bug Fixes: Tour Cards + Hashtag Wrap | Fix @keyframes slide-up purge; hashtag flex-wrap cả 2 listing pages |
| 2026-06-04 | Handover #21 — Gallery Seed + Hashtag Filter + Booking Form | migration #13 gallery_urls ✅; DomesticToursClient ✅; BookingModal ✅; pax field ✅ |
| 2026-06-04 | Handover #20 — Mega-menu + Animations + Hashtag Seed | Mega-menu 3 cột ✅; animations ✅; 49 tours hashtags ✅; Resend domain ✅ |
| 2026-06-03 | Handover #19 — Multi-User Auth + Staff Tab + URL fix | admin_users #10 ✅; bcrypt ✅; StaffTab ✅; URL fix ✅ |
| 2026-06-03 | Handover #18 — Admin Auth + Gallery Lightbox + Hashtag Filter | Login+middleware ✅; lightbox ✅; hashtag /tours ✅ |
| 2026-06-03 | Handover #17 — ToursTab CRUD + Edge Fn Fix + Migration #9 | ToursTab ✅; /api/tours ✅; migration #9 ✅ |
| 2026-06-03 | Handover #16 — CMS Admin + Articles + Thumbnails | ArticlesTab ✅; 6 bài mẫu ✅; Directus fallback ✅ |
| 2026-06-02 | Handover #15 — Directus CMS + /tours + Blog | /tours ✅; /tour-nuoc-ngoai v2 ✅; /tin-tuc ✅ |
| 2026-06-02 | Handover #14 — Bug Fixes + Domestic Data | /tours/[slug] ✅; 8 tour trong nước ✅ |
| 2026-06-01 | Handover #13 — Tour Categories + 2 Listing Pages | /tour-trong-nuoc ✅; /tour-nuoc-ngoai ✅; migration #8 ✅ |
| 2026-06-01 | Handover #9–12 | Lịch khởi hành; PDF Crawler; Tour Detail; Secrets fix |
| 2026-05-31 | Handover #8 | SeaStar 313 records; api/departures ✅ |
| 2026-05-30 | Session 1–7 | Child A–G; CRM; leads luồng kép ✅ |

> ⚙️ **Mục này được tự động ghi đè bởi lệnh `/handover`.**
> Không sửa tay — mọi thay đổi sẽ bị overwrite lần `/handover` tiếp theo.
> Trigger: khi context > 70% HOẶC khi kết thúc một giai đoạn lập trình lớn.

### Trạng thái Child Modules

| Child | Module | Trạng thái | Files chính |
|-------|--------|-----------|-------------|
| A | Search UI | ✅ v2.0.0 | `src/components/search/TourSearchBar.tsx` + `SearchResults.tsx` |
| B | Lịch khởi hành (SeaStar) + PDF Indexer | ✅ v1.2.0 | `src/lib/integrations/seastar.ts` + migrations #6+#7+#8 |
| C | Itinerary + PDF Embed | ✅ v2.1.0 | `TourDetail.tsx` (gallery lightbox + hashtag chips) + `PdfViewer.tsx` |
| D | Hồ sơ khách | ✅ v1.1.0 | `src/components/customer-profile/CustomerProfileDrawer.tsx` + `CustomerTable.tsx` |
| E | Chat & Lead | ✅ v2.0.0 | `src/components/chat/ChatWidget.tsx` + `AutoPopup.tsx` |
| F | CMS / RSS | ✅ v1.2.0 | `src/components/cms/ArticleFeed.tsx` |
| G | DB Schema | ✅ **13/13 cloud** | `supabase/migrations/` — Supabase: indjoegnsvcteaozmgrg |
| CRM | Admin CRM | ✅ v4.0.0 | `crm/page.tsx` + `ArticlesTab.tsx` + `ToursTab.tsx` + `StaffTab.tsx` — 6 tabs |
| AUTH | Admin Auth | ✅ v2.0.0 | `src/app/(admin)/login/page.tsx` + `src/middleware.ts` + `/api/admin/auth` |
| STAFF | Quản lý nhân viên | ✅ v1.0.0 | `crm/StaffTab.tsx` + `/api/admin/users` + `/api/admin/me` |
| TOURS-ADMIN | Admin Tour (CRM tab) | ✅ v1.0.0 | `src/app/(admin)/crm/ToursTab.tsx` — gallery + hashtags CRUD |
| TOURS-LIST | /tours listing | ✅ v1.2.0 | `ToursClient.tsx` + hashtag filter + stagger animation |
| NAV | Mega-menu Navigation | ✅ v1.0.0 | `Header.tsx` + `src/lib/mega-menu-data.ts` — 2 dropdown 3 cột |
| ANIM | Animations | ✅ **v1.1.0** | `globals.css` — @keyframes defined trực tiếp (fix Tailwind purge bug) |
| GALLERY | Gallery seed | ✅ v1.0.0 | migration #13 — Unsplash placeholder 3 ảnh/tour, 20 quốc gia |
| DOMESTIC | /tour-trong-nuoc | ✅ **v2.1.0** | `DomesticToursClient.tsx` — hashtag flex-wrap (fix scroll ngang) |
| INTL | /tour-nuoc-ngoai | ✅ **v2.2.0** | `InternationalToursClient.tsx` — hashtag flex-wrap + country filter |
| BOOKING | Booking form | ✅ v1.0.0 | `src/components/booking/BookingModal.tsx` — modal + floating CTA |
| EDGE | Edge Functions | ✅ v1.1.0 | `supabase/functions/google-drive/` — 23 folders created |
| PDF | PDF Crawler & Indexer | ✅ v1.3.0 | `/api/pdf-index` + migration #6+#7 |
| CRON | Vercel Cron | ✅ v1.0.0 | `/api/cron/crawl-pdf` + `vercel.json` |
| HOME | Trang chủ | ✅ v1.0.0 | `src/app/page.tsx` |
| LICH | Lịch Khởi Hành | ✅ v1.1.0 | `src/app/lich-khoi-hanh/page.tsx` |
| TIN-TUC | Blog Tin Tức | ✅ v1.1.0 | `src/app/tin-tuc/page.tsx` + `[slug]/page.tsx` |
| DIRECTUS | CMS Integration | ✅ v1.1.0 | `src/lib/directus.ts` — Supabase fallback hoạt động |

### Trạng thái API Routes

| Route | Method | Trạng thái | Ghi chú |
|-------|--------|-----------|---------|
| `/api/leads` | POST | ✅ | Zod + luồng kép Email+Realtime; `pax` field |
| `/api/cms` | GET/POST | ✅ | status=all cho admin; limit max 200 |
| `/api/cms/[id]` | PATCH/DELETE | ✅ | Auth: cookie hoặc x-admin-secret |
| `/api/tours` | GET/POST | ✅ | filter category/country/is_active/search |
| `/api/tours/[id]` | PATCH/DELETE | ✅ | Auth: cookie hoặc x-admin-secret; ?hard=true |
| `/api/customer-profile` | GET/PATCH | ✅ | Auth: cookie hoặc x-admin-secret |
| `/api/admin/auth` | POST/DELETE | ✅ | Login {username,password} → HttpOnly cookie 24h; DELETE = logout |
| `/api/admin/users` | GET/POST | ✅ | List + tạo admin users; bcrypt hash |
| `/api/admin/users/[id]` | PATCH/DELETE | ✅ | Update + soft deactivate |
| `/api/admin/me` | GET | ✅ | Trả AdminUser từ httpOnly cookie |
| `/api/search` | POST | ✅ | category filter |
| `/api/notifications` | POST | ✅ | Auth: x-webhook-secret |
| `/api/webhooks/n8n` | POST | ✅ | Auth: x-webhook-secret |
| `/api/webhooks/moda` | POST | ✅ | luồng kép nếu confirmed |
| `/api/departures` | GET/POST | ✅ | POST: cookie OR x-webhook-secret |
| `/api/itinerary/[tourId]` | GET | ✅ | Cache 5min; trả gallery_urls + hashtags |
| `/api/pdf-index` | GET | ✅ | FTS RPC |
| `/api/cron/crawl-pdf` | GET | ✅ | Auth kép |
| `/api/admin/setup-drive-folders` | POST | ✅ | 23 folders đã tạo |
| Edge: `google-drive` | POST | ✅ v1.1.0 | private_key fix; 3 actions |

### Zustand Stores

```
useUIStore              (store/ui.store.ts)               ✅
useNotificationStore    (store/notification.store.ts)      ✅ admin realtime
useSearchStore          (store/search.store.ts)            ✅
useCalendarStore        (store/calendar.store.ts)          ✅ fetchSchedules()
useChatStore            (store/chat.store.ts)              ✅
useCmsStore             (store/cms.store.ts)               ✅
useCustomerProfileStore (store/customer-profile.store.ts)  ✅
```

### Data Contract — Delta phiên #22

```typescript
// ── ⚠️ QUAN TRỌNG — URL thực tế của Admin (route group không thêm path) ────
// src/app/(admin)/login/page.tsx  → URL: /login   (KHÔNG phải /admin/login)
// src/app/(admin)/crm/page.tsx    → URL: /crm      (KHÔNG phải /admin/crm)
// middleware.ts matcher: ['/crm', '/crm/:path*']   redirect → /login

// ── LeadFormSchema (src/lib/validations/lead.schema.ts) ──────────────────
// pax: z.number().int().min(1).optional() — BookingModal gửi adults + children

// ── BookingModal (src/components/booking/BookingModal.tsx) ────────────────
// Props: tourId, tourName, schedules: TourSchedule[], onClose
// Submit POST /api/leads: { full_name, phone, email?, message, tour_id, lead_source:'organic', pax }
// Floating CTA: fixed bottom-6 right-6 (desktop) / center (mobile) — màu #FF6B00

// ── globals.css — @keyframes FIX (phiên #22) ─────────────────────────────
// @keyframes slide-up, fade-in-down, fade-in định nghĩa TRỰC TIẾP trong globals.css
// KHÔNG phụ thuộc vào Tailwind config (tránh bị purge trong production build)
// Lý do: animate-stagger dùng animation: slide-up nhưng không có component nào
//        dùng class animate-slide-up → Tailwind purge @keyframes slide-up → cards vô hình

// ── Hashtag chips (phiên #22) ─────────────────────────────────────────────
// InternationalToursClient + DomesticToursClient: đổi overflow-x-auto/min-w-max
// → flex-wrap, bỏ shrink-0 trên buttons → chips xuống dòng thay vì scroll ngang

// ── /tour/[tourId]/page.tsx ───────────────────────────────────────────────
// Luôn fetch departures → allSchedules: TourSchedule[] → truyền vào BookingModal
// showBooking state điều khiển modal visibility

// ── Gallery URLs (migration #13) ─────────────────────────────────────────
// tours.gallery_urls seeded 3 Unsplash photos/tour theo country (20 quốc gia)
// Admin thay bằng ảnh thực qua /crm → tab Tour → edit gallery_urls
```

### Hạ tầng & Tích hợp bên ngoài

```
GitHub  : https://github.com/trungdotest8/namngan-travel (branch: main)
Vercel  : namngan-travel — ✅ deployed; URL: namngan-travel.vercel.app
          ⚠️ CẦN THÊM: DIRECTUS_URL + DIRECTUS_STATIC_TOKEN
Supabase: indjoegnsvcteaozmgrg — ✅ 13/13 migrations cloud; 49 tours có gallery + hashtags
Edge Fn : ✅ deployed v1.1.0 — 23 Drive folders đã tạo
Directus: ⚠️ CHƯA setup — /tin-tuc dùng Supabase fallback (6 bài mẫu)
Vercel Cron: "0 2 * * *" /api/cron/crawl-pdf — ✅ CRON_SECRET đã có
Resend  : Domain namngantravel.com ĐÃ TẠO (ID: 4cf3c8a2-d600-43a6-bef8-03182924c30b)
          ⚠️ DNS chưa verify — cần thêm 3 records (xem bên dưới)
          RESEND_FROM_EMAIL đã đổi → noreply@namngantravel.com trên Vercel (prod+dev)
SeaStar : ✅ 49 tours tổng (41 nước ngoài + 8 trong nước)
Drive   : ✅ 23 folders created — root/domestic/international/[20 countries]
```

### Resend DNS Records cần thêm vào domain registrar

```
# Thêm 3 records này vào DNS của namngantravel.com:

1. TXT  — resend._domainkey.namngantravel.com
   Value: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCdFs6VUWNRa9qK1Gan...

2. MX   — send.namngantravel.com   Priority: 10
   Value: feedback-smtp.us-east-1.amazonses.com

3. TXT  — send.namngantravel.com
   Value: v=spf1 include:amazonses.com ~all

# Sau khi thêm DNS → vào resend.com/domains → Verify domain
# Email sẽ gửi từ noreply@namngantravel.com (env var đã sẵn sàng)
```

### Files ưu tiên cao chưa tồn tại / chưa hoàn chỉnh

```
# VIỆC CÒN LẠI ƯU TIÊN CAO:
Resend DNS: thêm 3 records vào registrar → verify trên resend.com (xem section trên)
Vercel env: DIRECTUS_URL + DIRECTUS_STATIC_TOKEN (khi setup Directus instance)

# CÓ THỂ TIẾP (feature):
Gallery thực: 49 tours có Unsplash placeholder — admin nhập ảnh thực qua /crm → tab Tour
CRM ToursTab: upload ảnh trực tiếp (base64 → Supabase Storage) thay vì chỉ nhập URL
CRM ArticlesTab: WYSIWYG editor (Tiptap lite) thay textarea HTML
/tin-tuc: pagination khi có nhiều bài viết
```

### Next Steps (3 việc làm ngay khi mở phiên mới)

1. **Verify Resend DNS** — Đăng nhập vào domain registrar `namngantravel.com`, thêm 3 DNS records ở section trên → resend.com/domains → "Verify" → email hoạt động từ `noreply@namngantravel.com`
2. **Thêm ảnh gallery thực** — `/crm` → tab "Quản lý Tour" → edit từng tour, nhập `gallery_urls` (ảnh thực thay Unsplash placeholder) để lightbox chuyên nghiệp hơn
3. **Setup Directus** — Tạo Directus instance → thêm `DIRECTUS_URL` + `DIRECTUS_STATIC_TOKEN` vào Vercel → `/tin-tuc` dùng CMS thực thay Supabase fallback

### Change Log

| Ngày | Giai đoạn | Thay đổi |
|------|-----------|---------|
| 2026-06-04 | Handover #22 — Bug Fixes: Tour Cards + Hashtag Wrap | Fix @keyframes slide-up purge; hashtag flex-wrap cả 2 listing pages |
| 2026-06-04 | Handover #21 — Gallery Seed + Hashtag Filter + Booking Form | migration #13 gallery_urls ✅; DomesticToursClient hashtag ✅; BookingModal ✅; pax field ✅ |
| 2026-06-04 | Handover #20 — Mega-menu + Animations + Hashtag Seed | Mega-menu 3 cột Header ✅; stagger/fade animations ✅; 49 tours hashtags seeded ✅; Resend domain created ✅ |
| 2026-06-03 | Handover #19 — Multi-User Auth + Staff Tab + URL fix | admin_users migration #10 ✅; bcrypt auth ✅; StaffTab ✅; fix /crm /login URLs ✅ |
| 2026-06-03 | Handover #18 — Admin Auth + Gallery Lightbox + Hashtag Filter | Login page + middleware + HttpOnly cookie ✅; gallery lightbox ✅; hashtag filter /tours ✅ |
| 2026-06-03 | Handover #17 — ToursTab CRUD + Edge Fn Fix + Migration #9 | ToursTab gallery+hashtags ✅; /api/tours CRUD ✅; migration #9 cloud ✅; Edge Fn fix ✅ |
| 2026-06-03 | Handover #16 — CMS Admin + Articles + Thumbnails | ArticlesTab CRUD ✅; 6 bài mẫu seeded ✅; Directus fallback ✅ |
| 2026-06-02 | Handover #15 — Directus CMS + /tours + Blog | /tours unified ✅; /tour-nuoc-ngoai v2 ✅; /tin-tuc ✅ |
| 2026-06-02 | Handover #14 — Bug Fixes + Domestic Data | /tours/[slug] ✅; 8 tour trong nước seeded ✅ |
| 2026-06-01 | Handover #13 — Tour Categories + 2 Listing Pages | /tour-trong-nuoc ✅; /tour-nuoc-ngoai ✅; migration #8 ✅ |
| 2026-06-01 | Handover #9–12 | Lịch khởi hành; PDF Crawler; Tour Detail; Secrets fix |
| 2026-05-31 | Handover #8 | SeaStar 313 records; api/departures ✅ |
| 2026-05-30 | Session 1–7 | Child A–G; CRM; leads luồng kép ✅ |

