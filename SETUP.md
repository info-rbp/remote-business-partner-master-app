# Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- Firebase project created
- Firebase CLI installed: `npm install -g firebase-tools`

## Setup Steps

### 1. Clone and Install Dependencies

```bash
# Install main dependencies
npm install

# Install function dependencies
cd functions
npm install
cd ..
```

### 2. Configure Firebase

```bash
# Login to Firebase
firebase login

# Initialize project (if not already done)
firebase init

# Select: Firestore, Functions, Hosting, Storage
```

### 3. Set Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your Firebase configuration values from the Firebase Console:
- Go to Project Settings > General
- Copy your web app configuration
- For service account: Project Settings > Service Accounts > Generate New Private Key

### 4. Deploy Firestore Rules & Indexes

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

### 5. Deploy Cloud Functions

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### 6. Create Default Organization

Run this script to create your default organization:

```bash
node scripts/create-default-org.js
```

Or manually create via Firebase Console:
1. Go to Firestore
2. Create collection `orgs`
3. Add document with ID `default-org`
4. Set fields:
```json
{
  "name": "Your Company",
  "displayName": "Your Company Name",
  "status": "active",
  "settings": {
    "timezone": "Australia/Sydney",
    "currency": "AUD",
    "fiscalYearStart": "07-01",
    "features": {
      "aiEnabled": true,
      "clientPortalEnabled": true,
      "crmEnabled": true
    }
  },
  "createdAt": <timestamp>,
  "updatedAt": <timestamp>,
  "createdBy": "system"
}
```

### 7. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## First User Setup

1. Navigate to `/signup` or `/login`
2. Create an account with email/password
3. The `bootstrapUserOrg` function will automatically:
   - Create your organization (or ask for org name)
   - Set you as admin
   - Create member record
   - Set custom claims

## Testing the Platform

### Test Lead Capture
1. Go to `/contact`
2. Fill in the form
3. Submit
4. Check Firestore: `orgs/default-org/leads`
5. Login as staff and view at `/crm/leads`

### Test Proposal Creation
1. Login as admin/staff
2. Go to `/proposals/new`
3. Create a proposal
4. Use AI generation if configured
5. Send to client (generates share link)

### Test Client Portal
1. Create a project (or convert a proposal)
2. Invite a client user
3. Client logs in
4. Client sees `/portal` dashboard with their projects

## Troubleshooting

### Functions Not Deploying
- Check Node.js version: `node --version` (should be 18+)
- Check function logs: `firebase functions:log`
- Verify service account permissions

### Auth Not Working
- Check Firebase Auth is enabled in console
- Verify environment variables are set correctly
- Check browser console for errors

### Firestore Rules Denying Access
- Check user has orgId set
- Verify member record exists in `orgs/{orgId}/members/{uid}`
- Check member has correct role

### AI Generation Failing
- Ensure Vertex AI API is enabled in Google Cloud Console
- Verify project has billing enabled
- Check function logs for specific errors

## Production Deployment

### Option 1: Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

### Option 2: Firebase App Hosting

```bash
# Deploy via GitHub integration
# See: https://firebase.google.com/docs/app-hosting
```

### Option 3: Vercel/Netlify

Configure environment variables in platform dashboard and deploy.

## Next Steps

1. Customize branding in org settings
2. Add team members via `/members`
3. Create service templates
4. Configure email notifications (optional)
5. Set up custom domain
6. Enable Google Analytics (optional)

## Support Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Implementation Details](./IMPLEMENTATION.md)

## Security Checklist

- [ ] Change default Firebase API keys
- [ ] Enable App Check
- [ ] Review Firestore security rules
- [ ] Set up backup schedule
- [ ] Enable audit logging
- [ ] Configure CORS for Storage
- [ ] Set up monitoring alerts
- [ ] Review function permissions
- [ ] Enable 2FA for admin accounts
- [ ] Set up rate limiting
