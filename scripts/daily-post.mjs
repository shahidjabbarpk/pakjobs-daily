// Ready-to-paste social post of today's new govt jobs (Facebook groups/page, WhatsApp channel/status, Telegram).
//   node scripts/daily-post.mjs            -> jobs first seen in the last 24 h
//   node scripts/daily-post.mjs 48         -> last 48 h
// Writes marketing/daily-post.txt and prints it.
import fs from 'node:fs';
const hours = +process.argv[2] || 24;
const SITE = 'https://pakjobs-daily.vercel.app';
const PLAY = 'https://play.google.com/store/apps/details?id=com.pakjobs.daily.mza';
const slug = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'job';
const feed = await (await fetch('https://raw.githubusercontent.com/shahidjabbarpk/pakjobs-daily/main/data/jobs.json')).json();
const since = Date.now() - hours * 3600e3;
const today = new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
let jobs = feed.jobs.filter((j) => Date.parse(j.firstSeen) >= since && (!j.lastDate || j.lastDate >= today));
if (!jobs.length) jobs = feed.jobs.filter((j) => j.lastDate && j.lastDate >= today).sort((a, b) => a.lastDate.localeCompare(b.lastDate)).slice(0, 8);
const fmt = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const lines = jobs.slice(0, 12).map((j) =>
  `🔹 ${j.title}${j.grade ? ` (${j.grade})` : ''}\n   🏢 ${j.organization || ''}${j.cities?.length ? `\n   📍 ${j.cities.join(', ')}` : ''}${j.qualification ? ` · 🎓 ${j.qualification}` : ''}${j.lastDate ? `\n   ⏳ Last date: ${fmt(j.lastDate)}` : ''}\n   👉 ${SITE}/jobs/${slug(j.title)}-${j.id}`);
const post = `📢 Aaj ki nayi Sarkari Naukriyan – ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}

${lines.join('\n\n')}
${jobs.length > 12 ? `\n➕ ${jobs.length - 12} aur jobs: ${SITE}/govt-jobs\n` : ''}
🔔 Har nayi job ka alert seedha mobile par – apne district ke hisab se, last date reminder ke sath. Free app:
${PLAY}&referrer=utm_source%3Dsocial%26utm_medium%3Ddaily_post

Share karein – kisi ki naukri lag sakti hai 🤲
#GovtJobs #PakistanJobs #SarkariNaukri #NTS #PPSC #FPSC #JobsInPakistan`;
fs.mkdirSync(new URL('../marketing/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../marketing/daily-post.txt', import.meta.url), post);
console.log(post);
