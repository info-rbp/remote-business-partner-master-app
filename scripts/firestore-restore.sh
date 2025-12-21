#!/usr/bin/env bash
set -euo pipefail

# Firestore restore script using gcloud
# Usage: ./scripts/firestore-restore.sh <GCP_PROJECT_ID> <GCS_EXPORT_PATH>
# Example: ./scripts/firestore-restore.sh my-project gs://my-backups/firestore/2025-12-21_12-00-00

PROJECT_ID=${1:-}
EXPORT_PATH=${2:-}

if [[ -z "$PROJECT_ID" || -z "$EXPORT_PATH" ]]; then
  echo "Usage: $0 <GCP_PROJECT_ID> <GCS_EXPORT_PATH>"
  exit 1
fi

echo "Starting Firestore import for project: $PROJECT_ID from $EXPORT_PATH"

gcloud config set project "$PROJECT_ID"

gcloud firestore import "$EXPORT_PATH" \
  --async

echo "Import requested. Monitor status in Cloud Console under Firestore imports."
