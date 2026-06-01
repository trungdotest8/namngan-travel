-- Migration #8: Tour country field + Drive folder registry

-- ── tours: thêm country ──────────────────────────────────────────────────────
ALTER TABLE tours ADD COLUMN IF NOT EXISTS country TEXT;
CREATE INDEX IF NOT EXISTS idx_nn_tours_country ON tours(country);

-- Backfill country từ destination (ILIKE keyword match)
UPDATE tours SET country = CASE
  WHEN destination ILIKE ANY(ARRAY[
    '%BẮC KINH%','%THƯỢNG HẢI%','%HẢI NAM%','%QUẾ LÂM%','%TRÙNG KHÁNH%',
    '%ĐẠI LÝ%','%THÂM QUYẾN%','%VŨ HÁN%','%TÂN CƯƠNG%','%QUẢNG CHÂU%',
    '%NAM KINH%','%TRƯƠNG GIA GIỚI%','%TÔ CHÂU%','%TRUNG QUỐC%','%TRUNG QUOC%'
  ]) THEN 'TRUNG QUỐC'
  WHEN destination ILIKE ANY(ARRAY[
    '%BANGKOK%','%PATTAYA%','%CHIANG%','%THÁI LAN%','%THAI LAN%'
  ]) THEN 'THÁI LAN'
  WHEN destination ILIKE '%SINGAPORE%' THEN 'SINGAPORE'
  WHEN destination ILIKE ANY(ARRAY[
    '%SEOUL%','%BUSAN%','%JEJU%','%HÀN QUỐC%','%HAN QUOC%'
  ]) THEN 'HÀN QUỐC'
  WHEN destination ILIKE ANY(ARRAY[
    '%TOKYO%','%OSAKA%','%KYOTO%','%HOKKAIDO%','%NHẬT BẢN%','%NHAT BAN%'
  ]) THEN 'NHẬT BẢN'
  WHEN destination ILIKE ANY(ARRAY['%HỒNG KÔNG%','%HONG KONG%']) THEN 'HỒNG KÔNG'
  WHEN destination ILIKE ANY(ARRAY['%ĐÀI LOAN%','%TAIPEI%','%DAI LOAN%']) THEN 'ĐÀI LOAN'
  WHEN destination ILIKE ANY(ARRAY[
    '%LOS ANGELES%','%NEW YORK%','%LAS VEGAS%'
  ]) THEN 'MỸ'
  WHEN destination ILIKE '%CANADA%' THEN 'CANADA'
  WHEN destination ILIKE ANY(ARRAY[
    '%PARIS%','%ROME%','%AMSTERDAM%','%CHÂU ÂU%','%CHAU AU%'
  ]) THEN 'CHÂU ÂU'
  WHEN destination ILIKE ANY(ARRAY['%ẤN ĐỘ%','%AN DO%']) THEN 'ẤN ĐỘ'
  WHEN destination ILIKE ANY(ARRAY['%BALI%','%INDONESIA%']) THEN 'INDONESIA'
  WHEN destination ILIKE ANY(ARRAY['%ANGKOR%','%CAMPUCHIA%','%CAMBODIA%']) THEN 'CAMPUCHIA'
  WHEN destination ILIKE ANY(ARRAY['%VIENTIANE%','%LÀO%','%LAO %']) THEN 'LÀO'
  WHEN destination ILIKE ANY(ARRAY['%MANILA%','%CEBU%','%PHILIPPINES%']) THEN 'PHILIPPINES'
  WHEN destination ILIKE ANY(ARRAY['%DUBAI%','%UAE%']) THEN 'UAE'
  WHEN destination ILIKE ANY(ARRAY[
    '%ĐÀ NẴNG%','%DA NANG%','%HỘI AN%','%HOI AN%','%NHA TRANG%',
    '%PHÚ QUỐC%','%PHU QUOC%','%HÀ NỘI%','%HA NOI%','%HỒ CHÍ MINH%',
    '%ĐÀ LẠT%','%DA LAT%','%SA PA%','%SAPA%','%HẠ LONG%','%HA LONG%',
    '%MÙ CANG%','%MU CANG%','%HÀ GIANG%','%HA GIANG%','%HUẾ%'
  ]) THEN 'VIỆT NAM'
  ELSE NULL
END
WHERE country IS NULL AND destination IS NOT NULL;

-- ── tour_pdf_index: thêm category + drive_folder_id ──────────────────────────
ALTER TABLE tour_pdf_index ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE tour_pdf_index ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;
CREATE INDEX IF NOT EXISTS idx_pdf_index_category ON tour_pdf_index(category);

-- ── drive_folder_registry: lưu Drive folder IDs theo path ────────────────────
CREATE TABLE IF NOT EXISTS drive_folder_registry (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  path_key    TEXT    UNIQUE NOT NULL,
  folder_type TEXT    NOT NULL,
  drive_id    TEXT    NOT NULL,
  drive_url   TEXT    NOT NULL,
  parent_path TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drive_registry_path
  ON drive_folder_registry(path_key);

ALTER TABLE drive_folder_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_drive_registry"
  ON drive_folder_registry FOR ALL
  USING (auth.role() = 'service_role');
