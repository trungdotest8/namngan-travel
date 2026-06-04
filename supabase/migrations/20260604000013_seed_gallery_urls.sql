-- Migration #13: Seed gallery_urls for 49 tours grouped by country
-- Only fills tours with no existing gallery images (safe to re-run)
-- Photos: curated Unsplash landscape IDs per destination country

-- ── NHẬT BẢN ──────────────────────────────────────────────────────────────────
UPDATE tours SET gallery_urls = ARRAY[
  'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80',
  'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800&q=80',
  'https://images.unsplash.com/photo-1545569341-4eb14c405d3c?w=800&q=80'
]
WHERE country = 'NHẬT BẢN'
  AND (gallery_urls IS NULL OR cardinality(gallery_urls) = 0);

-- ── HÀN QUỐC ──────────────────────────────────────────────────────────────────
UPDATE tours SET gallery_urls = ARRAY[
  'https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&q=80',
  'https://images.unsplash.com/photo-1601042879364-b5b14b573d0a?w=800&q=80',
  'https://images.unsplash.com/photo-1546412367-e87c7bdc4b0d?w=800&q=80'
]
WHERE country = 'HÀN QUỐC'
  AND (gallery_urls IS NULL OR cardinality(gallery_urls) = 0);

-- ── THÁI LAN ──────────────────────────────────────────────────────────────────
UPDATE tours SET gallery_urls = ARRAY[
  'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800&q=80',
  'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=80',
  'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80'
]
WHERE country = 'THÁI LAN'
  AND (gallery_urls IS NULL OR cardinality(gallery_urls) = 0);

-- ── SINGAPORE ─────────────────────────────────────────────────────────────────
UPDATE tours SET gallery_urls = ARRAY[
  'https://images.unsplash.com/photo-1525625293412-b53e40e32ded?w=800&q=80',
  'https://images.unsplash.com/photo-1570791600855-9958d6dd79c0?w=800&q=80',
  'https://images.unsplash.com/photo-1565967511849-76a60a516170?w=800&q=80'
]
WHERE country = 'SINGAPORE'
  AND (gallery_urls IS NULL OR cardinality(gallery_urls) = 0);

-- ── TRUNG QUỐC ────────────────────────────────────────────────────────────────
UPDATE tours SET gallery_urls = ARRAY[
  'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&q=80',
  'https://images.unsplash.com/photo-1535189043414-47a3c49a0bed?w=800&q=80',
  'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=800&q=80'
]
WHERE country = 'TRUNG QUỐC'
  AND (gallery_urls IS NULL OR cardinality(gallery_urls) = 0);

-- ── MALAYSIA ──────────────────────────────────────────────────────────────────
UPDATE tours SET gallery_urls = ARRAY[
  'https://images.unsplash.com/photo-1510652297879-9d4d066de4c3?w=800&q=80',
  'https://images.unsplash.com/photo-1508804052814-cd3ba865a116?w=800&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80'
]
WHERE country = 'MALAYSIA'
  AND (gallery_urls IS NULL OR cardinality(gallery_urls) = 0);

-- ── INDONESIA ─────────────────────────────────────────────────────────────────
UPDATE tours SET gallery_urls = ARRAY[
  'https://images.unsplash.com/photo-1537996134895-a0657fc34f06?w=800&q=80',
  'https://images.unsplash.com/photo-1580587771525-4cad5c41c7a0?w=800&q=80',
  'https://images.unsplash.com/photo-1568822617270-2c216ae16ae9?w=800&q=80'
]
WHERE country = 'INDONESIA'
  AND (gallery_urls IS NULL OR cardinality(gallery_urls) = 0);

-- ── PHILIPPINES ───────────────────────────────────────────────────────────────
UPDATE tours SET gallery_urls = ARRAY[
  'https://images.unsplash.com/photo-1518548419-00010d9a4fde?w=800&q=80',
  'https://images.unsplash.com/photo-1518508002483-dbe085fef5ee?w=800&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&q=80'
]
WHERE country = 'PHILIPPINES'
  AND (gallery_urls IS NULL OR cardinality(gallery_urls) = 0);

-- ── ĐÀI LOAN ──────────────────────────────────────────────────────────────────
UPDATE tours SET gallery_urls = ARRAY[
  'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80',
  'https://images.unsplash.com/photo-1548551706-3bfad0095d91?w=800&q=80',
  'https://images.unsplash.com/photo-1472597628852-bc59428cd0a7?w=800&q=80'
]
WHERE country = 'ĐÀI LOAN'
  AND (gallery_urls IS NULL OR cardinality(gallery_urls) = 0);

-- ── LÀO ───────────────────────────────────────────────────────────────────────
UPDATE tours SET gallery_urls = ARRAY[
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&q=80',
  'https://images.unsplash.com/photo-1516738229117-5eb27012f5c4?w=800&q=80',
  'https://images.unsplash.com/photo-1506929562872-aba6dc200c78?w=800&q=80'
]
WHERE country = 'LÀO'
  AND (gallery_urls IS NULL OR cardinality(gallery_urls) = 0);

-- ── CAMPUCHIA ─────────────────────────────────────────────────────────────────
UPDATE tours SET gallery_urls = ARRAY[
  'https://images.unsplash.com/photo-1583340806671-a61bac7c4127?w=800&q=80',
  'https://images.unsplash.com/photo-1596422564700-e9e49e67a2e7?w=800&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'
]
WHERE country = 'CAMPUCHIA'
  AND (gallery_urls IS NULL OR cardinality(gallery_urls) = 0);

-- ── HỒNG KÔNG ─────────────────────────────────────────────────────────────────
UPDATE tours SET gallery_urls = ARRAY[
  'https://images.unsplash.com/photo-1483653364400-eda28f6e1d89?w=800&q=80',
  'https://images.unsplash.com/photo-1549421263-5ec394a5ad4c?w=800&q=80',
  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80'
]
WHERE country = 'HỒNG KÔNG'
  AND (gallery_urls IS NULL OR cardinality(gallery_urls) = 0);

-- ── AUSTRALIA ─────────────────────────────────────────────────────────────────
UPDATE tours SET gallery_urls = ARRAY[
  'https://images.unsplash.com/photo-1523482580672-f2ce91cc8b87?w=800&q=80',
  'https://images.unsplash.com/photo-1536610498-fd7eb5d4073c?w=800&q=80',
  'https://images.unsplash.com/photo-1501426026-6af0c28587c0?w=800&q=80'
]
WHERE country = 'AUSTRALIA'
  AND (gallery_urls IS NULL OR cardinality(gallery_urls) = 0);

-- ── CHÂU ÂU ───────────────────────────────────────────────────────────────────
UPDATE tours SET gallery_urls = ARRAY[
  'https://images.unsplash.com/photo-1499856871958-5b9357976b82?w=800&q=80',
  'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80',
  'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=80'
]
WHERE country = 'CHÂU ÂU'
  AND (gallery_urls IS NULL OR cardinality(gallery_urls) = 0);

-- ── CANADA ────────────────────────────────────────────────────────────────────
UPDATE tours SET gallery_urls = ARRAY[
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
  'https://images.unsplash.com/photo-1544735716-392fe2affc12?w=800&q=80',
  'https://images.unsplash.com/photo-1472214103451-aed0f346dc70?w=800&q=80'
]
WHERE country = 'CANADA'
  AND (gallery_urls IS NULL OR cardinality(gallery_urls) = 0);

-- ── ẤN ĐỘ ─────────────────────────────────────────────────────────────────────
UPDATE tours SET gallery_urls = ARRAY[
  'https://images.unsplash.com/photo-1524492412-0dc8ce4fc90b?w=800&q=80',
  'https://images.unsplash.com/photo-1514222709525-3de38c1d82fd?w=800&q=80',
  'https://images.unsplash.com/photo-1585136917218-5a57c13af3ae?w=800&q=80'
]
WHERE country = 'ẤN ĐỘ'
  AND (gallery_urls IS NULL OR cardinality(gallery_urls) = 0);

-- ── UAE ───────────────────────────────────────────────────────────────────────
UPDATE tours SET gallery_urls = ARRAY[
  'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80',
  'https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=800&q=80',
  'https://images.unsplash.com/photo-1548277778-38fc3d3b7bca?w=800&q=80'
]
WHERE country = 'UAE'
  AND (gallery_urls IS NULL OR cardinality(gallery_urls) = 0);

-- ── THỔ NHĨ KỲ ────────────────────────────────────────────────────────────────
UPDATE tours SET gallery_urls = ARRAY[
  'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80',
  'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800&q=80',
  'https://images.unsplash.com/photo-1501980681761-2f4e59c85e11?w=800&q=80'
]
WHERE country = 'THỔ NHĨ KỲ'
  AND (gallery_urls IS NULL OR cardinality(gallery_urls) = 0);

-- ── MỸ ────────────────────────────────────────────────────────────────────────
UPDATE tours SET gallery_urls = ARRAY[
  'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&q=80',
  'https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=800&q=80',
  'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=800&q=80'
]
WHERE country = 'MỸ'
  AND (gallery_urls IS NULL OR cardinality(gallery_urls) = 0);

-- ── VIỆT NAM (trong nước) ─────────────────────────────────────────────────────
UPDATE tours SET gallery_urls = ARRAY[
  'https://images.unsplash.com/photo-1559592413-7cec4d883f16?w=800&q=80',
  'https://images.unsplash.com/photo-1555217851-6141535598e4?w=800&q=80',
  'https://images.unsplash.com/photo-1506929562872-aba6dc200c78?w=800&q=80'
]
WHERE (country = 'VIỆT NAM' OR category = 'trong nước')
  AND (gallery_urls IS NULL OR cardinality(gallery_urls) = 0);
