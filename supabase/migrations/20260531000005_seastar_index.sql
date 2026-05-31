-- Unique partial index cho tour_schedules.sheets_row_id
-- Cần thiết để upsert onConflict: 'sheets_row_id' hoạt động đúng
-- WHERE NOT NULL cho phép nhiều row NULL coexist (tours từ các nguồn khác)
CREATE UNIQUE INDEX IF NOT EXISTS idx_nn_tour_schedules_sheets_row_id
  ON tour_schedules(sheets_row_id)
  WHERE sheets_row_id IS NOT NULL;

-- Unique partial index cho tours.sheets_row_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_nn_tours_sheets_row_id
  ON tours(sheets_row_id)
  WHERE sheets_row_id IS NOT NULL;
