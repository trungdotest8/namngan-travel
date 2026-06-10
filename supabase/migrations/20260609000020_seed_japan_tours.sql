-- Migration #20: Seed Japan tours + thêm các tour nước ngoài thiếu
-- Lý do: SeaStar chỉ sync Trung Quốc. Japan/Hàn Quốc/Thái Lan phải seed thủ công.
-- Idempotent: ON CONFLICT DO NOTHING

-- ── NHẬT BẢN ──────────────────────────────────────────────────────────────────

INSERT INTO tours (code, name, slug, destination, country, category, duration_days, description, highlights, thumbnail_url, gallery_urls, hashtags, is_active)
VALUES
  (
    'NN-NB-001',
    'Tour Nhật Bản: Tokyo – Osaka – Kyoto 6N5Đ',
    'tour-nhat-ban-tokyo-osaka-kyoto-6n5d',
    'Tokyo – Osaka – Kyoto',
    'Nhật Bản',
    'nước ngoài',
    6,
    'Hành trình khám phá 3 thành phố biểu tượng của Nhật Bản: Tokyo hiện đại, cố đô Kyoto trầm mặc và Osaka sôi động. Trải nghiệm núi Phú Sĩ, đền Fushimi Inari, phố Dotonbori và văn hóa Nhật Bản thuần túy.',
    'Núi Phú Sĩ – Tháp Tokyo – Đền Fushimi Inari – Khu Dotonbori – Rừng tre Arashiyama',
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
    ARRAY[
      'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80',
      'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800&q=80',
      'https://images.unsplash.com/photo-1545569341-4eb14c405d3c?w=800&q=80'
    ],
    ARRAY['#dulichnhatban', '#nhatban', '#japan', '#tokyo', '#osaka', '#kyoto', '#nuitfuji', '#tourchaua'],
    true
  ),
  (
    'NN-NB-002',
    'Tour Nhật Bản: Tokyo – Hakone – Kyoto 8N7Đ',
    'tour-nhat-ban-tokyo-hakone-kyoto-8n7d',
    'Tokyo – Hakone – Kyoto',
    'Nhật Bản',
    'nước ngoài',
    8,
    'Hành trình 8 ngày khám phá Nhật Bản từ Tokyo sầm uất qua Hakone ngắm Phú Sĩ đến Kyoto cổ kính. Thưởng thức ẩm thực Nhật, tắm onsen truyền thống và mua sắm tại Akihabara.',
    'Tháp Tokyo Skytree – Hakone ngắm Phú Sĩ – Onsen truyền thống – Kyoto cố đô – Nara hươu sao',
    'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80',
    ARRAY[
      'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800&q=80',
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
      'https://images.unsplash.com/photo-1545569341-4eb14c405d3c?w=800&q=80'
    ],
    ARRAY['#dulichnhatban', '#nhatban', '#japan', '#tokyo', '#hakone', '#kyoto', '#onsen', '#tourchaua'],
    true
  ),
  (
    'NN-NB-003',
    'Tour Nhật Bản: Hokkaido – Sapporo 5N4Đ',
    'tour-nhat-ban-hokkaido-sapporo-5n4d',
    'Hokkaido – Sapporo',
    'Nhật Bản',
    'nước ngoài',
    5,
    'Khám phá đảo Hokkaido – thiên đường mùa đông của Nhật Bản với tuyết trắng Sapporo, lễ hội tuyết nổi tiếng, hải sản tươi ngon và cảnh sắc thiên nhiên tuyệt đẹp.',
    'Lễ hội tuyết Sapporo – Vườn hoa Shikisai – Núi lửa Showa Shinzan – Hải sản Hokkaido tươi sống',
    'https://images.unsplash.com/photo-1545569341-4eb14c405d3c?w=800&q=80',
    ARRAY[
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
      'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80',
      'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800&q=80'
    ],
    ARRAY['#dulichnhatban', '#nhatban', '#hokkaido', '#sapporo', '#japan', '#mualetuyetnhat', '#tourchaua'],
    true
  )
ON CONFLICT (code) DO NOTHING;

-- ── HÀN QUỐC (bổ sung nếu thiếu) ────────────────────────────────────────────

INSERT INTO tours (code, name, slug, destination, country, category, duration_days, description, highlights, thumbnail_url, gallery_urls, hashtags, is_active)
VALUES
  (
    'NN-HQ-001',
    'Tour Hàn Quốc: Seoul – Busan – Jeju 6N5Đ',
    'tour-han-quoc-seoul-busan-jeju-6n5d',
    'Seoul – Busan – Jeju',
    'Hàn Quốc',
    'nước ngoài',
    6,
    'Trải nghiệm Hàn Quốc từ Seoul hiện đại, Busan biển xanh đến đảo Jeju thơ mộng. Khám phá văn hóa K-Drama, ẩm thực Korean BBQ và mua sắm tại Myeongdong.',
    'Cung điện Gyeongbokgung – Phố Myeongdong – Đảo Jeju – Cầu Gwangan Busan – Làng Bukchon Hanok',
    'https://images.unsplash.com/photo-1538485399081-7c8272e29df8?w=800&q=80',
    ARRAY[
      'https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&q=80',
      'https://images.unsplash.com/photo-1601042879364-b5b14b573d0a?w=800&q=80',
      'https://images.unsplash.com/photo-1546412367-e87c7bdc4b0d?w=800&q=80'
    ],
    ARRAY['#dulichhangquoc', '#hangquoc', '#korea', '#seoul', '#busan', '#jeju', '#kpop', '#tourchaua'],
    true
  ),
  (
    'NN-HQ-002',
    'Tour Hàn Quốc: Seoul – Nami 4N3Đ',
    'tour-han-quoc-seoul-nami-4n3d',
    'Seoul – Nami',
    'Hàn Quốc',
    'nước ngoài',
    4,
    'Hành trình ngắn ngày khám phá Seoul và đảo Nami nổi tiếng qua bộ phim Bản Tình Ca Mùa Đông. Thưởng thức Korean BBQ, mua sắm Dongdaemun và trải nghiệm spa truyền thống.',
    'Tháp Namsan N Seoul – Đảo Nami – Chợ Namdaemun – Khu ẩm thực Insadong',
    'https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&q=80',
    ARRAY[
      'https://images.unsplash.com/photo-1538485399081-7c8272e29df8?w=800&q=80',
      'https://images.unsplash.com/photo-1601042879364-b5b14b573d0a?w=800&q=80',
      'https://images.unsplash.com/photo-1546412367-e87c7bdc4b0d?w=800&q=80'
    ],
    ARRAY['#dulichhangquoc', '#hangquoc', '#korea', '#seoul', '#nami', '#kpop', '#tourchaua'],
    true
  )
ON CONFLICT (code) DO NOTHING;

-- ── THÁI LAN (bổ sung nếu thiếu) ────────────────────────────────────────────

INSERT INTO tours (code, name, slug, destination, country, category, duration_days, description, highlights, thumbnail_url, gallery_urls, hashtags, is_active)
VALUES
  (
    'NN-TL-001',
    'Tour Thái Lan: Bangkok – Pattaya 5N4Đ',
    'tour-thai-lan-bangkok-pattaya-5n4d',
    'Bangkok – Pattaya',
    'Thái Lan',
    'nước ngoài',
    5,
    'Khám phá Thái Lan từ Bangkok náo nhiệt đến Pattaya nghỉ dưỡng biển. Thăm các ngôi chùa vàng, chợ nổi Amphawa và trải nghiệm show Alcazar nổi tiếng.',
    'Chùa Vàng Wat Pho – Cung điện Hoàng gia – Chợ nổi Amphawa – Show Alcazar Pattaya – Đảo san hô',
    'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800&q=80',
    ARRAY[
      'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=80',
      'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80',
      'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800&q=80'
    ],
    ARRAY['#dulichthailan', '#thailan', '#thailand', '#bangkok', '#pattaya', '#tourchaua'],
    true
  ),
  (
    'NN-TL-002',
    'Tour Thái Lan: Chiang Mai – Chiang Rai 4N3Đ',
    'tour-thai-lan-chiangmai-chiangrai-4n3d',
    'Chiang Mai – Chiang Rai',
    'Thái Lan',
    'nước ngoài',
    4,
    'Khám phá miền Bắc Thái Lan với Chiang Mai cổ kính và Chiang Rai huyền bí. Thăm Chùa Trắng Wat Rong Khun, làng Long Neck Karen và trải nghiệm cưỡi voi.',
    'Chùa Trắng Wat Rong Khun – Làng Long Neck Karen – Đền Doi Suthep – Chợ đêm Chiang Mai',
    'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=80',
    ARRAY[
      'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800&q=80',
      'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80',
      'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=80'
    ],
    ARRAY['#dulichthailan', '#chiangmai', '#chiangrai', '#thailand', '#chuatrang', '#tourchaua'],
    true
  )
ON CONFLICT (code) DO NOTHING;

-- ── Verify ─────────────────────────────────────────────────────────────────────
SELECT country, count(*) FROM tours WHERE country IN ('Nhật Bản','Hàn Quốc','Thái Lan') GROUP BY country ORDER BY country;
-- Kết quả mong đợi:
-- Hàn Quốc | 2
-- Nhật Bản | 3
-- Thái Lan | 2
