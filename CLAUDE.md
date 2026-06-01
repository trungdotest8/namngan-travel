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
| C | Itinerary + PDF Embed | ✅ v2.0.0 | `TourDetail.tsx` + `PdfViewer.tsx` + `/api/itinerary/[tourId]` + `/tour/[tourId]/page.tsx` |
| D | Hồ sơ khách | ✅ v1.1.0 | `src/components/customer-profile/CustomerProfileDrawer.tsx` + `CustomerTable.tsx` |
| E | Chat & Lead | ✅ v2.0.0 | `src/components/chat/ChatWidget.tsx` + `AutoPopup.tsx` |
| F | CMS / RSS | ✅ v1.2.0 | `src/components/cms/ArticleFeed.tsx` |
| G | DB Schema | ✅ **8/8 cloud** | `supabase/migrations/` — Supabase: indjoegnsvcteaozmgrg |
| CRM | Admin CRM | ✅ v1.2.0 | `src/app/(admin)/crm/page.tsx` |
| HOME | Trang chủ | ✅ v1.0.0 | `src/app/page.tsx` |
| LICH | Lịch Khởi Hành | ✅ v1.1.0 | `src/app/lich-khoi-hanh/page.tsx` |
| TOUR | Tour Detail Page | ✅ v1.0.0 | `src/app/tour/[tourId]/page.tsx` |
| SLUG | /tours/[slug] redirect | ✅ v1.0.0 | `src/app/tours/[slug]/page.tsx` — lookup slug → redirect /tour/{uuid} |
| TOURS | /tours unified | ✅ v1.0.0 | `src/app/tours/page.tsx` + `ToursClient.tsx` — tabs Tất cả/Quốc tế/Trong nước |
| TRONG | Tour Trong Nước | ✅ v1.1.0 | `src/app/tour-trong-nuoc/page.tsx` — 8 tours seeded |
| NGOAI | Tour Nước Ngoài | ✅ v2.0.0 | `src/app/tour-nuoc-ngoai/page.tsx` + `InternationalToursClient.tsx` — redesign mobile, sort, no-scroll |
| TIN-TUC | Blog Tin Tức | ✅ v1.0.0 | `src/app/tin-tuc/page.tsx` + `[slug]/page.tsx` — Directus-powered |
| DIRECTUS | CMS Integration | ✅ v1.0.0 | `src/lib/directus.ts` — `@directus/sdk` v21, fetchArticles/BySlug/ById |
| EDGE | Edge Functions | ✅ deployed | `supabase/functions/google-drive/` |
| PDF | PDF Crawler & Indexer | ✅ v1.3.0 | `/api/pdf-index` + migration #6+#7 |
| CRON | Vercel Cron | ✅ v1.0.0 | `/api/cron/crawl-pdf` + `vercel.json` |
| UI | Atom Components | ✅ | `Button.tsx` + `Card.tsx` + `NotificationPanel.tsx` + `DepartureCalendar.tsx` + `TourListingCard.tsx` |

### Trạng thái API Routes

| Route | Method | Trạng thái | Ghi chú |
|-------|--------|-----------|---------|
| `/api/leads` | POST | ✅ | Zod + luồng kép Email+Realtime |
| `/api/cms` | GET/POST | ✅ | filter source_type, status, limit |
| `/api/customer-profile` | GET/PATCH | ✅ | Auth: x-admin-secret |
| `/api/search` | POST | ✅ | category filter ✅ |
| `/api/notifications` | POST | ✅ | Auth: x-webhook-secret |
| `/api/webhooks/n8n` | POST | ✅ | Auth: x-webhook-secret |
| `/api/webhooks/moda` | POST | ✅ | luồng kép nếu confirmed |
| `/api/departures` | GET | ✅ | **v1.1**: category/country dùng `!inner` join DB-level |
| `/api/departures` | POST | ✅ | SeaStar sync + broadcast |
| `/api/itinerary/[tourId]` | GET | ✅ | Cache 5min; 404 nếu tour chưa có lịch trình |
| `/api/pdf-index` | GET | ✅ | FTS RPC search_pdf_index() |
| `/api/cron/crawl-pdf` | GET | ✅ | Auth kép CRON_SECRET / x-webhook-secret |
| `/api/admin/setup-drive-folders` | POST | ✅ | Auth: x-admin-secret |
| Edge: `google-drive` | POST | ✅ deployed | ⚠️ Secrets chưa set → cần set thủ công |

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

### Data Contract — Delta phiên #15

```typescript
// ── Directus CMS (NEW) ────────────────────────────────────────────────────────
// src/lib/directus.ts — @directus/sdk v21
// ArticleListItem: id, title, slug, summary, thumbnail_url, category, tags, published_at
// ArticleDetail:   + content (HTML WYSIWYG), source_type, author_id
// fetchArticles(options?)      → ArticleListItem[]  (trả [] khi lỗi/chưa set)
// fetchArticleBySlug(slug)     → ArticleDetail | null
// fetchArticleById(id)         → ArticleDetail | null
// ENV: DIRECTUS_URL + DIRECTUS_STATIC_TOKEN (chưa set trên Vercel — cần set)
// Directus setup: DB_CLIENT=pg, DB_CONNECTION_STRING=postgresql://...supabase.co:5432/postgres

// ── /tours unified (NEW) ──────────────────────────────────────────────────────
// src/app/tours/page.tsx — Server Component, fetch ALL tours (cả 2 category)
// src/app/tours/ToursClient.tsx — tabs: ?category=international|domestic
// Header nav có link "Tất cả tour" → /tours

// ── /tour-nuoc-ngoai redesign (v2.0.0) ───────────────────────────────────────
// InternationalToursClient.tsx: flex-wrap filter (no scroll), sort dropdown,
// collapsible filter panel, "X Xóa lọc" button, hero stats bar

// ── /tin-tuc (NEW) ────────────────────────────────────────────────────────────
// src/app/tin-tuc/page.tsx      — listing, ?category= Server-side filter
// src/app/tin-tuc/[slug]/page.tsx — detail, dangerouslySetInnerHTML WYSIWYG
// generateMetadata() động — title + og:image từ Directus
// Trang render empty state đẹp khi Directus chưa có data
```

### Hạ tầng & Tích hợp bên ngoài

```
GitHub  : https://github.com/trungdotest8/namngan-travel (branch: main)
Vercel  : namngan-travel — ✅ env vars đã set; ⚠️ CẦN THÊM DIRECTUS_URL + DIRECTUS_STATIC_TOKEN
Supabase: indjoegnsvcteaozmgrg — ✅ 8/8 migrations cloud
Edge Fn : ✅ deployed — ⚠️ Secrets GOOGLE_SERVICE_ACCOUNT_JSON + DRIVE_PARENT_FOLDER_ID chưa set
          → Set thủ công: Supabase Dashboard > Project Settings > Edge Functions > Secrets
          → Sau khi set: POST /api/admin/setup-drive-folders (header x-admin-secret)
Directus: ⚠️ CHƯA setup instance — trang /tin-tuc hiện trống (empty state)
          → Self-host tại cms.namngantravel.com hoặc Directus Cloud
          → Connect: DB_CLIENT=pg + DB_CONNECTION_STRING Supabase
          → Tạo Static Token → set DIRECTUS_URL + DIRECTUS_STATIC_TOKEN trên Vercel
Vercel Cron: "0 2 * * *" /api/cron/crawl-pdf — ✅ CRON_SECRET đã có
.env.local: ✅ đầy đủ; DIRECTUS_URL + DIRECTUS_STATIC_TOKEN trống; N8N_WEBHOOK_URL trống
Resend  : onboarding@resend.dev (tạm) — ⚠️ cần verify domain namngantravel.com
SeaStar : ✅ 41 tours nước ngoài + 8 tours trong nước = 49 tours tổng
```

### Files ưu tiên cao chưa tồn tại / chưa hoàn chỉnh

```
# CẦN CHẠY (thủ công, unblock tính năng):
Vercel Dashboard > Env Vars: DIRECTUS_URL + DIRECTUS_STATIC_TOKEN
  → Sau đó /tin-tuc sẽ hiển thị bài viết từ Directus
Supabase Dashboard > Edge Fn > Secrets: GOOGLE_SERVICE_ACCOUNT_JSON + DRIVE_PARENT_FOLDER_ID
  → POST /api/admin/setup-drive-folders

# CÓ THỂ TIẾP (feature thêm):
thumbnail_url cho 8 tour trong nước  ← hiện null → hiển thị placeholder
/tin-tuc: thêm pagination hoặc infinite scroll khi có nhiều bài
/tours: thêm search box filter theo tên tour
```

### Next Steps (3 việc làm ngay khi mở phiên mới)

1. **Set Directus env vars trên Vercel** — `DIRECTUS_URL` + `DIRECTUS_STATIC_TOKEN` → unblock trang `/tin-tuc` hiển thị bài viết thật
2. **Set Edge Fn secrets** — Supabase Dashboard → Project Settings → Edge Functions → Secrets: `GOOGLE_SERVICE_ACCOUNT_JSON` + `DRIVE_PARENT_FOLDER_ID` → sau đó POST `/api/admin/setup-drive-folders`
3. **Thêm thumbnail cho 8 tour trong nước** — cập nhật `thumbnail_url` cho NN-TN-001..008 trong Supabase (hiện đang hiển thị placeholder xám)

### Change Log

| Ngày | Giai đoạn | Thay đổi |
|------|-----------|---------|
| 2026-06-02 | Handover #15 — Directus CMS + /tours + Blog | /tours unified ✅; /tour-nuoc-ngoai redesign v2 ✅; src/lib/directus.ts ✅; /tin-tuc + /tin-tuc/[slug] ✅ |
| 2026-06-02 | Handover #14 — Bug Fixes + Domestic Data | /tours/[slug] redirect ✅; 8 tour trong nước seeded ✅; departures !inner fix ✅; Footer links fix ✅ |
| 2026-06-01 | Handover #13 — Tour Categories + 2 Listing Pages | Tour.country backfill 41/41 ✅; /tour-trong-nuoc ✅; /tour-nuoc-ngoai + country tabs ✅; TourListingCard ✅; migration #8 cloud ✅ |
| 2026-06-01 | Handover #12 — Secrets + Migration Fix | .env.local SA JSON fix 1 dòng ✅; migration #7 search_pdf_index RPC ✅; setup-secrets.mjs ✅ |
| 2026-06-01 | Handover #11 — Tour Detail + PdfViewer + Cron | /tour/[tourId] ✅; PdfViewer.tsx ✅; /api/cron/crawl-pdf ✅; vercel.json crons ✅; migration #6 cloud ✅ |
| 2026-06-01 | Handover #10 — PDF Crawler Integration | migration #6 tour_pdf_index ✅; /api/itinerary/[tourId] ✅; /api/pdf-index FTS ✅; TourPdfIndex type ✅ |
| 2026-06-01 | Handover #9 — Lịch Khởi Hành + Realtime | /lich-khoi-hanh ✅; Realtime auto-refresh; NotificationPanel + Button + Card + DepartureCalendar ✅ |
| 2026-05-31 | Handover #8 — Child B SeaStar Crawler | syncSeaStarSchedules() 313 records; api/departures; calendar.store |
| 2026-05-30 | Handover #7 — Code Review + Security | 10 findings fixed |
| 2026-05-30 | Session 1–5 | Child A–G ghép xong; CRM; leads luồng kép ✅ |

