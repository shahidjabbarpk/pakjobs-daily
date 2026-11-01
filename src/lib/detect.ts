/**
 * On-device detector — a light TypeScript port of scraper/scrape.py for the two
 * richest sources (National Jobs Portal + Pak Army API). Used when the hosted
 * feed is unreachable, so the app keeps discovering jobs with no server at all.
 */
import type { Category, Job } from './types';

const UA = 'Mozilla/5.0 (Linux; Android 14) PakJobsDaily/1.0';
const MAX_NEW_DETAILS = 15;

async function get(url: string, timeoutMs = 20000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
    if (!r.ok) throw new Error(`${url} -> ${r.status}`);
    return r;
  } finally {
    clearTimeout(timer);
  }
}

function hash(s: string): string {
  // FNV-1a 64; the dev- prefix keeps device ids apart from the server's sha1 ids
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < s.length; i++) {
    h ^= BigInt(s.charCodeAt(i));
    h = (h * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return 'dev-' + h.toString(16).padStart(16, '0');
}

const decode = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');

function htmlLines(html: string): string[] {
  return decode(
    html
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '')
      .replace(/<(br|\/p|\/div|\/h\d|\/li|\/span|\/button)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function after(lines: string[], label: string): string | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[:\s]+$/, '');
  const i = lines.findIndex((l) => norm(l) === norm(label));
  return i >= 0 ? lines[i + 1] : undefined;
}

const MON: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
function parseDate(s?: string): string | undefined {
  const m = s?.match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*,?\s+(\d{4})/);
  if (!m) return undefined;
  const mo = MON[m[2]!.toLowerCase()];
  return mo ? `${m[3]}-${mo}-${m[1]!.padStart(2, '0')}` : undefined;
}

const QUALS: [string, RegExp][] = [
  ['PhD', /\bph\.?\s?d\b|doctorate/i],
  ['MPhil', /\bm\.?\s?phil\b/i],
  ['Masters', /\bmasters?\b|\bm\.?\s?sc\b|\bmba\b|\bmcs\b|16 years/i],
  ['Bachelor', /bachelor|graduat|\bb\.?\s?sc\b|\bbs\b(?!-?\s?\d)|\bbba\b|\bmbbs\b|\bllb\b|14 years|\bdegree\b/i],
  ['DAE', /\bdae\b|diploma/i],
  ['Intermediate', /intermediate|\bf\.?\s?sc\b|\bhssc\b|12 years/i],
  ['Matric', /matric|\bssc\b|secondary school|10 years/i],
  ['Middle', /\bmiddle\b|primary|literate|under matric/i],
];
// adverts state the requirement first - take the earliest mention
const detectQual = (t: string) =>
  QUALS.map(([n, rx]) => [t.search(rx), n] as const).filter(([i]) => i >= 0).sort((a, b) => a[0] - b[0])[0]?.[1] ?? null;

const PLACES = ['Islamabad', 'Rawalpindi', 'Lahore', 'Karachi', 'Peshawar', 'Quetta', 'Multan', 'Faisalabad', 'Hyderabad',
  'Gwadar', 'Turbat', 'Sukkur', 'Abbottabad', 'Gilgit', 'Muzaffarabad', 'Punjab', 'Sindh', 'Balochistan', 'KPK'];
const detectCities = (t: string) => PLACES.filter((p) => new RegExp(`\\b${p}\\b`, 'i').test(t)).slice(0, 6);

function detectCategory(t: string): Category {
  const s = t.toLowerCase();
  if (/\b(army|navy|air force|paf|fc|rangers|cadet|sepoy|sailor)\b/.test(s)) return 'armed';
  if (/\bbank|state bank|sbp|nbp/.test(s)) return 'banking';
  if (/\bpolice|constable|sub inspector|motorway/.test(s)) return 'police';
  if (/teacher|lecturer|educator|professor|school|college|university/.test(s)) return 'education';
  if (/doctor|nurse|medical officer|hospital|health/.test(s)) return 'health';
  return 'govt';
}

async function njpDetail(num: string): Promise<Job | null> {
  const url = `https://www.njp.gov.pk/jobs/${num}`;
  const html = await (await get(url)).text();
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>([\s\S]{0,1500})/i);
  if (!h1) return null;
  const title = decode(h1[1]!.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  const org = decode(h1[2]!.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? 'Government of Pakistan').replace(/<[^>]+>|\s+/g, ' ').trim();
  const lines = htmlLines(html);
  const ds = lines.indexOf('Job Description');
  const de = lines.findIndex((l, i) => i > ds && (l === 'Read More' || l === 'Eligibility Criteria'));
  const desc = ds >= 0 ? lines.slice(ds + 1, de > ds ? de : ds + 30) : [];
  const qualLine = desc.find((l) => /^qualification/i.test(l))?.split(':').slice(1).join(':') ?? '';
  const domicile = after(lines, 'Domicile');
  const vac = after(lines, 'Vacancies')?.match(/\d+/)?.[0];
  return {
    id: hash(`njp|${num}`),
    source: 'njp',
    title,
    organization: org,
    category: detectCategory(`${title} ${org}`),
    cities: detectCities([title, org, domicile, ...desc].join(' ')),
    qualification: detectQual(qualLine || desc.join(' ')),
    url,
    applyUrl: url,
    description: desc.join('\n').slice(0, 2500),
    grade: after(lines, 'Grade'),
    jobType: after(lines, 'Job Type'),
    vacancies: vac ? Number(vac) : undefined,
    domicile,
    ageLimit: after(lines, 'Age Limit'),
    postedDate: parseDate(after(lines, 'Posted:')),
    lastDate: parseDate(after(lines, 'Deadline:')),
    logo: ((m) => m && decode(m))(html.match(/src="(https:\/\/www\.njp\.gov\.pk\/images\/profiles\/[^"]+)"/)?.[1]),
    firstSeen: new Date().toISOString(),
  };
}

async function detectNjp(knownUrls: Set<string>): Promise<Job[]> {
  const nums: string[] = [];
  for (const page of ['https://www.njp.gov.pk/', 'https://www.njp.gov.pk/jobs/live?page=1']) {
    try {
      const html = await (await get(page)).text();
      for (const m of html.matchAll(/njp\.gov\.pk\/jobs\/(\d+)["']/g)) if (!nums.includes(m[1]!)) nums.push(m[1]!);
    } catch {
      /* try next page */
    }
  }
  const todo = nums.filter((n) => !knownUrls.has(`https://www.njp.gov.pk/jobs/${n}`)).slice(0, MAX_NEW_DETAILS);
  const out = await Promise.all(todo.map((n) => njpDetail(n).catch(() => null)));
  return out.filter((j): j is Job => !!j);
}

const ARMY_KIND: Record<string, [string, string | null]> = {
  reg_comission: ['Commission (PMA Long Course)', 'Intermediate'],
  sldr_recruitment: ['Soldier Recruitment', 'Matric'],
  lcc_comission: ['Lady Cadet Course', 'Bachelor'],
  ssc_comission: ['Short Service Commission', 'Bachelor'],
  tcc_comission: ['Technical Cadet Course', 'Intermediate'],
  amc_comission: ['Army Medical Corps', 'Bachelor'],
  afns_comission: ['AFNS Nursing', 'Intermediate'],
};

export async function detectArmy(): Promise<Job[]> {
  const data: any[] = await (await get('https://joinpakarmy.gov.pk/api/course_list/')).json();
  return data
    .filter((c) => c.visibility_status && c.status)
    .map((c) => {
      const [kind, qual] = ARMY_KIND[c.abbr] ?? ['Recruitment', null];
      return {
        id: hash(`army|${c.id}`),
        source: 'army' as const,
        title: `Pak Army ${kind} - ${String(c.course_name).trim()}`,
        organization: 'Pakistan Army',
        category: 'armed' as const,
        cities: ['All Pakistan'],
        qualification: qual,
        url: 'https://joinpakarmy.gov.pk/',
        applyUrl: `https://joinpakarmy.gov.pk/course?com_type=${c.abbr}`,
        postedDate: c.registration_start_date,
        lastDate: c.registration_end_date,
        ageLimit: `Born ${c.max_dob} – ${c.min_dob}`,
        description: `Registration: ${c.registration_start_date} to ${c.registration_end_date}. Tests: ${c.tests_start_date} to ${c.tests_end_date}.`,
        firstSeen: new Date().toISOString(),
      };
    });
}

/** Returns current jobs = cached jobs (still open) + anything newly detected. */
export async function detectOnDevice(cached: Job[]): Promise<Job[]> {
  const known = new Set(cached.map((j) => j.url));
  const [njp, army] = await Promise.allSettled([detectNjp(known), detectArmy()]);
  if (njp.status === 'rejected' && army.status === 'rejected') throw new Error('offline');
  const fresh = [...(njp.status === 'fulfilled' ? njp.value : []), ...(army.status === 'fulfilled' ? army.value : [])];
  // reuse server ids for army courses we already know, so they don't re-alert
  const prevArmy = new Map(cached.filter((j) => j.source === 'army').map((j) => [j.title, j]));
  for (const j of fresh) {
    const prev = j.source === 'army' ? prevArmy.get(j.title) : undefined;
    if (prev) Object.assign(j, { id: prev.id, firstSeen: prev.firstSeen });
  }
  const byKey = new Map<string, Job>();
  // army records are replaced wholesale (dates change); everything else keeps first-seen data
  const keep = army.status === 'fulfilled' ? cached.filter((j) => j.source !== 'army') : cached;
  for (const j of [...keep, ...fresh]) {
    const k = j.source === 'army' ? j.title : j.url;
    if (!byKey.has(k)) byKey.set(k, j);
  }
  const today = new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10);
  return [...byKey.values()].filter((j) => !j.lastDate || j.lastDate >= today);
}
