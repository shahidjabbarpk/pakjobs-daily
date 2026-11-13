// Daily ASO tracker: where does PakJobs rank in Play Store search (Pakistan) for our keywords?
//   node scripts/aso-rank.mjs   -> appends to marketing/aso-ranks.csv and prints today's table + change vs last run
import fs from 'node:fs';
const APP = 'com.pakjobs.daily.mza';
const KEYWORDS = [
  'govt jobs', 'govt jobs pakistan', 'jobs in pakistan', 'pakistan jobs', 'sarkari naukri', 'job alert',
  'ppsc', 'fpsc', 'nts', 'njp', 'pak army jobs', 'police jobs', 'jobs app', 'naukri', 'mock test ppsc', 'cv maker',
  'سرکاری نوکری', 'نوکریاں',
];
const CSV = new URL('../marketing/aso-ranks.csv', import.meta.url);
const today = new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);

async function rank(kw) {
  const url = `https://play.google.com/store/search?q=${encodeURIComponent(kw)}&c=apps&hl=en&gl=PK`;
  const html = await (await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36', 'accept-language': 'en-PK,en' } })).text();
  const ids = [];
  for (const m of html.matchAll(/details\?id=([A-Za-z0-9._]+)/g)) if (!ids.includes(m[1])) ids.push(m[1]);
  const pos = ids.indexOf(APP);
  return { pos: pos < 0 ? '' : pos + 1, top: ids.slice(0, 3).join(' ') };
}

const prev = {};
if (fs.existsSync(CSV)) for (const l of fs.readFileSync(CSV, 'utf8').trim().split('\n').slice(1)) { const [d, k, p] = l.split(','); if (d !== today) prev[k] = p; }
else fs.writeFileSync(CSV, 'date,keyword,rank,top3\n');
const rows = [];
for (const kw of KEYWORDS) {
  let r = { pos: 'ERR', top: '' };
  try { r = await rank(kw); } catch {}
  rows.push([kw, r.pos, r.top]);
  fs.appendFileSync(CSV, `${today},${kw.replace(/,/g, ' ')},${r.pos},${r.top}\n`);
  await new Promise((s) => setTimeout(s, 1500));
}
console.log(`ASO ranks ${today} (Play search, PK; blank = not in first results)`);
for (const [kw, p] of rows) {
  const old = prev[kw];
  const diff = p && old ? (old - p > 0 ? ` ▲${old - p}` : old - p < 0 ? ` ▼${p - old}` : ' =') : p && !old ? ' NEW' : '';
  console.log(`${kw.padEnd(22)} ${String(p || '-').padStart(3)}${diff}`);
}
