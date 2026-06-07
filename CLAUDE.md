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
| B | Lịch khởi hành (SeaStar) + PDF Indexer | ✅ v1.2.0 | `src/lib/integrations/seastar.ts` + migrations #6+#7+#8 |
| C | Itinerary + PDF Embed | ✅ v2.1.0 | `TourDetail.tsx` + `PdfViewer.tsx` |
| D | Hồ sơ khách | ✅ v1.1.0 | `src/components/customer-profile/CustomerProfileDrawer.tsx` + `CustomerTable.tsx` |
| E | Chat & Lead | ✅ v2.1.0 | `src/components/chat/ChatWidget.tsx` — mobile responsive |
| F | CMS / RSS | ✅ v1.3.0 | `src/components/cms/ArticleFeed.tsx` — ArticlesTab thumbnail upload |
| G | DB Schema | ✅ **14 local / 13 cloud** | `supabase/migrations/` — Supabase: indjoegnsvcteaozmgrg — ⚠️ migration #14 chưa apply cloud |
| CRM | Admin CRM | ✅ v6.0.0 | `crm/page.tsx` + 4 tab files — 7 tabs, MOBILE RESPONSIVE |
| AUTH | Admin Auth | ✅ v2.0.0 | `src/app/(admin)/login/page.tsx` + `src/middleware.ts` + `/api/admin/auth` |
| SEARCH | Search Engine | ✅ v2.1.0 | `api/search/route.ts` — OR query name\|destination\|country |
| DOMAIN | Domain & SEO | ✅ v1.3.0 | `sitemap.ts` dynamic; `robots.ts`; `page.tsx` TravelAgency JSON-LD |
| UPLOAD | Image Upload API | ✅ v1.0.0 | `/api/admin/upload-image` — base64 → Supabase `tour-galleries` |
| TIPTAP | WYSIWYG Editor | ✅ v1.0.0 | `src/components/cms/TiptapLiteEditor.tsx` |
| TIN-TUC | Tin Tức | ✅ v1.2.0 | `TinTucClient.tsx` — pagination 6/trang |
| BLOG | Blog SEO | ✅ v2.0.0 | `blog/page.tsx` Server Component + metadata ✅; `BlogListClient.tsx` client island; `BlogCtaSection.tsx` |
| DIEM-DEN | Điểm đến | ✅ v2.0.0 | `diem-den/page.tsx` ✅; `diem-den/[slug]/page.tsx` generateMetadata + Place JSON-LD; `DiemDenDetailClient.tsx` |
| TAO-LICH-TRINH | TripGenie Landing | ✅ v2.0.0 | `tao-lich-trinh/page.tsx` Server Component + metadata; `TaoLichTrinhClient.tsx` client island |
| TOURS-LIST | /tours listing | ✅ v2.0.0 | `ToursClient.tsx` — country filter normalizeCountry() |
| DOMESTIC | /tour-trong-nuoc | ✅ v2.1.0 | `DomesticToursClient.tsx` |
| INTL | /tour-nuoc-ngoai | ✅ v2.3.0 | `InternationalToursClient.tsx` — normalizeCountry() fix |
| BOOKING | Booking form | ✅ v1.0.0 | `src/components/booking/BookingModal.tsx` |
| TRIPGENIE-LEAD | TripGenie Lead Modal | ✅ v1.0.0 | `src/components/booking/TripGenieLeadModal.tsx` — TripGenieLeadSchema, 7 fields, dual CTA |
| TRIPGENIE-SECTION | TripGenie Homepage | ✅ v1.0.0 | `src/components/home/TripGenieSection.tsx` — 3 feature cards + modal |
| DEST | Điểm đến nổi bật CRM | ✅ v1.1.0 | `DestinationsTab.tsx` + `/api/featured-destinations` + migration #14 |
| SECURE | Mixed Content Fix | ✅ v1.0.0 | `layout.tsx` CSP meta; `TourListingCard.tsx` + `TourCard.tsx` toHttps() |
| MOBILE | Mobile Responsive | ✅ v1.1.0 | ChatWidget + TourDetail + Header mega-menu |
| COUNTRY | Country Filter Fix | ✅ v1.0.0 | `tour-country.ts` + `mega-menu-data.ts` + `normalizeCountry()` |
| PAGINATION | Shared Pagination | ✅ v1.0.0 | `src/components/ui/Pagination.tsx` — reuse blog + diem-den |
| SEO | Server Component Refactor | ✅ v1.0.0 | blog/tao-lich-trinh → Static; diem-den/[slug] generateMetadata; TravelAgency JSON-LD homepage |
| TRIPGENIE | AI Travel Platform | ⏳ v0.2.0 | Landing ✅ Lead Modal ✅ — Phase 1 AI Chat Core chưa build |

### Trạng thái API Routes

| Route | Method | Trạng thái | Ghi chú |
|-------|--------|-----------|---------|
| `/api/leads` | POST | ✅ | Zod + luồng kép Email+Realtime; TripGenieLeadSchema compatible |
| `/api/search` | POST | ✅ v2.1.0 | OR query name\|destination\|country |
| `/api/cms` | GET/POST | ✅ | `?page=N&limit=6` pagination |
| `/api/cms/[id]` | PATCH/DELETE | ✅ | Auth: cookie hoặc x-admin-secret |
| `/api/tours` | GET/POST | ✅ | filter category/country/is_active/search |
| `/api/tours/[id]` | PATCH/DELETE | ✅ | Auth + ?hard=true |
| `/api/featured-destinations` | GET/POST | ✅ | GET public; POST create — Zod validated |
| `/api/featured-destinations/[id]` | PATCH/DELETE | ✅ | Auth: cookie hoặc x-admin-secret |
| `/api/customer-profile` | GET/PATCH | ✅ | Auth: cookie hoặc x-admin-secret |
| `/api/admin/auth` | POST/DELETE | ✅ | HttpOnly cookie 24h |
| `/api/admin/users` | GET/POST | ✅ | bcrypt hash |
| `/api/admin/users/[id]` | PATCH/DELETE | ✅ | soft deactivate |
| `/api/admin/me` | GET | ✅ | từ httpOnly cookie |
| `/api/admin/upload-image` | POST | ✅ | base64 → `tour-galleries` ≤5MB |
| `/api/notifications` | POST | ✅ | x-webhook-secret |
| `/api/webhooks/n8n` | POST | ✅ | |
| `/api/webhooks/moda` | POST | ✅ | luồng kép |
| `/api/departures` | GET/POST | ✅ | POST: cookie OR x-webhook-secret |
| `/api/itinerary/[tourId]` | GET | ✅ | Cache 5min |
| `/api/pdf-index` | GET | ✅ | FTS RPC |
| `/api/cron/crawl-pdf` | GET | ✅ | Auth kép |
| `/api/ai/chat` | POST | ❌ | **TripGenie Phase 1 — chưa build** |
| `/api/affiliate/track` | GET | ❌ | **TripGenie Phase 3 — chưa build** |
| `/api/webhooks/zalo` | POST | ❌ | **TripGenie Phase 4 — chưa build** |

### Zustand Stores

```
useUIStore              (store/ui.store.ts)               ✅
useNotificationStore    (store/notification.store.ts)      ✅ admin realtime
useSearchStore          (store/search.store.ts)            ✅
useCalendarStore        (store/calendar.store.ts)          ✅ fetchSchedules()
useChatStore            (store/chat.store.ts)              ✅
useCmsStore             (store/cms.store.ts)               ✅
useCustomerProfileStore (store/customer-profile.store.ts)  ✅
useAiChatStore          (store/ai-chat.store.ts)           ❌ TripGenie Phase 1 — chưa tạo
```

### Data Contract — Delta phiên #31

```typescript
// ── SEO Metadata (phiên #31) — MỚI ───────────────────────────────────────────
// page.tsx:            export const metadata + TravelAgency JSON-LD (schema.org)
// blog/page.tsx:       export const metadata { title, description, openGraph, canonical }
// tao-lich-trinh:      export const metadata { title, description, openGraph, canonical }
// diem-den/[slug]:     generateMetadata() async — fetch Supabase server-side per slug
//                      → title/description/openGraph/canonical per destination
//                      → Place JSON-LD nhúng server-side (không phụ thuộc client render)

// ── Server Component Refactor (phiên #31) — THAY ĐỔI KIẾN TRÚC ──────────────
// blog/page.tsx:        'use client' → Server Component; fetchArticles() server-side
//                       pass initialArticles → BlogListClient (client island)
//                       Build: ○ Static (was ƒ Dynamic)
// tao-lich-trinh:       'use client' → Server Component; render TaoLichTrinhClient
//                       Build: ○ Static (was ƒ Dynamic)
// diem-den/[slug]:      'use client' → Server Component wrapper; render DiemDenDetailClient
//                       Build: ƒ Dynamic + generateMetadata ✅

// ── Client Islands mới (phiên #31) ───────────────────────────────────────────
// BlogListClient.tsx:        hero search + category filter + grid + Pagination
// TaoLichTrinhClient.tsx:    modal state + destination shortcuts + all sections
// DiemDenDetailClient.tsx:   fetch tours client-side + tour grid + CTA modal
// BlogCtaSection.tsx:        CTA banner cuối blog detail — modal state + Zalo link
```

### Hạ tầng & Tích hợp bên ngoài

```
GitHub  : https://github.com/trungdotest8/namngan-travel (branch: main) ✅ pushed
Vercel  : namngan-travel — ✅ deployed (auto-deploy từ push)
          namngantravel.site alias ✅ | namngantravel.com ⚠️ CẦN THÊM vào Vercel
Supabase: indjoegnsvcteaozmgrg — 14 migrations local / 13 cloud
          ⚠️ CẦN CHẠY: migration #14 (featured_destinations) trên Supabase Dashboard
          ✅ bucket 'tour-galleries' — public, 10MB limit, jpeg/png/webp/gif
Edge Fn : ✅ deployed v1.1.0 — 23 Drive folders đã tạo
Directus: ⚠️ CHƯA setup — /tin-tuc + /blog dùng Supabase fallback
Vercel Cron: "0 2 * * *" /api/cron/crawl-pdf ✅
Resend  : Domain namngantravel.com — status: PENDING (verify triggered ✅)
          ⚠️ CẦN: thêm 3 DNS records vào registrar → domain tự verify
          DNS Record 1: TXT  resend._domainkey  → p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCdFs6VUWNRa9qK1GanWJu0bVVS62QJ3AOef6CGuIWLY4nEB2niR+MXYg7ge9Uo4aAJlA2Quqx/8L3/puXUnL6jsuhYPiumZMdBQ6kYSI4r6jN+kDHppOwaerBb1RTxmmg49J3EtDSAzZllkxNlF1GCwp0HdDz1VeJCuc5m7odbQQIDAQAB
          DNS Record 2: MX   send  priority:10  → feedback-smtp.us-east-1.amazonses.com
          DNS Record 3: TXT  send              → v=spf1 include:amazonses.com ~all
SeaStar : ✅ 49 tours (41 nước ngoài + 8 trong nước)
TripGenie: ⏳ Landing ✅ + Lead Modal ✅ — Phase 1 AI Chat cần ANTHROPIC_API_KEY
```

### Files ưu tiên cao chưa hoàn chỉnh

```
# CẦN LÀM NGAY (infra):
1. Supabase: chạy migration #14 (featured_destinations) — SQL Editor → dán nội dung file migration
2. Vercel: thêm domain namngantravel.com → DNS: A @→76.76.21.21 + CNAME www→cname.vercel-dns.com
3. Resend DNS: thêm 3 records vào registrar namngantravel.com (xem section Hạ tầng trên)

# TRIPGENIE — Phase 1 (AI Chat Core):
- pnpm add @anthropic-ai/sdk
- src/lib/ai/claude.ts         — Anthropic SDK client + streaming helper
- src/lib/ai/prompts.ts        — System prompt tư vấn viên 49 tours
- src/app/api/ai/chat/route.ts — Streaming POST endpoint
- src/store/ai-chat.store.ts   — Conversation state (Zustand)
- src/types/ai.types.ts        — Message, ConversationContext types
- supabase migration #15       — ai_conversations table
- Nâng cấp ChatWidget.tsx      — thêm tab "Chat AI" bên cạnh form Zalo
- /tao-lich-trinh nâng cấp    — embed AI chat thực thay placeholder
- .env: ANTHROPIC_API_KEY

# FEATURE TIẾP (non-AI):
- Gallery ảnh thực 49 tours — bucket ✅ sẵn sàng, upload qua ToursTab CRM
- DestinationsTab CRM: drag-and-drop sort thực sự
- /diem-den/[slug]: thêm slug column vào featured_destinations (migration #15)
```

### Next Steps (3 việc làm ngay khi mở phiên mới)

1. **Build TripGenie Phase 1 — AI Chat Core** — `pnpm add @anthropic-ai/sdk` → tạo `src/lib/ai/claude.ts` + `prompts.ts` + `/api/ai/chat` streaming + nâng cấp ChatWidget. Cần `ANTHROPIC_API_KEY` trong `.env`.
2. **Chạy migration #14 trên Supabase** — Dashboard → SQL Editor → dán nội dung `supabase/migrations/20260605000014_featured_destinations.sql` → Run. (Để `/diem-den` load data từ DB thay fallback)
3. **Thêm domain `namngantravel.com` vào Vercel + DNS Resend** — Vercel: Settings → Domains → Add. Registrar: thêm 3 DNS records Resend (xem section Hạ tầng trên).

### Change Log

| Ngày | Giai đoạn | Thay đổi |
|------|-----------|---------|
| 2026-06-07 | Handover #31 — SEO Metadata + Server Component Refactor | blog/tao-lich-trinh→Static; diem-den generateMetadata; TravelAgency JSON-LD; 4 client islands |
| 2026-06-07 | Handover #30 — TripGenie Pages + Lead Modal | /blog, /diem-den, /tao-lich-trinh; TripGenieLeadModal; TripGenieSection; Pagination; TripGenieLeadSchema |
| 2026-06-07 | Handover #29 — Mobile + Sitemap + TripGenie Plan | ChatWidget/TourDetail/Header mobile; sitemap dynamic; ArticlesTab upload; TripGenie roadmap |
| 2026-06-06 | Handover #28 — Country Filter Fix | COUNTRY_MAP title case; normalizeCountry(); mega-menu fix; HREF_SUGGESTIONS 19 nước |
| 2026-06-06 | Handover #27 — CRM Mobile Responsive | Sidebar hamburger; slide panels full-width; grids responsive; table scroll |
| 2026-06-05 | Handover #26 — Mixed Content Fix | CSP upgrade-insecure-requests layout.tsx; toHttps() TourListingCard + TourCard |
| 2026-06-05 | Handover #25 — Điểm đến nổi bật CRM | migration #14 featured_destinations; DestinationsTab CRM; /api/featured-destinations |
| 2026-06-05 | Handover #24 — Domain SEO + Search Fix | Domain middleware redirect .site→.com; robots+sitemap; search OR query fix |
| 2026-06-05 | Handover #23 — CRM Upload + Tiptap + Pagination | upload-image API ✅; TiptapLiteEditor ✅; /api/cms pagination ✅ |
| 2026-06-05 | Domain Migration | namngantravel.site DNS+Vercel alias ✅; Resend pending migration |
| 2026-06-04 | Handover #22 — Bug Fixes: Tour Cards + Hashtag Wrap | Fix @keyframes slide-up purge; hashtag flex-wrap cả 2 listing pages |
| 2026-06-04 | Handover #21 — Gallery Seed + Hashtag Filter + Booking Form | migration #13 gallery_urls ✅; DomesticToursClient ✅; BookingModal ✅ |
| 2026-06-04 | Handover #20 — Mega-menu + Animations + Hashtag Seed | Mega-menu 3 cột ✅; animations ✅; 49 tours hashtags ✅ |
| 2026-06-03 | Handover #19 — Multi-User Auth + Staff Tab + URL fix | admin_users #10 ✅; bcrypt ✅; StaffTab ✅ |
| 2026-06-03 | Handover #18 — Admin Auth + Gallery Lightbox + Hashtag Filter | Login+middleware ✅; lightbox ✅; hashtag /tours ✅ |
| 2026-06-03 | Handover #17 — ToursTab CRUD + Edge Fn Fix + Migration #9 | ToursTab ✅; /api/tours ✅; migration #9 ✅ |
| 2026-06-03 | Handover #16 — CMS Admin + Articles + Thumbnails | ArticlesTab ✅; 6 bài mẫu ✅; Directus fallback ✅ |
| 2026-06-02 | Handover #15 — Directus CMS + /tours + Blog | /tours ✅; /tour-nuoc-ngoai v2 ✅; /tin-tuc ✅ |
| 2026-06-02 | Handover #14 — Bug Fixes + Domestic Data | /tours/[slug] ✅; 8 tour trong nước ✅ |
| 2026-06-01 | Handover #9–12 | Lịch khởi hành; PDF Crawler; Tour Detail; Secrets fix |

