-- Migration #9: Thêm hashtags vào bảng tours
-- Dùng cho tính năng quản lý hashtag trong CRM ToursTab

ALTER TABLE tours ADD COLUMN IF NOT EXISTS hashtags TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_nn_tours_hashtags ON tours USING GIN(hashtags);

COMMENT ON COLUMN tours.hashtags IS 'Hashtag SEO/social media, e.g. {#dulichtrongnuoc, #hanoi, #tour2n1d}';
