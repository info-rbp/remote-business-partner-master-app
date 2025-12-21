This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## What this app does

DealFlow AI is a Firebase-backed Next.js SaaS for agencies/consultancies to manage the client lifecycle end to end:
- Public site + lead capture → CRM intake
- Proposal drafting, preview, sharing, acceptance, and conversion to projects
- Client portal with shareable proposal links and acceptance flows
- Delivery visibility: projects, milestones, risks, decisions, knowledge, proof/case studies
- Governance and RBAC via Firebase Auth claims; App Check support for callable functions
- Cloud Functions power AI generation, audit logs, commercial/margin checks, operating rhythm summaries, and client intelligence snapshots
- Runs on Firebase App Hosting with Firestore as the primary store

## How to run it

Prereqs: Node 20+, npm, Firebase CLI (for emulators/deploys).

1) Install deps: `npm ci`
2) Copy `.env.example` → `.env.local` and set client Firebase web config (`NEXT_PUBLIC_FIREBASE_*`). For App Hosting, the platform injects `FIREBASE_WEBAPP_CONFIG` automatically.
3) For App Check (if enforced), set `NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY` or `NEXT_PUBLIC_APP_CHECK_PUBLIC_KEY`.
4) For server/admin features (seeding, SSR calls to Firestore), set `FIREBASE_SERVICE_ACCOUNT` or point to the Firestore emulator with `FIREBASE_EMULATOR_HOST`/`FIRESTORE_EMULATOR_HOST`.
5) Run dev server: `npm run dev` (uses `APP_ENV=development` by default). Build: `npm run build`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Firebase configuration

The app connects to Firestore through `firebase-admin`. Configure the following environment variables before running the app locally or in production:

- `FIREBASE_SERVICE_ACCOUNT`: **Required for production.** A JSON string of your service account object containing `project_id`, `client_email`, and `private_key`. If your private key is multi-line, replace newline characters with `\\n` so it can be parsed from the environment variable. Example:

  ```bash
  export FIREBASE_SERVICE_ACCOUNT='{"project_id":"my-project","client_email":"firebase-adminsdk@my-project.iam.gserviceaccount.com","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"}'
  ```

- `FIREBASE_PROJECT_ID` or `GCLOUD_PROJECT`: The Firebase project ID. This can override the value embedded in `FIREBASE_SERVICE_ACCOUNT` or provide it when running against the emulator. `GCLOUD_PROJECT` is populated automatically when you run against the emulator, but you can set it explicitly.

- `FIREBASE_EMULATOR_HOST` or `FIRESTORE_EMULATOR_HOST`: Optional. When set (for example `localhost:8080`), the app will skip service account initialization and connect to the Firestore emulator instead. The host value is reused between both variables so you can set whichever is most convenient.

To run locally against the Firestore emulator:

1. Start the emulator in another terminal (default Firestore port is `8080`):

   ```bash
   firebase emulators:start --only firestore
   ```

2. Set the emulator host and a project ID for the local build:

   ```bash
   export FIREBASE_EMULATOR_HOST=localhost:8080
   export FIREBASE_PROJECT_ID=demo-project # or your project ID
   ```

3. With the variables set, run your usual commands (`npm run dev`, `npm run build`, `npm run lint`). The server will reuse the emulator host automatically without requiring `FIREBASE_SERVICE_ACCOUNT`.

## Initial Firebase Deployment Order

For the first deployment to a new Firebase project, deploy resources in this order:

1. Firestore (rules and indexes)
   firebase deploy --only firestore

2. Cloud Functions
   firebase deploy --only functions

3. App Hosting (Next.js app)
   firebase deploy --only apphosting

This avoids runtime errors caused by the app calling functions or Firestore resources that do not yet exist.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Environment configuration

The client-side Firebase SDK is configured via a JSON string. Provide one of the following variables in your environment:

- `NEXT_PUBLIC_FIREBASE_CONFIG` (preferred for Next.js environments)
- `NEXT_PUBLIC_FIREBASE_WEBAPP_CONFIG`
- `FIREBASE_WEBAPP_CONFIG`

Each should contain the Firebase web app config JSON (e.g. `{"apiKey":"...","authDomain":"...","projectId":"...","appId":"..."}`).

To enable Firebase App Check for callable functions, also set one of:

- `NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY`
- `NEXT_PUBLIC_APP_CHECK_PUBLIC_KEY`

Server-side functions that call Firebase Admin require `FIREBASE_SERVICE_ACCOUNT` to hold the service account JSON string, unless you are explicitly targeting the Firestore emulator with `FIREBASE_EMULATOR_HOST`/`FIRESTORE_EMULATOR_HOST`.
