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
| B | Lịch khởi hành + PDF Indexer | ✅ v1.2.0 | `src/lib/integrations/seastar.ts` + migrations #6+#7+#8 |
| C | Itinerary + PDF Embed | ✅ v2.1.0 | `TourDetail.tsx` + `PdfViewer.tsx` |
| D | Hồ sơ khách | ✅ v1.1.0 | `CustomerProfileDrawer.tsx` + `CustomerTable.tsx` |
| E | Chat & Lead | ✅ v2.2.0 | `ChatWidget.tsx` — 2 tab: "Để lại số" + "Chat AI" |
| F | CMS / RSS | ✅ v1.3.0 | `ArticleFeed.tsx` — TiptapEditor ✅ |
| G | DB Schema | ✅ **18 local / 15 cloud** | `supabase/migrations/` — #16+#17+#18 chưa apply cloud ⚠️ |
| CRM | Admin CRM | ✅ v7.0.0 | `crm/page.tsx` — Source cards + Realtime bell + NotificationPanel ✅ |
| AUTH | Admin Auth | ✅ v2.0.0 | `login/page.tsx` + `middleware.ts` — cookie: `admin_session` |
| TRIPGENIE | AI Chat Core | ✅ v1.2.0 | `/api/ai/chat` Node.js runtime; RAG ✅ |
| TRIPGENIE-LEADS | Lead Capture | ✅ v2.0.0 | `/api/leads` POST+GET ✅ (adminClient — RLS bypassed); `/api/leads/[id]` PATCH ✅ |
| TRIPGENIE-CLASSIFY | AI Classification | ✅ v1.0.0 | `src/lib/ai/classify.ts`; `/api/ai/classify-lead`; migration #17 |
| TRIPGENIE-AFFILIATE | Affiliate Engine | ✅ v1.0.0 | migration #18; `src/lib/affiliate/tracker.ts`; `/api/affiliate/track` |
| NOTIFY | Notification | ✅ v2.1.0 | Luồng 3: Email + Realtime + Telegram ✅; SĐT trong Telegram ✅ |
| RAG | AI Context | ✅ v1.0.0 | `src/lib/ai/rag.ts` — searchRelevantTours() |
| AICHAT-PANEL | Full-page AI Chat | ✅ v1.0.0 | `src/components/ai/AiChatPanel.tsx` — embedded /tao-lich-trinh |

### Trạng thái API Routes

| Route | Method | Trạng thái | Ghi chú |
|-------|--------|-----------|---------|
| `/api/leads` | POST | ✅ v2.1.0 | **createAdminClient** (bypass RLS) + honeypot + lead_score + Telegram SĐT |
| `/api/leads` | GET | ✅ v1.0.0 | Auth + filter ?channel= ?status= ?page= ?limit= |
| `/api/leads/[id]` | PATCH | ✅ v1.0.0 | LeadStatusUpdateSchema + auth |
| `/api/ai/chat` | POST | ✅ v1.2.0 | Node.js runtime + RAG + SSE streaming |
| `/api/ai/classify-lead` | POST | ✅ v1.0.0 | classifyLead() → UPDATE ai_tier + ai_tags |
| `/api/affiliate/track` | GET | ✅ v1.0.0 | record click → 302 redirect; IP hash SHA-256 |
| `/api/search` | POST | ✅ | OR query name\|destination\|country |
| `/api/cms` | GET/POST | ✅ | pagination + new_article notification |
| `/api/tours` | GET/POST | ✅ | filter category/country/is_active |
| `/api/featured-destinations` | GET/POST/PATCH/DELETE | ✅ | auth fix ✅ |
| `/api/admin/upload-image` | POST | ✅ | base64 → `tour-galleries` |
| `/api/notifications` | POST | ✅ | x-webhook-secret |
| `/api/departures` | GET/POST | ✅ | |
| `/api/itinerary/[tourId]` | GET | ✅ | |
| `/api/pdf-index` | GET | ✅ | FTS RPC |
| `/api/cron/crawl-pdf` | GET | ✅ | |
| `/api/webhooks/n8n` | POST | ✅ | |
| `/api/webhooks/moda` | POST | ✅ | |
| `/api/webhooks/zalo` | POST | ❌ | Phase 4 — chưa build |

### Zustand Stores

```
useUIStore              (store/ui.store.ts)               ✅
useNotificationStore    (store/notification.store.ts)      ✅ — wired vào CRM bell
useSearchStore          (store/search.store.ts)            ✅
useCalendarStore        (store/calendar.store.ts)          ✅
useChatStore            (store/chat.store.ts)              ✅
useCmsStore             (store/cms.store.ts)               ✅
useCustomerProfileStore (store/customer-profile.store.ts)  ✅ — CRMFilter mở rộng
useAiChatStore          (store/ai-chat.store.ts)           ✅ — ChatWidget + AiChatPanel
```

### Data Contract — Delta phiên #35

```typescript
// ── CRMFilter (phiên #35) — MỞ RỘNG ──────────────────────────────────────
// 'all' | 'fb_ads' | 'web_ads' | 'deposited' | 'new'
// + 'hot' | 'warm' | 'cold'          (AI tier — phiên #34)
// + 'popup' | 'chat' | 'tiktok' | 'zalo'  (source channel — phiên #35)

// ── /api/leads POST (phiên #35) — FIX ────────────────────────────────────
// Đổi createClient() → createAdminClient() → bypass RLS hoàn toàn
// triggerNotification: thêm detail: lead.phone → Telegram hiển thị SĐT

// ── CRM page (phiên #35) — MỚI ────────────────────────────────────────────
// SourceCards: 5 card (Facebook / Website·Popup / Tư vấn / TikTok / Zalo)
//   count thực từ leads store; click → setFilter; click lại → 'all'
// NotificationPanel: dropdown từ bell — dismiss / đọc hết (dùng useNotificationStore)
// Realtime subscription: channel 'admin-notifications' → new_lead + new_booking
//   → addNotification() + fetchLeads() auto-refresh

// ── affiliate_links / affiliate_clicks (phiên #34) — migration #18 ────────
// GET /api/affiliate/track?link_id=&lead_id=&session_id=
//   → recordClick() fire-and-forget → 302 redirect tracking_url
// tracker.ts: getActiveLinks(), getLinkById(), recordClick() (IP sha256)
```

### Hạ tầng & Tích hợp bên ngoài

```
GitHub  : https://github.com/trungdotest8/namngan-travel (branch: main)
Vercel  : namngan-travel — cần redeploy để nhận migrations cloud
Supabase: indjoegnsvcteaozmgrg — 18 migrations local / 15 cloud
          ⚠️ Migration #16 + #17 + #18 chưa apply cloud
          ✅ bucket 'tour-galleries' | ✅ ai_conversations | ✅ featured_destinations
Resend  : Domain namngantravel.com — PENDING DNS
SeaStar : ✅ 49 tours | Vercel Cron: "0 2 * * *" /api/cron/crawl-pdf ✅
ANTHROPIC_API_KEY: ✅ .env.local | ⚠️ cần add Vercel Env Vars + redeploy
TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID: ✅ Vercel đã set
```

### Files ưu tiên cao chưa hoàn chỉnh

```
# APPLY NGAY (không cần code):
1. Supabase Dashboard → SQL Editor → paste migration #16 → Run
2. Supabase Dashboard → SQL Editor → paste migration #17 → Run
3. Supabase Dashboard → SQL Editor → paste migration #18 → Run
4. Vercel → Redeploy production (nhận ANTHROPIC_API_KEY)

# TRIPGENIE Phase 4 (Zalo OA + FB Lead Ads):
5. /api/webhooks/zalo — nhận OA webhook, insert lead với source_channel='zalo'
6. /api/webhooks/fb-leads — nhận FB Lead Ads, insert lead với lead_source='fb_ads'

# TRIPGENIE Phase 5 (Itinerary Builder AI):
7. /api/ai/itinerary — streaming, nhúng affiliate links
8. src/components/ai/ItineraryBuilder.tsx

# CRM enhancement:
9. CRM LeadsTab: filter theo ai_tier (HOT/WARM/COLD) đã có chip — cần test production
10. Affiliate links nhúng vào tour pages (Phase 3 backend ✅, frontend còn thiếu)
```

### Next Steps (3 việc làm ngay khi mở phiên mới)

1. **Apply migration #16 + #17 + #18 lên Supabase cloud** — SQL Editor → paste lần lượt → Run → `vercel --prod`
2. **TripGenie Phase 4 — Zalo & FB Webhook** — `/api/webhooks/zalo` + `/api/webhooks/fb-leads`; insert lead với đúng source_channel; test trigger Telegram
3. **Nhúng affiliate links vào tour detail pages** — dùng `getActiveLinks({ destination })` từ `tracker.ts`; render card bên dưới tour description

### Change Log

| Ngày | Giai đoạn | Thay đổi |
|------|-----------|---------|
| 2026-06-08 | Handover #35 — CRM Source Tabs + Fix 500 leads | Fix /api/leads createAdminClient; Source cards 5 kênh; Realtime bell; NotificationPanel |
| 2026-06-08 | Handover #34 — TripGenie Phase 2+3 + Build Fix | Phase 2 classify ✅; Affiliate Engine ✅; CRM HOT/WARM/COLD filter ✅; Edge→Node fix ✅ |
| 2026-06-08 | Handover #33 — TripGenie Leads WIP + RAG + Env Vercel | Migration #16 ✅; lead-capture.schema ✅; Edge+RAG ✅; Telegram Vercel ✅ |
| 2026-06-07 | Handover #32 — TripGenie Phase 1 + Notification v2 | AI Chat ✅; Telegram ✅; 8 events; auth cookie fix; ISR |
| 2026-06-07 | Handover #31 — SEO + Server Component | blog/tao-lich-trinh Static; generateMetadata; JSON-LD |
| 2026-06-07 | Handover #30 — TripGenie Pages + Lead Modal | /blog /diem-den /tao-lich-trinh; TripGenieLeadModal |
| 2026-06-07 | Handover #29 — Mobile + Sitemap | ChatWidget/TourDetail/Header mobile; sitemap dynamic |
| 2026-06-06 | Handover #28 — Country Filter Fix | COUNTRY_MAP title case; normalizeCountry(); mega-menu |
| 2026-06-06 | Handover #27 — CRM Mobile Responsive | Sidebar hamburger; slide panels full-width |
| 2026-06-05 | Handover #26 — Mixed Content Fix | CSP upgrade-insecure-requests; toHttps() |
| 2026-06-05 | Handover #25 — Điểm đến nổi bật CRM | migration #14; DestinationsTab; /api/featured-destinations |
| 2026-06-05 | Handover #24 — Domain SEO + Search Fix | middleware .site→.com; robots+sitemap; OR query |
| 2026-06-05 | Handover #23 — CRM Upload + Tiptap + Pagination | upload-image; TiptapEditor; /api/cms pagination |
| 2026-06-04 | Handover #20–22 | Mega-menu; animations; hashtags; booking; bug fixes |
| 2026-06-03 | Handover #16–19 | Auth; Gallery; StaffTab; ToursTab; CMS |
| 2026-06-02 | Handover #14–15 | /tours/[slug]; 8 tour trong nước; Directus CMS |
| 2026-06-01 | Handover #9–12 | Lịch khởi hành; PDF Crawler; Tour Detail; Secrets fix |

> ⚙️ **Mục này được tự động ghi đè bởi lệnh `/handover`.**
> Không sửa tay — mọi thay đổi sẽ bị overwrite lần `/handover` tiếp theo.
> Trigger: khi context > 70% HOẶC khi kết thúc một giai đoạn lập trình lớn.
