// src/app/api/departures/sync/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// PHASE 4 — Google Sheets Selective UPSERT Sync (via n8n)
// Dữ liệu vào đã được chuẩn hóa tại n8n node "Normalize Rows":
//   - Ngày: ISO YYYY-MM-DD | Giá/slot: number thuần (đã bỏ . , ngăn cách)
// An toàn song song với 476 lịch SeaStar: UPSERT theo (tour_id, departure_date),
// KHÔNG delete bảng. Yêu cầu migration #21 (unique index + cột source).
// ─────────────────────────────────────────────────────────────────────────────

import { type NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache';
import { timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── 1. CONSTANTS ─────────────────────────────────────────────────────────────

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ROWS = 2000;
const UPSERT_CHUNK_SIZE = 500;

// ── 2. ZOD SCHEMA (khớp dữ liệu đã chuẩn hóa từ Google Sheets / n8n) ────────

const ScheduleRowSchema = z
  .object({
    code: z.string().min(1, 'Mã tour không được rỗng'),
    departure_date: z
      .string()
      .regex(DATE_REGEX, 'departure_date phải là YYYY-MM-DD'),
    return_date: z
      .string()
      .regex(DATE_REGEX, 'return_date phải là YYYY-MM-DD'),
    price_adult: z.number().int().nonnegative(),
    price_child: z.number().int().nonnegative(),
    // nonnegative (KHÔNG dùng positive): tour cancelled có thể có slots_total = 0
    slots_total: z.number().int().nonnegative(),
    slots_booked: z.number().int().nonnegative(),
    status: z.enum(['open', 'full', 'cancelled', 'completed']),
    flight_code_departure: z.string().optional(),
    flight_code_return: z.string().optional(),
  })
  .refine((r) => r.slots_booked <= r.slots_total, {
    message: 'slots_booked không được vượt quá slots_total',
    path: ['slots_booked'],
  })
  .refine((r) => r.return_date >= r.departure_date, {
    message: 'return_date phải >= departure_date',
    path: ['return_date'],
  });

// Chấp nhận cả mảng raw lẫn { tour_schedules: [...] } — n8n có thể đổi shape
const SyncPayloadSchema = z.union([
  z.array(ScheduleRowSchema).min(1).max(MAX_ROWS),
  z.object({
    tour_schedules: z.array(ScheduleRowSchema).min(1).max(MAX_ROWS),
  }),
]);

type ScheduleRow = z.infer<typeof ScheduleRowSchema>;

// DB columns: seats_total / seats_booked / seats_available (initial schema)
interface ScheduleUpsertRow {
  tour_id: string;
  departure_date: string;
  return_date: string;
  price_adult: number;
  price_child: number;
  seats_total: number;
  seats_booked: number;
  seats_available: number;
  flight_code_departure: string | null;
  flight_code_return: string | null;
  status: ScheduleRow['status'];
  source: 'google_sheets';
  updated_at: string;
}

interface SyncSuccessResponse {
  success: true;
  synced_count: number;
  skipped_count: number;
  skipped_codes: string[];
}

// ── 3. HELPERS ────────────────────────────────────────────────────────────────

function verifyWebhookSecret(req: NextRequest): boolean {
  const provided = req.headers.get('x-webhook-secret');
  const expected = process.env.WEBHOOK_SECRET;
  if (!provided || !expected) return false;

  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

// ── 4. ROUTE HANDLER ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!verifyWebhookSecret(req)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Body không phải JSON hợp lệ' },
        { status: 400 }
      );
    }

    const parsed = SyncPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 422 }
      );
    }

    const rows: ScheduleRow[] = Array.isArray(parsed.data)
      ? parsed.data
      : parsed.data.tour_schedules;

    // Resolve code → tour_id (1 query batch duy nhất, không query trong loop)
    const supabaseAdmin = createAdminClient();
    const uniqueCodes = Array.from(new Set(rows.map((r) => r.code)));

    const { data: tours, error: tourError } = await supabaseAdmin
      .from('tours')
      .select('id, code')
      .in('code', uniqueCodes);

    if (tourError) {
      console.error('[departures/sync] Lỗi query tours:', tourError.message);
      return NextResponse.json(
        { success: false, error: 'Không thể truy vấn bảng tours' },
        { status: 500 }
      );
    }

    const codeToTourId = new Map<string, string>(
      (tours ?? []).map((t: { id: string; code: string }) => [t.code, t.id])
    );

    const skippedCodes: string[] = [];
    const nowIso = new Date().toISOString();
    const upsertRows: ScheduleUpsertRow[] = [];

    for (const r of rows) {
      const tourId = codeToTourId.get(r.code);
      if (!tourId) {
        if (!skippedCodes.includes(r.code)) skippedCodes.push(r.code);
        continue;
      }
      // Map payload slots_* → DB seats_*
      upsertRows.push({
        tour_id: tourId,
        departure_date: r.departure_date,
        return_date: r.return_date,
        price_adult: r.price_adult,
        price_child: r.price_child,
        seats_total: r.slots_total,
        seats_booked: r.slots_booked,
        seats_available: r.slots_total - r.slots_booked,
        flight_code_departure: r.flight_code_departure?.trim() || null,
        flight_code_return: r.flight_code_return?.trim() || null,
        status: r.status,
        source: 'google_sheets',
        updated_at: nowIso,
      });
    }

    if (upsertRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Toàn bộ mã tour không tồn tại trong bảng tours',
          skipped_count: skippedCodes.length,
          skipped_codes: skippedCodes,
        },
        { status: 422 }
      );
    }

    // Selective UPSERT theo (tour_id, departure_date), chunk 500
    // Yêu cầu unique index từ migration #21
    let syncedCount = 0;
    for (const batch of chunk(upsertRows, UPSERT_CHUNK_SIZE)) {
      const { error: upsertError, count } = await supabaseAdmin
        .from('tour_schedules')
        .upsert(batch, {
          onConflict: 'tour_id,departure_date',
          ignoreDuplicates: false,
          count: 'exact',
        });

      if (upsertError) {
        console.error('[departures/sync] Lỗi upsert:', upsertError.message);
        return NextResponse.json(
          {
            success: false,
            error: 'Upsert thất bại',
            detail: upsertError.message,
            synced_before_failure: syncedCount,
          },
          { status: 500 }
        );
      }
      syncedCount += count ?? batch.length;
    }

    revalidatePath('/lich-khoi-hanh');

    const response: SyncSuccessResponse = {
      success: true,
      synced_count: syncedCount,
      skipped_count: skippedCodes.length,
      skipped_codes: skippedCodes,
    };
    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[departures/sync] Unhandled error:', message);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
