-- ============================================================
-- NAM NGÂN TRAVEL — Row Level Security Policies
-- ============================================================

-- TOURS: public read (active only), service_role full access
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tours_public_read" ON tours FOR SELECT USING (is_active = TRUE);
CREATE POLICY "tours_admin_all"   ON tours FOR ALL    USING (auth.role() = 'service_role');

-- TOUR_SCHEDULES: public read (open only), service_role full access
ALTER TABLE tour_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schedules_public_read" ON tour_schedules FOR SELECT USING (status = 'open');
CREATE POLICY "schedules_admin_all"   ON tour_schedules FOR ALL    USING (auth.role() = 'service_role');

-- USERS: owner read/update own row, service_role full access
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_owner_read"   ON users FOR SELECT USING (auth_id = auth.uid());
CREATE POLICY "users_owner_update" ON users FOR UPDATE USING (auth_id = auth.uid());
CREATE POLICY "users_admin_all"    ON users FOR ALL    USING (auth.role() = 'service_role');

-- WALLETS: owner read own wallet
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets_owner_read" ON wallets
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );
CREATE POLICY "wallets_admin_all"  ON wallets FOR ALL USING (auth.role() = 'service_role');

-- WALLET_TRANSACTIONS: owner read own transactions
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_txn_owner_read" ON wallet_transactions
  FOR SELECT USING (
    wallet_id IN (
      SELECT w.id FROM wallets w
      JOIN users u ON u.id = w.user_id
      WHERE u.auth_id = auth.uid()
    )
  );
CREATE POLICY "wallet_txn_admin_all" ON wallet_transactions FOR ALL USING (auth.role() = 'service_role');

-- BOOKINGS: owner read/insert own bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings_owner_read" ON bookings
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );
CREATE POLICY "bookings_owner_insert" ON bookings
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );
CREATE POLICY "bookings_admin_all" ON bookings FOR ALL USING (auth.role() = 'service_role');

-- ARTICLES: public read (published only)
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "articles_public_read" ON articles FOR SELECT USING (status = 'published');
CREATE POLICY "articles_admin_all"   ON articles FOR ALL    USING (auth.role() = 'service_role');

-- LEADS: public insert (anonymous form), service_role full access
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads_public_insert" ON leads FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "leads_admin_all"     ON leads FOR ALL    USING (auth.role() = 'service_role');
