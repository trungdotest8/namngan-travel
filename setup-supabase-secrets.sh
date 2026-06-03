#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# Nam Ngân Travel — Set Supabase Edge Function Secrets
# Chạy 1 lần sau khi `npx supabase login`
# ─────────────────────────────────────────────────────────────────
set -e

PROJECT_REF="indjoegnsvcteaozmgrg"
SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://namngan-travel.vercel.app}"
ADMIN_SECRET="${NEXT_PUBLIC_ADMIN_SECRET:-namngan-secret-2025}"

echo "▶ Loading .env.local..."
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
else
  echo "❌ .env.local not found. Run from project root."
  exit 1
fi

echo ""
echo "▶ Setting Supabase Edge Function secrets for project: $PROJECT_REF"
echo ""

npx supabase secrets set \
  GOOGLE_SERVICE_ACCOUNT_JSON="${GOOGLE_SERVICE_ACCOUNT_JSON}" \
  DRIVE_PARENT_FOLDER_ID="${DRIVE_PARENT_FOLDER_ID}" \
  --project-ref "$PROJECT_REF"

echo ""
echo "✅ Secrets set successfully!"
echo ""
echo "▶ Calling /api/admin/setup-drive-folders to initialize Drive folders..."
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "${SITE_URL}/api/admin/setup-drive-folders" \
  -H "x-admin-secret: ${ADMIN_SECRET}" \
  -H "Content-Type: application/json")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_STATUS:")

echo "HTTP Status: $HTTP_STATUS"
echo "Response: $BODY"

if [ "$HTTP_STATUS" = "200" ]; then
  echo ""
  echo "✅ Drive folders initialized!"
else
  echo ""
  echo "⚠️  setup-drive-folders returned $HTTP_STATUS — kiểm tra Edge Fn logs."
fi
