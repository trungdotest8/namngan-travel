/**
 * ============================================================
 * NAM NGÂN TRAVEL — google-drive Edge Function
 * Hai endpoint:
 *   POST /functions/v1/google-drive/create-folder
 *   POST /functions/v1/google-drive/upload-file
 *
 * Deploy: supabase functions deploy google-drive
 *
 * Env vars:
 *   GOOGLE_SERVICE_ACCOUNT_JSON  — JSON string của Service Account key
 *   DRIVE_PARENT_FOLDER_ID       — ID thư mục gốc "Nam Ngân CRM" trên Drive
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — tự inject
 *
 * leads.id là UUID (không phải BIGINT) — dùng .eq("id", customer_id) với UUID string
 * ============================================================
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const PARENT_FOLDER_ID = Deno.env.get("DRIVE_PARENT_FOLDER_ID") ?? "";
const SA_JSON_RAW      = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON") ?? "{}";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/* ────────────────────────────────────────
   MAIN HANDLER
──────────────────────────────────────── */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  const url    = new URL(req.url);
  const action = url.pathname.split("/").pop(); // "create-folder" | "upload-file"

  /* Xác thực Bearer token — bỏ qua khi chưa production */
  const authHeader = req.headers.get("Authorization") ?? "";
  const { error: authErr } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authErr && Deno.env.get("SUPABASE_ENV") === "production") {
    return json({ error: "Unauthorized" }, 401);
  }

  const body = await req.json().catch(() => ({})) as Record<string, string>;

  if (action === "create-folder") return await handleCreateFolder(body);
  if (action === "upload-file")   return await handleUploadFile(body);

  return json({ error: "Unknown action. Use /create-folder or /upload-file" }, 404);
});

/* ────────────────────────────────────────
   ACTION 1: Tạo thư mục KH mới
   Input:  { customer_id: UUID, customer_name }
   Output: { folder_id, folder_url, folder_name }
──────────────────────────────────────── */
async function handleCreateFolder(body: Record<string, string>) {
  const { customer_id, customer_name } = body;
  if (!customer_id || !customer_name) {
    return json({ error: "customer_id và customer_name là bắt buộc" }, 400);
  }

  const folderName = `[NNT] ${customer_name} — ID${customer_id.slice(0, 8)}`;
  const token      = await getAccessToken();

  const res = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name:     folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents:  PARENT_FOLDER_ID ? [PARENT_FOLDER_ID] : [],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[Drive create-folder error]", err);
    return json({ error: "Drive API error", detail: err }, 502);
  }

  const folder = await res.json() as DriveFile;
  await setPublicReadPermission(folder.id, token);

  const folder_url = `https://drive.google.com/drive/folders/${folder.id}`;

  /* Cập nhật google_drive_url trong bảng leads (id là UUID) */
  const { error: dbErr } = await supabase
    .from("leads")
    .update({ google_drive_url: folder_url })
    .eq("id", customer_id);

  if (dbErr) {
    console.warn("[Supabase update google_drive_url error]", dbErr.message);
  }

  return json({ folder_id: folder.id, folder_url, folder_name: folderName });
}

/* ────────────────────────────────────────
   ACTION 2: Upload ảnh hồ sơ lên Drive
   Input:  { folder_id, file_name, file_base64, mime_type, label, lead_id? }
   Output: { file_id, file_url, thumbnail_url }
   Nếu có lead_id (UUID) → insert vào lead_attachments
──────────────────────────────────────── */
async function handleUploadFile(body: Record<string, string>) {
  const { folder_id, file_name, file_base64, mime_type, label, lead_id } = body;
  if (!folder_id || !file_base64 || !file_name) {
    return json({ error: "folder_id, file_name, file_base64 là bắt buộc" }, 400);
  }

  const token     = await getAccessToken();
  const fileBytes = base64ToUint8Array(file_base64);
  const boundary  = "----NNTDriveBoundary";
  const metadata  = JSON.stringify({
    name:        file_name,
    parents:     [folder_id],
    description: label ?? "",
  });

  const multipart = buildMultipart(boundary, metadata, mime_type ?? "image/jpeg", fileBytes);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,thumbnailLink",
    {
      method:  "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary="${boundary}"`,
      },
      body: multipart,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("[Drive upload error]", err);
    return json({ error: "Drive upload error", detail: err }, 502);
  }

  const file = await res.json() as DriveFile;

  /* Ghi vào lead_attachments nếu có lead_id */
  if (lead_id) {
    const { error: dbErr } = await supabase.from("lead_attachments").insert({
      lead_id,
      label:         label ?? file_name,
      drive_file_id: file.id,
      drive_url:     file.webViewLink,
      thumbnail_url: file.thumbnailLink,
    });
    if (dbErr) {
      console.warn("[Supabase insert lead_attachments error]", dbErr.message);
    }
  }

  return json({
    file_id:       file.id,
    file_url:      file.webViewLink,
    thumbnail_url: file.thumbnailLink,
    file_name:     file.name,
    label,
  });
}

/* ────────────────────────────────────────
   GOOGLE AUTH — Service Account JWT
   Cache token 55 phút (Google token hết hạn sau 60 phút)
──────────────────────────────────────── */
let _cachedToken: string | null = null;
let _tokenExpiry = 0;

async function getAccessToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;

  const sa  = JSON.parse(SA_JSON_RAW) as ServiceAccount;
  const now = Math.floor(Date.now() / 1000);

  const header  = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss:   sa.client_email,
    scope: "https://www.googleapis.com/auth/drive",
    aud:   "https://oauth2.googleapis.com/token",
    exp:   now + 3600,
    iat:   now,
  };

  // JWT phải dùng base64url (không phải base64 thường)
  const toSign    = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const pkcs8     = pemToArrayBuffer(sa.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", pkcs8,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(toSign));
  const jwt = `${toSign}.${base64url(sig)}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion:  jwt,
    }),
  });

  const tokenData  = await tokenRes.json() as { access_token: string };
  _cachedToken     = tokenData.access_token;
  _tokenExpiry     = Date.now() + 55 * 60 * 1000;
  return _cachedToken;
}

/* ────────────────────────────────────────
   HELPERS
──────────────────────────────────────── */

/* base64url: JWT cần base64url (thay +→-, /→_, bỏ =) */
function base64url(input: string | Uint8Array | ArrayBuffer): string {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : input instanceof ArrayBuffer ? new Uint8Array(input) : input;
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function setPublicReadPermission(fileId: string, token: string) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
}

function base64ToUint8Array(b64: string): Uint8Array {
  const clean  = b64.replace(/^data:[^;]+;base64,/, "");
  const binary = atob(clean);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function buildMultipart(boundary: string, metadata: string, mimeType: string, bytes: Uint8Array): Uint8Array {
  const enc   = new TextEncoder();
  const parts = [
    enc.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
    enc.encode(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    bytes,
    enc.encode(`\r\n--${boundary}--`),
  ];
  const total  = parts.reduce((a, b) => a + b.length, 0);
  const result = new Uint8Array(total);
  let offset   = 0;
  for (const p of parts) { result.set(p, offset); offset += p.length; }
  return result;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

interface ServiceAccount { client_email: string; private_key: string }
interface DriveFile { id: string; name: string; webViewLink: string; thumbnailLink: string }
