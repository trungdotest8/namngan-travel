export interface DestinationLink {
  label:   string
  country: string
}

export type MegaMenuColumn = DestinationLink[]

export const INTL_COLUMNS: MegaMenuColumn[] = [
  [
    { label: 'Du lịch Lào',         country: 'Lào' },
    { label: 'Du lịch Malaysia',    country: 'Malaysia' },
    { label: 'Du lịch Campuchia',   country: 'Campuchia' },
    { label: 'Du lịch Singapore',   country: 'Singapore' },
    { label: 'Du lịch Indonesia',   country: 'Indonesia' },
    { label: 'Du lịch Thái Lan',    country: 'Thái Lan' },
    { label: 'Du Lịch Đài Loan',    country: 'Đài Loan' },
    { label: 'Du lịch Trung Quốc',  country: 'Trung Quốc' },
    { label: 'Du lịch Philippines', country: 'Philippines' },
  ],
  [
    { label: 'Du Lịch Hồng Kông',  country: 'Hồng Kông' },
    { label: 'Du lịch Hàn Quốc',   country: 'Hàn Quốc' },
    { label: 'Du lịch Nhật Bản',   country: 'Nhật Bản' },
    { label: 'Du Lịch Úc',         country: 'Australia' },
    { label: 'Du Lịch Anh Quốc',   country: 'Châu Âu' },
    { label: 'Du Lịch Canada',      country: 'Canada' },
    { label: 'Du Lịch Ấn Độ',      country: 'Ấn Độ' },
    { label: 'Du lịch UAE',         country: 'UAE' },
  ],
  [
    { label: 'Du Lịch Thổ Nhĩ Kỳ', country: 'Thổ Nhĩ Kỳ' },
    { label: 'Du Lịch Châu Âu',    country: 'Châu Âu' },
    { label: 'Du Lịch Mỹ',         country: 'Mỹ' },
    { label: 'Du Lịch Dubai',       country: 'UAE' },
    { label: 'Du lịch Nhật Bản',   country: 'Nhật Bản' },
    { label: 'Du lịch Hàn Quốc',   country: 'Hàn Quốc' },
    { label: 'Du lịch Thái Lan',   country: 'Thái Lan' },
    { label: 'Du lịch Singapore',  country: 'Singapore' },
  ],
]

export const DOMESTIC_COLUMNS: MegaMenuColumn[] = [
  [
    { label: 'Du lịch Hà Nội',    country: 'Việt Nam' },
    { label: 'Du lịch Hạ Long',   country: 'Việt Nam' },
    { label: 'Du lịch Sapa',      country: 'Việt Nam' },
    { label: 'Du lịch Hà Giang',  country: 'Việt Nam' },
    { label: 'Du lịch Ninh Bình', country: 'Việt Nam' },
  ],
  [
    { label: 'Du lịch Đà Nẵng',   country: 'Việt Nam' },
    { label: 'Du lịch Hội An',    country: 'Việt Nam' },
    { label: 'Du lịch Nha Trang', country: 'Việt Nam' },
    { label: 'Du lịch Đà Lạt',    country: 'Việt Nam' },
    { label: 'Du lịch Huế',       country: 'Việt Nam' },
  ],
  [
    { label: 'Du lịch Phú Quốc',  country: 'Việt Nam' },
    { label: 'Du lịch Mũi Né',    country: 'Việt Nam' },
    { label: 'Du lịch Cần Thơ',   country: 'Việt Nam' },
    { label: 'Du lịch Côn Đảo',   country: 'Việt Nam' },
    { label: 'Du lịch Miền Tây',  country: 'Việt Nam' },
  ],
]
