#!/usr/bin/env bash
set -euo pipefail

# Firestore backup script using gcloud
# Usage: ./scripts/firestore-backup.sh <GCP_PROJECT_ID> <GCS_BUCKET_PATH>
# Example: ./scripts/firestore-backup.sh my-project gs://my-backups/firestore/$(date +%F)

PROJECT_ID=${1:-}
BUCKET_PATH=${2:-}

if [[ -z "$PROJECT_ID" || -z "$BUCKET_PATH" ]]; then
  echo "Usage: $0 <GCP_PROJECT_ID> <GCS_BUCKET_PATH>"
  exit 1
fi

echo "Starting Firestore export for project: $PROJECT_ID to $BUCKET_PATH"

gcloud config set project "$PROJECT_ID"

gcloud firestore export "$BUCKET_PATH" \
  --async

echo "Export requested. Monitor status in Cloud Console under Firestore exports."
