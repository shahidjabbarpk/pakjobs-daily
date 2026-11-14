// Posts for (a) jobs that appeared since the last run and (b) open jobs whose last date is today+1 or today+2
// (one "last date qareeb" reminder per job). Used by the hourly own-channel auto-post task.
//   node scripts/new-jobs-post.mjs          -> writes marketing/new-jobs/{facebook,whatsapp}.txt + pending.json, prints "NEW <n> REMIND <m>" or "NONE"
//   node scripts/new-jobs-post.mjs --done   -> marks pending jobs as posted/reminded (run only after BOTH posts succeeded)
//   node scripts/new-jobs-post.mjs --seed   -> marks every current job as already posted (first-time setup)
// State: marketing/new-jobs/posted.json + reminded.json (local only, gitignored).
import fs from 'node:fs';
const DIR = new URL('../marketing/new-jobs/', import.meta.url);
fs.mkdirSync(DIR, { recursive: true });
const STATE = new URL('posted.json', DIR), REM = new URL('reminded.json', DIR), PENDING = new URL('pending.json', DIR);
const load = (u) => new Set(fs.existsSync(u) ? JSON.parse(fs.readFileSync(u, 'utf8')) : []);
const posted = load(STATE), reminded = load(REM);
const save = () => {
  fs.writeFileSync(STATE, JSON.stringify([...posted].slice(-5000)));
  fs.writeFileSync(REM, JSON.stringify([...reminded].slice(-5000)));
};

if (process.argv.includes('--done')) {
  const p = fs.existsSync(PENDING) ? JSON.parse(fs.readFileSync(PENDING, 'utf8')) : {};
  const fresh = Array.isArray(p) ? p : p.fresh || [], remind = p.remind || [];
  fresh.forEach((id) => posted.add(id)); remind.forEach((id) => reminded.add(id)); save(); fs.rmSync(PENDING, { force: true });
  console.log(`marked ${fresh.length} new + ${remind.length} reminders as posted`); process.exit(0);
}

const SITE = 'https://pakjobs-daily.vercel.app';
const PLAY = 'https://play.google.com/store/apps/details?id=com.pakjobs.daily.mza';
const slug = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'job';
const feed = await (await fetch('https://raw.githubusercontent.com/shahidjabbarpk/pakjobs-daily/main/data/jobs.json', { cache: 'no-store' })).json();
const day = (n) => new Date(Date.now() + 5 * 3600e3 + n * 86400e3).toISOString().slice(0, 10); // Pakistan time
const today = day(0), soon = [day(1), day(2)];
const open = feed.jobs.filter((j) => !j.lastDate || j.lastDate >= today);

if (process.argv.includes('--seed')) {
  feed.jobs.forEach((j) => posted.add(j.id)); save();
  console.log(`seeded ${feed.jobs.length} jobs`); process.exit(0);
}

const fresh = open.filter((j) => !posted.has(j.id)).sort((a, b) => String(b.firstSeen).localeCompare(String(a.firstSeen)));
const freshIds = new Set(fresh.map((j) => j.id));
const remind = open.filter((j) => soon.includes(j.lastDate) && !reminded.has(j.id) && !freshIds.has(j.id))
  .sort((a, b) => a.lastDate.localeCompare(b.lastDate));
if (!fresh.length && !remind.length) { fs.rmSync(PENDING, { force: true }); console.log('NONE'); process.exit(0); }

const fmt = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const left = (d) => (d === soon[0] ? 'KAL last date hai!' : 'Sirf 2 din baqi!');
const MAX = 10;
const block = (j, r) =>
  `🔹 ${j.title}${j.grade ? ` (${j.grade})` : ''}\n   🏢 ${j.organization || ''}${j.cities?.length ? `\n   📍 ${j.cities.slice(0, 4).join(', ')}` : ''}${j.qualification ? ` · 🎓 ${j.qualification}` : ''}${j.lastDate ? `\n   ⏳ Last date: ${fmt(j.lastDate)}${r ? ` – ${left(j.lastDate)}` : ''}` : ''}\n   👉 ${SITE}/jobs/${slug(j.title)}-${j.id}`;
const parts = [];
if (fresh.length) parts.push(`${fresh.length === 1 ? '🆕 Nayi Job Aa Gayi!' : `🆕 ${fresh.length} Nayi Jobs Aa Gayi!`}\n\n${fresh.slice(0, MAX).map((j) => block(j)).join('\n\n')}${fresh.length > MAX ? `\n\n➕ ${fresh.length - MAX} aur nayi jobs: ${SITE}/govt-jobs` : ''}`);
if (remind.length) parts.push(`⏰ LAST DATE QAREEB! Jaldi apply karein – ${remind.length === 1 ? 'is job' : `in ${remind.length} jobs`} ki last date 1-2 din mein hai:\n\n${remind.slice(0, MAX).map((j) => block(j, true)).join('\n\n')}${remind.length > MAX ? `\n\n➕ ${remind.length - MAX} aur: ${SITE}/last-date-soon` : ''}`);
const make = (src) => `${parts.join('\n\n━━━━━━━━━━━━\n\n')}

🔔 Har nayi job aur last date ka reminder seedha mobile par (apne district ke hisab se). Free app:
${PLAY}&referrer=utm_source%3D${src}%26utm_medium%3D${fresh.length ? 'new_job' : 'last_date'}

#GovtJobs #PakistanJobs #SarkariNaukri #JobsInPakistan`;
fs.writeFileSync(new URL('facebook.txt', DIR), make('facebook'));
fs.writeFileSync(new URL('whatsapp.txt', DIR), make('whatsapp_channel'));
fs.writeFileSync(PENDING, JSON.stringify({ fresh: fresh.slice(0, MAX).map((j) => j.id).concat(fresh.slice(MAX).map((j) => j.id)), remind: remind.map((j) => j.id) }));
console.log(`NEW ${fresh.length} REMIND ${remind.length}`);
console.log(make('facebook'));
