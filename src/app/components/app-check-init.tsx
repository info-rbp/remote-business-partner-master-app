"use client";

import { useEffect } from 'react';
import { getAppCheck } from '@/lib/firebase-client';

export default function AppCheckInit() {
  useEffect(() => {
    // Initialize App Check on the client if keys are provided
    try {
      const appCheck = getAppCheck();
      if (!appCheck) {
        // Optional: visible only in dev console
        console.warn('App Check not initialized. Provide NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY to enable.');
      }
    } catch (e) {
      console.warn('App Check initialization failed:', e);
    }
  }, []);

  return null;
}
