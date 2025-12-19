#!/usr/bin/env bash
set -euo pipefail

CONFIG_PATH="infra/storage/cors.json"

if [ ! -f "$CONFIG_PATH" ]; then
  echo "CORS config not found at $CONFIG_PATH"
  exit 1
fi

BUCKET="${1:-}"

pull_bucket_from_json() {
  local json="$1"
  node -e "const cfg = JSON.parse(process.argv[1] || '{}'); if (cfg.storageBucket) { console.log(cfg.storageBucket); }" "$json"
}

if [ -z "$BUCKET" ] && [ -n "${FIREBASE_CONFIG:-}" ]; then
  BUCKET="$(pull_bucket_from_json "$FIREBASE_CONFIG")"
fi

if [ -z "$BUCKET" ] && [ -n "${FIREBASE_WEBAPP_CONFIG:-}" ]; then
  BUCKET="$(pull_bucket_from_json "$FIREBASE_WEBAPP_CONFIG")"
fi

if [ -z "$BUCKET" ] && [ -n "${NEXT_PUBLIC_FIREBASE_WEBAPP_CONFIG:-}" ]; then
  BUCKET="$(pull_bucket_from_json "$NEXT_PUBLIC_FIREBASE_WEBAPP_CONFIG")"
fi

if [ -z "$BUCKET" ] && [ -n "${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:-}" ]; then
  BUCKET="${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}"
fi

if [ -z "$BUCKET" ]; then
  cat <<'INSTRUCTIONS'
Unable to determine your Firebase Storage bucket automatically.

Provide the bucket name explicitly:
  ./scripts/set-storage-cors.sh <YOUR_BUCKET_NAME>

Or set one of the following environment variables:
  FIREBASE_CONFIG / FIREBASE_WEBAPP_CONFIG / NEXT_PUBLIC_FIREBASE_WEBAPP_CONFIG (JSON with storageBucket)
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
INSTRUCTIONS
  exit 1
fi

echo "Applying CORS config from $CONFIG_PATH to bucket gs://$BUCKET"
gsutil cors set "$CONFIG_PATH" "gs://${BUCKET}"
echo "Done."
