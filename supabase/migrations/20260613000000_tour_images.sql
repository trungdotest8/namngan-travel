-- Migration #26: Add images jsonb column to tours table
-- Mảng URL ảnh do admin upload thủ công (KHÔNG cào tự động)
-- Ảnh đầu tiên = ảnh đại diện (gallery cover)
ALTER TABLE tours
  ADD COLUMN IF NOT EXISTS images jsonb;
