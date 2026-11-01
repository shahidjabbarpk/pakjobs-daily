import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import seed from '../data/seed.json';
import { Storage } from './kv';
import type { Lang } from './i18n';
import type { Category, Feed, Job } from './types';

export const ALL_CATEGORIES: Category[] = ['govt', 'psc', 'armed', 'banking', 'police', 'education', 'health', 'private'];

interface AppState {
  jobs: Job[];
  updatedAt: string | null;   // feed generation time
  lastChecked: string | null; // last successful refresh on this device
  seenIds: string[];          // ids already notified/shown, for new-job detection
  saved: Record<string, Job>;
  reminders: Record<string, string>; // jobId -> scheduled notification id
  lang: Lang;
  theme: 'system' | 'light' | 'dark';
  notify: boolean;
  alertCategories: Category[];
  alertCity: string | null;
  onboarded: boolean;
  lastInterstitial: number;

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
      theme: 'system',
      notify: true,
      alertCategories: [...ALL_CATEGORIES],
      alertCity: null,
      onboarded: false,
      lastInterstitial: 0,

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
      partialize: ({ ingest, toggleSave, set, ...rest }) => rest,
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
