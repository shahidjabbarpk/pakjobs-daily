import * as StoreReview from 'expo-store-review';
import { Linking, Platform, Share } from 'react-native';
import { track } from './analytics';
import { SITE_URL, STORE_URL } from './config';
import { useApp } from './store';
import type { Job } from './types';

const REVIEW_GAP_MS = 30 * 86_400_000;

/**
 * Google Play's in-app review sheet, only at a happy moment (2nd saved job, a good mock-test score)
 * and at most once every 30 days. Never called on launch. Play itself may still decide not to show it.
 */
export async function maybeAskReview() {
  if (Platform.OS !== 'android') return;
  const { reviewAskedAt, set } = useApp.getState();
  if (reviewAskedAt && Date.now() - reviewAskedAt < REVIEW_GAP_MS) return;
  try {
    if (!(await StoreReview.isAvailableAsync())) return;
    set({ reviewAskedAt: Date.now() });
    await StoreReview.requestReview();
  } catch {}
}

/** Call after toggleSave: counts saves for the review prompt and logs job_save. */
export function jobSaveToggled(job: Job, nowSaved: boolean) {
  if (!nowSaved) return;
  const savesTotal = useApp.getState().savesTotal + 1;
  useApp.getState().set({ savesTotal });
  track('job_save', { source: job.source, category: job.category });
  if (savesTotal >= 2) maybeAskReview();
}

/** Play Store link that tells Google Play (and Google Ads) the install came from a share. */
export const storeLink = (medium: 'job_share' | 'app_share') =>
  `${STORE_URL}&referrer=${encodeURIComponent(`utm_source=app_share&utm_medium=${medium}&utm_campaign=organic_share`)}`;

const pkToday = () => new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 10);
const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'job';

/**
 * The job's page on the website, or null when the site has none: it builds pages only for feed
 * jobs (not employer posts or jobs the phone found itself) that are still open (proxy/build.mjs).
 */
export function jobPageUrl(job: Job): string | null {
  if (!/^[0-9a-f]{16}$/.test(job.id)) return null;
  const today = pkToday();
  const open = job.lastDate ? job.lastDate >= today : Date.parse(job.firstSeen) >= Date.parse(today) - 30 * 86_400_000;
  return open ? `${SITE_URL}/jobs/${slug(job.title)}-${job.id}?utm_source=app_share&utm_medium=job_share` : null;
}

/** "Share app" from Settings. */
export async function shareApp(message: string) {
  track('app_share');
  await Share.share({ message: `${message}\n${storeLink('app_share')}` }).catch(() => {});
}

/** "Rate app": the Play listing itself (the in-app sheet is reserved for the happy moments above). */
export function openStoreListing() {
  Linking.openURL('market://details?id=com.pakjobs.daily.mza').catch(() => Linking.openURL(STORE_URL));
}
