import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import type { TourLandingPage, TourImage } from '@/types/landing-page';
import PromoGallery from './PromoGallery';
import PromoFeatures from './PromoFeatures';
import LeadCaptureForm from './LeadCaptureForm';

export const revalidate = 1800; // ISR 30 phút — HTML tĩnh tại Edge CDN

// ── generateMetadata ────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: { slug: string } },
): Promise<Metadata> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('tour_landing_pages')
    .select('headline, sub_headline')
    .eq('slug', params.slug)
    .single();

  if (!data) return { title: 'Nam Ngân Travel' };

  return {
    title:       `${data.headline} | Nam Ngân Travel`,
    description: data.sub_headline ?? undefined,
    robots:      { index: false }, // landing page ads — không index Google
  };
}

// ── Page ──────────────────────────────────────────────────────────
export default async function PromoPage({ params }: { params: { slug: string } }) {
  const supabase = createAdminClient();

  // Query landing page
  const { data: page } = await supabase
    .from('tour_landing_pages')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (!page) notFound();

  const lp = page as TourLandingPage;

  // Query tour images nếu có tour_id
  let sortedImages: TourImage[] = [];
  if (lp.tour_id) {
    const { data: tour } = await supabase
      .from('tours')
      .select('images')
      .eq('id', lp.tour_id)
      .single();

    if (tour?.images && Array.isArray(tour.images) && tour.images.length > 0) {
      sortedImages = (tour.images as TourImage[]).sort((a, b) => a.order - b.order);
    }
  }

  const hasPriceDeal    = lp.price_deal != null;
  const hasDeparture    = Boolean(lp.departure_note);
  const hasSubHeadline  = Boolean(lp.sub_headline);
  const hasFeatures     = lp.promo_features.length > 0;

  const fmtVND = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  return (
    <div className="min-h-screen bg-white">
      {/* ── BLOCK 1: Hero ────────────────────────────────────────── */}
      <section style={{ backgroundColor: '#005BAA' }} className="py-14 px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-5">
          <h1 className="text-white text-3xl sm:text-4xl font-extrabold leading-tight">
            {lp.headline}
          </h1>

          {hasSubHeadline && (
            <p className="text-blue-100 text-base sm:text-lg leading-relaxed">
              {lp.sub_headline}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {hasPriceDeal && (
              <span
                style={{ backgroundColor: '#FF6B00' }}
                className="text-white font-extrabold text-xl px-5 py-2 rounded-full shadow"
              >
                {fmtVND(lp.price_deal!)}
              </span>
            )}
            {hasDeparture && (
              <span className="border-2 text-white font-semibold text-sm px-4 py-2 rounded-full" style={{ borderColor: '#FF6B00' }}>
                {lp.departure_note}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── BLOCK 2: Gallery (ẩn nếu rỗng) ─────────────────────── */}
      <PromoGallery images={sortedImages} />

      {/* ── BLOCK 3: Features (ẩn nếu rỗng) ────────────────────── */}
      {hasFeatures && <PromoFeatures features={lp.promo_features} />}

      {/* ── BLOCK 4: Lead Form (Client Island) ──────────────────── */}
      <section style={{ backgroundColor: '#005BAA' }} className="py-4">
        <LeadCaptureForm tourId={lp.tour_id ?? undefined} slug={lp.slug} />
      </section>

      {/* Footer tối giản */}
      <footer className="py-6 text-center text-xs text-gray-400 border-t border-gray-100">
        © {new Date().getFullYear()} Nam Ngân Travel — namngantravel.com
        <span className="mx-2">|</span>
        Hotline: <a href="tel:0932611933" className="text-[#005BAA] font-semibold">0932 611 933</a>
      </footer>
    </div>
  );
}
