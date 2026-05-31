export type { Tour, TourSchedule, TourScheduleStatus, TourItineraryDay, TourSearchResult } from './tour.types'
export type { Departure } from './departure.types'   // alias → TourSchedule
export type { User, UserRole, UserGender, Wallet, WalletTransaction, WalletTransactionType } from './user.types'
export type { Booking, BookingStatus, PaymentStatus, PaymentMethod, BookingFormData } from './booking.types'
export type { Lead, LeadSource, LeadStatus, LeadFormData } from './lead.types'
export type { Article, ArticleSourceType, ArticleStatus, NewsArticle, FeedItem } from './news.types'
export type { N8nPayload, ModaBookingPayload, WebhookHandler } from './integration.types'
export type {
  RealtimeNotification,
  NotificationEvent,
  EmailTemplateId,
  EmailPayload,
  NotificationTriggerPayload,
} from './notification.types'
export type {
  CustomerProfile,
  FileUploadResult,
  UploadStatus,
} from './customer-profile.types'
