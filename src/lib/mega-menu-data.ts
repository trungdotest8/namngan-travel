export interface DestinationLink {
  label:   string
  country: string
}

export type MegaMenuColumn = DestinationLink[]

export const INTL_COLUMNS: MegaMenuColumn[] = [
  [
    { label: 'Du lịch Lào',         country: 'LÀO' },
    { label: 'Du lịch Malaysia',    country: 'MALAYSIA' },
    { label: 'Du lịch Campuchia',   country: 'CAMPUCHIA' },
    { label: 'Du lịch Singapore',   country: 'SINGAPORE' },
    { label: 'Du lịch Indonesia',   country: 'INDONESIA' },
    { label: 'Du lịch Thái Lan',    country: 'THÁI LAN' },
    { label: 'Du Lịch Đài Loan',    country: 'ĐÀI LOAN' },
    { label: 'Du lịch Trung Quốc',  country: 'TRUNG QUỐC' },
    { label: 'Du lịch Philippines', country: 'PHILIPPINES' },
  ],
  [
    { label: 'Du Lịch Hồng Kông',  country: 'HỒNG KÔNG' },
    { label: 'Du lịch Hàn Quốc',   country: 'HÀN QUỐC' },
    { label: 'Du lịch Nhật Bản',   country: 'NHẬT BẢN' },
    { label: 'Du Lịch Úc',         country: 'AUSTRALIA' },
    { label: 'Du Lịch Anh Quốc',   country: 'CHÂU ÂU' },
    { label: 'Du Lịch Canada',      country: 'CANADA' },
    { label: 'Du Lịch Ấn Độ',      country: 'ẤN ĐỘ' },
    { label: 'Du lịch UAE',         country: 'UAE' },
  ],
  [
    { label: 'Du Lịch Thổ Nhĩ Kỳ', country: 'THỔ NHĨ KỲ' },
    { label: 'Du Lịch Châu Âu',    country: 'CHÂU ÂU' },
    { label: 'Du Lịch Mỹ',         country: 'MỸ' },
    { label: 'Du Lịch Dubai',       country: 'UAE' },
    { label: 'Du lịch Nhật Bản',   country: 'NHẬT BẢN' },
    { label: 'Du lịch Hàn Quốc',   country: 'HÀN QUỐC' },
    { label: 'Du lịch Thái Lan',   country: 'THÁI LAN' },
    { label: 'Du lịch Singapore',  country: 'SINGAPORE' },
  ],
]

export const DOMESTIC_COLUMNS: MegaMenuColumn[] = [
  [
    { label: 'Du lịch Hà Nội',    country: 'VIỆT NAM' },
    { label: 'Du lịch Hạ Long',   country: 'VIỆT NAM' },
    { label: 'Du lịch Sapa',      country: 'VIỆT NAM' },
    { label: 'Du lịch Hà Giang',  country: 'VIỆT NAM' },
    { label: 'Du lịch Ninh Bình', country: 'VIỆT NAM' },
  ],
  [
    { label: 'Du lịch Đà Nẵng',   country: 'VIỆT NAM' },
    { label: 'Du lịch Hội An',    country: 'VIỆT NAM' },
    { label: 'Du lịch Nha Trang', country: 'VIỆT NAM' },
    { label: 'Du lịch Đà Lạt',    country: 'VIỆT NAM' },
    { label: 'Du lịch Huế',       country: 'VIỆT NAM' },
  ],
  [
    { label: 'Du lịch Phú Quốc',  country: 'VIỆT NAM' },
    { label: 'Du lịch Mũi Né',    country: 'VIỆT NAM' },
    { label: 'Du lịch Cần Thơ',   country: 'VIỆT NAM' },
    { label: 'Du lịch Côn Đảo',   country: 'VIỆT NAM' },
    { label: 'Du lịch Miền Tây',  country: 'VIỆT NAM' },
  ],
]
