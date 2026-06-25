import type { ModaBookingPayload } from '@/types'

// Placeholder — điền vào khi tích hợp Moda chính thức
export async function syncModaBooking(
  payload: ModaBookingPayload
): Promise<{ success: boolean }> {
  const apiKey = process.env.MODA_API_KEY
  if (!apiKey) {
    console.warn('[Moda] MODA_API_KEY chưa được cấu hình')
    return { success: false }
  }

  // TODO: implement Moda API call
  console.warn('[Moda] syncBooking:', payload.booking_id)
  return { success: true }
}
