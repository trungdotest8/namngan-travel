-- Migration #21 — Hỗ trợ Google Sheets Sync (/api/departures/sync)
-- BẮT BUỘC apply trước khi deploy route, nếu không upsert onConflict sẽ fail.
-- Lưu ý: updated_at, seats_total, seats_booked đã tồn tại trong initial schema.

-- 1. Cột mới (an toàn — IF NOT EXISTS, không phá schema hiện tại)
ALTER TABLE tour_schedules
  ADD COLUMN IF NOT EXISTS seats_available    integer,
  ADD COLUMN IF NOT EXISTS flight_code_departure text,
  ADD COLUMN IF NOT EXISTS flight_code_return    text,
  ADD COLUMN IF NOT EXISTS source               text NOT NULL DEFAULT 'seastar';

-- 2. Unique index cho UPSERT onConflict (tour_id, departure_date)
--    Kiểm tra duplicate TRƯỚC khi chạy:
--    SELECT tour_id, departure_date, count(*) FROM tour_schedules
--      GROUP BY 1,2 HAVING count(*) > 1;
CREATE UNIQUE INDEX IF NOT EXISTS tour_schedules_tour_departure_uniq
  ON tour_schedules (tour_id, departure_date);

-- 3. Backfill seats_available cho dữ liệu cũ
UPDATE tour_schedules
SET seats_available = GREATEST(seats_total - seats_booked, 0)
WHERE seats_available IS NULL;

-- 4. Index hỗ trợ filter theo nguồn (debug SeaStar vs Google Sheets)
CREATE INDEX IF NOT EXISTS tour_schedules_source_idx
  ON tour_schedules (source);
