// Posts for jobs that appeared since the last run (for the hourly own-channel auto-post task).
//   node scripts/new-jobs-post.mjs          -> writes marketing/new-jobs/{facebook,whatsapp}.txt + pending.json, prints "NEW <n>" or "NONE"
//   node scripts/new-jobs-post.mjs --done   -> marks pending jobs as posted (run only after BOTH posts succeeded)
//   node scripts/new-jobs-post.mjs --seed   -> marks every current job as already posted (first-time setup)
// State: marketing/new-jobs/posted.json (local only, gitignored).
import fs from 'node:fs';
const DIR = new URL('../marketing/new-jobs/', import.meta.url);
fs.mkdirSync(DIR, { recursive: true });
const STATE = new URL('posted.json', DIR), PENDING = new URL('pending.json', DIR);
const posted = new Set(fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : []);
const save = () => fs.writeFileSync(STATE, JSON.stringify([...posted].slice(-5000)));

if (process.argv.includes('--done')) {
  const ids = fs.existsSync(PENDING) ? JSON.parse(fs.readFileSync(PENDING, 'utf8')) : [];
  ids.forEach((id) => posted.add(id)); save(); fs.rmSync(PENDING, { force: true });
  console.log(`marked ${ids.length} as posted`); process.exit(0);
}

const SITE = 'https://pakjobs-daily.vercel.app';
const PLAY = 'https://play.google.com/store/apps/details?id=com.pakjobs.daily.mza';
const slug = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'job';
const feed = await (await fetch('https://raw.githubusercontent.com/shahidjabbarpk/pakjobs-daily/main/data/jobs.json', { cache: 'no-store' })).json();
const today = new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
const open = feed.jobs.filter((j) => !j.lastDate || j.lastDate >= today);

if (process.argv.includes('--seed')) {
  feed.jobs.forEach((j) => posted.add(j.id)); save();
  console.log(`seeded ${feed.jobs.length} jobs`); process.exit(0);
}

const fresh = open.filter((j) => !posted.has(j.id)).sort((a, b) => String(b.firstSeen).localeCompare(String(a.firstSeen)));
if (!fresh.length) { fs.rmSync(PENDING, { force: true }); console.log('NONE'); process.exit(0); }

const fmt = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const MAX = 10;
const block = (j) =>
  `🔹 ${j.title}${j.grade ? ` (${j.grade})` : ''}\n   🏢 ${j.organization || ''}${j.cities?.length ? `\n   📍 ${j.cities.slice(0, 4).join(', ')}` : ''}${j.qualification ? ` · 🎓 ${j.qualification}` : ''}${j.lastDate ? `\n   ⏳ Last date: ${fmt(j.lastDate)}` : ''}\n   👉 ${SITE}/jobs/${slug(j.title)}-${j.id}`;
const head = fresh.length === 1 ? '🆕 Nayi Job Aa Gayi!' : `🆕 ${fresh.length} Nayi Jobs Aa Gayi!`;
const make = (src) => `${head}

${fresh.slice(0, MAX).map(block).join('\n\n')}
${fresh.length > MAX ? `\n➕ ${fresh.length - MAX} aur nayi jobs: ${SITE}/govt-jobs\n` : ''}
🔔 Har nayi job ka alert seedha mobile par (apne district ke hisab se). Free app:
${PLAY}&referrer=utm_source%3D${src}%26utm_medium%3Dnew_job

#GovtJobs #PakistanJobs #SarkariNaukri #JobsInPakistan`;
fs.writeFileSync(new URL('facebook.txt', DIR), make('facebook'));
fs.writeFileSync(new URL('whatsapp.txt', DIR), make('whatsapp_channel'));
fs.writeFileSync(PENDING, JSON.stringify(fresh.map((j) => j.id)));
console.log(`NEW ${fresh.length}`);
console.log(make('facebook'));
