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
  android: { banner: '', native: '', interstitial: '' },
  ios: { banner: '', native: '', interstitial: '' },
};
