# Environment management (DEV vs PROD)

This project is wired for two Firebase projects and intentionally defaults to the DEV environment for local work and most CLI flows.

## Project aliases

`.firebaserc` defines two aliases:

- `dev` → `dealflow-ai-agency-dev` (also the `default` project)
- `prod` → `dealflow-ai-agency`

Update these IDs if your Firebase projects differ, but keep the alias names stable so scripts continue to work.

## Local environment variables

- Copy `.env.example` to `.env.local` and fill in the `NEXT_PUBLIC_*` Firebase web config values for the DEV project.
- `APP_ENV` defaults to `development`. If you set `APP_ENV=production` locally, the client guard will throw unless you set `ALLOW_PROD_LOCAL=true`—this is intentional friction.
- On Firebase App Hosting, the platform injects `FIREBASE_WEBAPP_CONFIG`; the client prefers that value automatically.
- When `FIREBASE_SERVICE_ACCOUNT` is absent in development, the Admin SDK falls back to the Firestore emulator (default `localhost:8080`). Provide a service account or point to a running emulator before seeding or server-side data access.

## App Hosting runtime variables

- `FIREBASE_WEBAPP_CONFIG` is provided automatically by App Hosting and picked up by the client.
- If App Check is enforced, set either `NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY` or `NEXT_PUBLIC_APP_CHECK_PUBLIC_KEY` in the App Hosting environment.
- Configure any additional `NEXT_PUBLIC_*` variables introduced by later phases in the App Hosting environment alongside the App Check key.

## Firebase configuration files

- `firebase.json` targets the DEV backend `rbp-dev-backend`.
- `firebase.prod.json` targets the PROD backend `rbp-prod-backend`.
- Both configs deploy App Hosting plus Firestore rules/indexes and Cloud Functions.
- Keep the backend names distinct so each Firebase project has its own App Hosting backend.

## CLI helpers

- Switch projects: `npm run firebase:use:dev` or `npm run firebase:use:prod`.
- Build: `npm run build` (works for both environments once config is present).
- Deploy DEV: `npm run deploy:dev` (uses `firebase.json`).
- Deploy PROD: `npm run deploy:prod` (requires typing `DEPLOY TO PROD` or setting `ALLOW_PROD_DEPLOY=true`, uses `firebase.prod.json`).

Deploy commands scope to App Hosting, Firestore (rules/indexes), and Cloud Functions. App Hosting is the default target; if you add classic Hosting, deploy it explicitly via `--only hosting`.

## Seeding DEV data

Use `npm run seed:dev` to populate deterministic seed documents:

- Org: `orgs/demo-agency-org`
- Member: `orgs/demo-agency-org/members/demo-staff-admin`
- Client: `orgs/demo-agency-org/clients/demo-client`
- Proposal: `orgs/demo-agency-org/proposals/demo-proposal`
- Audit log: `orgs/demo-agency-org/auditLogs/seed-run`

The seed script reads the active Firebase project from the Admin SDK initialization and **refuses to run if it matches the PROD project ID**. Set `FIREBASE_DEV_PROJECT_ID`/`FIREBASE_PROD_PROJECT_ID` to override the defaults if needed.

## Domain mapping guidance

- DEV: use the App Hosting generated URL or a `dev.<your-domain>` CNAME.
- PROD: map to `app.<your-domain>` (or another production subdomain) once you control DNS.

Keep DEV/PROD domains separate to avoid accidental production traffic during testing.
