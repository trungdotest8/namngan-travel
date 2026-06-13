# NAM NGÂN TRAVEL — CLAUDE PROJECT MEMORY

## Tên dự án
**Nam Ngân Travel** — Website du lịch trọn gói.
Tên miền: `namngantravel.com`
Tên miền tham chiếu thiết kế: `trieuhaotravel.vn_ (1).jpg` (file ảnh trong repo).

> **⚠️ LƯU Ý TÊN THƯƠNG HIỆU:** Domain là `namngantravel.com` → "Nam Ngân" (ngân = bạc).
> Nếu đúng tên là "Nam Ngạn" (ngạn = bờ/proverb) hãy báo Orchestrator để cập nhật.

## 🤖 TripGenie — Hệ thống AI Du lịch

### Tầm nhìn sản phẩm
Nam Ngân Travel đang phát triển thành **TripGenie** — AI travel platform:
- SEO/social traffic → website → lead capture
- AI Agent phân loại lead, tư vấn, tạo lịch trình tự động
- Affiliate links nhúng trong lịch trình và tour pages
- Revenue: affiliate commission, tour booking, bán lead, visa, khách sạn, sim, bảo hiểm

### Business Model
| Kênh | Revenue |
|------|---------|
| Tour booking | Hoa hồng từ SeaStar / direct |
| Affiliate | Hotel (Booking.com/Agoda), Visa service, Insurance, SIM du lịch |
| Lead monetization | Bán lead qualified cho đối tác |
| Content SEO | Traffic organic → affiliate click |

### Roadmap TripGenie (6 phases)
| Phase | Module | Thời gian |
|-------|--------|-----------|
| **1** | AI Chat Core — Claude API + nâng cấp ChatWidget | 2–3 ngày |
| **2** | Lead Classification AI — auto score + ai_tags | 1–2 ngày |
| **3** | Affiliate Engine — tracking links, commission log | 2–3 ngày |
| **4** | Zalo OA + FB Lead Ads → CRM | 2–3 ngày |
| **5** | Itinerary Builder AI — streaming + affiliate nhúng | 2–3 ngày |
| **6** | Content Automation + Programmatic SEO /du-lich/[country] | 3–5 ngày |

### Tech stack bổ sung (TripGenie)
| Layer | Công nghệ |
|-------|-----------|
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) |
| Affiliate tracking | Custom tables: `affiliate_links` + `affiliate_clicks` |
| Zalo OA | Zalo API v2 |
| Embeddings | OpenAI text-embedding-3-small (cho `tour_pdf_index`) |

### Biến môi trường TripGenie (bổ sung vào .env)
```
ANTHROPIC_API_KEY        ← Claude API (Phase 1)
ZALO_OA_ACCESS_TOKEN     ← Zalo OA messaging (Phase 4)
ZALO_OA_SECRET           ← Verify Zalo webhook (Phase 4)
FB_PAGE_ACCESS_TOKEN     ← Facebook page posting (Phase 4, 6)
```

### Folder mới sẽ thêm
```
src/lib/ai/              ← claude.ts, prompts.ts, rag.ts, embeddings.ts
src/lib/affiliate/       ← providers.ts, tracker.ts
src/app/api/ai/          ← chat, classify-lead, itinerary, recommend
src/app/api/affiliate/   ← track, commission
src/components/ai/       ← AiChatPanel, ItineraryBuilder, TourRecommendCard
src/components/affiliate/ ← AffiliateLink, CommissionBadge
```

### DB migrations sẽ thêm
- `#15`: `affiliate_links` (provider, product_type, tracking_url, commission_rate)
- `#16`: `affiliate_clicks` (link_id, lead_id, session_id, clicked_at)
- `#17`: `ai_conversations` (lead_id, session_id, messages jsonb, context jsonb)
- `#18`: `leads.ai_tags jsonb` column

---

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
| A | Search UI | ✅ v2.1.0 | `src/components/search/TourSearchBar.tsx` + `SearchResults.tsx` |
| B | Lịch khởi hành + PDF Indexer | ✅ v1.3.1 | `src/lib/integrations/seastar.ts` — 6 tháng; limit 1000 |
| C | Itinerary + PDF Embed | ✅ v2.1.0 | `TourDetail.tsx` + `PdfViewer.tsx` |
| D | Hồ sơ khách | ✅ v1.3.0 | `CustomerProfileDrawer.tsx` + `CustomerTable.tsx` — Export+Import CSV ✅ |
| E | Chat & Lead | ✅ v2.2.0 | `ChatWidget.tsx` — 2 tab: "Để lại số" + "Chat AI" |
| F | CMS / RSS | ✅ v1.3.0 | `ArticleFeed.tsx` — TiptapEditor ✅ |
| G | DB Schema | ✅ **24 local / 22 cloud** | `supabase/migrations/` — migration #26 (images) LOCAL chưa push |
| CRM | Admin CRM | ✅ v8.5.0 | `crm/page.tsx` + `ToursTab.tsx` — gallery button (🖼) per row ✅ |
| AUTH | Admin Auth | ✅ v2.0.0 | `login/page.tsx` + `middleware.ts` — cookie: `admin_session` |
| TRIPGENIE | AI Chat Core | ✅ v1.2.0 | `/api/ai/chat` Node.js runtime; RAG ✅ — claude-sonnet-4-6 |
| TRIPGENIE-LEADS | Lead Capture | ✅ v2.1.0 | `/api/leads` POST (adminClient); `/api/leads/[id]` PATCH ✅ |
| TRIPGENIE-CLASSIFY | AI Classification | ✅ v1.0.0 | `src/lib/ai/classify.ts` — claude-haiku-4-5 |
| TRIPGENIE-AFFILIATE | Affiliate Engine | ✅ v1.0.0 | migration #18; `src/lib/affiliate/tracker.ts` |
| TRIPGENIE-ITINERARY | Itinerary Builder AI | ✅ v1.0.0 | `/api/ai/itinerary` 4096 tokens SSE — claude-sonnet-4-6 |
| LEADS-ACTIVITIES | Nhật ký chăm sóc | ✅ v1.0.0 | migration #19; `/api/leads/[id]/activities` |
| LEADS-IMPORT | Bulk Import CSV | ✅ v1.0.0 | `/api/leads/import` POST max 500 |
| NOTIFY | Notification | ✅ v2.1.0 | Email + Realtime + Telegram; `src/lib/notifications/index.ts` |
| RAG | AI Context | ✅ v1.0.0 | `src/lib/ai/rag.ts` — searchRelevantTours() |
| ZALO-WEBHOOK | Phase 4 Zalo OA | ✅ v1.0.0 | `/api/webhooks/zalo/route.ts` + `src/lib/zalo/client.ts` |
| FB-LEADS-WEBHOOK | Phase 4 FB Lead Ads | ✅ v1.0.0 | `/api/webhooks/fb-leads/route.ts` |
| GSHEET-SYNC | Google Sheets Sync | ✅ v1.1.0 | `scripts/sheets-sync/Code.gs` — LIVE ✅ |
| PHASE6-SEO | Programmatic SEO | ✅ v1.0.0 | `src/app/du-lich/[country]/page.tsx` + `CountryToursClient.tsx` |
| PHASE6-CONTENT | Content Generate AI | ✅ v1.0.1 | `/api/content/generate` — claude-opus-4-8 |
| REMOTE-DEV | Tailscale + code-server | ✅ v1.0.0 | Mac 100.117.250.21:8080 \| pw: 074f49a444ee24314c07bda0 |
| SCRAPER-TQ | TrieuHao TQ Downloader | ✅ v1.0.0 | `scripts/download-trieuhao-tq.mjs` — 30 tours; 128MB |
| AUDIENCE-CONTACTS | SMS Audience Import | ✅ v1.0.0 | migration #22 ✅ cloud; `/api/admin/audiences/export` ✅ |
| SEASTAR-CRAWLER | SeaStar Crawler v3 | ✅ **v1.2.0** | `scripts/crawl-seastar-tours.ts` — 83 tours Sheets ✅; batch write ✅ |
| TOURS-IMPORT | Tour Detail Import từ Sheets | ✅ **v1.0.1** | `scripts/import-tours-from-sheet.ts` — 36 tours đã upsert Supabase ✅ |
| TOUR-DETAIL-PAGE | Trang chi tiết tour | ✅ **v4.0.0** | `TourDetailClient.tsx` — TourGallery wired; gallery fallback thumbnail |
| TOUR-LEADBOX | Lead Capture trên Tour | ✅ v1.0.0 | `src/components/tour/TourLeadBox.tsx` — Zod phone + advisor card tel/Zalo |
| TOUR-TABNAV | Sticky Tab Nav | ✅ v1.0.0 | `src/components/tour/TourTabNav.tsx` — IntersectionObserver 2 tab |
| TOUR-TIMELINE | Timeline Itinerary | ✅ v1.0.0 | `src/components/tour/TourTimeline.tsx` — open sẵn; meals badge; thu/mở gọn |
| TOUR-LINKS | Tour ecosystem linking | ✅ v1.0.0 | sitemap, TourCard, TourListingCard, /lich-khoi-hanh, "Tour cùng loại" |
| BOOKING-BTN | BookingScheduleButton | ✅ v1.0.0 | `src/components/tour/BookingScheduleButton.tsx` |
| HOMEPAGE-PERF | Homepage FPS Fix | ✅ **v1.0.0** | `page.tsx`+`TourCard.tsx`+`TourListingCard.tsx` — shadow-overlay; content-visibility ⚡ |
| TRIPAGENT-PERF | TripAgent Chat Perf | ✅ **v1.0.0** | `AiChatPanel.tsx`+`ChatWidget.tsx`+`ai-chat.store.ts` — React.memo; smart-scroll ⚡ |
| TOUR-GALLERY | Tour Gallery (upload thủ công) | ✅ **v1.0.0** | `TourGallery.tsx`+`GalleryLightbox.tsx`+`TourGalleryManager.tsx`; migration #26 |

### Trạng thái API Routes

| Route | Method | Trạng thái | Ghi chú |
|-------|--------|-----------|---------|
| `/api/leads` | POST | ✅ v2.1.0 | adminClient + honeypot + lead_score + Telegram + classify auto |
| `/api/leads` | GET | ✅ | Auth + filter ?channel= ?status= ?page= ?limit= |
| `/api/leads/[id]` | PATCH | ✅ | LeadStatusUpdateSchema + auth |
| `/api/leads/[id]/activities` | GET+POST | ✅ | ActivityInsertSchema + Realtime broadcast |
| `/api/leads/import` | POST | ✅ | Bulk insert max 500 |
| `/api/ai/chat` | POST | ✅ v1.2.0 | Node.js + RAG + SSE — claude-sonnet-4-6 |
| `/api/ai/classify-lead` | POST | ✅ | classifyLead() — claude-haiku-4-5 |
| `/api/ai/itinerary` | POST | ✅ | 4096 tokens SSE — claude-sonnet-4-6 |
| `/api/affiliate/track` | GET | ✅ | click → 302 redirect; IP hash SHA-256 |
| `/api/customer-profile` | GET+PATCH | ✅ | Auth + limit 200 |
| `/api/search` | POST | ✅ | OR query name\|destination\|country |
| `/api/cms` | GET/POST | ✅ | pagination + new_article notification |
| `/api/tours` | GET/POST | ✅ | filter category/country/is_active |
| `/api/tours/[id]` | PATCH | ✅ | TourUpdateSchema — hỗ trợ images[] (migration #26) |
| `/api/featured-destinations` | ALL | ✅ | |
| `/api/admin/upload-image` | POST | ✅ | base64 → `tour-galleries` bucket |
| `/api/notifications` | POST | ✅ | x-webhook-secret |
| `/api/departures` | GET | ✅ | filter destination/month/status/country; max 1000 |
| `/api/departures` | POST | ✅ v2.2.0 | SeaStar-only; 6 tháng; broadcast Realtime |
| `/api/departures/sync` | POST | ✅ | Apps Script UPSERT; URL: www.namngantravel.com |
| `/api/itinerary/[tourId]` | GET | ✅ | |
| `/api/pdf-index` | GET | ✅ | FTS RPC |
| `/api/cron/crawl-pdf` | GET | ✅ | |
| `/api/webhooks/n8n` | POST | ✅ | |
| `/api/webhooks/moda` | POST | ✅ | |
| `/api/webhooks/zalo` | POST+GET | ✅ | HMAC SHA256 + upsert lead + auto-reply |
| `/api/webhooks/fb-leads` | POST+GET | ✅ | hub.challenge + Graph API + dedup fb_lead_id |
| `/api/content/generate` | POST | ✅ | Admin auth; claude-opus-4-8; INSERT articles draft |
| `/api/admin/audiences/export` | GET | ✅ | ?platform=facebook\|tiktok; SHA-256; paginate |

### Zustand Stores

```
useUIStore              (store/ui.store.ts)               ✅
useNotificationStore    (store/notification.store.ts)      ✅ — wired vào CRM bell
useSearchStore          (store/search.store.ts)            ✅
useCalendarStore        (store/calendar.store.ts)          ✅ — limit 1000
useChatStore            (store/chat.store.ts)              ✅
useCmsStore             (store/cms.store.ts)               ✅
useCustomerProfileStore (store/customer-profile.store.ts)  ✅ — default filter 'deposited'
useAiChatStore          (store/ai-chat.store.ts)           ✅ — appendDelta O(1) index-based ⚡
```

### Hạ tầng & Tích hợp bên ngoài

```
GitHub  : https://github.com/trungdotest8/namngan-travel (branch: main) — commit ce41935
          ⚠️  Gallery changes (Handover #62) chưa commit+push — làm ngay
Vercel  : namngan-travel — deploy tự động từ main — last deploy từ ce41935
Supabase: indjoegnsvcteaozmgrg — 24 migrations local / 22 cloud
          ⚠️  migration #26 (tour_images) LOCAL ONLY — cần push lên cloud
          ✅ bucket 'tour-galleries' | ✅ ai_conversations | ✅ featured_destinations
          ✅ SeaStar 476 lịch synced tháng 6–11/2026
          ✅ 36 tours có detail_synced_at NOT NULL
Resend  : Domain namngantravel.com — PENDING DNS
ANTHROPIC_API_KEY: ⚠️ CREDIT DEPLETED — TripAgent 400 error — cần nạp console.anthropic.com
TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID: ✅ Vercel đã set
NEXT_PUBLIC_SALES_NAME=Lê Hoài Nam: ✅ Vercel Production + Development
NEXT_PUBLIC_SALES_PHONE=0932611933: ✅ Vercel Production + Development
Env vars CẦN THÊM Vercel: ZALO_OA_SECRET, ZALO_OA_ACCESS_TOKEN, FB_VERIFY_TOKEN, FB_APP_SECRET
Remote Dev: Tailscale ✅ | code-server ✅ | Mac 100.117.250.21:8080 | pw: 074f49a444ee24314c07bda0

Google Sheets:
  Tab "tour_schedules": SeaStar sync 2h sáng hàng ngày (Apps Script Code.gs)
  Tab "tours_master": 83 tours crawled ✅ (36 unique codes upsert Supabase ✅)

pnpm build (Handover #62): ✅ CLEAN — 0 TypeScript errors
  Route /: ○ Static ISR revalidate=1800
  Route /tao-lich-trinh: ○ Static
  /api/affiliate/track: ƒ Dynamic (pre-existing DYNAMIC_SERVER_USAGE warning — không ảnh hưởng)

Claude models:
  src/lib/ai/claude.ts              → claude-sonnet-4-6
  src/lib/ai/classify.ts            → claude-haiku-4-5-20251001
  src/app/api/ai/itinerary/route.ts → claude-sonnet-4-6
  src/app/api/content/generate/route.ts → claude-opus-4-8
```

### Data Contract — Thay đổi phiên #62

```typescript
// ── TOUR GALLERY (migration #26) ─────────────────────────────────────────────
// tours.images: string[] | null (JSONB)
// - null = chưa upload ảnh → trang tour fallback về thumbnail_url
// - string[] = URLs từ bucket 'tour-galleries' do admin upload
// - images[0] = ảnh đại diện gallery (cover)
// Tách biệt với gallery_urls (text[]) đã có — gallery_urls = URL nhập tay, images = upload

// TourGallery component (TourDetailClient.tsx line ~178):
//   if Array.isArray(tour.images) && tour.images.length > 0 → render <TourGallery>
//   else if tour.thumbnail_url → render hero img fallback
//   else → nothing (không crash)
//
// TourGallery layout patterns:
//   1 image  → full width, aspect-ratio 16:9
//   2 images → grid-cols-2, aspect-ratio 4:3
//   3 images → large left (50%) + 2 stacked right, h-72 fixed
//   4 images → 2×2 grid, aspect-ratio 4:3
//   ≥5 images → h-[420px] fixed, large 50% + 2×2 right
//              "Xem tất cả ảnh (+n)" button bottom-right of large image
//   Mobile → CSS scroll-snap carousel, width=85vw per slide, badge [i/n]
//
// GalleryLightbox: keyboard ← → Esc; aria-modal; fixed z-[70]
//
// TourGalleryManager (CRM ToursTab — icon 🖼 per row):
//   - Reads tours.images (not gallery_urls)
//   - Upload via /api/admin/upload-image (base64 → Supabase Storage)
//   - HTML5 draggable reorder; max 12 images; warn >500KB (không blocking)
//   - PATCH /api/tours/[id] với { images: string[] }
//   - ErrorBoundary moduleName="GalleryManager"

// ── HOMEPAGE TOUR CARDS — SHADOW OVERLAY PATTERN ─────────────────────────────
// transition-opacity instead of transition-shadow (compositor only, không repaint)
// page.tsx: export const revalidate = 1800
// INTL + DOMESTIC sections: style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 700px' }}

// ── TRIPAGENT PERFORMANCE PATTERNS ───────────────────────────────────────────
// ai-chat.store.ts appendDelta O(1) index-based; React.memo ChatBubble/ChatMessage
// Smart scroll: rafPendingRef + userScrollingUpRef (80px threshold)
// page.tsx /tour/[tourId]: export const dynamic = 'force-dynamic'
```

### Files ưu tiên cao cần làm

```
# ƯU TIÊN #1 — COMMIT + PUSH GALLERY CHANGES LÊN GITHUB:
  git add supabase/migrations/20260613000000_tour_images.sql
          src/types/tour.types.ts
          src/app/api/tours/[id]/route.ts
          src/components/crm/TourGalleryManager.tsx
          src/app/(admin)/crm/ToursTab.tsx
          src/components/tour/TourGallery.tsx
          src/components/tour/GalleryLightbox.tsx
          src/app/tour/[tourId]/TourDetailClient.tsx
          CLAUDE.md
  git commit -m "feat(gallery): Tour Gallery upload thủ công — TourGalleryManager + TourGallery + Lightbox + migration #26"
  git push → Vercel auto deploy

# ƯU TIÊN #2 — PUSH MIGRATION #26 LÊN SUPABASE CLOUD:
  supabase db push  (hoặc chạy SQL thủ công trên Supabase Dashboard)
  ALTER TABLE tours ADD COLUMN IF NOT EXISTS images jsonb;

# ƯU TIÊN #3 — NẠP ANTHROPIC API CREDITS (TripAgent đang DOWN):
  Vào console.anthropic.com → Billing → Add credits
  Nạp tối thiểu $10 để TripAgent hoạt động lại
  Sau nạp: test TripAgent trên production widget

# ƯU TIÊN #4 — TEST GALLERY END-TO-END (sau push Supabase):
  1. Admin CRM → Tours tab → click icon 🖼 trên 1 tour
  2. Upload 6 ảnh → kéo thả sắp xếp → Lưu
  3. Mở trang /tour/[slug] → kiểm tra desktop grid (large+4small)
  4. Mobile 380px → carousel vuốt mượt
  5. Click ảnh → Lightbox mở → ← → Esc hoạt động

# ƯU TIÊN #5 — VERCEL ENV VARS CÒN THIẾU (manual):
  ZALO_OA_SECRET, ZALO_OA_ACCESS_TOKEN, FB_VERIFY_TOKEN, FB_APP_SECRET
```

### Next Steps (3 việc làm ngay khi mở phiên mới)

1. **Commit + push Gallery changes** — 9 files đã sửa/tạo → `git push` → Vercel auto deploy
2. **Push migration #26 lên Supabase cloud** — `supabase db push` hoặc Dashboard SQL
3. **Nạp Anthropic credits** — TripAgent đang 400 credit depleted → console.anthropic.com

### Change Log

| Ngày | Giai đoạn | Thay đổi |
|------|-----------|---------|
| 2026-06-13 | Handover #62 — Tour Gallery ✅ | migration #26; TourGalleryManager drag+upload; TourGallery grid/carousel; GalleryLightbox |
| 2026-06-12 | Handover #61 — TripAgent Chat Perf ✅ | ChatBubble.memo+SmartScroll; AiInput isolated; appendDelta O(1) index-based |
| 2026-06-12 | Handover #60 — Homepage FPS Fix ✅ | shadow-overlay pattern×3 cards; backdrop-blur removed; content-visibility; ISR 1800 |
| 2026-06-12 | Handover #59 — Tour Detail 500 fix + Import ✅ | force-dynamic DYNAMIC_SERVER_USAGE; 36 tours imported; ws+dedup fix |
| 2026-06-12 | Handover #58 — Tour Detail v3.0.0 + Crawler ✅ | TourLeadBox+TabNav+Timeline; crawler batch fix; 83 tours Sheets |
| 2026-06-12 | Handover #57 — Crawler Pipeline vận hành | endpoint fix departures.php; 3 tours AI ok; Sheets tab lỗi fix |
| 2026-06-12 | Handover #56 — Tour Detail v2.0.0 hotfix | [slug]→[tourId] revert; UUID-safe lookup; isolated schedules |
| 2026-06-12 | Handover #56 — Tour Detail v2.0.0 | [slug] route; flight codes; mobile cards; BookingScheduleButton |
| 2026-06-11 | Handover #55 — Tour Ecosystem Linking DONE | sitemap /tour/[slug]; TourListingCard slug prop; /lich-khoi-hanh |
| 2026-06-11 | Handover #54 — Tour Detail Page DONE | page.tsx Server Component ISR + TourDetailClient.tsx; SSG |
| 2026-06-11 | Handover #53 — Tours Detail Import DONE | migration #24 + import-tours-from-sheet.ts + tour.types.ts ✅ |
| 2026-06-11 | Handover #52 — Crawler DONE + migration fix | crawl-seastar-tours.ts ✅; migration #22 IF NOT EXISTS fix |
| 2026-06-11 | Handover #51 — Audience Contacts DONE + Crawler plan | Audience pipeline ✅; Crawler v3 plan approved |
| 2026-06-11 | Handover #50 — Sheets Sync LIVE + Audience spec | Sheets sync live ✅; URL fix www.; migrations #16-21 cloud ✅ |
| 2026-06-10 | Handover #49 — Sheets Sync + Model Tune | Code.gs Apps Script; /api/departures/sync; migration #21 |
| 2026-06-10 | Handover #48 — Model update claude-opus-4-8 | 4 files AI → claude-opus-4-8; TS CLEAN |
| 2026-06-09 | Handover #47 — Remote dev + TQ Scraper | Tailscale+code-server ✅; /api/content/generate; 30 TQ tours |
| 2026-06-09 | Handover #46 — Phase 6 DONE: /api/content/generate | claude-sonnet-4-6; style seo/blog/social; INSERT articles draft |
| 2026-06-09 | Handover #45 — Phase 6 SEO + Japan seed + SeaStar fix | /du-lich/[country] ✅; migration #20; SeaStar code fix |
| 2026-06-09 | Handover #44 — SeaStar 6 tháng + fix limit + xóa TrieuHao | getMonths(3→6); limit 200→1000; 476 lịch synced |
