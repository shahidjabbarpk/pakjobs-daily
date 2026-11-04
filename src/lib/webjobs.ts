import { WEB_JOBS_URL } from './config';

/** A private-sector job from Careerjet (via our proxy, see proxy/api/jobs.js). Opens on the employer's page. */
export interface WebJob {
  title: string;
  company?: string;
  date?: string;
  description?: string;
  locations?: string;
  salary?: string;
  url: string;
}

// what each industry chip searches for on Careerjet
export const INDUSTRY_KEYWORDS: Record<string, string> = {
  factory: 'factory',
  construction: 'construction',
  sales: 'sales',
  office: 'admin',
  tech: 'developer',
  driver: 'driver',
  hotel: 'restaurant',
  health: 'pharmacy',
  teaching: 'teacher',
  security: 'security guard',
  household: 'maid',
};

/** One page (20) of web jobs; null when the feature is off (no proxy / no API key yet). */
export async function fetchWebJobs(opts: { keywords?: string; location?: string; page?: number }): Promise<{ jobs: WebJob[]; pages: number } | null> {
  if (!WEB_JOBS_URL) return null;
  const q = new URLSearchParams();
  if (opts.keywords) q.set('keywords', opts.keywords);
  if (opts.location) q.set('location', opts.location);
  if (opts.page) q.set('page', String(opts.page));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(`${WEB_JOBS_URL}?${q}`, { signal: ctrl.signal });
    const body = await r.json();
    if (body.type === 'OFF') return null;
    // "LOCATIONS" = Careerjet didn't recognise the place; show nothing rather than wrong-city jobs
    if (body.type !== 'JOBS') return { jobs: [], pages: 0 };
    return { jobs: (body.jobs ?? []).filter((j: WebJob) => j.title && j.url), pages: body.pages ?? 1 };
  } finally {
    clearTimeout(timer);
  }
}
