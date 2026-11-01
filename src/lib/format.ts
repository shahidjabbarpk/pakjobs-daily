import type { Job } from './types';

const DAY = 86_400_000;

/** End of the last day in Pakistan time (UTC+5). */
export function deadlineMs(job: Job): number | null {
  if (!job.lastDate) return null;
  return Date.parse(`${job.lastDate}T23:59:59+05:00`);
}

export function daysLeft(job: Job, now = Date.now()): number | null {
  const end = deadlineMs(job);
  if (end == null) return null;
  return Math.floor((end - now) / DAY);
}

export type Urgency = 'closed' | 'today' | 'urgent' | 'soon' | 'ok' | 'open';

export function urgency(job: Job, now = Date.now()): Urgency {
  const end = deadlineMs(job);
  if (end == null) return 'open';
  if (end < now) return 'closed';
  const d = Math.floor((end - now) / DAY);
  if (d === 0) return 'today';
  if (d <= 3) return 'urgent';
  if (d <= 7) return 'soon';
  return 'ok';
}

export function isNew(job: Job, now = Date.now()): boolean {
  return now - Date.parse(job.firstSeen) < DAY;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function prettyDate(iso?: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function initials(name: string): string {
  return name
    .replace(/\b(of|the|and|for|&)\b/gi, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

/** Progress of the application window, 0..1 (used for the deadline bar). */
export function windowProgress(job: Job, now = Date.now()): number {
  const end = deadlineMs(job);
  if (end == null) return 0;
  const start = Date.parse(job.postedDate ? `${job.postedDate}T00:00:00+05:00` : job.firstSeen);
  if (end <= start) return 1;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

export function sortJobs(jobs: Job[], by: 'newest' | 'deadline'): Job[] {
  const copy = [...jobs];
  if (by === 'deadline') {
    const far = Number.MAX_SAFE_INTEGER;
    const now = Date.now();
    copy.sort((a, b) => {
      const ea = deadlineMs(a) ?? far;
      const eb = deadlineMs(b) ?? far;
      // closed jobs sink to the bottom
      return (ea < now ? far : ea) - (eb < now ? far : eb);
    });
  } else {
    copy.sort((a, b) =>
      (b.postedDate ?? b.firstSeen).localeCompare(a.postedDate ?? a.firstSeen) || b.firstSeen.localeCompare(a.firstSeen));
  }
  return copy;
}

/** 0300-1234567 -> 923001234567 (for wa.me links). */
export function toIntl(n: string): string {
  const d = n.replace(/\D/g, '');
  return d.startsWith('0') ? `92${d.slice(1)}` : d;
}
