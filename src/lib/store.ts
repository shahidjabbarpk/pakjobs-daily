import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import seed from '../data/seed.json';
import bundledPapers from '../../data/papers.json';
import { Storage } from './kv';
import type { Lang } from './i18n';
import type { Category, Feed, Job, Paper, Profile, Update } from './types';
import type { CvData } from './cv';

export const ALL_CATEGORIES: Category[] = ['govt', 'psc', 'armed', 'banking', 'police', 'education', 'health', 'it', 'private'];

interface AppState {
  jobs: Job[];
  updatedAt: string | null;   // feed generation time
  lastChecked: string | null; // last successful refresh on this device
  seenIds: string[];          // ids already notified/shown, for new-job detection
  saved: Record<string, Job>;
  reminders: Record<string, string>; // jobId -> scheduled notification id
  lang: Lang;
  theme: 'system' | 'light' | 'dark'; // 'system' is legacy and now means light
  notify: boolean;
  alertCategories: Category[];
  alertCity: string | null;
  updates: Update[];          // results / roll no slips / schedules
  papers: Paper[];            // official past papers, refreshed with the updates
  seenUpdateIds: string[];
  notifyUpdates: boolean;
  cv: CvData | null;
  quizBest: Record<string, number>; // subject -> best score %
  homeCity: string | null;    // user's district, picked on first launch
  profile: Profile | null;    // cached copy of the Firestore profile (name + WhatsApp)
  admin: boolean;
  batteryHintShown: boolean;
  onboarded: boolean;
  lastInterstitial: number;
  syncing: boolean;           // a job refresh is in flight (not persisted) - drives skeleton loaders
  alertsSeenAt: number;       // last time the Alerts tab was opened; newer updates show a badge

  /** Merge a fresh feed in; returns the jobs never seen before on this device. */
  ingest: (feed: Feed) => Job[];
  toggleSave: (job: Job) => boolean;
  set: (patch: Partial<AppState>) => void;
}

const seedFeed = seed as Feed;

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      jobs: seedFeed.jobs,
      updatedAt: seedFeed.updatedAt,
      lastChecked: null,
      seenIds: seedFeed.jobs.map((j) => j.id),
      saved: {},
      reminders: {},
      lang: 'en',
      theme: 'light',
      notify: true,
      alertCategories: [...ALL_CATEGORIES],
      alertCity: null,
      updates: [],
      papers: bundledPapers.papers as Paper[],
      seenUpdateIds: [],
      notifyUpdates: true,
      cv: null,
      quizBest: {},
      homeCity: null,
      profile: null,
      admin: false,
      batteryHintShown: false,
      onboarded: false,
      lastInterstitial: 0,
      syncing: false,
      alertsSeenAt: Date.now(),

      ingest: (feed) => {
        const seen = new Set(get().seenIds);
        const fresh = feed.jobs.filter((j) => !seen.has(j.id));
        // keep saved copies in sync with the latest data
        const saved = { ...get().saved };
        for (const j of feed.jobs) if (saved[j.id]) saved[j.id] = j;
        const ids = feed.jobs.map((j) => j.id);
        set({
          jobs: feed.jobs,
          updatedAt: feed.updatedAt,
          lastChecked: new Date().toISOString(),
          // remember ids for a while after they leave the feed so they never re-alert
          seenIds: [...new Set([...ids, ...get().seenIds])].slice(0, 3000),
          saved,
        });
        return fresh;
      },
      toggleSave: (job) => {
        const saved = { ...get().saved };
        const now = !saved[job.id];
        if (now) saved[job.id] = job;
        else delete saved[job.id];
        set({ saved });
        return now;
      },
      set: (patch) => set(patch),
    }),
    {
      name: 'pakjobs-app',
      version: 1,
      storage: createJSONStorage(() => Storage),
      partialize: ({ ingest, toggleSave, set, syncing, ...rest }) => rest,
    },
  ),
);

export function waitForHydration(): Promise<void> {
  if (useApp.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = useApp.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}
