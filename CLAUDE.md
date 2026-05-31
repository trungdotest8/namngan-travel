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
| B | Lịch khởi hành (Google Sheets) | `src/components/calendar/` | `/api/departures` | `calendar.store.ts` |
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
│       ├── departures/    ← Child B
│       ├── itinerary/     ← Child C
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
│   ├── integrations/      ← n8n, moda, slot mở
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
| B | Lịch khởi hành (SeaStar) | ✅ v1.1.0 | `src/lib/integrations/seastar.ts` + `src/app/api/departures/route.ts` + `src/store/calendar.store.ts` |
| C | Itinerary Docs | ✅ Ghép xong | `src/components/itinerary/TourDetail.tsx` |
| D | Hồ sơ khách | ✅ v1.1.0 | `src/components/customer-profile/CustomerProfileDrawer.tsx` + `CustomerTable.tsx` |
| E | Chat & Lead | ✅ v2.0.0 | `src/components/chat/ChatWidget.tsx` + `AutoPopup.tsx` |
| F | CMS / RSS | ✅ v1.2.0 | `src/components/cms/ArticleFeed.tsx` |
| G | DB Schema | ✅ cloud 4 applied + migration #5 local | `supabase/migrations/` — **Supabase: indjoegnsvcteaozmgrg** |
| CRM | Admin CRM Platform | ✅ v1.2.0 | `src/app/(admin)/crm/page.tsx` + `public/crm-standalone.html` |
| HOME | Trang chủ | ✅ v1.0.0 | `src/app/page.tsx` |
| LICH | Trang Lịch Khởi Hành | ✅ v1.0.0 | `src/app/lich-khoi-hanh/page.tsx` — 3-bước filter + Realtime auto-refresh |
| EDGE | Supabase Edge Functions | ✅ deployed | `supabase/functions/fb-webhook/` + `google-drive/` |

### Trạng thái API Routes

| Route | Method | Trạng thái | Ghi chú |
|-------|--------|-----------|---------|
| `/api/leads` | POST | ✅ | Zod + Supabase + luồng kép Email+Realtime |
| `/api/cms` | GET/POST | ✅ | filter source_type, status, limit |
| `/api/customer-profile` | GET/PATCH | ✅ | Auth: x-admin-secret; createAdminClient |
| `/api/search` | POST | ✅ | createClient (RLS); TourSearchResult từ @/types |
| `/api/notifications` | POST | ✅ | Auth: x-webhook-secret; triggerNotification() |
| `/api/webhooks/n8n` | POST | ✅ | Auth: x-webhook-secret; new_lead_notify |
| `/api/webhooks/moda` | POST | ✅ | Auth: x-webhook-secret; luồng kép nếu confirmed |
| `/api/departures` | GET | ✅ | Public RLS; filter dest/month/status/tour_id; join tours |
| `/api/departures` | POST | ✅ | Auth: x-webhook-secret; sync + broadcast 'schedule-sync' channel |
| `/api/itinerary/[tourId]` | GET | ❌ | Child C API chưa có |
| Edge: `fb-webhook` | POST/GET | ✅ deployed | Web Crypto API |
| Edge: `google-drive` | POST | ✅ deployed | base64url JWT fix |

### Zustand Stores

```
useUIStore              (store/ui.store.ts)               ✅ toast, modal, loading
useNotificationStore    (store/notification.store.ts)      ✅ admin realtime
useSearchStore          (store/search.store.ts)            ✅ results: TourSearchResult[]
useCalendarStore        (store/calendar.store.ts)          ✅ Child B — fetchSchedules(), schedules[]
useChatStore            (store/chat.store.ts)              ✅ Child E
useCmsStore             (store/cms.store.ts)               ✅ Child F
useCustomerProfileStore (store/customer-profile.store.ts)  ✅ Child D + CRM admin
```

### Data Contract — Delta phiên này

```typescript
// ── Realtime channel MỚI ──────────────────────────────────────────
// channel: 'schedule-sync'  event: 'updated'
// payload: { synced: number, at: string }
// Sender:  POST /api/departures (sau syncSeaStarSchedules)
// Listener: src/app/lich-khoi-hanh/page.tsx → fetchSchedules() + toast

// ── /lich-khoi-hanh page ─────────────────────────────────────────
// COUNTRY_MAP: 17 quốc gia/vùng → keyword matching từ tour.destination
// 3-bước filter: country → destination → month (client-side)
// seatsLeft = seats_total - seats_booked; isFull khi ≤ 0 || status='full'
```

### Hạ tầng & Tích hợp bên ngoài

```
GitHub  : https://github.com/trungdotest8/namngan-travel  (branch: main)
          ✅ commit 91e0956 — auto-refresh /lich-khoi-hanh
Vercel  : 2 projects tồn tại:
          • dulichtrungquoc (prj_Rk46Y9...) — project cũ, cần xóa
          • namngan-travel  (prj_so9Cap...) — ĐÃ LINK folder local ← DÙNG CÁI NÀY
          ⚠️ namngan-travel chưa có env vars → cần chạy script push env
          ⚠️ Cần kết nối domain namngantravel.site
Supabase: ✅ indjoegnsvcteaozmgrg — 5 migrations local (4 applied cloud)
          ⚠️ Migration #5 (seastar_index) chưa push: supabase db push
.env.local: ✅ Đã restore đầy đủ (Supabase ✅, Resend ✅, Google APIs ✅)
            WEBHOOK_SECRET = NEXT_PUBLIC_ADMIN_SECRET = namngan-secret-2025
Edge Fn : ✅ fb-webhook + google-drive deployed
          ⚠️ Secrets chưa set: FB_APP_SECRET, ZALO_OA_SECRET,
             GOOGLE_SERVICE_ACCOUNT_JSON, DRIVE_PARENT_FOLDER_ID, FB_VERIFY_TOKEN
Resend  : re_gZSD1XRc_... — onboarding@resend.dev (tạm)
          ⚠️ Verify domain → đổi RESEND_FROM_EMAIL
SeaStar : ✅ 313 synced — Realtime broadcast sau mỗi sync
SĐT     : 0932 611 933 (main) · 0774 623 514 (Zalo)
```

### Files ưu tiên cao chưa tồn tại

```
# CẦN LÀM SAU (ưu tiên giảm dần)
src/components/notifications/NotificationPanel.tsx   ← wire Realtime → addNotification store
src/components/ui/Button.tsx + Card.tsx              ← atom components
src/components/calendar/DepartureCalendar.tsx        ← UI widget lịch cho trang chủ

# CHỜ API
src/app/api/itinerary/[tourId]/route.ts              ← Child C API chưa có
```

### Next Steps (3 việc làm ngay khi mở phiên mới)

1. **Push env vars lên Vercel `namngan-travel`** — chạy script loop trong Terminal (`while IFS='=' read...`) → sau đó `vercel --prod` để redeploy → test `https://namngan-travel.vercel.app/lich-khoi-hanh`
2. **`supabase db push`** — apply migration #5 (`seastar_index.sql`) lên cloud → performance upsert
3. **Tạo `NotificationPanel.tsx`** — subscribe `admin-notifications` channel → `addNotification()` từ `notification.store.ts`

### Change Log

| Ngày | Giai đoạn | Thay đổi |
|------|-----------|---------|
| 2026-06-01 | Handover #9 — Lịch Khởi Hành + Realtime | /lich-khoi-hanh page ✅; Realtime auto-refresh; 2 Vercel projects phát hiện; .env.local restored |
| 2026-05-31 | Handover #8 — Child B SeaStar Crawler | syncSeaStarSchedules() ✅ 313 records; api/departures GET+POST; calendar.store; CRM sync button |
| 2026-05-30 | Handover #7 — Code Review + Security Fixes | 10 findings fixed: auth guards, RLS migration #4, LeadStatus CRM, HTML escape |
| 2026-05-30 | Handover #6 — Search + Deploy | api/search ✅; SearchResults component; Edge Fn deployed+fixed; Vercel live |
| 2026-05-30 | Handover #5 — CRM + Edge Functions | Migration #3 CRM extensions; fb-webhook + google-drive; CRM standalone v3.0 |
| 2026-05-30 | Handover #4 — Deploy Session | page.tsx trang chủ ✅; GitHub ✅; Supabase cloud ✅; Resend ✅ |
| 2026-05-30 | Handover #3 | tsc CLEAN, cập nhật delta Child D + CRM |
| 2026-05-30 | Session 2 — Child D + CRM | Child D xong: Drawer upload + Drive, CustomerTable, store, api/customer-profile |
| 2026-05-30 | Session 1 | Xác nhận repo: Child A,C,E,F ghép xong; luồng kép api/leads ✅ |
