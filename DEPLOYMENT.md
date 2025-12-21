# Firebase Deployment Guide

This document provides step-by-step instructions for deploying the application to Firebase App Hosting.

## Prerequisites

1. Firebase CLI installed and logged in: `npm install -g firebase-tools && firebase login`
2. Two Firebase projects created: one for DEV, one for PROD
3. App Hosting backends created in each project (via Firebase Console)
4. Service account keys for Cloud Functions Admin SDK access

## Initial Project Setup

### 1. Configure Firebase Project Aliases

Update `.firebaserc` with your actual project IDs:

```json
{
  "projects": {
    "default": "your-dev-project-id",
    "dev": "your-dev-project-id",
    "prod": "your-prod-project-id"
  }
}
```

### 2. Enable Required Firebase Services

In both projects, enable:
- **App Hosting** (create backend: `rbp-dev-backend` for DEV, `rbp-prod-backend` for PROD)
- **Cloud Firestore** (Native mode)
- **Cloud Storage** (default bucket)
- **Cloud Functions** (2nd gen)
- **Firebase Authentication**
- **App Check** (optional but recommended)

### 3. Set Up App Check (Recommended)

If using App Check:

1. Go to Firebase Console → App Check
2. Register your web app
3. Enable reCAPTCHA v3 provider
4. Copy the site key

## Environment Configuration

### For App Hosting (Runtime)

Firebase App Hosting **automatically injects** `FIREBASE_WEBAPP_CONFIG` at runtime. You don't need to configure it manually.

**However, you MUST manually set these in the App Hosting environment:**

1. Go to Firebase Console → App Hosting → Your Backend → Environment Variables
2. Add:
   - `NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY` = your reCAPTCHA site key (if using App Check)
   - `NEXT_PUBLIC_APP_CHECK_PUBLIC_KEY` = alternative to above
   - `DEFAULT_ORG_ID` = your default organization ID (e.g., `default-org`)
   - Any other `NEXT_PUBLIC_*` vars required by later phases

### For Cloud Functions (Runtime)

Firebase Functions automatically get `FIREBASE_CONFIG` and access to the service account. No additional secrets needed unless you're calling external APIs.

### For Local Development

Copy `.env.example` to `.env.local` and populate:

```bash
APP_ENV=development

# Firebase Web Config (get from Firebase Console → Project Settings → Your apps)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc123

# App Check (if enabled)
NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY=your-recaptcha-site-key

# Default org for public lead capture
DEFAULT_ORG_ID=default-org
```

## Deployment Steps

### First-Time Setup

1. **Deploy Firestore rules and indexes:**
   ```bash
   npm run firebase:use:dev
   firebase deploy --only firestore
   ```

2. **Deploy Storage rules:**
   ```bash
   firebase deploy --only storage
   ```

3. **Set Storage CORS (if needed):**
   ```bash
   ./scripts/set-storage-cors.sh
   ```

4. **Deploy Cloud Functions:**
   ```bash
   npm run deploy:dev
   ```
   This deploys functions from `functions/src/`.

5. **Deploy App Hosting:**
   - Push your code to the connected GitHub repository
   - App Hosting will auto-build and deploy
   - Or use: `firebase apphosting:backends:deploy rbp-dev-backend`

### Subsequent Deployments

**DEV:**
```bash
npm run deploy:dev
```

**PROD:**
```bash
npm run deploy:prod
# You'll be prompted to type "DEPLOY TO PROD" or set ALLOW_PROD_DEPLOY=true
```

Both commands deploy:
- Firestore rules and indexes
- Cloud Functions
- App Hosting backend

## Common Deployment Issues

### Issue: Build fails with "NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing"

**Solution:** This is expected during CI builds without secrets. The CI workflow now provides dummy env vars. For App Hosting, ensure `FIREBASE_WEBAPP_CONFIG` is being injected (it should be automatic).

### Issue: Functions fail with "Vertex AI quota exceeded"

**Solution:** Enable Vertex AI API in GCP Console and ensure billing is enabled.

### Issue: App Check errors in production

**Solution:**
1. Verify `NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY` is set in App Hosting environment variables
2. Ensure App Check is enabled for your Firebase project
3. Register your production domain in App Check settings

### Issue: CORS errors when accessing Storage

**Solution:** Run `./scripts/set-storage-cors.sh` with your production domain added to `infra/storage/cors.json`.

### Issue: "No organization associated with this user"

**Solution:** Users need to bootstrap their org. Call the `bootstrapUserOrg` callable function after first login:
```typescript
const functions = getFunctions();
const bootstrap = httpsCallable(functions, 'bootstrapUserOrg');
await bootstrap({ orgName: 'My Agency', displayName: 'John Doe' });
```

## Post-Deployment Verification

1. **Check App Hosting logs:**
   ```bash
   firebase apphosting:backends:logs rbp-dev-backend
   ```

2. **Check Functions logs:**
   ```bash
   firebase functions:log
   ```

3. **Test public endpoints:**
   - Visit your App Hosting URL
   - Submit a lead via `/contact`
   - Verify lead appears in Firestore: `orgs/{orgId}/leads`

4. **Test authenticated flows:**
   - Sign in
   - Bootstrap org
   - Create proposal
   - Share proposal link
   - Accept proposal

## Rollback Procedure

### App Hosting
1. Go to Firebase Console → App Hosting → Your Backend
2. Click "Rollouts"
3. Select a previous successful rollout
4. Click "Roll back to this version"

### Functions
```bash
firebase functions:rollback <functionName>
```

### Firestore Rules (manual)
1. Keep backups of `firestore.rules` in git
2. Checkout previous version: `git checkout HEAD~1 -- firestore.rules`
3. Deploy: `firebase deploy --only firestore:rules`

## Monitoring

- **App Hosting:** Firebase Console → App Hosting → Metrics
- **Functions:** Firebase Console → Functions → Dashboard
- **Firestore:** Firebase Console → Firestore → Usage
- **Logs:** Cloud Logging in GCP Console

## Security Checklist

- [ ] App Check enabled and enforced
- [ ] Firestore rules deployed and tested
- [ ] Storage rules deployed and tested
- [ ] Service account keys rotated regularly
- [ ] Environment variables set in App Hosting console (not in code)
- [ ] CORS configured for production domains only
- [ ] Firebase Authentication providers configured (Email/Password, Google, etc.)
- [ ] Custom claims set for RBAC (`orgId`, `role`)

## Troubleshooting Resources

- [Firebase App Hosting Docs](https://firebase.google.com/docs/app-hosting)
- [Cloud Functions 2nd Gen](https://firebase.google.com/docs/functions/beta/get-started-2nd-gen)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [App Check Setup](https://firebase.google.com/docs/app-check)
