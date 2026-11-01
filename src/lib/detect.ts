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

const cellText = (html: string) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function dmy(s?: string): string | undefined {
  const m = s?.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  return m ? `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}` : undefined;
}

/** PPSC current adverts table: SR | AD NO | CASE NO | POST | FEE | DEPARTMENT | AD DATE | CLOSING DATE */
export async function detectPpsc(): Promise<Job[]> {
  const base = 'https://www.ppsc.gop.pk/';
  const html = await (await get(`${base}Jobs.aspx`)).text();
  const out: Job[] = [];
  for (const row of html.split(/<tr[\s>]/i).slice(1)) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => cellText(m[1]!));
    if (cells.length < 8 || !/^\d+$/.test(cells[0]!)) continue;
    const [, adNo, caseNo, post, fee, dept, adDate, closing] = cells as string[];
    const href = row.match(/href="([^"]+)"/i)?.[1];
    out.push({
      id: hash(`ppsc|${adNo}|${caseNo}`),
      source: 'ppsc',
      title: post!,
      organization: dept || 'Punjab Public Service Commission',
      category: 'psc',
      cities: ['Punjab'],
      qualification: detectQual(post!),
      url: href ? new URL(decode(href), base).toString() : `${base}Jobs.aspx`,
      applyUrl: 'https://ppsc.gop.pk/',
      advertNo: adNo,
      caseNo,
      fee: fee ? `Rs ${fee}` : undefined,
      postedDate: dmy(adDate),
      lastDate: dmy(closing),
      description: `PPSC Advertisement ${adNo}, Case No. ${caseNo}. Department: ${dept}.`,
      firstSeen: new Date().toISOString(),
    });
  }
  return out;
}

const NAVY_QUAL: Record<string, string> = { 'pn cadet': 'Intermediate', ssc: 'Bachelor', sailors: 'Matric', marines: 'Matric' };

/** Join Pak Navy cadre cards that currently carry a "View Ad" link. Titles match the server scraper. */
export async function detectNavy(): Promise<Job[]> {
  const base = 'https://www.joinpaknavy.gov.pk/';
  const html = await (await get(base)).text();
  const out: Job[] = [];
  for (const box of html.split(/class="advertisement_box"/i).slice(1)) {
    const ad = box.match(/<a[^>]*href="([^"]+)"[^>]*>\s*View Ad\s*</i)?.[1];
    if (!ad) continue;
    const name = cellText(box.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i)?.[1] ?? 'Pakistan Navy');
    const crit = box.match(/<a[^>]*href="([^"]+)"[^>]*>\s*View Criteria\s*</i)?.[1];
    const adUrl = decode(ad);
    const file = adUrl.split('/').pop()!.replace(/^\d{2}-\d{2}-\d{4}-|\.(jpe?g|png|pdf)$/gi, '');
    const detail = /^AD /i.test(file) ? `: ${file.slice(3).replace(/\s+/g, ' ').trim()}` : '';
    out.push({
      id: hash(`navy|${name}|${adUrl}`),
      source: 'navy',
      title: `Join Pak Navy as ${name}${detail}`,
      organization: 'Pakistan Navy',
      category: 'armed',
      cities: ['All Pakistan'],
      qualification: NAVY_QUAL[name.toLowerCase()] ?? 'Any',
      url: base,
      applyUrl: `${base}registrationform`,
      advertImage: adUrl,
      criteriaUrl: crit ? decode(crit) : undefined,
      postedDate: dmy(adUrl.match(/(\d{2}-\d{2}-\d{4})/)?.[1]),
      description: `Pakistan Navy has announced induction as ${name}. See the official advertisement and selection criteria for age, height and qualification requirements.`,
      firstSeen: new Date().toISOString(),
    });
  }
  return out;
}

// These sites block foreign servers (GitHub, AWS), so the phone in Pakistan checks them itself.
const PHONE_SOURCES = { army: detectArmy, ppsc: detectPpsc, navy: detectNavy } as const;

const reuseKey = (j: Job) => `${j.source}|${j.title}|${j.advertNo ?? ''}`;

/**
 * Replaces each phone-checked source in `base` with what the phone sees right now.
 * A source that fails keeps its previous jobs. Known jobs keep their id + firstSeen so they never re-alert.
 */
export async function mergePhoneSources(base: Job[], known: Job[]): Promise<{ jobs: Job[]; ok: number }> {
  const names = Object.keys(PHONE_SOURCES) as (keyof typeof PHONE_SOURCES)[];
  const results = await Promise.allSettled(names.map((n) => PHONE_SOURCES[n]()));
  const prev = new Map([...known, ...base].map((j) => [reuseKey(j), j]));
  let jobs = base;
  let ok = 0;
  results.forEach((r, i) => {
    if (r.status !== 'fulfilled') return;
    ok++;
    for (const j of r.value) {
      const p = prev.get(reuseKey(j));
      if (p) Object.assign(j, { id: p.id, firstSeen: p.firstSeen });
    }
    jobs = [...r.value, ...jobs.filter((j) => j.source !== names[i])];
  });
  return { jobs, ok };
}

/** Full on-device detection when the hosted feed is unreachable. */
export async function detectOnDevice(cached: Job[]): Promise<Job[]> {
  const known = new Set(cached.map((j) => j.url));
  const njp = await detectNjp(known).catch(() => null);
  const { jobs, ok } = await mergePhoneSources([...(njp ?? []), ...cached], cached);
  if (!njp && !ok) throw new Error('offline');
  const seen = new Set<string>();
  const today = new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10);
  return jobs.filter((j) => {
    if (seen.has(j.id)) return false;
    seen.add(j.id);
    return !j.lastDate || j.lastDate >= today;
  });
}
