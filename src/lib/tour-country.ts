export const COUNTRY_MAP: Record<string, string[]> = {
  'TRUNG QUỐC': [
    'BẮC KINH', 'THƯỢNG HẢI', 'HẢI NAM', 'QUẾ LÂM', 'TRÙNG KHÁNH',
    'ĐẠI LÝ', 'ĐẠI LÍ', 'LỆ GIANG', 'THÂM QUYẾN', 'VŨ HÁN', 'TÂN CƯƠNG',
    'QUẢNG CHÂU', 'NAM KINH', 'TRƯƠNG GIA GIỚI', 'TÔ CHÂU', 'THANH ĐẢO',
    'TRUNG QUOC', 'TRUNG QUỐC', 'CUNG ĐƯỜNG VÀNG',
  ],
  'THÁI LAN': ['BANGKOK', 'PATTAYA', 'CHIANG', 'PHUKET', 'THAI LAN', 'THÁI LAN'],
  'SINGAPORE': ['SINGAPORE'],
  'HÀN QUỐC': ['SEOUL', 'BUSAN', 'JEJU', 'HAN QUOC', 'HÀN QUỐC'],
  'NHẬT BẢN': ['TOKYO', 'OSAKA', 'KYOTO', 'HOKKAIDO', 'NHAT BAN', 'NHẬT BẢN'],
  'HỒNG KÔNG': ['HỒNG KÔNG', 'HONG KONG'],
  'ĐÀI LOAN': ['ĐÀI LOAN', 'TAIPEI', 'DAI LOAN'],
  'MỸ': ['LOS ANGELES', 'NEW YORK', 'LAS VEGAS', 'BỜ TÂY MỸ', 'BỜ ĐÔNG', 'MY ', ' MỸ', 'MỸ'],
  'CANADA': ['CANADA'],
  'CHÂU ÂU': ['PARIS', 'ROME', 'AMSTERDAM', 'CHAU AU', 'CHÂU ÂU'],
  'ẤN ĐỘ': ['ẤN ĐỘ', 'AN DO'],
  'INDONESIA': ['BALI', 'INDONESIA'],
  'CAMPUCHIA': ['ANGKOR', 'SIEM REAP', 'CAMPUCHIA', 'CAMBODIA'],
  'LÀO': ['VIENTIANE', 'VIÊNG CHĂN', 'LUANG PRABANG', 'LÀO', 'LAO '],
  'PHILIPPINES': ['MANILA', 'CEBU', 'PHILIPPINES'],
  'UAE': ['DUBAI', 'UAE'],
  'AUSTRALIA': ['SYDNEY', 'MELBOURNE', 'AUSTRALIA'],
  'THỔ NHĨ KỲ': ['ISTANBUL', 'THỔ NHĨ KỲ'],
  'MALAYSIA': ['KUALA LUMPUR', 'PENANG', 'MALAYSIA'],
  'VIỆT NAM': [
    'ĐÀ NẴNG', 'DA NANG', 'HỘI AN', 'HOI AN', 'NHA TRANG',
    'PHÚ QUỐC', 'PHU QUOC', 'HÀ NỘI', 'HA NOI', 'HỒ CHÍ MINH',
    'ĐÀ LẠT', 'DA LAT', 'SA PA', 'SAPA', 'HẠ LONG', 'HA LONG',
    'MÙ CANG', 'MU CANG', 'HÀ GIANG', 'HA GIANG', 'HUẾ', 'HUE ',
    'MIỀN TÂY', 'CẦN THƠ', 'TIỀN GIANG', 'BẾN TRE',
  ],
}

export function deriveCountry(destination: string | null): string {
  if (!destination) return 'Khác'
  const upper = destination.toUpperCase()
  for (const [country, keywords] of Object.entries(COUNTRY_MAP)) {
    if (keywords.some(kw => upper.includes(kw))) return country
  }
  return 'Khác'
}
