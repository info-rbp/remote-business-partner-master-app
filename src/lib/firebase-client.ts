import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck, getToken as getAppCheckToken } from 'firebase/app-check';

const firebaseConfigString = process.env.NEXT_PUBLIC_FIREBASE_CONFIG
  ?? process.env.NEXT_PUBLIC_FIREBASE_WEBAPP_CONFIG
  ?? process.env.FIREBASE_WEBAPP_CONFIG;

if (!firebaseConfigString) {
  throw new Error('NEXT_PUBLIC_FIREBASE_CONFIG or FIREBASE_WEBAPP_CONFIG environment variable is required.');
}

const firebaseConfig = JSON.parse(firebaseConfigString) as FirebaseOptions;

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let appCheck: AppCheck | undefined;
if (typeof window !== 'undefined') {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY ?? process.env.NEXT_PUBLIC_APP_CHECK_PUBLIC_KEY;

  if (!siteKey) {
    console.warn('App Check site key is not configured; App Check will not be enforced.');
  } else {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
}

const auth = getAuth(app);
const functions = getFunctions(app, 'us-central1');

export { app, auth, appCheck, functions };

export async function getAuthTokens() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User is not signed in.');
  }

  if (!appCheck) {
    throw new Error('App Check has not been initialized in this environment.');
  }

  const [idToken, appCheckToken] = await Promise.all([
    user.getIdToken(),
    getAppCheckToken(appCheck),
  ]);

  return { idToken, appCheckToken: appCheckToken.token };
}
