# Firestore Backups & Restores

This guide covers exporting Firestore to Cloud Storage and restoring from an export.

## Prerequisites
- Google Cloud project with Firestore in Native mode
- Cloud Storage bucket for backups
- `gcloud` CLI authenticated and configured
- IAM permissions: `Datastore Import Export Admin` and access to the bucket

## Backup (Export)

Run an export to a GCS bucket path. A timestamped folder is recommended.

```bash
# Example
./scripts/firestore-backup.sh my-project gs://my-backups/firestore/$(date +%F-%H%M)
```

Notes:
- Export runs asynchronously; verify completion in the Cloud Console.
- Consider daily exports and a 30–90 day retention policy.
- To include specific collections only, use `--collection-ids` with `gcloud firestore export`.

## Restore (Import)

Restore from a prior export path.

```bash
# Example
./scripts/firestore-restore.sh my-project gs://my-backups/firestore/2025-12-21-1200
```

Warnings:
- Import overwrites documents in target collections.
- Test restores in a staging project before production.

## Scheduling Backups

Use Cloud Scheduler to trigger a Cloud Function or Cloud Run job that executes Firestore export on a schedule. Alternatively, run the scripts from a CI runner with service-account credentials.

- Schedule: daily at off-peak hours (e.g., 02:00 local time)
- Retention: rotate and clean old backups using lifecycle rules on the bucket

## App Check & Security Considerations

- Backups use service accounts and bypass App Check; ensure roles are scoped minimally.
- Keep exports encrypted (default Google-managed keys or CMEK).

## Disaster Recovery Tips

- Keep a recent backup chain (daily for 30 days; weekly for 6 months)
- Document restore runbooks and verification steps
- Consider exporting critical collections separately for faster point restores
