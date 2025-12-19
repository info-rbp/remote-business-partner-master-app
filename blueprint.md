# Project Blueprint: DealFlow AI

## Overview

This project is a Next.js application that leverages AI to generate business proposals. It is deployed on Firebase App Hosting and uses a Cloud Function (`generateProposal`) to interact with the Vertex AI (Gemini) API. The application will feature user authentication to manage access to proposal generation.

## Current State & Features

### Application Structure

*   **Framework:** Next.js with App Router
*   **Routing Root:** `src/app`
*   **Styling:** Tailwind CSS
*   **Deployment:** Firebase App Hosting
*   **Backend Logic:** Cloud Function (`generateProposal`) written in TypeScript.

### Implemented Components

*   `src/app/layout.tsx`: The root layout of the application.
*   `src/app/page.tsx`: The main landing page.
*   `src/app/components/header.tsx`: The application header.
*   `src/app/components/footer.tsx`: The application footer.
*   `lib/firebase-client.ts`: Client-side Firebase initialization.
*   `functions/src/index.ts`: The `generateProposal` Cloud Function.
*   `src/app/dashboard/page.tsx`: The dashboard page with interactive charts.
*   `src/app/components/proposal-status-chart.tsx`: A pie chart to display proposal statuses.
*   `src/app/clients/page.tsx`: A page to manage clients with full CRUD functionality.
*   `src/app/proposals/page.tsx`: A page to manage proposals with filtering.
*   `src/app/settings/page.tsx`: A page to manage application settings.
*   `src/app/loading.tsx`: A global loading indicator.
*   `src/app/error.tsx`: A global error boundary.
*   `src/lib/firebase-client.ts`: Client-side Firebase initialization with Auth, Functions, and App Check support.

### Design & Style

*   **Theme:** Dark theme with a gray background (`bg-gray-900`) and white text. A theme selector has been added to the settings page to switch between dark and light themes.
*   **Typography:** The `Inter` font is used throughout the application.
*   **Layout:** A simple container-based layout is used for the main content area.
*   **Charts:** The `recharts` library is used to create interactive charts.
*   **Icons:** The `lucide-react` library is used to add icons to the navigation and buttons.

## Recent Changes: Resilience & Iconography

*   **Problem:** The application lacked loading and error states, and the UI could be more intuitive.
*   **Solution:** Added global loading and error components, and integrated icons into the UI.
*   **Steps Taken:**
    *   Created `src/app/loading.tsx` to provide a loading indicator for all routes.
    *   Created `src/app/error.tsx` to provide a fallback UI in case of an error.
    *   Installed the `lucide-react` icon library.
*   Added icons to the navigation in the `header.tsx` file.
*   Added icons to the buttons on the `proposals` page.
*   Restored the `package.json` build script.

## Environment & Security Notes

*   Provide Firebase web app credentials in `NEXT_PUBLIC_FIREBASE_CONFIG` (or `NEXT_PUBLIC_FIREBASE_WEBAPP_CONFIG`/`FIREBASE_WEBAPP_CONFIG`) as a JSON string.
*   App Check for callable functions uses either `NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY` or `NEXT_PUBLIC_APP_CHECK_PUBLIC_KEY`.
*   The Admin SDK expects `FIREBASE_SERVICE_ACCOUNT` to contain the service account JSON when targeting production resources. For local development you can point at the Firestore emulator instead by setting `FIREBASE_EMULATOR_HOST`/`FIRESTORE_EMULATOR_HOST` plus `FIREBASE_PROJECT_ID` or `GCLOUD_PROJECT`.
