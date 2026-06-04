-- Migration #11: Seed hashtags cho 49 tours theo country + category
-- Chạy sau migration #9 (column hashtags đã tồn tại)
-- Chỉ cập nhật tours có hashtags rỗng để không override dữ liệu đã nhập thủ công

-- ── NƯỚC NGOÀI ───────────────────────────────────────────────────────────────

UPDATE tours SET hashtags = ARRAY[
  '#dulichnhatban', '#nhatban', '#japan', '#tourchaua',
  '#dulichtrongoai', '#hoaphuongnhat', '#mùahoaanh', '#nuitfuji'
] WHERE country = 'NHẬT BẢN' AND (hashtags = '{}' OR hashtags IS NULL);

UPDATE tours SET hashtags = ARRAY[
  '#dulichhangquoc', '#hangquoc', '#korea', '#tourchaua',
  '#dulichtrongoai', '#seoul', '#jeju', '#kpop'
] WHERE country = 'HÀN QUỐC' AND (hashtags = '{}' OR hashtags IS NULL);

UPDATE tours SET hashtags = ARRAY[
  '#dulichsingapore', '#singapore', '#tourchaua',
  '#dulichtrongoai', '#marinabay', '#donnamchauA'
] WHERE country = 'SINGAPORE' AND (hashtags = '{}' OR hashtags IS NULL);

UPDATE tours SET hashtags = ARRAY[
  '#dulichthailan', '#thailan', '#thailand', '#tourchaua',
  '#dulichtrongoai', '#bangkok', '#phuket', '#chiangmai', '#donnamchauA'
] WHERE country = 'THÁI LAN' AND (hashtags = '{}' OR hashtags IS NULL);

UPDATE tours SET hashtags = ARRAY[
  '#dulichchauau', '#chauau', '#europe', '#tourchauu',
  '#dulichtrongoai', '#paris', '#rome', '#thuysi', '#dongau'
] WHERE country = 'CHÂU ÂU' AND (hashtags = '{}' OR hashtags IS NULL);

UPDATE tours SET hashtags = ARRAY[
  '#dulichhongkong', '#hongkong', '#tourchaua',
  '#dulichtrongoai', '#disneyland', '#donnamchauA'
] WHERE country = 'HỒNG KÔNG' AND (hashtags = '{}' OR hashtags IS NULL);

UPDATE tours SET hashtags = ARRAY[
  '#dulichdailoan', '#dailoan', '#taiwan', '#tourchaua',
  '#dulichtrongoai', '#taipei', '#donnamchauA'
] WHERE country = 'ĐÀI LOAN' AND (hashtags = '{}' OR hashtags IS NULL);

UPDATE tours SET hashtags = ARRAY[
  '#dulichmy', '#my', '#usa', '#tourchaumi',
  '#dulichtrongoai', '#newyork', '#lasvegas', '#losangeles'
] WHERE country = 'MỸ' AND (hashtags = '{}' OR hashtags IS NULL);

UPDATE tours SET hashtags = ARRAY[
  '#dulichcanada', '#canada', '#tourchaumi',
  '#dulichtrongoai', '#niagara', '#vancouver', '#toronto'
] WHERE country = 'CANADA' AND (hashtags = '{}' OR hashtags IS NULL);

UPDATE tours SET hashtags = ARRAY[
  '#dulichando', '#ando', '#india', '#tourchaua',
  '#dulichtrongoai', '#tajmahal', '#newdelhi', '#donnamchauA'
] WHERE country = 'ẤN ĐỘ' AND (hashtags = '{}' OR hashtags IS NULL);

UPDATE tours SET hashtags = ARRAY[
  '#dulichbali', '#bali', '#indonesia', '#tourchaua',
  '#dulichtrongoai', '#donnamchauA', '#daocuabali'
] WHERE country = 'INDONESIA' AND (hashtags = '{}' OR hashtags IS NULL);

UPDATE tours SET hashtags = ARRAY[
  '#dulichcampuchia', '#campuchia', '#cambodia', '#tourchaua',
  '#dulichtrongoai', '#angkorwat', '#siemreap', '#donnamchauA'
] WHERE country = 'CAMPUCHIA' AND (hashtags = '{}' OR hashtags IS NULL);

UPDATE tours SET hashtags = ARRAY[
  '#dulichlao', '#lao', '#laos', '#tourchaua',
  '#dulichtrongoai', '#vientiane', '#luangprabang', '#donnamchauA'
] WHERE country = 'LÀO' AND (hashtags = '{}' OR hashtags IS NULL);

UPDATE tours SET hashtags = ARRAY[
  '#dulichphilippines', '#philippines', '#tourchaua',
  '#dulichtrongoai', '#cebu', '#manila', '#donnamchauA'
] WHERE country = 'PHILIPPINES' AND (hashtags = '{}' OR hashtags IS NULL);

UPDATE tours SET hashtags = ARRAY[
  '#dulichdubai', '#dubai', '#uae', '#trungdong',
  '#dulichtrongoai', '#burjkhalifa', '#abudhabi'
] WHERE country = 'UAE' AND (hashtags = '{}' OR hashtags IS NULL);

UPDATE tours SET hashtags = ARRAY[
  '#dulichtrungquoc', '#trungquoc', '#china', '#tourchaua',
  '#dulichtrongoai', '#truongthanhtrungquoc', '#thugon', '#donnamchauA'
] WHERE country = 'TRUNG QUỐC' AND (hashtags = '{}' OR hashtags IS NULL);

-- ── TOUR TRONG NƯỚC ────────────────────────────────────────────────────────

UPDATE tours SET hashtags = ARRAY[
  '#dulichtrongnuoc', '#vietnamtravel', '#tourtrongnuoc',
  '#dulichvietnam', '#namngantravel', '#khamphaVietnam'
] WHERE category = 'trong nước' AND (hashtags = '{}' OR hashtags IS NULL);

-- ── FALLBACK: tours chưa khớp country nào ──────────────────────────────────

UPDATE tours SET hashtags = ARRAY[
  '#dulichtrongoai', '#namngantravel', '#tourvietnam'
] WHERE category = 'nước ngoài'
  AND (hashtags = '{}' OR hashtags IS NULL)
  AND country IS NOT NULL;
