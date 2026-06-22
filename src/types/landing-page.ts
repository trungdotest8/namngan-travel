export interface TourImage {
  url: string;
  alt: string;
  caption?: string;
  order: number;
}

export interface PromoFeature {
  icon: string; // Plane | Star | Shield | Clock | MapPin | Gift | Camera | Heart | Award | Zap
  title: string;
  description: string;
}

export interface TourLandingPage {
  id: string;
  tour_id: string | null;
  slug: string;
  headline: string;
  sub_headline: string | null;
  price_deal: number | null;
  departure_note: string | null;
  promo_features: PromoFeature[];
  created_at: string;
  updated_at: string;
}

export interface GeneratePayload {
  fb_text: string;
  tour_id: string;
  slug: string;
}
