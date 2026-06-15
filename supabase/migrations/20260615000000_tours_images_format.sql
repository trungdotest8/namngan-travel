-- Migration #27: Chuyển tours.images từ string[] sang object[] + thêm source_url
-- Tương thích ngược: TourGallery.tsx xử lý cả string lẫn object

-- 1. Thêm cột source_url (URL nguồn cào — dùng bởi agent.py)
ALTER TABLE tours ADD COLUMN IF NOT EXISTS source_url text;

-- 2. Migrate dữ liệu: images string[] → [{order, url, alt, caption}]
--    Chỉ chạy trên các hàng có images là mảng string (không phải object)
UPDATE tours
SET images = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'order',   ordinality::int,
      'url',     value::text,
      'alt',     '',
      'caption', ''
    ) ORDER BY ordinality
  )
  FROM jsonb_array_elements_text(images) WITH ORDINALITY
)
WHERE images IS NOT NULL
  AND jsonb_typeof(images) = 'array'
  AND jsonb_array_length(images) > 0
  AND jsonb_typeof(images->0) = 'string';
