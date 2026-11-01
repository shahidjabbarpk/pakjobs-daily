/**
 * Hourly feed produced by scraper/scrape.py (GitHub Actions). Any static host
 * works: GitHub raw (public repo), GitHub Pages, Vercel, S3, your EC2 box.
 * If it can't be reached the app falls back to on-device detection (detect.ts).
 */
export const FEED_URL =
  process.env.EXPO_PUBLIC_FEED_URL ??
  'https://raw.githubusercontent.com/shahidjabbarpk/pakjobs-daily/main/data/jobs.json';

export const BACKGROUND_TASK = 'pakjobs-detect-new-jobs';
export const BACKGROUND_INTERVAL_MIN = 30; // Android/iOS treat this as a minimum, not exact

export const INTERSTITIAL_GAP_MS = 3 * 60 * 1000;
export const NATIVE_AD_EVERY = 4;

// Replace with your real AdMob unit IDs before publishing; empty = Google test ads.
export const PROD_AD_UNITS = {
  android: { banner: '', native: '', interstitial: '', rewarded: '' },
  ios: { banner: '', native: '', interstitial: '', rewarded: '' },
};

// Firebase web config is public by design; access is enforced by firebase/firestore.rules.
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCshEboijGLAT9Eei8QSdaN6k-xtJ9yTJc',
  authDomain: 'pakjobs-daily-pk.firebaseapp.com',
  projectId: 'pakjobs-daily-pk',
  storageBucket: 'pakjobs-daily-pk.firebasestorage.app',
  messagingSenderId: '449808741466',
  appId: '1:449808741466:web:7ada91ae611cd804c51463',
};

/** Private job posts stay visible this long. */
export const POST_LIFETIME_DAYS = 30;

/**
 * Featured listing: employers pay outside the app, then the admin switches "featured" on.
 * Fill in your own price and JazzCash / Easypaisa / WhatsApp details before release.
 */
export const FEATURED = {
  pricePkr: 1000,
  days: 7,
  payTo: 'JazzCash / Easypaisa: 03XX-XXXXXXX (Account title)',
  adminWhatsapp: '', // e.g. '923001234567' - shown as "Send payment proof" button
};
