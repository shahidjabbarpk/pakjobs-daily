import { FEED_URL } from './config';
import { detectOnDevice, mergePhoneSources } from './detect';
import { useApp } from './store';
import type { Feed, Job } from './types';

export interface RefreshResult {
  fresh: Job[];
  via: 'feed' | 'device';
}

async function fetchFeed(): Promise<Feed> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    // cache-buster: raw.githubusercontent caches ~5 min
    const r = await fetch(`${FEED_URL}?t=${Math.floor(Date.now() / 300000)}`, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`feed ${r.status}`);
    const feed = (await r.json()) as Feed;
    if (!Array.isArray(feed.jobs)) throw new Error('bad feed');
    return feed;
  } finally {
    clearTimeout(timer);
  }
}

let inflight: Promise<RefreshResult> | null = null;

/** Pull the hosted feed, or detect directly from official sites if it's down. */
export function refreshJobs(): Promise<RefreshResult> {
  inflight ??= (async () => {
    const { jobs, ingest } = useApp.getState();
    try {
      const feed = await fetchFeed();
      // PPSC / Army / Navy block the foreign servers that build the feed - the phone checks them itself
      feed.jobs = (await mergePhoneSources(feed.jobs, jobs)).jobs;
      // keep NJP jobs the device found itself (offline fallback) that the feed doesn't know yet
      const ids = new Set(feed.jobs.map((j) => j.id));
      const urls = new Set(feed.jobs.map((j) => j.url + j.title));
      const today = new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10);
      const extras = jobs.filter((j) => j.source === 'njp' && j.id.startsWith('dev-') && !ids.has(j.id)
        && !urls.has(j.url + j.title) && (!j.lastDate || j.lastDate >= today));
      // a job the device already found must not alert again when the feed catches up with a new id
      const devUrls = new Set(jobs.filter((j) => j.id.startsWith('dev-')).map((j) => j.url + j.title));
      const adopted = feed.jobs.filter((j) => devUrls.has(j.url + j.title)).map((j) => j.id);
      if (adopted.length) useApp.getState().set({ seenIds: [...adopted, ...useApp.getState().seenIds] });
      return { fresh: ingest({ ...feed, jobs: [...extras, ...feed.jobs] }), via: 'feed' as const };
    } catch {
      const merged = await detectOnDevice(jobs);
      return { fresh: ingest({ updatedAt: new Date().toISOString(), jobs: merged }), via: 'device' as const };
    }
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}
