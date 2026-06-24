# NAM NGÂN TRAVEL — CLAUDE PROJECT MEMORY

## Tên dự án
**Nam Ngân Travel** — Website du lịch trọn gói.
Tên miền: `namngantravel.com`
Tên miền tham chiếu thiết kế: `trieuhaotravel.vn_ (1).jpg` (file ảnh trong repo).

> **⚠️ LƯU Ý TÊN THƯƠNG HIỆU:** Domain là `namngantravel.com` → "Nam Ngân" (ngân = bạc).
> Nếu đúng tên là "Nam Ngạn" (ngạn = bờ/proverb) hãy báo Orchestrator để cập nhật.

## Thông tin liên lạc chính thức

> Dùng thống nhất trong toàn bộ codebase (Footer, JSON-LD, email templates, prompt AI...).

| Trường | Giá trị |
|--------|---------|
| **Địa chỉ** | 525/44 Huỳnh Văn Bánh, Phường Phú Nhuận, Quận Phú Nhuận, Thành phố Hồ Chí Minh, Việt Nam |
| **Email** | dulichnamngan@gmail.com |
| **Hotline** | 0932 611 933 |
| **Zalo** | 0774 623 514 |
| **Website** | namngantravel.com |

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
| G | DB Schema | ✅ **27 local / 25 cloud** | `supabase/migrations/` — migration #28+#29 chưa push cloud ⚠️ |
| CRM | Admin CRM | ✅ **v9.1.0** | `crm/page.tsx` — tab `landing-pages` + `Layers` icon ✅ |
| AUTH | Admin Auth | ✅ v2.0.0 | `login/page.tsx` + `middleware.ts` — cookie: `admin_session` |
| TRIPGENIE | AI Chat Core | ✅ v1.2.0 | `/api/ai/chat` Node.js runtime; RAG ✅ — **claude-sonnet-4-6** |
| TRIPGENIE-LEADS | Lead Capture | ✅ v2.1.0 | `/api/leads` POST (adminClient); `/api/leads/[id]` PATCH ✅ |
| TRIPGENIE-CLASSIFY | AI Classification | ✅ v1.1.0 | `src/lib/ai/classify.ts` — **claude-haiku-4-5-20251001** |
| TRIPGENIE-AFFILIATE | Affiliate Engine | ✅ v1.0.0 | migration #18; `src/lib/affiliate/tracker.ts` |
| TRIPGENIE-ITINERARY | Itinerary Builder AI | ✅ v1.1.0 | `/api/ai/itinerary` 4096 tokens SSE — **claude-sonnet-4-6** |
| LEADS-ACTIVITIES | Nhật ký chăm sóc | ✅ v1.0.0 | migration #19; `/api/leads/[id]/activities` |
| LEADS-IMPORT | Bulk Import CSV | ✅ v1.0.0 | `/api/leads/import` POST max 500 |
| NOTIFY | Notification | ✅ v2.1.0 | Email + Realtime + Telegram; `src/lib/notifications/index.ts` |
| RAG | AI Context | ✅ v1.0.0 | `src/lib/ai/rag.ts` — searchRelevantTours() |
| ZALO-WEBHOOK | Phase 4 Zalo OA | ✅ **v2.0.0** | `/api/webhooks/zalo/route.ts` — multi-account + mapping + ticket ✅ |
| FB-LEADS-WEBHOOK | Phase 4 FB Lead Ads | ✅ v1.0.0 | `/api/webhooks/fb-leads/route.ts` |
| TELEGRAM-WEBHOOK | Omnichannel Gateway | ✅ **v1.0.0** | `/api/webhooks/telegram/route.ts` — staff reply → Zalo ✅ |
| GSHEET-SYNC | Google Sheets Sync | ✅ v1.1.0 | `scripts/sheets-sync/Code.gs` — LIVE ✅ |
| PHASE6-SEO | Programmatic SEO | ✅ v1.0.0 | `src/app/du-lich/[country]/page.tsx` + `CountryToursClient.tsx` |
| PHASE6-CONTENT | Content Generate AI | ✅ v1.0.1 | `/api/content/generate` — claude-opus-4-8 |
| REMOTE-DEV | Tailscale + code-server | ✅ v1.0.0 | Mac 100.117.250.21:8080 \| pw: 074f49a444ee24314c07bda0 |
| SCRAPER-TQ | TrieuHao TQ Downloader | ✅ v1.0.0 | `scripts/download-trieuhao-tq.mjs` — 30 tours; 128MB |
| AUDIENCE-CONTACTS | SMS Audience Import | ✅ v1.0.0 | migration #22 ✅ cloud; `/api/admin/audiences/export` ✅ |
| SEASTAR-CRAWLER | SeaStar Crawler v3 | ✅ v1.2.0 | `scripts/crawl-seastar-tours.ts` — 83 tours Sheets ✅ |
| TOURS-IMPORT | Tour Detail Import từ Sheets | ✅ v1.0.1 | `scripts/import-tours-from-sheet.ts` — 36 tours upsert ✅ |
| TOUR-DETAIL-PAGE | Trang chi tiết tour | ✅ v5.1.0 | `TourDetailClient.tsx` — 2-col scrollspy; day.images[] render ✅ |
| TOUR-BOOKING-WIDGET | Sticky Booking Widget | ✅ v1.0.0 | `src/components/tour/TourBookingWidget.tsx` |
| ITINERARY-NAV | Scrollspy Sidebar Nav | ✅ v1.0.0 | `src/components/tour/ItineraryNav.tsx` |
| ITINERARY-EDITOR | Admin Itinerary Editor | ✅ v1.0.0 | `ToursTab.tsx` — days+meals+ảnh ✅ |
| TOUR-LEADBOX | Lead Capture trên Tour | ✅ v1.0.0 | `src/components/tour/TourLeadBox.tsx` |
| TOUR-LINKS | Tour ecosystem linking | ✅ v1.0.0 | sitemap, TourCard, TourListingCard, /lich-khoi-hanh |
| HOMEPAGE-PERF | Homepage FPS Fix | ✅ v1.0.0 | shadow-overlay; content-visibility ⚡ |
| TRIPAGENT-PERF | TripAgent Chat Perf | ✅ v1.0.0 | React.memo; smart-scroll; appendDelta O(1) ⚡ |
| TOUR-GALLERY | Tour Gallery | ✅ v2.1.0 | `TourGallery.tsx` — backward-compat helpers ✅ |
| IMAGES-FORMAT | tours.images format | ✅ v1.0.0 | migration #27 cloud ✅; {url,alt,caption,order}[] |
| LISTING-UI | Tour Listing UI đồng nhất | ✅ v1.0.0 | `HScrollRow.tsx`; 4 Client filter+sort chuẩn |
| UPLOAD-IMAGE-FIX | Admin upload auth fix | ✅ v1.0.0 | `isAdminRequest()` ✅ |
| LANDING-PAGE-FACTORY | Landing Page từ FB Ads | ✅ v1.0.0 | `/promo/[slug]` ISR 1800s; AI extract sonnet-4-6 ✅ |
| CONTACT-INFO | Thông tin liên lạc | ✅ v1.0.0 | Header+Footer+JSON-LD: 525/44 Huỳnh Văn Bánh ✅ |
| OMNICHANNEL-GATEWAY | Zalo↔Telegram bidirectional | ✅ **v1.0.0** | migration #29; `zalo_accounts`+`telegram_zalo_mappings`+`conversation_logs`+`support_tickets` |
| CRM-GATEWAY-API | CRM Omnichannel Routes | ✅ **v1.0.0** | `/api/crm/customers/[leadId]`+`/conversations`+`/notes`; `/api/crm/tickets` |
| DX-TOOLCHAIN | Cline+Continue+Roo Code | ✅ **v1.0.0** | `.clinerules` + `.continue/config.json` + `.vscode/` + `.prettierrc` + `.eslintrc.json` |

### Trạng thái API Routes

| Route | Method | Trạng thái | Ghi chú |
|-------|--------|-----------|---------|
| `/api/leads` | POST | ✅ v2.1.0 | adminClient + honeypot(`website_hp`) + Telegram + classify → 201 |
| `/api/leads` | GET | ✅ | Auth + filter ?channel= ?status= ?page= ?limit= |
| `/api/leads/[id]` | PATCH | ✅ | field: `lead_status` + auth |
| `/api/leads/[id]/activities` | GET+POST | ✅ | field: `action_type` enum note\|call\|email\|other |
| `/api/leads/import` | POST | ✅ | Bulk insert max 500 |
| `/api/ai/chat` | POST | ✅ v1.2.0 | Node.js + RAG + SSE — **claude-sonnet-4-6** |
| `/api/ai/classify-lead` | POST | ✅ | classifyLead() — **claude-haiku-4-5-20251001** |
| `/api/ai/itinerary` | POST | ✅ | 4096 tokens SSE — **claude-sonnet-4-6** |
| `/api/affiliate/track` | GET | ✅ | param: `link_id` UUID; 302 redirect |
| `/api/customer-profile` | GET+PATCH | ✅ | Auth + limit 200 |
| `/api/search` | POST | ✅ | destination + adults + children (required) |
| `/api/cms` | GET/POST | ✅ | pagination + new_article notification |
| `/api/tours` | GET | ✅ | filter: category + country + is_active |
| `/api/tours/[id]` | PATCH | ✅ v1.2.0 | adminClient; itinerary JSONB; PGRST116→404 |
| `/api/tours/[id]` | DELETE | ✅ v1.1.0 | adminClient; soft delete (is_active=false) |
| `/api/featured-destinations` | ALL | ✅ | |
| `/api/admin/upload-image` | POST | ✅ v1.1.0 | isAdminRequest() ✅; base64→`tour-galleries` |
| `/api/admin/landing-page/generate` | POST | ✅ v1.0.0 | AI extract claude-sonnet-4-6 + Zod + upsert slug |
| `/api/admin/landing-pages` | GET | ✅ v1.0.0 | ⚠️ cần migration #28 cloud |
| `/api/notifications` | POST | ✅ | x-webhook-secret |
| `/api/departures` | GET | ✅ | filter destination/month/status/country; max 1000 |
| `/api/departures` | POST | ✅ v2.2.0 | SeaStar-only; 6 tháng; broadcast Realtime |
| `/api/departures/sync` | POST | ✅ | Apps Script UPSERT |
| `/api/itinerary/[tourId]` | GET | ✅ | |
| `/api/pdf-index` | GET | ✅ | FTS RPC |
| `/api/webhooks/n8n` | POST | ✅ | |
| `/api/webhooks/moda` | POST | ✅ | |
| `/api/webhooks/zalo` | POST+GET | ✅ **v2.0.0** | HMAC SHA256 + multi-account + mapping + conversation_log + auto-ticket |
| `/api/webhooks/telegram` | POST+GET | ✅ **v1.0.0** | Staff reply → Zalo; secret_token verify; mapping lookup |
| `/api/webhooks/fb-leads` | POST+GET | ✅ | hub.challenge + Graph API + dedup fb_lead_id |
| `/api/content/generate` | POST | ✅ | Admin auth; claude-opus-4-8; INSERT articles draft |
| `/api/admin/audiences/export` | GET | ✅ | ?platform=facebook\|tiktok; SHA-256; paginate |
| `/api/crm/customers/[leadId]` | GET | ✅ **v1.0.0** | lead + booking history + ticket summary |
| `/api/crm/customers/[leadId]/conversations` | GET | ✅ **v1.0.0** | conversation_logs với zalo_account + admin_user join |
| `/api/crm/customers/[leadId]/notes` | POST | ✅ **v1.0.0** | Thêm lead_activity; Zod validate |
| `/api/crm/tickets` | GET | ✅ **v1.0.0** | filter ?status= ?priority= ?page= ?limit= |
| `/api/crm/tickets/[id]` | PATCH | ✅ **v1.0.0** | update status/priority/assigned; auto set resolved_at |

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
GitHub  : https://github.com/trungdotest8/namngan-travel (branch: main)
Vercel  : namngan-travel — deploy tự động từ main
Supabase: indjoegnsvcteaozmgrg — 27 migrations local / 25 cloud
          ⚠️ migration #28 (tour_landing_pages) CẦN APPLY cloud
          ⚠️ migration #29 (omnichannel_gateway) CẦN APPLY cloud
          ✅ bucket 'tour-galleries' | ✅ ai_conversations | ✅ featured_destinations
          ✅ SeaStar 476 lịch synced tháng 6–11/2026
          ✅ 36 tours có detail_synced_at NOT NULL
          ✅ tours.images jsonb — migration #27: {url,alt,caption,order}[] + source_url column
Resend  : Domain namngantravel.com — PENDING DNS (chưa verify)
ANTHROPIC_API_KEY: ⚠️ hết credit cho agent.py --gen-alt (TripAgent Next.js vẫn OK)
TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID: ✅ Vercel đã set
NEXT_PUBLIC_SALES_NAME=Lê Hoài Nam: ✅ Vercel Production + Development
NEXT_PUBLIC_SALES_PHONE=0932611933: ✅ Vercel Production + Development
Env vars CẦN THÊM Vercel: ZALO_OA_SECRET, ZALO_OA_ACCESS_TOKEN, FB_VERIFY_TOKEN, FB_APP_SECRET
                           TELEGRAM_WEBHOOK_SECRET (tùy chọn)
Remote Dev: Tailscale ✅ | code-server ✅ | Mac 100.117.250.21:8080 | pw: 074f49a444ee24314c07bda0
Python venv: .venv/ — activate: source .venv/bin/activate

Google Sheets:
  Tab "tour_schedules": SeaStar sync 2h sáng hàng ngày (Apps Script Code.gs)
  Tab "tours_master": 83 tours crawled ✅ (36 unique codes upsert Supabase ✅)

pnpm build (Handover #71): ✅ CLEAN — 0 TypeScript errors
pnpm lint  (Handover #71): ✅ warnings only (5× catch(e) → đổi thành catch(_e) khi chỉnh file)

Claude models (phiên #71 — giữ nguyên từ #70):
  src/lib/ai/claude.ts              → claude-sonnet-4-6
  src/lib/ai/classify.ts            → claude-haiku-4-5-20251001
  src/app/api/ai/itinerary/route.ts → claude-sonnet-4-6
  src/app/api/content/generate/route.ts → claude-opus-4-8
  src/app/api/admin/landing-page/generate/route.ts → claude-sonnet-4-6

DX Toolchain mới (phiên #71):
  .clinerules        → Cline + Roo Code: 8 nguyên tắc + data contracts + patterns
  .continue/config.json → Claude Sonnet chat + Haiku autocomplete + 3 slash commands
  .vscode/settings.json → formatOnSave + ESLint auto-fix + Tailwind IntelliSense
  .vscode/extensions.json → 9 extensions recommended
  .prettierrc        → single quotes, semi, trailing commas, printWidth 100
  .eslintrc.json     → @typescript-eslint plugin: no-explicit-any warn, no-console warn
  .editorconfig      → 2-space indent, LF, UTF-8
```

### Files ưu tiên cao cần làm

```
# ƯU TIÊN #1 — APPLY MIGRATION #28 + #29 LÊN SUPABASE CLOUD:
  Supabase Dashboard → SQL Editor → chạy LẦN LƯỢT:
  1. supabase/migrations/20260623000001_landing_pages.sql
  2. supabase/migrations/20260624000029_omnichannel_gateway.sql

# ƯU TIÊN #2 — ĐĂNG KÝ TELEGRAM WEBHOOK:
  curl -X POST "https://api.telegram.org/bot{TOKEN}/setWebhook" \
       -d "url=https://namngantravel.com/api/webhooks/telegram"

# ƯU TIÊN #3 — SEED BẢNG zalo_accounts (sau khi apply #29):
  Supabase Table Editor → INSERT:
  { oa_id: "APP_ID_từ_Zalo_Dev", phone_number: "0774623514",
    account_name: "Nam Ngân Travel OA", department: "sales",
    access_token: "...", telegram_chat_id: "8718234653", is_active: true }

# ƯU TIÊN #4 — THÊM VERCEL ENV VARS:
  ZALO_OA_SECRET, ZALO_OA_ACCESS_TOKEN, FB_VERIFY_TOKEN, FB_APP_SECRET
  TELEGRAM_WEBHOOK_SECRET (tùy chọn)

# ƯU TIÊN #5 — NẠP CREDIT ANTHROPIC:
  console.anthropic.com → Plans & Billing → nạp credit cho agent.py --gen-alt

# ƯU TIÊN #6 — VERIFY RESEND DNS:
  Resend dashboard → check DNS records cho namngantravel.com
```

### Next Steps (3 việc làm ngay khi mở phiên mới)

1. **Apply migration #28 + #29 cloud** — cả hai đang pending; thiếu #28 → CRM LandingPages tab 500; thiếu #29 → Omnichannel Gateway 500
2. **Seed `zalo_accounts` + đăng ký Telegram webhook** — không có thì Flow B (staff reply → Zalo) không hoạt động dù code đã deploy
3. **Thêm 4 Vercel env vars** — ZALO_OA_SECRET + ZALO_OA_ACCESS_TOKEN + FB_VERIFY_TOKEN + FB_APP_SECRET

### Change Log

| Ngày | Giai đoạn | Thay đổi |
|------|-----------|---------|
| 2026-06-24 | Handover #71 — DX Toolchain ✅ | .clinerules + .continue + .vscode + .prettierrc + ESLint @typescript-eslint |
| 2026-06-24 | Handover #70 — Omnichannel Gateway v1.0.0 ✅ | migration #29; 4 bảng; Telegram↔Zalo bidirectional; 5 CRM routes; integrity fix |
| 2026-06-23 | Handover #69 — Landing Page Factory + Contact update ✅ | /promo/[slug] ISR; AI extract; LandingPageTab CRM; địa chỉ+email mới; revert models |
| 2026-06-22 | Handover #68 — Itinerary Editor + Model Opus + Image fix ✅ | ItineraryEditor admin; day.images render; tất cả model → opus-4-8 |
| 2026-06-16 | Handover #67 — Tour Detail v5.0.0 + Upload fix ✅ | 2-col scrollspy; TourBookingWidget+ItineraryNav mới; upload auth bug fixed |
| 2026-06-16 | Handover #66 — Listing UI đồng nhất ✅ | HScrollRow ← → arrows; 4 trang filter+sort chuẩn hoá |
| 2026-06-16 | Handover #65 — Agent.py Image Scraper ✅ | scripts/agent.py v1.1.0; migration #27 images format; TourGallery backward-compat |
| 2026-06-15 | Handover #64 — Gallery Layout Fix + Seed Script ✅ | TourGallery 2/3→60/40; 4→L+2up+1down; ≥5 button ảnh[4]; seed script |
| 2026-06-15 | Handover #63 — Health Check + Bug Fix ✅ | 15 pages + 9 APIs green; fix tours PATCH adminClient; PGRST116→404 |
| 2026-06-13 | Handover #62 — Tour Gallery ✅ | migration #26; TourGalleryManager drag+upload; TourGallery grid/carousel |
| 2026-06-12 | Handover #61 — TripAgent Chat Perf ✅ | ChatBubble.memo+SmartScroll; AiInput isolated; appendDelta O(1) |
| 2026-06-12 | Handover #60 — Homepage FPS Fix ✅ | shadow-overlay×3 cards; backdrop-blur removed; content-visibility; ISR 1800 |
| 2026-06-12 | Handover #59 — Tour Detail 500 fix + Import ✅ | force-dynamic; 36 tours imported; ws+dedup fix |
| 2026-06-12 | Handover #58 — Tour Detail v3.0.0 + Crawler ✅ | TourLeadBox+TabNav+Timeline; crawler batch fix; 83 tours Sheets |
| 2026-06-11 | Handover #55 — Tour Ecosystem Linking DONE | sitemap /tour/[slug]; TourListingCard slug prop |
| 2026-06-11 | Handover #54 — Tour Detail Page DONE | page.tsx Server Component ISR + TourDetailClient.tsx |
| 2026-06-11 | Handover #52 — Crawler DONE + migration fix | crawl-seastar-tours.ts ✅; migration IF NOT EXISTS fix |
| 2026-06-11 | Handover #50 — Sheets Sync LIVE + Audience spec | Sheets sync live ✅; migrations #16-21 cloud ✅ |
| 2026-06-09 | Handover #44–49 — Phase 6 + Remote Dev + TQ Scraper | /du-lich/[country] ✅; Tailscale+code-server |

### Trạng thái Child Modules

| Child | Module | Trạng thái | Files chính |
|-------|--------|-----------|-------------|
| A | Search UI | ✅ v2.1.0 | `src/components/search/TourSearchBar.tsx` + `SearchResults.tsx` |
| B | Lịch khởi hành + PDF Indexer | ✅ v1.3.1 | `src/lib/integrations/seastar.ts` — 6 tháng; limit 1000 |
| C | Itinerary + PDF Embed | ✅ v2.1.0 | `TourDetail.tsx` + `PdfViewer.tsx` |
| D | Hồ sơ khách | ✅ v1.3.0 | `CustomerProfileDrawer.tsx` + `CustomerTable.tsx` — Export+Import CSV ✅ |
| E | Chat & Lead | ✅ v2.2.0 | `ChatWidget.tsx` — 2 tab: "Để lại số" + "Chat AI" |
| F | CMS / RSS | ✅ v1.3.0 | `ArticleFeed.tsx` — TiptapEditor ✅ |
| G | DB Schema | ✅ **27 local / 25 cloud** | `supabase/migrations/` — migration #28+#29 chưa push cloud ⚠️ |
| CRM | Admin CRM | ✅ **v9.1.0** | `crm/page.tsx` — tab `landing-pages` + `Layers` icon ✅ |
| AUTH | Admin Auth | ✅ v2.0.0 | `login/page.tsx` + `middleware.ts` — cookie: `admin_session` |
| TRIPGENIE | AI Chat Core | ✅ v1.2.0 | `/api/ai/chat` Node.js runtime; RAG ✅ — **claude-sonnet-4-6** |
| TRIPGENIE-LEADS | Lead Capture | ✅ v2.1.0 | `/api/leads` POST (adminClient); `/api/leads/[id]` PATCH ✅ |
| TRIPGENIE-CLASSIFY | AI Classification | ✅ v1.1.0 | `src/lib/ai/classify.ts` — **claude-haiku-4-5-20251001** |
| TRIPGENIE-AFFILIATE | Affiliate Engine | ✅ v1.0.0 | migration #18; `src/lib/affiliate/tracker.ts` |
| TRIPGENIE-ITINERARY | Itinerary Builder AI | ✅ v1.1.0 | `/api/ai/itinerary` 4096 tokens SSE — **claude-sonnet-4-6** |
| LEADS-ACTIVITIES | Nhật ký chăm sóc | ✅ v1.0.0 | migration #19; `/api/leads/[id]/activities` |
| LEADS-IMPORT | Bulk Import CSV | ✅ v1.0.0 | `/api/leads/import` POST max 500 |
| NOTIFY | Notification | ✅ v2.1.0 | Email + Realtime + Telegram; `src/lib/notifications/index.ts` |
| RAG | AI Context | ✅ v1.0.0 | `src/lib/ai/rag.ts` — searchRelevantTours() |
| ZALO-WEBHOOK | Phase 4 Zalo OA | ✅ **v2.0.0** | `/api/webhooks/zalo/route.ts` — multi-account + mapping + ticket ✅ |
| FB-LEADS-WEBHOOK | Phase 4 FB Lead Ads | ✅ v1.0.0 | `/api/webhooks/fb-leads/route.ts` |
| TELEGRAM-WEBHOOK | Omnichannel Gateway | ✅ **v1.0.0** | `/api/webhooks/telegram/route.ts` — staff reply → Zalo ✅ |
| GSHEET-SYNC | Google Sheets Sync | ✅ v1.1.0 | `scripts/sheets-sync/Code.gs` — LIVE ✅ |
| PHASE6-SEO | Programmatic SEO | ✅ v1.0.0 | `src/app/du-lich/[country]/page.tsx` + `CountryToursClient.tsx` |
| PHASE6-CONTENT | Content Generate AI | ✅ v1.0.1 | `/api/content/generate` — claude-opus-4-8 |
| REMOTE-DEV | Tailscale + code-server | ✅ v1.0.0 | Mac 100.117.250.21:8080 \| pw: 074f49a444ee24314c07bda0 |
| SCRAPER-TQ | TrieuHao TQ Downloader | ✅ v1.0.0 | `scripts/download-trieuhao-tq.mjs` — 30 tours; 128MB |
| AUDIENCE-CONTACTS | SMS Audience Import | ✅ v1.0.0 | migration #22 ✅ cloud; `/api/admin/audiences/export` ✅ |
| SEASTAR-CRAWLER | SeaStar Crawler v3 | ✅ v1.2.0 | `scripts/crawl-seastar-tours.ts` — 83 tours Sheets ✅ |
| TOURS-IMPORT | Tour Detail Import từ Sheets | ✅ v1.0.1 | `scripts/import-tours-from-sheet.ts` — 36 tours upsert ✅ |
| TOUR-DETAIL-PAGE | Trang chi tiết tour | ✅ v5.1.0 | `TourDetailClient.tsx` — 2-col scrollspy; day.images[] render ✅ |
| TOUR-BOOKING-WIDGET | Sticky Booking Widget | ✅ v1.0.0 | `src/components/tour/TourBookingWidget.tsx` |
| ITINERARY-NAV | Scrollspy Sidebar Nav | ✅ v1.0.0 | `src/components/tour/ItineraryNav.tsx` |
| ITINERARY-EDITOR | Admin Itinerary Editor | ✅ v1.0.0 | `ToursTab.tsx` — days+meals+ảnh ✅ |
| TOUR-LEADBOX | Lead Capture trên Tour | ✅ v1.0.0 | `src/components/tour/TourLeadBox.tsx` |
| TOUR-LINKS | Tour ecosystem linking | ✅ v1.0.0 | sitemap, TourCard, TourListingCard, /lich-khoi-hanh |
| HOMEPAGE-PERF | Homepage FPS Fix | ✅ v1.0.0 | shadow-overlay; content-visibility ⚡ |
| TRIPAGENT-PERF | TripAgent Chat Perf | ✅ v1.0.0 | React.memo; smart-scroll; appendDelta O(1) ⚡ |
| TOUR-GALLERY | Tour Gallery | ✅ v2.1.0 | `TourGallery.tsx` — backward-compat helpers ✅ |
| IMAGES-FORMAT | tours.images format | ✅ v1.0.0 | migration #27 cloud ✅; {url,alt,caption,order}[] |
| LISTING-UI | Tour Listing UI đồng nhất | ✅ v1.0.0 | `HScrollRow.tsx`; 4 Client filter+sort chuẩn |
| UPLOAD-IMAGE-FIX | Admin upload auth fix | ✅ v1.0.0 | `isAdminRequest()` ✅ |
| LANDING-PAGE-FACTORY | Landing Page từ FB Ads | ✅ v1.0.0 | `/promo/[slug]` ISR 1800s; AI extract sonnet-4-6 ✅ |
| CONTACT-INFO | Thông tin liên lạc | ✅ v1.0.0 | Header+Footer+JSON-LD: 525/44 Huỳnh Văn Bánh ✅ |
| OMNICHANNEL-GATEWAY | Zalo↔Telegram bidirectional | ✅ **v1.0.0** | migration #29; `zalo_accounts`+`telegram_zalo_mappings`+`conversation_logs`+`support_tickets` |
| CRM-GATEWAY-API | CRM Omnichannel Routes | ✅ **v1.0.0** | `/api/crm/customers/[leadId]`+`/conversations`+`/notes`; `/api/crm/tickets` |

### Trạng thái API Routes

| Route | Method | Trạng thái | Ghi chú |
|-------|--------|-----------|---------|
| `/api/leads` | POST | ✅ v2.1.0 | adminClient + honeypot(`website_hp`) + Telegram + classify → 201 |
| `/api/leads` | GET | ✅ | Auth + filter ?channel= ?status= ?page= ?limit= |
| `/api/leads/[id]` | PATCH | ✅ | field: `lead_status` + auth |
| `/api/leads/[id]/activities` | GET+POST | ✅ | field: `action_type` enum note\|call\|email\|other |
| `/api/leads/import` | POST | ✅ | Bulk insert max 500 |
| `/api/ai/chat` | POST | ✅ v1.2.0 | Node.js + RAG + SSE — **claude-sonnet-4-6** |
| `/api/ai/classify-lead` | POST | ✅ | classifyLead() — **claude-haiku-4-5-20251001** |
| `/api/ai/itinerary` | POST | ✅ | 4096 tokens SSE — **claude-sonnet-4-6** |
| `/api/affiliate/track` | GET | ✅ | param: `link_id` UUID; 302 redirect |
| `/api/customer-profile` | GET+PATCH | ✅ | Auth + limit 200 |
| `/api/search` | POST | ✅ | destination + adults + children (required) |
| `/api/cms` | GET/POST | ✅ | pagination + new_article notification |
| `/api/tours` | GET | ✅ | filter: category + country + is_active |
| `/api/tours/[id]` | PATCH | ✅ v1.2.0 | adminClient; itinerary JSONB; PGRST116→404 |
| `/api/tours/[id]` | DELETE | ✅ v1.1.0 | adminClient; soft delete (is_active=false) |
| `/api/featured-destinations` | ALL | ✅ | |
| `/api/admin/upload-image` | POST | ✅ v1.1.0 | isAdminRequest() ✅; base64→`tour-galleries` |
| `/api/admin/landing-page/generate` | POST | ✅ v1.0.0 | AI extract claude-sonnet-4-6 + Zod + upsert slug |
| `/api/admin/landing-pages` | GET | ✅ v1.0.0 | ⚠️ cần migration #28 cloud |
| `/api/notifications` | POST | ✅ | x-webhook-secret |
| `/api/departures` | GET | ✅ | filter destination/month/status/country; max 1000 |
| `/api/departures` | POST | ✅ v2.2.0 | SeaStar-only; 6 tháng; broadcast Realtime |
| `/api/departures/sync` | POST | ✅ | Apps Script UPSERT |
| `/api/itinerary/[tourId]` | GET | ✅ | |
| `/api/pdf-index` | GET | ✅ | FTS RPC |
| `/api/webhooks/n8n` | POST | ✅ | |
| `/api/webhooks/moda` | POST | ✅ | |
| `/api/webhooks/zalo` | POST+GET | ✅ **v2.0.0** | HMAC SHA256 + multi-account + mapping + conversation_log + auto-ticket |
| `/api/webhooks/telegram` | POST+GET | ✅ **v1.0.0** | Staff reply → Zalo; secret_token verify; mapping lookup |
| `/api/webhooks/fb-leads` | POST+GET | ✅ | hub.challenge + Graph API + dedup fb_lead_id |
| `/api/content/generate` | POST | ✅ | Admin auth; claude-opus-4-8; INSERT articles draft |
| `/api/admin/audiences/export` | GET | ✅ | ?platform=facebook\|tiktok; SHA-256; paginate |
| `/api/crm/customers/[leadId]` | GET | ✅ **v1.0.0** | lead + booking history + ticket summary |
| `/api/crm/customers/[leadId]/conversations` | GET | ✅ **v1.0.0** | conversation_logs với zalo_account + admin_user join |
| `/api/crm/customers/[leadId]/notes` | POST | ✅ **v1.0.0** | Thêm lead_activity; Zod validate |
| `/api/crm/tickets` | GET | ✅ **v1.0.0** | filter ?status= ?priority= ?page= ?limit= |
| `/api/crm/tickets/[id]` | PATCH | ✅ **v1.0.0** | update status/priority/assigned; auto set resolved_at |

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
GitHub  : https://github.com/trungdotest8/namngan-travel (branch: main)
Vercel  : namngan-travel — deploy tự động từ main
Supabase: indjoegnsvcteaozmgrg — 27 migrations local / 25 cloud
          ⚠️ migration #28 (tour_landing_pages) CẦN APPLY cloud
          ⚠️ migration #29 (omnichannel_gateway) CẦN APPLY cloud
          ✅ bucket 'tour-galleries' | ✅ ai_conversations | ✅ featured_destinations
          ✅ SeaStar 476 lịch synced tháng 6–11/2026
          ✅ 36 tours có detail_synced_at NOT NULL
          ✅ tours.images jsonb — migration #27: {url,alt,caption,order}[] + source_url column
Resend  : Domain namngantravel.com — PENDING DNS (chưa verify)
ANTHROPIC_API_KEY: ⚠️ hết credit cho agent.py --gen-alt (TripAgent Next.js vẫn OK)
TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID: ✅ Vercel đã set
NEXT_PUBLIC_SALES_NAME=Lê Hoài Nam: ✅ Vercel Production + Development
NEXT_PUBLIC_SALES_PHONE=0932611933: ✅ Vercel Production + Development
Env vars CẦN THÊM Vercel: ZALO_OA_SECRET, ZALO_OA_ACCESS_TOKEN, FB_VERIFY_TOKEN, FB_APP_SECRET
                           TELEGRAM_WEBHOOK_SECRET (tuỳ chọn, bảo vệ /api/webhooks/telegram)
Remote Dev: Tailscale ✅ | code-server ✅ | Mac 100.117.250.21:8080 | pw: 074f49a444ee24314c07bda0
Python venv: .venv/ — activate: source .venv/bin/activate (tất cả deps agent.py đã cài)

Google Sheets:
  Tab "tour_schedules": SeaStar sync 2h sáng hàng ngày (Apps Script Code.gs)
  Tab "tours_master": 83 tours crawled ✅ (36 unique codes upsert Supabase ✅)

pnpm build (Handover #70): ✅ CLEAN — 0 TypeScript errors

Claude models (phiên #70 — giữ nguyên từ #69):
  src/lib/ai/claude.ts              → claude-sonnet-4-6
  src/lib/ai/classify.ts            → claude-haiku-4-5-20251001
  src/app/api/ai/itinerary/route.ts → claude-sonnet-4-6
  src/app/api/content/generate/route.ts → claude-opus-4-8
  src/app/api/admin/landing-page/generate/route.ts → claude-sonnet-4-6

Thông tin liên lạc chính thức:
  Địa chỉ: 525/44 Huỳnh Văn Bánh, Phường Phú Nhuận, Quận Phú Nhuận, TP. Hồ Chí Minh
  Email:   dulichnamngan@gmail.com
```

### Data Contract — Thay đổi phiên #70

```typescript
// ── OMNICHANNEL GATEWAY (phiên #70) ──────────────────────────────────────────
// src/types/omnichannel.types.ts

// ZaloAccount { id UUID, oa_id TEXT, phone_number, account_name, department,
//               access_token, refresh_token, telegram_chat_id, is_active }
// → bảng zalo_accounts (migration #29)

// TelegramZaloMapping { id, tg_message_id BIGINT, zalo_account_id UUID,
//                       customer_zalo_id, lead_id UUID }
// → bảng telegram_zalo_mappings (migration #29)
// → index: tg_message_id (UNIQUE, dùng để staff reply lookup)

// ConversationLog { id, lead_id, zalo_account_id, direction 'inbound'|'outbound',
//                   channel 'zalo'|'telegram'|'facebook', message_text,
//                   tg_message_id, admin_user_id }
// → bảng conversation_logs (migration #29)

// SupportTicket { id, ticket_code 'TKT-YYYY-NNNN', lead_id, booking_id,
//                 subject, priority, status, assigned_admin_id,
//                 first_response_at, resolved_at }
// → bảng support_tickets (migration #29)

// admin_users — thêm 2 cột mới:
//   telegram_chat_id TEXT  ← liên kết nhân viên với chat Telegram
//   department VARCHAR(50) CHECK('sales'|'support'|'booking')

// ── FLOW A: Zalo → Telegram ───────────────────────────────────────────────────
// /api/webhooks/zalo/route.ts (v2.0.0):
//   getZaloAccountByOaId(event.app_id) → ZaloAccount
//   → getBookingContext(supabase, lead.id) → { booking_code, tour_name, departure_date }
//   → formatZaloInboundMessage() → rich Telegram text
//   → sendTelegramToChatAndGetId(chatId, text) → tg_message_id
//   → INSERT telegram_zalo_mappings (tg_message_id, zalo_account_id, customer_zalo_id, lead_id)
//   → INSERT conversation_logs (inbound)
//   → ensureOpenTicket() — auto-create support_ticket if none open

// ── FLOW B: Telegram → Zalo ───────────────────────────────────────────────────
// /api/webhooks/telegram/route.ts (v1.0.0):
//   reply_to_message.message_id → SELECT telegram_zalo_mappings
//   → SELECT zalo_accounts.access_token
//   → sendZaloTextWithToken(customer_zalo_id, text, access_token)
//   → INSERT conversation_logs (outbound)
//   → UPDATE support_tickets SET first_response_at, status='in_progress'
//   → UPDATE leads.updated_at
```

### Files ưu tiên cao cần làm

```
# ƯU TIÊN #1 — APPLY MIGRATION #28 + #29 LÊN SUPABASE CLOUD:
  Supabase Dashboard → SQL Editor → chạy LẦN LƯỢT:
  1. supabase/migrations/20260623000001_landing_pages.sql
  2. supabase/migrations/20260624000029_omnichannel_gateway.sql

# ƯU TIÊN #2 — ĐĂNG KÝ TELEGRAM WEBHOOK:
  curl -X POST "https://api.telegram.org/bot{TOKEN}/setWebhook" \
       -d "url=https://namngantravel.com/api/webhooks/telegram" \
       -d "secret_token={TELEGRAM_WEBHOOK_SECRET}"

# ƯU TIÊN #3 — SEED BẢNG zalo_accounts:
  Supabase Table Editor → zalo_accounts → INSERT row:
  { oa_id: "OA_ID_từ_Zalo_Developer", phone_number: "0774623514",
    account_name: "Zalo Sale", department: "sales",
    access_token: "...", telegram_chat_id: "TELEGRAM_CHAT_ID" }

# ƯU TIÊN #4 — THÊM VERCEL ENV VARS:
  ZALO_OA_SECRET, ZALO_OA_ACCESS_TOKEN, FB_VERIFY_TOKEN, FB_APP_SECRET
  TELEGRAM_WEBHOOK_SECRET (tùy chọn — bảo vệ /api/webhooks/telegram)

# ƯU TIÊN #5 — NẠPKREDIT ANTHROPIC:
  console.anthropic.com → Plans & Billing → nạp credit cho agent.py --gen-alt
```

### Next Steps (3 việc làm ngay khi mở phiên mới)

1. **Apply migration #28 + #29 cloud** — cả hai đang pending; thiếu #28 → CRM LandingPages tab 500; thiếu #29 → Omnichannel Gateway 500
2. **Đăng ký Telegram webhook** — không đăng ký thì Flow B (staff reply → Zalo) không hoạt động; seed ít nhất 1 row vào `zalo_accounts`
3. **Verify Resend DNS + nạp credit Anthropic** — email booking chưa gửi được; agent.py --gen-alt bị chặn

### Change Log

| Ngày | Giai đoạn | Thay đổi |
|------|-----------|---------|
| 2026-06-24 | Handover #70 — Omnichannel Gateway v1.0.0 ✅ | migration #29; 4 bảng; Telegram↔Zalo bidirectional; 5 CRM routes; integrity fix |
| 2026-06-23 | Handover #69 — Landing Page Factory + Contact update ✅ | /promo/[slug] ISR; AI extract; LandingPageTab CRM; địa chỉ+email mới; revert models |
| 2026-06-22 | Handover #68 — Itinerary Editor + Model Opus + Image fix ✅ | ItineraryEditor admin; day.images render; tất cả model → opus-4-8 |
| 2026-06-16 | Handover #67 — Tour Detail v5.0.0 + Upload fix ✅ | 2-col scrollspy; TourBookingWidget+ItineraryNav mới; upload auth bug fixed |
| 2026-06-16 | Handover #66 — Listing UI đồng nhất ✅ | HScrollRow ← → arrows; 4 trang filter+sort chuẩn hoá |
| 2026-06-16 | Handover #65 — Agent.py Image Scraper ✅ | scripts/agent.py v1.1.0; migration #27 images format; TourGallery backward-compat |
| 2026-06-15 | Handover #64 — Gallery Layout Fix + Seed Script ✅ | TourGallery 2/3→60/40; 4→L+2up+1down; ≥5 button ảnh[4]; seed script |
| 2026-06-15 | Handover #63 — Health Check + Bug Fix ✅ | 15 pages + 9 APIs green; fix tours PATCH adminClient; PGRST116→404 |
| 2026-06-13 | Handover #62 — Tour Gallery ✅ | migration #26; TourGalleryManager drag+upload; TourGallery grid/carousel |
| 2026-06-12 | Handover #61 — TripAgent Chat Perf ✅ | ChatBubble.memo+SmartScroll; AiInput isolated; appendDelta O(1) |
| 2026-06-12 | Handover #60 — Homepage FPS Fix ✅ | shadow-overlay×3 cards; backdrop-blur removed; content-visibility; ISR 1800 |
| 2026-06-12 | Handover #59 — Tour Detail 500 fix + Import ✅ | force-dynamic; 36 tours imported; ws+dedup fix |
| 2026-06-12 | Handover #58 — Tour Detail v3.0.0 + Crawler ✅ | TourLeadBox+TabNav+Timeline; crawler batch fix; 83 tours Sheets |
| 2026-06-11 | Handover #55 — Tour Ecosystem Linking DONE | sitemap /tour/[slug]; TourListingCard slug prop |
| 2026-06-11 | Handover #54 — Tour Detail Page DONE | page.tsx Server Component ISR + TourDetailClient.tsx |
| 2026-06-11 | Handover #52 — Crawler DONE + migration fix | crawl-seastar-tours.ts ✅; migration IF NOT EXISTS fix |
| 2026-06-11 | Handover #50 — Sheets Sync LIVE + Audience spec | Sheets sync live ✅; migrations #16-21 cloud ✅ |
| 2026-06-09 | Handover #44–49 — Phase 6 + Remote Dev + TQ Scraper | /du-lich/[country] ✅; Tailscale+code-server |

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
| G | DB Schema | ✅ **26 local / 25 cloud** | `supabase/migrations/` — migration #28 chưa push cloud ⚠️ |
| CRM | Admin CRM | ✅ **v9.1.0** | `crm/page.tsx` — tab `landing-pages` mới + `Layers` icon ✅ |
| AUTH | Admin Auth | ✅ v2.0.0 | `login/page.tsx` + `middleware.ts` — cookie: `admin_session` |
| TRIPGENIE | AI Chat Core | ✅ v1.2.0 | `/api/ai/chat` Node.js runtime; RAG ✅ — **claude-sonnet-4-6** |
| TRIPGENIE-LEADS | Lead Capture | ✅ v2.1.0 | `/api/leads` POST (adminClient); `/api/leads/[id]` PATCH ✅ |
| TRIPGENIE-CLASSIFY | AI Classification | ✅ v1.1.0 | `src/lib/ai/classify.ts` — **claude-haiku-4-5-20251001** |
| TRIPGENIE-AFFILIATE | Affiliate Engine | ✅ v1.0.0 | migration #18; `src/lib/affiliate/tracker.ts` |
| TRIPGENIE-ITINERARY | Itinerary Builder AI | ✅ v1.1.0 | `/api/ai/itinerary` 4096 tokens SSE — **claude-sonnet-4-6** |
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
| SEASTAR-CRAWLER | SeaStar Crawler v3 | ✅ v1.2.0 | `scripts/crawl-seastar-tours.ts` — 83 tours Sheets ✅ |
| TOURS-IMPORT | Tour Detail Import từ Sheets | ✅ v1.0.1 | `scripts/import-tours-from-sheet.ts` — 36 tours upsert ✅ |
| TOUR-DETAIL-PAGE | Trang chi tiết tour | ✅ v5.1.0 | `TourDetailClient.tsx` — 2-col scrollspy; day.images[] render ✅ |
| TOUR-BOOKING-WIDGET | Sticky Booking Widget | ✅ v1.0.0 | `src/components/tour/TourBookingWidget.tsx` |
| ITINERARY-NAV | Scrollspy Sidebar Nav | ✅ v1.0.0 | `src/components/tour/ItineraryNav.tsx` |
| ITINERARY-EDITOR | Admin Itinerary Editor | ✅ v1.0.0 | `ToursTab.tsx` — days+meals+ảnh ✅ |
| TOUR-LEADBOX | Lead Capture trên Tour | ✅ v1.0.0 | `src/components/tour/TourLeadBox.tsx` |
| TOUR-LINKS | Tour ecosystem linking | ✅ v1.0.0 | sitemap, TourCard, TourListingCard, /lich-khoi-hanh |
| HOMEPAGE-PERF | Homepage FPS Fix | ✅ v1.0.0 | shadow-overlay; content-visibility ⚡ |
| TRIPAGENT-PERF | TripAgent Chat Perf | ✅ v1.0.0 | React.memo; smart-scroll; appendDelta O(1) ⚡ |
| TOUR-GALLERY | Tour Gallery | ✅ v2.1.0 | `TourGallery.tsx` — backward-compat helpers ✅ |
| IMAGES-FORMAT | tours.images format | ✅ v1.0.0 | migration #27 cloud ✅; {url,alt,caption,order}[] |
| LISTING-UI | Tour Listing UI đồng nhất | ✅ v1.0.0 | `HScrollRow.tsx`; 4 Client filter+sort chuẩn |
| UPLOAD-IMAGE-FIX | Admin upload auth fix | ✅ v1.0.0 | `isAdminRequest()` ✅ |
| LANDING-PAGE-FACTORY | Landing Page từ FB Ads | ✅ **v1.0.0** | `/promo/[slug]` ISR 1800s; AI extract sonnet-4-6; LeadForm Zod+honeypot ✅ |
| CONTACT-INFO | Thông tin liên lạc | ✅ **v1.0.0** | Header+Footer+JSON-LD: 525/44 Huỳnh Văn Bánh; dulichnamngan@gmail.com ✅ |

### Trạng thái API Routes

| Route | Method | Trạng thái | Ghi chú |
|-------|--------|-----------|---------|
| `/api/leads` | POST | ✅ v2.1.0 | adminClient + honeypot(`website_hp`) + Telegram + classify → 201 |
| `/api/leads` | GET | ✅ | Auth + filter ?channel= ?status= ?page= ?limit= |
| `/api/leads/[id]` | PATCH | ✅ | field: `lead_status` + auth |
| `/api/leads/[id]/activities` | GET+POST | ✅ | field: `action_type` enum note\|call\|email\|other |
| `/api/leads/import` | POST | ✅ | Bulk insert max 500 |
| `/api/ai/chat` | POST | ✅ v1.2.0 | Node.js + RAG + SSE — **claude-sonnet-4-6** |
| `/api/ai/classify-lead` | POST | ✅ | classifyLead() — **claude-haiku-4-5-20251001** |
| `/api/ai/itinerary` | POST | ✅ | 4096 tokens SSE — **claude-sonnet-4-6** |
| `/api/affiliate/track` | GET | ✅ | param: `link_id` UUID; 302 redirect |
| `/api/customer-profile` | GET+PATCH | ✅ | Auth + limit 200 |
| `/api/search` | POST | ✅ | destination + adults + children (required) |
| `/api/cms` | GET/POST | ✅ | pagination + new_article notification |
| `/api/tours` | GET | ✅ | filter: category + country + is_active |
| `/api/tours/[id]` | PATCH | ✅ v1.2.0 | adminClient; itinerary JSONB; PGRST116→404 |
| `/api/tours/[id]` | DELETE | ✅ v1.1.0 | adminClient; soft delete (is_active=false) |
| `/api/featured-destinations` | ALL | ✅ | |
| `/api/admin/upload-image` | POST | ✅ v1.1.0 | isAdminRequest() ✅; base64→`tour-galleries` |
| `/api/admin/landing-page/generate` | POST | ✅ **v1.0.0** | AI extract claude-sonnet-4-6 + Zod + upsert slug |
| `/api/admin/landing-pages` | GET | ✅ **v1.0.0** | isAdminRequest() + list tour_landing_pages ⚠️ cần migration #28 cloud |
| `/api/notifications` | POST | ✅ | x-webhook-secret |
| `/api/departures` | GET | ✅ | filter destination/month/status/country; max 1000 |
| `/api/departures` | POST | ✅ v2.2.0 | SeaStar-only; 6 tháng; broadcast Realtime |
| `/api/departures/sync` | POST | ✅ | Apps Script UPSERT |
| `/api/itinerary/[tourId]` | GET | ✅ | |
| `/api/pdf-index` | GET | ✅ | FTS RPC |
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
GitHub  : https://github.com/trungdotest8/namngan-travel (branch: main)
Vercel  : namngan-travel — deploy tự động từ main
Supabase: indjoegnsvcteaozmgrg — 26 migrations local / 25 cloud
          ⚠️ migration #28 (tour_landing_pages) CẦN APPLY cloud — SQL Editor
          ✅ bucket 'tour-galleries' | ✅ ai_conversations | ✅ featured_destinations
          ✅ SeaStar 476 lịch synced tháng 6–11/2026
          ✅ 36 tours có detail_synced_at NOT NULL
          ✅ tours.images jsonb — migration #27: {url,alt,caption,order}[] + source_url column
Resend  : Domain namngantravel.com — PENDING DNS (chưa verify)
ANTHROPIC_API_KEY: ⚠️ hết credit cho agent.py --gen-alt (TripAgent Next.js vẫn OK)
TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID: ✅ Vercel đã set
NEXT_PUBLIC_SALES_NAME=Lê Hoài Nam: ✅ Vercel Production + Development
NEXT_PUBLIC_SALES_PHONE=0932611933: ✅ Vercel Production + Development
Env vars CẦN THÊM Vercel: ZALO_OA_SECRET, ZALO_OA_ACCESS_TOKEN, FB_VERIFY_TOKEN, FB_APP_SECRET
Remote Dev: Tailscale ✅ | code-server ✅ | Mac 100.117.250.21:8080 | pw: 074f49a444ee24314c07bda0
Python venv: .venv/ — activate: source .venv/bin/activate (tất cả deps agent.py đã cài)

Google Sheets:
  Tab "tour_schedules": SeaStar sync 2h sáng hàng ngày (Apps Script Code.gs)
  Tab "tours_master": 83 tours crawled ✅ (36 unique codes upsert Supabase ✅)

pnpm build (Handover #69): ✅ CLEAN — 0 TypeScript errors

Claude models (phiên #69 — revert về tiết kiệm):
  src/lib/ai/claude.ts              → claude-sonnet-4-6      ← revert từ opus
  src/lib/ai/classify.ts            → claude-haiku-4-5-20251001 ← revert từ opus
  src/app/api/ai/itinerary/route.ts → claude-sonnet-4-6      ← revert từ opus
  src/app/api/content/generate/route.ts → claude-opus-4-8    ← giữ nguyên
  src/app/api/admin/landing-page/generate/route.ts → claude-sonnet-4-6 ← MỚI

Thông tin liên lạc chính thức (cập nhật phiên #69):
  Địa chỉ: 525/44 Huỳnh Văn Bánh, Phường Phú Nhuận, Quận Phú Nhuận, TP. Hồ Chí Minh
  Email:   dulichnamngan@gmail.com
  (Header top bar + Footer + JSON-LD page.tsx + diem-den/page.tsx)
```

### Data Contract — Thay đổi phiên #69

```typescript
// ── LANDING PAGE FACTORY (phiên #69) ─────────────────────────────────────────
// src/types/landing-page.ts
// TourLandingPage { id, tour_id, slug, headline, sub_headline, price_deal,
//                  departure_note, promo_features: PromoFeature[], created_at, updated_at }
// PromoFeature { icon, title, description }
// TourImage { url, alt, caption?, order }

// ── /promo/[slug] (Server Component, ISR 1800s) ───────────────────────────────
// 4 blocks: Hero → PromoGallery → PromoFeatures → LeadCaptureForm (Client Island)
// Ẩn block nếu data null/rỗng; robots: noindex
// LeadCaptureForm POST /api/leads với lead_source: 'web_ads', source_channel: 'landing_page'
// honeypot field: website_hp (khớp với /api/leads route.ts line 49)

// ── /api/admin/landing-page/generate (POST) ──────────────────────────────────
// Body: { fb_text: string, tour_id: UUID, slug: /^[a-z0-9-]+$/ }
// Upsert vào tour_landing_pages ON CONFLICT slug
// ⚠️ Cần bảng tour_landing_pages tồn tại — apply migration #28 trước
```

### Files ưu tiên cao cần làm

```
# ƯU TIÊN #1 — APPLY MIGRATION #28 LÊN SUPABASE CLOUD (FIX 500 CRM):
  Supabase Dashboard → SQL Editor → chạy file:
  supabase/migrations/20260623000001_landing_pages.sql

# ƯU TIÊN #2 — NẠP CREDIT ANTHROPIC CHO AGENT.PY:
  console.anthropic.com → Plans & Billing → nạp credit
  Sau đó: source .venv/bin/activate
           python scripts/agent.py "URL" --single --upload --gen-alt --sync-db --yes

# ƯU TIÊN #3 — THÊM VERCEL ENV VARS (manual, Vercel Dashboard):
  ZALO_OA_SECRET, ZALO_OA_ACCESS_TOKEN, FB_VERIFY_TOKEN, FB_APP_SECRET

# ƯU TIÊN #4 — VERIFY RESEND DNS:
  Resend dashboard → check DNS records cho namngantravel.com
```

### Next Steps (3 việc làm ngay khi mở phiên mới)

1. **Apply migration #28 Supabase cloud** — bảng `tour_landing_pages` chưa tồn tại → mọi request CRM Landing Page tab đều 500; vào SQL Editor chạy `supabase/migrations/20260623000001_landing_pages.sql`
2. **Nạp credit Anthropic** — ANTHROPIC_API_KEY hết credit cho `--gen-alt`; nạp tại console.anthropic.com
3. **Thêm 4 Vercel env vars** — ZALO_OA_SECRET + ZALO_OA_ACCESS_TOKEN + FB_VERIFY_TOKEN + FB_APP_SECRET

### Change Log

| Ngày | Giai đoạn | Thay đổi |
|------|-----------|---------|
| 2026-06-23 | Handover #69 — Landing Page Factory + Contact update ✅ | /promo/[slug] ISR; AI extract; LandingPageTab CRM; địa chỉ+email mới; revert models |
| 2026-06-22 | Handover #68 — Itinerary Editor + Model Opus + Image fix ✅ | ItineraryEditor admin; day.images render; tất cả model → opus-4-8 |
| 2026-06-16 | Handover #67 — Tour Detail v5.0.0 + Upload fix ✅ | 2-col scrollspy; TourBookingWidget+ItineraryNav mới; upload auth bug fixed |
| 2026-06-16 | Handover #66 — Listing UI đồng nhất ✅ | HScrollRow ← → arrows; 4 trang filter+sort chuẩn hoá |
| 2026-06-16 | Handover #65 — Agent.py Image Scraper ✅ | scripts/agent.py v1.1.0; migration #27 images format; TourGallery backward-compat |
| 2026-06-15 | Handover #64 — Gallery Layout Fix + Seed Script ✅ | TourGallery 2/3→60/40; 4→L+2up+1down; ≥5 button ảnh[4]; seed script |
| 2026-06-15 | Handover #63 — Health Check + Bug Fix ✅ | 15 pages + 9 APIs green; fix tours PATCH adminClient; PGRST116→404 |
| 2026-06-13 | Handover #62 — Tour Gallery ✅ | migration #26; TourGalleryManager drag+upload; TourGallery grid/carousel |
| 2026-06-12 | Handover #61 — TripAgent Chat Perf ✅ | ChatBubble.memo+SmartScroll; AiInput isolated; appendDelta O(1) |
| 2026-06-12 | Handover #60 — Homepage FPS Fix ✅ | shadow-overlay×3 cards; backdrop-blur removed; content-visibility; ISR 1800 |
| 2026-06-12 | Handover #59 — Tour Detail 500 fix + Import ✅ | force-dynamic; 36 tours imported; ws+dedup fix |
| 2026-06-12 | Handover #58 — Tour Detail v3.0.0 + Crawler ✅ | TourLeadBox+TabNav+Timeline; crawler batch fix; 83 tours Sheets |
| 2026-06-12 | Handover #57 — Crawler Pipeline vận hành | endpoint fix departures.php; 3 tours AI ok |
| 2026-06-12 | Handover #56 — Tour Detail v2.0.0 hotfix | [slug]→[tourId] revert; UUID-safe lookup |
| 2026-06-11 | Handover #55 — Tour Ecosystem Linking DONE | sitemap /tour/[slug]; TourListingCard slug prop |
| 2026-06-11 | Handover #54 — Tour Detail Page DONE | page.tsx Server Component ISR + TourDetailClient.tsx |
| 2026-06-11 | Handover #53 — Tours Detail Import DONE | migration #24 + import-tours-from-sheet.ts ✅ |
| 2026-06-11 | Handover #52 — Crawler DONE + migration fix | crawl-seastar-tours.ts ✅; migration IF NOT EXISTS fix |
| 2026-06-11 | Handover #51 — Audience Contacts DONE + Crawler plan | Audience pipeline ✅ |
| 2026-06-11 | Handover #50 — Sheets Sync LIVE + Audience spec | Sheets sync live ✅; migrations #16-21 cloud ✅ |
| 2026-06-09 | Handover #44–49 — Phase 6 + Remote Dev + TQ Scraper | /du-lich/[country] ✅; Tailscale+code-server |

### Trạng thái Child Modules

| Child | Module | Trạng thái | Files chính |
|-------|--------|-----------|-------------|
| A | Search UI | ✅ v2.1.0 | `src/components/search/TourSearchBar.tsx` + `SearchResults.tsx` |
| B | Lịch khởi hành + PDF Indexer | ✅ v1.3.1 | `src/lib/integrations/seastar.ts` — 6 tháng; limit 1000 |
| C | Itinerary + PDF Embed | ✅ v2.1.0 | `TourDetail.tsx` + `PdfViewer.tsx` |
| D | Hồ sơ khách | ✅ v1.3.0 | `CustomerProfileDrawer.tsx` + `CustomerTable.tsx` — Export+Import CSV ✅ |
| E | Chat & Lead | ✅ v2.2.0 | `ChatWidget.tsx` — 2 tab: "Để lại số" + "Chat AI" |
| F | CMS / RSS | ✅ v1.3.0 | `ArticleFeed.tsx` — TiptapEditor ✅ |
| G | DB Schema | ✅ **25 local / 25 cloud** | `supabase/migrations/` — tất cả đã push cloud ✅ |
| CRM | Admin CRM | ✅ **v9.0.0** | `crm/ToursTab.tsx` — ItineraryEditor numbered days+meals+ảnh ✅ |
| AUTH | Admin Auth | ✅ v2.0.0 | `login/page.tsx` + `middleware.ts` — cookie: `admin_session` |
| TRIPGENIE | AI Chat Core | ✅ v1.2.0 | `/api/ai/chat` Node.js runtime; RAG ✅ — **claude-opus-4-8** |
| TRIPGENIE-LEADS | Lead Capture | ✅ v2.1.0 | `/api/leads` POST (adminClient); `/api/leads/[id]` PATCH ✅ |
| TRIPGENIE-CLASSIFY | AI Classification | ✅ **v1.1.0** | `src/lib/ai/classify.ts` — **claude-opus-4-8** |
| TRIPGENIE-AFFILIATE | Affiliate Engine | ✅ v1.0.0 | migration #18; `src/lib/affiliate/tracker.ts` |
| TRIPGENIE-ITINERARY | Itinerary Builder AI | ✅ **v1.1.0** | `/api/ai/itinerary` 4096 tokens SSE — **claude-opus-4-8** |
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
| TOUR-DETAIL-PAGE | Trang chi tiết tour | ✅ **v5.1.0** | `TourDetailClient.tsx` — 2-col scrollspy; day.images[] render thực sự ✅ |
| TOUR-BOOKING-WIDGET | Sticky Booking Widget | ✅ **v1.0.0** | `src/components/tour/TourBookingWidget.tsx` — dropdown+stepper+realtime total |
| ITINERARY-NAV | Scrollspy Sidebar Nav | ✅ **v1.0.0** | `src/components/tour/ItineraryNav.tsx` — IntersectionObserver + smooth scroll |
| ITINERARY-EDITOR | Admin Itinerary Editor | ✅ **v1.0.0** | `ToursTab.tsx` ItineraryEditor — add/reorder days, meals, textarea, upload ảnh/ngày |
| TOUR-LEADBOX | Lead Capture trên Tour | ✅ v1.0.0 | `src/components/tour/TourLeadBox.tsx` — Zod phone + advisor card tel/Zalo |
| TOUR-LINKS | Tour ecosystem linking | ✅ v1.0.0 | sitemap, TourCard, TourListingCard, /lich-khoi-hanh, "Tour cùng loại" |
| BOOKING-BTN | BookingScheduleButton | ✅ v1.0.0 | `src/components/tour/BookingScheduleButton.tsx` |
| HOMEPAGE-PERF | Homepage FPS Fix | ✅ **v1.0.0** | `page.tsx`+`TourCard.tsx`+`TourListingCard.tsx` — shadow-overlay; content-visibility ⚡ |
| TRIPAGENT-PERF | TripAgent Chat Perf | ✅ **v1.0.0** | `AiChatPanel.tsx`+`ChatWidget.tsx`+`ai-chat.store.ts` — React.memo; smart-scroll ⚡ |
| TOUR-GALLERY | Tour Gallery | ✅ **v2.1.0** | `TourGallery.tsx` — backward-compat `TourImageItem`; `getImgUrl`/`getImgAlt` helpers |
| TOURS-API-FIX | Tours PATCH/DELETE adminClient | ✅ **v1.2.0** | `src/app/api/tours/[id]/route.ts` — itinerary field thêm vào schema ✅ |
| PYTHON-VENV | Python scraper env | ✅ v1.0.0 | `.venv/` — tất cả deps agent.py đã cài ✅ |
| SEED-IMAGES | Seed script gallery | ✅ v1.0.0 | `scripts/seed-tour-images.ts` — npx tsx; --slug --images --file |
| AGENT-PY | Tour Image Scraper | ✅ **v1.1.0** | `scripts/agent.py` — crawl+WebP+upload+alt+syncDB; --single --yes; 20 ảnh SeaStar test ✅ |
| IMAGES-FORMAT | tours.images format migration | ✅ **v1.0.0** | migration #27 cloud ✅; string[]→{url,alt,caption,order}[]; source_url column |
| LISTING-UI | Tour Listing UI đồng nhất | ✅ **v1.0.0** | `HScrollRow.tsx`; 4 Client đồng nhất filter panel + scroll arrows + sort |
| UPLOAD-IMAGE-FIX | Admin upload auth bug fix | ✅ **v1.0.0** | `/api/admin/upload-image` — cookie `admin-token`→`isAdminRequest()` |

### Trạng thái API Routes

| Route | Method | Trạng thái | Ghi chú |
|-------|--------|-----------|---------|
| `/api/leads` | POST | ✅ v2.1.0 | adminClient + honeypot + lead_score + Telegram + classify auto → **201** |
| `/api/leads` | GET | ✅ | Auth + filter ?channel= ?status= ?page= ?limit= |
| `/api/leads/[id]` | PATCH | ✅ | field: `lead_status` (không phải `status`) + auth |
| `/api/leads/[id]/activities` | GET+POST | ✅ | field: `action_type` enum note\|call\|email\|other |
| `/api/leads/import` | POST | ✅ | Bulk insert max 500 |
| `/api/ai/chat` | POST | ✅ v1.2.0 | Node.js + RAG + SSE — **claude-opus-4-8** |
| `/api/ai/classify-lead` | POST | ✅ | classifyLead() — **claude-opus-4-8** |
| `/api/ai/itinerary` | POST | ✅ | 4096 tokens SSE — **claude-opus-4-8** |
| `/api/affiliate/track` | GET | ✅ | param: `link_id` (UUID); 302 redirect hoặc 404 |
| `/api/customer-profile` | GET+PATCH | ✅ | Auth + limit 200 |
| `/api/search` | POST | ✅ | fields: destination + adults + children (required) |
| `/api/cms` | GET/POST | ✅ | pagination + new_article notification |
| `/api/tours` | GET | ✅ | filter: category URL-encoded + country + is_active |
| `/api/tours/[id]` | PATCH | ✅ **v1.2.0** | adminClient ✅; itinerary JSONB ✅; PGRST116 → 404 |
| `/api/tours/[id]` | DELETE | ✅ **v1.1.0** | adminClient ✅; soft delete (is_active=false) |
| `/api/featured-destinations` | ALL | ✅ | |
| `/api/admin/upload-image` | POST | ✅ **v1.1.0** | isAdminRequest() ✅; base64→`tour-galleries` |
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
GitHub  : https://github.com/trungdotest8/namngan-travel (branch: main)
Vercel  : namngan-travel — deploy tự động từ main
Supabase: indjoegnsvcteaozmgrg — 25 migrations local / 25 cloud ✅ (tất cả đồng bộ)
          ✅ bucket 'tour-galleries' | ✅ ai_conversations | ✅ featured_destinations
          ✅ SeaStar 476 lịch synced tháng 6–11/2026
          ✅ 36 tours có detail_synced_at NOT NULL
          ✅ tours.images jsonb — migration #27: {url,alt,caption,order}[] + source_url column
          ✅ TourItineraryDay.images?: string[] — lưu qua tours.itinerary JSONB (không cần migration)
Resend  : Domain namngantravel.com — PENDING DNS (chưa verify)
ANTHROPIC_API_KEY: ⚠️ hết credit cho agent.py --gen-alt (TripAgent Next.js vẫn OK)
TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID: ✅ Vercel đã set
NEXT_PUBLIC_SALES_NAME=Lê Hoài Nam: ✅ Vercel Production + Development
NEXT_PUBLIC_SALES_PHONE=0932611933: ✅ Vercel Production + Development
Env vars CẦN THÊM Vercel: ZALO_OA_SECRET, ZALO_OA_ACCESS_TOKEN, FB_VERIFY_TOKEN, FB_APP_SECRET
Remote Dev: Tailscale ✅ | code-server ✅ | Mac 100.117.250.21:8080 | pw: 074f49a444ee24314c07bda0
Python venv: .venv/ — activate: source .venv/bin/activate (tất cả deps agent.py đã cài)

Google Sheets:
  Tab "tour_schedules": SeaStar sync 2h sáng hàng ngày (Apps Script Code.gs)
  Tab "tours_master": 83 tours crawled ✅ (36 unique codes upsert Supabase ✅)

pnpm build (Handover #68): ✅ CLEAN — 0 TypeScript errors

Claude models (ALL claude-opus-4-8 từ phiên #68):
  src/lib/ai/claude.ts              → claude-opus-4-8  ← đổi từ sonnet
  src/lib/ai/classify.ts            → claude-opus-4-8  ← đổi từ haiku
  src/app/api/ai/itinerary/route.ts → claude-opus-4-8  ← đổi từ sonnet
  src/app/api/content/generate/route.ts → claude-opus-4-8  ← giữ nguyên
  scripts/agent.py --gen-alt        → claude-haiku-4-5-20251001 (⚠️ cần credit riêng)
```

### Data Contract — Thay đổi phiên #68

```typescript
// ── ITINERARY DAY IMAGES (phiên #68) ──────────────────────────────────────────
// TourItineraryDay.images?: string[]  ← MỚI (lưu trong tours.itinerary JSONB, không migration)
// Admin: ItineraryEditor component trong ToursTab.tsx
//   - add/remove/reorder ngày; bữa ăn checkbox Sáng/Trưa/Tối; textarea mô tả; upload ảnh/ngày
//   - PATCH /api/tours/[id] body: { itinerary: TourItineraryDay[] | null }
// Frontend: TourDetailClient.tsx — render day.images[] thành <img> thực
//   - 1 ảnh: full-width max-h-72; 2+ ảnh: grid 2 cột
//   - loading=lazy; onError ẩn div

// ── API PATCH /api/tours/[id] — thêm itinerary vào TourUpdateSchema ────────────
// itinerary: z.array(ItineraryDaySchema).nullable().optional()
// ItineraryDaySchema: { day, title, description, meals?, images? }
```

### Files ưu tiên cao cần làm

```
# ƯU TIÊN #1 — NẠP CREDIT ANTHROPIC CHO AGENT.PY:
  Vào console.anthropic.com → Plans & Billing → nạp credit
  Sau đó: source .venv/bin/activate
           python scripts/agent.py "URL" --single --upload --gen-alt --sync-db --yes

# ƯU TIÊN #2 — THÊM VERCEL ENV VARS (manual, Vercel Dashboard):
  ZALO_OA_SECRET        ← verify Zalo webhook HMAC
  ZALO_OA_ACCESS_TOKEN  ← gửi tin Zalo OA
  FB_VERIFY_TOKEN       ← verify Facebook webhook
  FB_APP_SECRET         ← verify Facebook signature

# ƯU TIÊN #3 — VERIFY RESEND DNS:
  Vào Resend dashboard → check DNS records cho namngantravel.com
  Sau verify: test gửi email booking confirmation thực tế

# ƯU TIÊN #4 — SEED THÊM ẢNH CHO TOURS:
  source .venv/bin/activate
  python scripts/agent.py "https://seastartravel.vn/tour-trung-quoc/" \
    --max-tours 20 --max-images 20 --upload --sync-db --yes
```

### Next Steps (3 việc làm ngay khi mở phiên mới)

1. **Nạp credit Anthropic** — ANTHROPIC_API_KEY hết credit cho `--gen-alt`; nạp tại console.anthropic.com để bật sinh alt text tự động cho ảnh crawl
2. **Thêm 4 Vercel env vars** — ZALO_OA_SECRET + ZALO_OA_ACCESS_TOKEN + FB_VERIFY_TOKEN + FB_APP_SECRET → Zalo/FB webhooks mới hoạt động production
3. **Verify Resend DNS** — email booking confirmation chưa gửi được vì domain namngantravel.com chưa verify trên Resend dashboard

### Change Log

| Ngày | Giai đoạn | Thay đổi |
|------|-----------|---------|
| 2026-06-22 | Handover #68 — Itinerary Editor + Model Opus + Image fix ✅ | ItineraryEditor admin; day.images render; tất cả model → opus-4-8 |
| 2026-06-16 | Handover #67 — Tour Detail v5.0.0 + Upload fix ✅ | 2-col scrollspy; TourBookingWidget+ItineraryNav mới; upload auth bug fixed |
| 2026-06-16 | Handover #66 — Listing UI đồng nhất ✅ | HScrollRow ← → arrows; 4 trang filter+sort chuẩn hoá |
| 2026-06-16 | Handover #65 — Agent.py Image Scraper ✅ | scripts/agent.py v1.1.0; migration #27 images format; TourGallery backward-compat |
| 2026-06-15 | Handover #64 — Gallery Layout Fix + Seed Script ✅ | TourGallery 2/3→60/40; 4→L+2up+1down; ≥5 button ảnh[4]; gallery sau H1; seed script |
| 2026-06-15 | Handover #63 — Health Check + Bug Fix ✅ | 15 pages + 9 APIs green; fix tours PATCH adminClient; PGRST116→404 |
| 2026-06-13 | Handover #62 — Tour Gallery ✅ | migration #26; TourGalleryManager drag+upload; TourGallery grid/carousel; GalleryLightbox |
| 2026-06-12 | Handover #61 — TripAgent Chat Perf ✅ | ChatBubble.memo+SmartScroll; AiInput isolated; appendDelta O(1) index-based |
| 2026-06-12 | Handover #60 — Homepage FPS Fix ✅ | shadow-overlay pattern×3 cards; backdrop-blur removed; content-visibility; ISR 1800 |
| 2026-06-12 | Handover #59 — Tour Detail 500 fix + Import ✅ | force-dynamic DYNAMIC_SERVER_USAGE; 36 tours imported; ws+dedup fix |
| 2026-06-12 | Handover #58 — Tour Detail v3.0.0 + Crawler ✅ | TourLeadBox+TabNav+Timeline; crawler batch fix; 83 tours Sheets |
| 2026-06-12 | Handover #57 — Crawler Pipeline vận hành | endpoint fix departures.php; 3 tours AI ok; Sheets tab lỗi fix |
| 2026-06-12 | Handover #56 — Tour Detail v2.0.0 hotfix | [slug]→[tourId] revert; UUID-safe lookup; isolated schedules |
| 2026-06-11 | Handover #55 — Tour Ecosystem Linking DONE | sitemap /tour/[slug]; TourListingCard slug prop; /lich-khoi-hanh |
| 2026-06-11 | Handover #54 — Tour Detail Page DONE | page.tsx Server Component ISR + TourDetailClient.tsx; SSG |
| 2026-06-11 | Handover #53 — Tours Detail Import DONE | migration #24 + import-tours-from-sheet.ts + tour.types.ts ✅ |
| 2026-06-11 | Handover #52 — Crawler DONE + migration fix | crawl-seastar-tours.ts ✅; migration #22 IF NOT EXISTS fix |
| 2026-06-11 | Handover #51 — Audience Contacts DONE + Crawler plan | Audience pipeline ✅; Crawler v3 plan approved |
| 2026-06-11 | Handover #50 — Sheets Sync LIVE + Audience spec | Sheets sync live ✅; URL fix www.; migrations #16-21 cloud ✅ |
| 2026-06-09 | Handover #44–49 — Phase 6 + Remote Dev + TQ Scraper + Models | /du-lich/[country] ✅; Tailscale+code-server; claude-opus-4-8 |
