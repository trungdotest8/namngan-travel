-- Migration #14: Featured Destinations (Điểm đến nổi bật)
-- Quản lý section "Điểm đến nổi bật" trên homepage qua CRM

CREATE TABLE IF NOT EXISTS featured_destinations (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         text NOT NULL,
  image_url    text NOT NULL,
  href         text NOT NULL,
  sort_order   integer NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER featured_destinations_updated_at
  BEFORE UPDATE ON featured_destinations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE featured_destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_featured_destinations"
  ON featured_destinations FOR SELECT USING (is_active = true);

CREATE POLICY "service_role_all_featured_destinations"
  ON featured_destinations FOR ALL USING (auth.role() = 'service_role');

-- Seed dữ liệu mặc định từ POPULAR_DEST hiện tại
INSERT INTO featured_destinations (name, image_url, href, sort_order) VALUES
  ('Trung Quốc', 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=400&q=80', '/tours?country=Trung+Qu%E1%BB%91c&category=n%C6%B0%E1%BB%9Bc+ngo%C3%A0i', 1),
  ('Nhật Bản',   'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&q=80', '/tours?country=Nh%E1%BA%ADt+B%E1%BA%A3n&category=n%C6%B0%E1%BB%9Bc+ngo%C3%A0i', 2),
  ('Hàn Quốc',  'https://images.unsplash.com/photo-1538485399081-7c8272e29df8?w=400&q=80', '/tours?country=H%C3%A0n+Qu%E1%BB%91c&category=n%C6%B0%E1%BB%9Bc+ngo%C3%A0i', 3),
  ('Phú Quốc',  'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80', '/tour-trong-nuoc?destination=Ph%C3%BA+Qu%E1%BB%91c', 4),
  ('Đà Nẵng',   'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80', '/tour-trong-nuoc?destination=%C4%90%C3%A0+N%E1%BA%B5ng', 5),
  ('Hà Giang',  'https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?w=400&q=80', '/tour-trong-nuoc?destination=H%C3%A0+Giang', 6);
