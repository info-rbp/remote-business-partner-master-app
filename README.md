This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

- `FIREBASE_PROJECT_ID`: The Firebase project ID. This can override the value embedded in `FIREBASE_SERVICE_ACCOUNT` or provide it when running against the emulator.

- `FIREBASE_EMULATOR_HOST`: Optional. When set (for example `localhost:8080`), the app will skip service account initialization and connect to the Firestore emulator instead. You can also set `FIRESTORE_EMULATOR_HOST` if you prefer the standard Firebase variable name; the value from `FIREBASE_EMULATOR_HOST` is reused automatically when both are present.

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

Server-side functions that call Firebase Admin require `FIREBASE_SERVICE_ACCOUNT` to hold the service account JSON string.
