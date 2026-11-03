/**
 * Hourly feed produced by scraper/scrape.py (GitHub Actions). Any static host
 * works: GitHub raw (public repo), GitHub Pages, Vercel, S3, your EC2 box.
 * If it can't be reached the app falls back to on-device detection (detect.ts).
 */
export const FEED_URL =
  process.env.EXPO_PUBLIC_FEED_URL ??
  'https://raw.githubusercontent.com/shahidjabbarpk/pakjobs-daily/main/data/jobs.json';

export const STORE_URL = 'https://play.google.com/store/apps/details?id=com.pakjobs.daily.mza';
export const PRIVACY_URL = 'https://shahidjabbarpk.github.io/pakjobs-daily/privacy.html';

export const BACKGROUND_TASK = 'pakjobs-detect-new-jobs';
export const BACKGROUND_INTERVAL_MIN = 30; // Android/iOS treat this as a minimum, not exact

/** Minimum time between any two full-screen ads (job open, advert, result, quiz, CV). */
export const FULLSCREEN_GAP_MS = 5 * 60 * 1000;
export const NATIVE_AD_EVERY = 3;

// AdMob app "PakJobs Daily" (ca-app-pub-2214888899948620~1749464777, shahidjabbarpk@gmail.com).
// Debug builds always use Google's test ads; empty = test ads too.
export const PROD_AD_UNITS = {
  android: {
    banner: 'ca-app-pub-2214888899948620/5497138097',
    native: 'ca-app-pub-2214888899948620/2291943142',
    interstitial: 'ca-app-pub-2214888899948620/4184056427',
    rewarded: 'ca-app-pub-2214888899948620/5109678177',
  },
  ios: { banner: '', native: '', interstitial: '', rewarded: '' },
};

// Firebase web config (public by design; access is enforced by firebase/firestore.rules).
// Written by `node scripts/setup-firebase.mjs` for the shahidjabbarpk@gmail.com project.
// null = community features (private jobs, comments) show "being set up".
export const FIREBASE_CONFIG: {
  apiKey: string; authDomain: string; projectId: string; storageBucket: string; messagingSenderId: string; appId: string;
} | null = {
  apiKey: 'AIzaSyDgReqSEL_iUg4gbza4hToZ6Ju9OQbF9xo',
  authDomain: 'pakjobs-daily-sj.firebaseapp.com',
  projectId: 'pakjobs-daily-sj',
  storageBucket: 'pakjobs-daily-sj.firebasestorage.app',
  messagingSenderId: '349850513796',
  appId: '1:349850513796:web:50e8ab7215c29f5632add1'
};

// OAuth "web client" of the same project (type 3 in google-services.json); Google login asks
// for an idToken issued to this client so Firebase Auth accepts it.
export const GOOGLE_WEB_CLIENT_ID = '349850513796-f32iv00qk35t8q0mv8dtnjjb83frl6fv.apps.googleusercontent.com';

/** Private job posts stay visible this long. */
export const POST_LIFETIME_DAYS = 30;

/**
 * Featured listing: employers pay outside the app, then the admin switches "featured" on.
 * Fill in your own price and JazzCash / Easypaisa / WhatsApp details before release.
 */
export const FEATURED = {
  pricePkr: 1000,
  days: 30,
  payTo: 'Easypaisa: 0302-4534929 (Shahid Jabbar)',
  adminWhatsapp: '923024534929', // payment screenshots go here
};
