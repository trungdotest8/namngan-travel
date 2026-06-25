import { type NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!isAdminRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('tour_landing_pages')
      .select('id, slug, headline, price_deal, departure_note, tour_id, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ pages: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[LandingPagesListAPI_Crash]', err);
    return NextResponse.json({ error: 'Internal Server Error', details: msg }, { status: 500 });
  }
}
