-- ============================================================
-- Migration #30 — Database Performance Optimizations
-- Chỉ ADD indexes, không xóa hoặc thay đổi schema
-- ============================================================

-- pg_trgm: hỗ trợ ILIKE '%keyword%' nhanh hơn bằng GIN
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- TOURS — 11 queries/request, hot table
-- ============================================================

-- /api/tours ORDER BY updated_at DESC (không có index)
CREATE INDEX IF NOT EXISTS idx_nn_tours_updated_at
  ON tours(updated_at DESC);

-- ILIKE '%search%' trên name: dùng GIN trigram thay vì seq scan
CREATE INDEX IF NOT EXISTS idx_nn_tours_name_trgm
  ON tours USING GIN (name gin_trgm_ops);

-- Combo filter phổ biến nhất: is_active + category + sort
CREATE INDEX IF NOT EXISTS idx_nn_tours_active_category
  ON tours(is_active, category, updated_at DESC)
  WHERE is_active = true;

-- Combo filter: is_active + country + sort (trang du-lich/[country])
CREATE INDEX IF NOT EXISTS idx_nn_tours_active_country
  ON tours(is_active, country, updated_at DESC)
  WHERE is_active = true;

-- ============================================================
-- LEADS — 17 queries/request, bảng nóng nhất
-- ============================================================

-- Zalo webhook: leads.zalo_id dùng để lookup/dedup (không có index)
CREATE INDEX IF NOT EXISTS idx_nn_leads_zalo_id
  ON leads(zalo_id)
  WHERE zalo_id IS NOT NULL;

-- FB Leads webhook: leads.fb_lead_id dùng để dedup (không có index)
CREATE INDEX IF NOT EXISTS idx_nn_leads_fb_lead_id
  ON leads(fb_lead_id)
  WHERE fb_lead_id IS NOT NULL;

-- CRM listing: filter status + sort created_at (thay thế 2 index đơn)
CREATE INDEX IF NOT EXISTS idx_nn_leads_status_created
  ON leads(status, created_at DESC);

-- CRM filter theo kênh + sort (thay thế 2 index đơn)
CREATE INDEX IF NOT EXISTS idx_nn_leads_channel_created
  ON leads(source_channel, created_at DESC);

-- Partial index: leads mới chưa xử lý — dùng cho alert badge và dashboard count
CREATE INDEX IF NOT EXISTS idx_nn_leads_new_created
  ON leads(created_at DESC)
  WHERE status = 'new';

-- Phone lookup trong Zalo webhook + CRM customer profile
-- (idx_nn_leads_phone đã tồn tại — bỏ qua)

-- ============================================================
-- LEAD_ACTIVITIES — 7 queries/request
-- ============================================================

-- Filter theo action_type ('call' | 'note' | 'email' | 'other')
CREATE INDEX IF NOT EXISTS idx_nn_lead_activities_action_type
  ON lead_activities(action_type);

-- Composite: lead_id + action_type (filter cùng lúc)
CREATE INDEX IF NOT EXISTS idx_nn_lead_activities_lead_action
  ON lead_activities(lead_id, action_type, created_at DESC);

-- ============================================================
-- TOUR_SCHEDULES — 3 queries/request
-- ============================================================

-- Composite thay thế 2 index đơn (status + departure_date)
-- /api/departures: filter status, ORDER BY departure_date ASC
CREATE INDEX IF NOT EXISTS idx_nn_tour_schedules_status_date
  ON tour_schedules(status, departure_date ASC);

-- ============================================================
-- SUPPORT_TICKETS — 6 queries/request
-- ============================================================

-- ORDER BY created_at DESC (không có index)
CREATE INDEX IF NOT EXISTS idx_nn_support_tickets_created_at
  ON support_tickets(created_at DESC);

-- Filter priority (high | urgent — dùng trong admin CRM)
CREATE INDEX IF NOT EXISTS idx_nn_support_tickets_priority
  ON support_tickets(priority);

-- Composite: status + created_at (CRM tickets list)
CREATE INDEX IF NOT EXISTS idx_nn_support_tickets_status_created
  ON support_tickets(status, created_at DESC);

-- ============================================================
-- CONVERSATION_LOGS — 3 queries/request
-- ============================================================

-- Composite: lead_id + sent_at DESC (CRM conversation view)
-- idx_conv_logs_lead và idx_conv_logs_sent_at đã có riêng lẻ
-- Composite nhanh hơn cho query WHERE lead_id = ? ORDER BY sent_at DESC
CREATE INDEX IF NOT EXISTS idx_conv_logs_lead_sent
  ON conversation_logs(lead_id, sent_at DESC);

-- ============================================================
-- ARTICLES — 7 queries/request
-- ============================================================

-- ILIKE search trên title (admin CMS search)
CREATE INDEX IF NOT EXISTS idx_nn_articles_title_trgm
  ON articles USING GIN (title gin_trgm_ops);

-- Composite: status + published_at DESC (public blog listing)
CREATE INDEX IF NOT EXISTS idx_nn_articles_status_published
  ON articles(status, published_at DESC)
  WHERE status = 'published';
