export const COUNTRY_MAP: Record<string, string[]> = {
  'Trung Quốc': [
    'BẮC KINH', 'THƯỢNG HẢI', 'HẢI NAM', 'QUẾ LÂM', 'TRÙNG KHÁNH',
    'ĐẠI LÝ', 'ĐẠI LÍ', 'LỆ GIANG', 'THÂM QUYẾN', 'VŨ HÁN', 'TÂN CƯƠNG',
    'QUẢNG CHÂU', 'NAM KINH', 'TRƯƠNG GIA GIỚI', 'TÔ CHÂU', 'THANH ĐẢO',
    'TRUNG QUOC', 'TRUNG QUỐC', 'CUNG ĐƯỜNG VÀNG',
  ],
  'Thái Lan':    ['BANGKOK', 'PATTAYA', 'CHIANG', 'PHUKET', 'THAI LAN', 'THÁI LAN'],
  'Singapore':   ['SINGAPORE'],
  'Hàn Quốc':   ['SEOUL', 'BUSAN', 'JEJU', 'HAN QUOC', 'HÀN QUỐC'],
  'Nhật Bản':   ['TOKYO', 'OSAKA', 'KYOTO', 'HOKKAIDO', 'NHAT BAN', 'NHẬT BẢN'],
  'Hồng Kông':  ['HỒNG KÔNG', 'HONG KONG'],
  'Đài Loan':   ['ĐÀI LOAN', 'TAIPEI', 'DAI LOAN'],
  'Mỹ':         ['LOS ANGELES', 'NEW YORK', 'LAS VEGAS', 'BỜ TÂY MỸ', 'BỜ ĐÔNG', 'MY ', ' MỸ', 'MỸ'],
  'Canada':      ['CANADA'],
  'Châu Âu':    ['PARIS', 'ROME', 'AMSTERDAM', 'CHAU AU', 'CHÂU ÂU'],
  'Ấn Độ':      ['ẤN ĐỘ', 'AN DO'],
  'Indonesia':   ['BALI', 'INDONESIA'],
  'Campuchia':   ['ANGKOR', 'SIEM REAP', 'CAMPUCHIA', 'CAMBODIA'],
  'Lào':         ['VIENTIANE', 'VIÊNG CHĂN', 'LUANG PRABANG', 'LÀO', 'LAO '],
  'Philippines': ['MANILA', 'CEBU', 'PHILIPPINES'],
  'UAE':         ['DUBAI', 'UAE'],
  'Australia':   ['SYDNEY', 'MELBOURNE', 'AUSTRALIA'],
  'Thổ Nhĩ Kỳ': ['ISTANBUL', 'THỔ NHĨ KỲ'],
  'Malaysia':    ['KUALA LUMPUR', 'PENANG', 'MALAYSIA'],
  'Việt Nam': [
    'VIỆT NAM', 'VIET NAM',
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
