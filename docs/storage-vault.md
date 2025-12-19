# Storage Vault foundation

This document captures the conventions and helper tooling for the document vault (client vault, proposals, projects, templates).

## Path standards

All uploads must follow predictable, org-scoped paths:

- Client vault: `orgs/{orgId}/clients/{clientId}/vault/{category}/{yyyy}/{mm}/{fileId}_{safeFilename}`
- Proposal attachments: `orgs/{orgId}/proposals/{proposalId}/attachments/{yyyy}/{mm}/{fileId}_{safeFilename}`
- Project deliverables: `orgs/{orgId}/projects/{projectId}/deliverables/{yyyy}/{mm}/{fileId}_{safeFilename}`
- Templates: `orgs/{orgId}/templates/{templateType}/{yyyy}/{mm}/{fileId}_{safeFilename}`

Client vault categories (enforced by helpers and rules):
`contracts | sows | evidence | reports | communications | misc`

Rules:

- `fileId` is a UUID generated per upload and prepended to the sanitized filename.
- Filenames are normalized to `[a-zA-Z0-9._-]` with spaces converted to `-`.
- Paths outside these patterns are denied by default.

## Firestore file index

Every stored file must have an audit record under `orgs/{orgId}/files/{fileId}`. Required fields:

- `orgId`, `fileId`, `storagePath`, `bucket`
- `originalFilename`, `contentType`, `size`, `sha256` (optional)
- `createdAt` (Timestamp), `createdBy` (uid)
- `entityType` (`client|proposal|project|template`), `entityId`
- `category` (if applicable), `status` (`active|archived`)
- `visibility` (`internal|client`), `allowedRoles`
- `clientId` when the file is associated with a specific client

The Firestore record is the source of truth for authorization checks in Storage rules.

## Security model (RBAC alignment)

Membership lookup: `orgs/{orgId}/members/{uid}` with fields `{ role, clientId? }`.

- Admin/Staff: can read/write any file in their org.
- Client: can read only when `visibility == "client"` **and** `clientId` matches their membership and the file record. Clients may upload only into the dedicated `clients/{clientId}/uploads/...` path.
- All requests are org-scoped; cross-org access is denied.
- Storage rules verify membership + file record alignment; Firestore rules restrict who can create/update file records.

## CORS for browser uploads

Configuration lives at `infra/storage/cors.json`.
Origins allowed by default:

- `http://localhost:3000`
- `https://<APP_HOSTING_DOMAIN>` (replace with the real domain)

Allowed methods: `GET, HEAD, PUT, POST, DELETE`  
Allowed/Exposed headers: `Content-Type, Authorization, x-goog-*` (see config for full list)  
`maxAgeSeconds`: `43200`

Apply the config with:

```bash
./scripts/set-storage-cors.sh <YOUR_BUCKET_NAME>
# or rely on FIREBASE_CONFIG / NEXT_PUBLIC_FIREBASE_WEBAPP_CONFIG to auto-detect storageBucket
```

## Helpers

- Client upload helper: `src/lib/storage-client.ts` enforces path building, metadata, and Firestore record creation. Only usable in client components.
- Admin/server helper: `src/lib/storage-admin.ts` (server-only) can fetch file records and generate signed download URLs.
- Shared path logic: `src/lib/storage-paths.ts`.

## Rules overview

- `storage.rules`: strict path matches per entity, membership verification through Firestore, staff-only writes (clients only in `/uploads`), client reads gated by `visibility=="client"` and `clientId` alignment. Deny by default.
- `firestore.rules`: staff/admin create/update file records; clients may only read file records explicitly marked client-visible for their `clientId`. Other collections keep previous org-role checks.

## Testing checklist

1) Run static checks:

```bash
npm run lint
npm run build
firebase deploy --only storage   # or equivalent emulator validation
```

2) Manual flows:

- Staff/Admin uploads a file via `uploadFileToVault`, path matches spec, Firestore record created with `status=active`.
- Staff/Admin can download the file using Storage SDK (authorized user).
- Client user:
  - Can download only when `visibility="client"` and `clientId` matches.
  - Is denied for internal-only files or mismatched `clientId`.
- Client upload (if enabled): succeeds only under `clients/{clientId}/uploads/...` with matching membership.
- Unauthorized user: denied for any read/write attempt.
