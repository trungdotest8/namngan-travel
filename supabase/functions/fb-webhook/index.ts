/**
 * ============================================================
 * NAM NGÂN TRAVEL — fb-webhook Edge Function
 * Nhận và xử lý Lead từ: Facebook Lead Ads + Zalo OA + Web Form
 *
 * Deploy: supabase functions deploy fb-webhook
 * URL:    https://<project>.supabase.co/functions/v1/fb-webhook
 *
 * Env vars (supabase secrets set ...):
 *   FB_VERIFY_TOKEN   — token xác thực webhook FB
 *   FB_APP_SECRET     — App Secret để verify chữ ký SHA256
 *   ZALO_OA_SECRET    — Secret key Zalo OA
 *   SUPABASE_URL      — tự inject bởi runtime
 *   SUPABASE_SERVICE_ROLE_KEY — tự inject bởi runtime
 *
 * Schema target: leads table (Nam Ngân Travel v1.0 + CRM extensions v1.0)
 * Ghi cả full_name (Next.js) và name (CRM), cả lead_source và source.
 * ============================================================
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ── Supabase client (service role — bypass RLS) ── */
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const FB_VERIFY_TOKEN = Deno.env.get("FB_VERIFY_TOKEN") ?? "nnt_fb_verify";
const FB_APP_SECRET   = Deno.env.get("FB_APP_SECRET") ?? "";
const ZALO_OA_SECRET  = Deno.env.get("ZALO_OA_SECRET") ?? "";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Hub-Signature-256, X-ZaloOA-Signature",
};

/* Source mapping: CRM granular → Next.js lead_source enum */
const CRM_TO_LEAD_SOURCE: Record<string, string> = {
  fb:   "fb_ads",
  zalo: "other",
  web:  "web_ads",
};

/* ────────────────────────────────────────
   MAIN HANDLER
──────────────────────────────────────── */
serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  /* ── Facebook Verification Handshake (GET) ── */
  if (req.method === "GET") {
    const mode      = url.searchParams.get("hub.mode");
    const token     = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === FB_VERIFY_TOKEN) {
      console.log("[FB Webhook] Verification OK");
      return new Response(challenge, { status: 200, headers: CORS });
    }
    return new Response("Forbidden", { status: 403, headers: CORS });
  }

  /* ── POST: Nhận Payload ── */
  if (req.method === "POST") {
    const rawBody = await req.text();
    const crmSource = detectSource(req, url);

    if (crmSource === "fb") {
      const valid = await verifyFacebookSignature(req, rawBody);
      if (!valid) return new Response("Invalid signature", { status: 401, headers: CORS });
    } else if (crmSource === "zalo") {
      const valid = verifyZaloSignature(req, rawBody);
      if (!valid) return new Response("Invalid Zalo signature", { status: 401, headers: CORS });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response("Bad JSON", { status: 400, headers: CORS });
    }

    const leads =
      crmSource === "fb"   ? parseFacebookPayload(payload, crmSource) :
      crmSource === "zalo" ? parseZaloPayload(payload, crmSource)     :
      parseWebFormPayload(payload, crmSource);

    if (leads.length === 0) {
      return new Response(JSON.stringify({ ok: true, inserted: 0 }), {
        status: 200,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    /* Upsert vào Supabase — phone là unique key */
    const { data, error } = await supabase
      .from("leads")
      .upsert(leads, { onConflict: "phone", ignoreDuplicates: false })
      .select("id, full_name, phone");

    if (error) {
      console.error("[Supabase upsert error]", error);
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    /* Ghi webhook_log */
    await supabase.from("webhook_logs").insert({
      source:          crmSource,
      raw_payload:     rawBody.substring(0, 4000),
      leads_inserted:  data?.length ?? 0,
      created_at:      new Date().toISOString(),
    });

    console.log(`[${crmSource.toUpperCase()}] Inserted/updated ${data?.length} leads`);
    return new Response(
      JSON.stringify({ ok: true, inserted: data?.length, leads: data }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }

  return new Response("Method Not Allowed", { status: 405, headers: CORS });
});

/* ────────────────────────────────────────
   DETECT SOURCE
──────────────────────────────────────── */
function detectSource(req: Request, url: URL): "fb" | "zalo" | "web" {
  const src = url.searchParams.get("src");
  if (src === "zalo") return "zalo";
  if (src === "web")  return "web";
  return req.headers.get("X-Hub-Signature-256") ? "fb" : "web";
}

/* ────────────────────────────────────────
   FACEBOOK SIGNATURE VERIFY
   Web Crypto API (không cần 3rd-party dep)
──────────────────────────────────────── */
async function verifyFacebookSignature(req: Request, body: string): Promise<boolean> {
  if (!FB_APP_SECRET) return true;
  const header = req.headers.get("X-Hub-Signature-256") ?? "";
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(FB_APP_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `sha256=${hex}` === header;
}

/* ────────────────────────────────────────
   ZALO SIGNATURE VERIFY
──────────────────────────────────────── */
function verifyZaloSignature(req: Request, _body: string): boolean {
  if (!ZALO_OA_SECRET) return true;
  const header = req.headers.get("X-ZaloOA-Signature") ?? "";
  return header.length > 0; // TODO: implement HMAC-SHA256 khi có secret
}

/* ────────────────────────────────────────
   PARSER: Facebook Lead Ads
──────────────────────────────────────── */
function parseFacebookPayload(payload: unknown, crmSource: string): LeadRow[] {
  const p = payload as FbPayload;
  if (p?.object !== "page") return [];

  const leads: LeadRow[] = [];
  for (const entry of p.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;
      const v = change.value;

      const fields: Record<string, string> = {};
      for (const f of v.field_data ?? []) {
        fields[f.name] = f.values?.[0] ?? "";
      }

      const displayName = fields["full_name"] || fields["name"] || "Không rõ";
      leads.push({
        full_name:   displayName,
        name:        displayName,
        phone:       normalizePhone(fields["phone_number"] || fields["phone"] || ""),
        email:       fields["email"] ?? "",
        lead_source: CRM_TO_LEAD_SOURCE[crmSource] ?? "other",
        source:      crmSource,
        status:      "new",
        score:       computeScore({ phone: fields["phone_number"] || fields["phone"], email: fields["email"] }),
        campaign:    v.ad_name ?? v.campaign_name ?? "",
        fb_lead_id:  String(v.leadgen_id ?? ""),
        fb_page_id:  String(entry.id ?? ""),
        fb_form_id:  String(v.form_id ?? ""),
        utm:         null,
        created_at:  new Date().toISOString(),
      });
    }
  }
  return leads;
}

/* ────────────────────────────────────────
   PARSER: Zalo OA Lead
──────────────────────────────────────── */
function parseZaloPayload(payload: unknown, crmSource: string): LeadRow[] {
  const p = payload as ZaloPayload;
  if (!p?.event_name) return [];

  const displayName = p.sender?.display_name ?? "Zalo User";
  return [{
    full_name:   displayName,
    name:        displayName,
    phone:       normalizePhone(p.sender?.phone ?? ""),
    email:       "",
    lead_source: CRM_TO_LEAD_SOURCE[crmSource] ?? "other",
    source:      crmSource,
    status:      "new",
    score:       50,
    campaign:    p.event_name ?? "zalo_oa",
    fb_lead_id:  "",
    fb_page_id:  "",
    fb_form_id:  "",
    utm:         null,
    created_at:  new Date().toISOString(),
  }];
}

/* ────────────────────────────────────────
   PARSER: Web Form (từ ChatWidget)
   Body: { name, phone, dest, source, ts, page, utm_* }
──────────────────────────────────────── */
function parseWebFormPayload(payload: unknown, crmSource: string): LeadRow[] {
  const p = payload as WebFormPayload;
  if (!p?.phone) return [];

  const utmParts = (["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const)
    .filter(k => p[k])
    .map(k => `${k}=${p[k]}`)
    .join("&");

  const displayName = p.name ?? "Không rõ";
  return [{
    full_name:    displayName,
    name:         displayName,
    phone:        normalizePhone(p.phone),
    email:        p.email ?? "",
    message:      p.dest ? `Quan tâm tour: ${p.dest}` : undefined,
    lead_source:  CRM_TO_LEAD_SOURCE[crmSource] ?? "web_ads",
    source:       crmSource,
    source_page:  p.page ?? "",
    utm_source:   p.utm_source ?? "",
    utm_medium:   p.utm_medium ?? "",
    utm_campaign: p.utm_campaign ?? "",
    utm:          utmParts || null,
    status:       "new",
    score:        computeScore({ phone: p.phone, email: p.email, dest: p.dest }),
    tour:         p.dest ?? "",
    campaign:     p.utm_campaign ?? "web_form",
    fb_lead_id:   "",
    fb_page_id:   "",
    fb_form_id:   "",
    created_at:   p.ts ?? new Date().toISOString(),
  }];
}

/* ────────────────────────────────────────
   HELPERS
──────────────────────────────────────── */

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("84") && digits.length === 11) return "0" + digits.slice(2);
  if (digits.startsWith("0") && digits.length === 10)  return digits;
  return digits || raw;
}

function computeScore(fields: Record<string, string | undefined>): number {
  let score = 40;
  if (fields.phone?.match(/^0[35789]\d{8}$/)) score += 25;
  if (fields.email?.includes("@"))            score += 15;
  if (fields.dest && fields.dest.length > 2)  score += 20;
  return Math.min(score, 100);
}

/* ── Types ── */
interface LeadRow {
  full_name:    string;
  name:         string;
  phone:        string;
  email:        string;
  message?:     string;
  lead_source:  string;
  source:       string;
  source_page?: string;
  utm_source?:  string;
  utm_medium?:  string;
  utm_campaign?: string;
  utm:          string | null;
  status:       string;
  score:        number;
  campaign?:    string;
  tour?:        string;
  fb_lead_id:   string;
  fb_page_id:   string;
  fb_form_id:   string;
  created_at:   string;
}
interface FbPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      field: string;
      value: {
        leadgen_id: number; form_id: number; page_id: number;
        ad_name: string; campaign_name: string;
        field_data: Array<{ name: string; values: string[] }>;
      };
    }>;
  }>;
}
interface ZaloPayload {
  event_name: string;
  sender: { display_name: string; phone: string; user_id: string };
}
interface WebFormPayload {
  name: string; phone: string; email?: string; dest?: string;
  source?: string; ts?: string; page?: string;
  utm_source?: string; utm_medium?: string; utm_campaign?: string;
  utm_content?: string; utm_term?: string;
  [key: string]: string | undefined;
}
