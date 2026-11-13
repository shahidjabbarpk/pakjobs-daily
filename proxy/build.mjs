// Static SEO pages for pakjobs-daily.vercel.app, generated from the hourly job feed.
// Runs as Vercel's build step (vercel.json buildCommand). Every feed commit redeploys,
// so expired jobs disappear (404) and new ones get their own page within the hour.
//   node build.mjs          -> writes jobs/, jobs-in/, ... sitemap.xml, robots.txt into this folder
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = 'https://pakjobs-daily.vercel.app';
const RAW = 'https://raw.githubusercontent.com/shahidjabbarpk/pakjobs-daily/main/data/';
const PLAY = 'https://play.google.com/store/apps/details?id=com.pakjobs.daily.mza';
const GENERATED = ['jobs', 'jobs-in', 'jobs-by', 'qualification', 'govt-jobs', 'last-date-soon', 'results', 'past-papers', 'guides'];

async function data(name) {
  const local = path.join(HERE, '..', 'data', name);
  if (fs.existsSync(local)) return JSON.parse(fs.readFileSync(local, 'utf8'));
  const r = await fetch(RAW + name);
  if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
  return r.json();
}

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'job';
const todayPK = new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
const nowISO = new Date().toISOString();
const fmtDate = (d) => (d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');
const daysLeft = (d) => Math.round((Date.parse(d) - Date.parse(todayPK)) / 864e5);
const PROVINCES = { Punjab: 'Punjab', Sindh: 'Sindh', Balochistan: 'Balochistan', KPK: 'Khyber Pakhtunkhwa', 'Khyber Pakhtunkhwa': 'Khyber Pakhtunkhwa', AJK: 'Azad Kashmir', 'Gilgit-Baltistan': 'Gilgit-Baltistan', ICT: 'Islamabad' };
const SOURCES = {
  njp: ['National Jobs Portal (NJP)', 'njp-jobs'], nts: ['NTS', 'nts-jobs'], navy: ['Pak Navy', 'pak-navy-jobs'], army: ['Pak Army', 'pak-army-jobs'],
  paf: ['PAF', 'paf-jobs'], ppsc: ['PPSC', 'ppsc-jobs'], fpsc: ['FPSC', 'fpsc-jobs'], kppsc: ['KPPSC', 'kppsc-jobs'], spsc: ['SPSC', 'spsc-jobs'], bpsc: ['BPSC', 'bpsc-jobs'],
};
const QUALS = { Middle: 'middle-pass', Matric: 'matric', Intermediate: 'intermediate', DAE: 'dae', Bachelor: 'bachelor', Masters: 'masters', MPhil: 'mphil', PhD: 'phd' };

function utm(medium) { return `${PLAY}&referrer=${encodeURIComponent(`utm_source=website&utm_medium=${medium}`)}`; }

function layout({ title, desc, canonical, body, jsonld = [], current = '' }) {
  const ld = jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${canonical}">
<meta property="og:image" content="${SITE}/icon.png">
<meta property="og:type" content="website">
<meta name="google-play-app" content="app-id=com.pakjobs.daily.mza">
<link rel="icon" href="/icon.png">
<link rel="stylesheet" href="/site.css">
${ld}
</head>
<body>
<nav class="top"><div class="wrap">
  <a class="brand" href="/"><img src="/icon.png" alt="">PakJobs Daily</a>
  <div class="links"><a href="/govt-jobs"${current === 'govt' ? ' aria-current="page"' : ''}>Govt Jobs</a><a href="/results"${current === 'results' ? ' aria-current="page"' : ''}>Results</a><a href="/guides"${current === 'guides' ? ' aria-current="page"' : ''}>Guides</a></div>
</div></nav>
${body}
<a class="sticky-app" href="${utm('sticky')}" rel="noopener">📲 Get free job alerts in the app</a>
<footer class="wrap">© 2026 PakJobs Daily · <a href="/govt-jobs">Govt jobs</a> · <a href="/last-date-soon">Last date soon</a> · <a href="/past-papers">Past papers</a> · <a href="https://pakjobs-daily-govt-jobs.blogspot.com/">Blog</a> · <a href="https://whatsapp.com/channel/0029VbEVConCnA7mPJEYhb3X" rel="noopener">WhatsApp Channel</a> · <a href="https://www.facebook.com/profile.php?id=61596636206817" rel="noopener">Facebook</a> · <a href="/about">About</a> · <a href="/privacy">Privacy Policy</a> · <a href="mailto:shahidjabbarpk@gmail.com">Contact</a><br><span class="muted">PakJobs Daily is independent and not affiliated with any government body. Always confirm details and apply on the official website. Never pay anyone for a job.</span></footer>
</body>
</html>`;
}

function appBox(medium, text = 'Get an alert the hour a new job for your district is announced, plus reminders before the last date, mock tests, past papers and a free CV maker – in English and Urdu.') {
  return `<section class="app">
    <div><h2>Never miss a job – get the free app</h2><p>${text}</p>
    <a class="play" href="${utm(medium)}" rel="noopener">Download on Google Play</a></div>
    <img src="/icon.png" alt="PakJobs Daily app icon" width="88" height="88" loading="lazy">
  </section>`;
}

function crumbs(items) {
  const html = `<nav class="crumbs">${items.map(([n, u], i) => (i < items.length - 1 ? `<a href="${u}">${esc(n)}</a> › ` : `<span>${esc(n)}</span>`)).join('')}</nav>`;
  const ld = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE + u })) };
  return [html, ld];
}

const jobUrl = (j) => `/jobs/${slug(j.title)}-${j.id}`;
function card(j) {
  const left = j.lastDate ? daysLeft(j.lastDate) : null;
  return `<a class="job" href="${jobUrl(j)}">
    <h3>${esc(j.title)}</h3>
    <div class="co">${esc(j.organization || '')}</div>
    <div class="meta">
      ${j.cities?.length ? `<span>📍 ${esc(j.cities.join(', '))}</span>` : ''}
      ${j.qualification ? `<span>🎓 ${esc(j.qualification)}</span>` : ''}
      ${j.grade ? `<span>🏷️ ${esc(j.grade)}</span>` : ''}
      ${j.lastDate ? `<span class="${left <= 3 ? 'hot' : ''}">⏳ Last date ${fmtDate(j.lastDate)}${left === 0 ? ' (today)' : left > 0 && left <= 3 ? ` (${left} day${left > 1 ? 's' : ''} left)` : ''}</span>` : ''}
    </div>
  </a>`;
}

function listPage({ url, h1, title, desc, intro, jobs, crumbTrail, current, related = '' }) {
  const [crumbHtml, crumbLd] = crumbs(crumbTrail);
  const itemList = { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: jobs.slice(0, 50).map((j, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + jobUrl(j) })) };
  const body = `<main class="wrap page">${crumbHtml}
  <h1>${esc(h1)}</h1>
  <p>${intro}</p>
  <p class="muted">${jobs.length} open job${jobs.length === 1 ? '' : 's'} · updated ${fmtDate(todayPK)}</p>
  ${jobs.length ? jobs.slice(0, 15).map(card).join('') : '<div class="note">No open jobs right now. New jobs are added every hour – get the app to be alerted first.</div>'}
  ${appBox(`list_${slug(url)}`)}
  ${jobs.slice(15).map(card).join('')}
  ${related}
  </main>`;
  return layout({ title, desc, canonical: url, body, jsonld: [crumbLd, itemList], current });
}

function relatedLinks(cityIdx, srcIdx, qualIdx) {
  const a = (arr) => arr.map(([n, u]) => `<a href="${u}">${esc(n)}</a>`).join('');
  return `<section class="related">
    <h2>Jobs by city & province</h2><div class="chipset">${a(cityIdx)}</div>
    <h2>Jobs by department</h2><div class="chipset">${a(srcIdx)}</div>
    <h2>Jobs by qualification</h2><div class="chipset">${a(qualIdx)}</div>
  </section>`;
}

function jobPage(j, related) {
  const url = jobUrl(j);
  const loc = j.cities?.length ? j.cities.join(', ') : 'Pakistan';
  const desc = `${j.title} job at ${j.organization || 'Pakistan'}${j.cities?.length ? ' in ' + loc : ''}${j.qualification ? ', qualification ' + j.qualification : ''}${j.lastDate ? ', last date ' + fmtDate(j.lastDate) : ''}. How to apply, eligibility and official link.`;
  const rows = [
    ['Organization', j.organization], ['Location', loc], ['Pay scale', j.grade], ['Qualification', j.qualification], ['Seats', j.vacancies],
    ['Job type', j.jobType], ['Domicile', j.domicile], ['Age limit', j.ageLimit], ['Advertisement no.', j.advertNo],
    ['Posted on', fmtDate(j.postedDate || (j.firstSeen || '').slice(0, 10))], ['Last date to apply', fmtDate(j.lastDate)],
  ].filter(([, v]) => v !== undefined && v !== null && v !== '');
  const descriptionText = j.description || `${j.organization || 'The department'} has announced vacancies for ${j.title}. Read the official advertisement for full eligibility criteria, documents required and the application method.`;
  const posting = {
    '@context': 'https://schema.org', '@type': 'JobPosting',
    title: j.title,
    description: `<p>${esc(descriptionText).replace(/\n/g, '<br>')}</p>`,
    datePosted: j.postedDate || (j.firstSeen || nowISO).slice(0, 10),
    hiringOrganization: { '@type': 'Organization', name: j.organization || 'Government of Pakistan', sameAs: new URL(j.applyUrl || j.url).origin },
    jobLocation: (j.cities?.length ? j.cities : ['Pakistan']).slice(0, 5).map((c) => ({
      '@type': 'Place', address: { '@type': 'PostalAddress', addressCountry: 'PK', ...(PROVINCES[c] ? { addressRegion: PROVINCES[c] } : c === 'All Pakistan' || c === 'Pakistan' ? {} : { addressLocality: c }) },
    })),
    directApply: false,
    identifier: { '@type': 'PropertyValue', name: 'PakJobs Daily', value: j.id },
  };
  if (j.lastDate) posting.validThrough = `${j.lastDate}T23:59:59+05:00`;
  if (j.jobType) posting.employmentType = /contract/i.test(j.jobType) ? 'CONTRACTOR' : 'FULL_TIME';
  if (j.qualification && j.qualification !== 'Any') posting.educationRequirements = j.qualification;
  if (j.vacancies) posting.totalJobOpenings = j.vacancies;

  const [crumbHtml, crumbLd] = crumbs([['Home', '/'], ['Govt Jobs', '/govt-jobs'], [j.title, url]]);
  const left = j.lastDate ? daysLeft(j.lastDate) : null;
  const shareText = encodeURIComponent(`${j.title} – ${j.organization || ''}${j.lastDate ? ' – last date ' + fmtDate(j.lastDate) : ''}\n${SITE}${url}`);
  const body = `<main class="wrap page">${crumbHtml}
  <h1>${esc(j.title)}</h1>
  <p class="co">${esc(j.organization || '')}</p>
  ${left !== null ? `<p class="deadline${left <= 3 ? ' hot' : ''}">⏳ Last date: <b>${fmtDate(j.lastDate)}</b>${left === 0 ? ' – today is the last day!' : left > 0 ? ` – ${left} day${left > 1 ? 's' : ''} left` : ''}</p>` : ''}
  <table class="facts">${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>
  <h2>Job details</h2>
  <p class="pre">${esc(descriptionText)}</p>
  <h2>How to apply</h2>
  <ol>
    <li>Open the official advertisement / application page below and read the eligibility criteria carefully.</li>
    <li>Prepare your CNIC, domicile, educational certificates and a recent photograph${j.source === 'njp' ? ', and create or log in to your account on the National Jobs Portal' : ''}.</li>
    <li>Apply on the official website before the last date${j.lastDate ? ` (${fmtDate(j.lastDate)})` : ''}. Keep a copy of the submitted form and any fee challan.</li>
  </ol>
  <p class="actions"><a class="btn" href="${esc(j.applyUrl || j.url)}" rel="nofollow noopener" target="_blank">Apply on official website ↗</a>
  ${j.advertImage && j.advertImage !== j.applyUrl ? `<a class="btn ghost" href="${esc(j.advertImage)}" rel="nofollow noopener" target="_blank">View advertisement ↗</a>` : ''}
  <a class="btn wa" href="https://wa.me/?text=${shareText}" rel="noopener" target="_blank">Share on WhatsApp</a></p>
  ${appBox('job_page', 'Save this job in the free PakJobs Daily app and get a reminder 3 days and 1 day before the last date. Prepare with mock tests and past papers, and make your CV in minutes.')}
  <p class="muted">Source: ${esc(new URL(j.url).hostname)}. PakJobs Daily is not affiliated with the hiring department. Details are copied from the official advertisement; if anything differs, the official advertisement is correct. Never pay anyone to get a job.</p>
  ${related}
  </main>`;
  return layout({ title: `${j.title} Job ${j.lastDate ? new Date(j.lastDate).getFullYear() : 2026} – ${j.organization || 'Pakistan'}${j.cities?.[0] ? ', ' + j.cities[0] : ''}`.slice(0, 95), desc: desc.slice(0, 300), canonical: url, body, jsonld: [posting, crumbLd] });
}

// ---------- guides (evergreen content for search) ----------
const GUIDES = [
  ['how-to-apply-on-national-jobs-portal', 'How to Apply for Govt Jobs on the National Jobs Portal (NJP) – Step by Step', 'A simple step-by-step guide to creating an account and applying for federal government jobs on njp.gov.pk.', `
<p>The National Jobs Portal (njp.gov.pk) is the Government of Pakistan's official website where federal ministries, divisions and departments advertise jobs from BPS-1 to BPS-16. Applying is free and done completely online.</p>
<h2>Step 1 – Create your account</h2><p>Open njp.gov.pk and click Register. Enter your CNIC number, mobile number and email. You will receive a verification code by SMS; enter it to activate your account.</p>
<h2>Step 2 – Complete your profile</h2><p>Fill in personal details exactly as on your CNIC, your domicile (province and district), education with marks and year, and any experience. Upload a clear photo. An incomplete profile is the most common reason applications are rejected.</p>
<h2>Step 3 – Find a job</h2><p>Browse the latest jobs or filter by department, scale and domicile. Read the eligibility, age limit and domicile quota for each post – many posts are reserved for specific provinces.</p>
<h2>Step 4 – Apply</h2><p>Click Apply on the post, confirm your details and submit before the last date. You can track your application in your NJP account.</p>
<h2>Tips</h2><ul><li>Apply 2–3 days before the last date; the website is slow on the final day.</li><li>The maximum age limit is often relaxed by 5 years for government employees and by more for some quotas – read the advert.</li><li>Use the <a href="${utm('guide_njp')}">PakJobs Daily app</a> to get an alert for new NJP jobs in your district every hour.</li></ul>`],
  ['ppsc-jobs-preparation-guide', 'PPSC Jobs 2026: How to Apply and Prepare for the Test', 'How to apply for PPSC jobs online, the test pattern, syllabus and the best way to prepare with MCQs and past papers.', `
<p>The Punjab Public Service Commission (PPSC) recruits for Punjab government posts such as Lecturer, Sub-Inspector, Assistant, Tehsildar and many more. Applications are submitted online on ppsc.gop.pk.</p>
<h2>How to apply</h2><ol><li>Create an account on the PPSC website with your CNIC.</li><li>Fill your profile and education details.</li><li>Choose the advertised post and pay the application fee challan at the designated bank or online.</li><li>Submit before the closing date and keep your application ID.</li></ol>
<h2>Test pattern</h2><p>Most PPSC written tests are 100 MCQs in 90 minutes, with negative marking on some tests. General posts include General Knowledge, Pakistan Studies, Islamic Studies, Current Affairs, English, Urdu, Everyday Science, Basic Math and Computer, plus post-specific subjects.</p>
<h2>How to prepare</h2><ul><li>Solve past papers – questions are often repeated.</li><li>Practice timed mock tests so 90 minutes feels comfortable.</li><li>Read current affairs for the last 6 months.</li></ul>
<p>The <a href="${utm('guide_ppsc')}">PakJobs Daily app</a> has free timed PPSC-pattern mock tests, MCQ practice and official past papers.</p>`],
  ['fpsc-jobs-apply-online-guide', 'FPSC Jobs: How to Apply Online, Test Pattern and Preparation', 'A guide to FPSC recruitment: online application, fees, test pattern, interviews and preparation tips.', `
<p>The Federal Public Service Commission (FPSC) recruits for federal posts in BPS-16 and above, as well as the CSS competitive exam. Applications are made online at fpsc.gov.pk.</p>
<h2>How to apply</h2><ol><li>Register on the FPSC website and complete your profile.</li><li>Select the case number of the post you want to apply for.</li><li>Pay the fee and upload the required documents.</li><li>Submit before the closing date. FPSC does not accept late applications.</li></ol>
<h2>Selection process</h2><p>Depending on the number of applicants, FPSC may hold a screening test (MCQs), followed by a professional test and an interview. Shortlisting is merit-based.</p>
<h2>Preparation tips</h2><ul><li>Revise English grammar, General Knowledge, Current Affairs, Pakistan Affairs and Islamic Studies.</li><li>Practise with past papers and timed tests.</li></ul>
<p>Get alerts for new FPSC jobs and practise with mock tests in the <a href="${utm('guide_fpsc')}">PakJobs Daily app</a>.</p>`],
  ['how-to-make-cv-for-govt-job-pakistan', 'How to Make a CV for a Government Job in Pakistan (Free Template)', 'What to include in a CV for government and private jobs in Pakistan, with a free CV maker app.', `
<p>A clear, one-to-two page CV makes a strong first impression for both private jobs and government interviews.</p>
<h2>What to include</h2><ul><li><b>Personal details:</b> name, father's name, CNIC, domicile, phone, email, address.</li><li><b>Objective:</b> two lines about the job you want.</li><li><b>Education:</b> degree, board/university, year and marks or CGPA – latest first.</li><li><b>Experience:</b> organization, post, dates and 2–3 duties.</li><li><b>Skills:</b> computer (MS Office), languages, typing speed.</li><li><b>Certificates and awards.</b></li></ul>
<h2>Common mistakes</h2><ul><li>Spelling errors and a wrong phone number.</li><li>Unclear photos – use a recent, formal photo.</li><li>Writing paragraphs instead of short points.</li></ul>
<p>The <a href="${utm('guide_cv')}">PakJobs Daily app</a> has a free CV maker: fill in your details, add a photo and download a professional PDF in minutes.</p>`],
  ['how-to-avoid-fake-job-scams-pakistan', 'How to Spot Fake Jobs and Job Scams in Pakistan', 'Warning signs of fake job adverts and fraud in Pakistan, and how to verify a job before applying.', `
<p>Every year thousands of job seekers in Pakistan lose money to fake job adverts. Use these checks before you apply.</p>
<h2>Warning signs</h2><ul><li>Someone asks for money to "confirm" your job, for "processing", or for a "medical".</li><li>The advert has no department name, no advertisement number, or only a WhatsApp number.</li><li>Promises of a job without a test or interview.</li><li>Email addresses like gmail/yahoo for a government department.</li></ul>
<h2>How to verify</h2><ul><li>Find the same advert on the department's official .gov.pk website or the National Jobs Portal.</li><li>Pay only official fee challans at banks – never to a person.</li></ul>
<p>Every job on PakJobs Daily links to its official source. Get verified job alerts in the <a href="${utm('guide_scam')}">free app</a>.</p>`],
  ['join-pak-army-navy-paf-guide', 'How to Join Pak Army, Navy or PAF: Eligibility and Registration', 'Eligibility, age limits, registration and selection steps for joining the Pakistan Army, Navy and Air Force.', `
<p>The armed forces induct both commissioned officers and soldiers/sailors/airmen several times a year. Registration is online on the official websites: joinpakarmy.gov.pk, joinpaknavy.gov.pk and joinpaf.gov.pk.</p>
<h2>General eligibility</h2><ul><li>Pakistani citizen, physically fit and unmarried for most cadet courses.</li><li>Officer courses usually need Intermediate (FA/FSc) with good marks, or a bachelor's degree for graduate courses.</li><li>Age limits differ by course – usually 17 to 22 years for cadets.</li></ul>
<h2>Selection steps</h2><ol><li>Online registration.</li><li>Written intelligence and academic test.</li><li>Physical and medical tests.</li><li>Interview and ISSB/selection board (for officers).</li></ol>
<p>Get an alert the moment a new course opens in the <a href="${utm('guide_armed')}">PakJobs Daily app</a>, which also has armed-forces style mock tests.</p>`],
];

// ---------- build ----------
async function main() {
  // extra guides: proxy/content/*.mjs, each `export default (utm) => [[slug, title, description, html], ...]`
  const cdir = path.join(HERE, 'content');
  if (fs.existsSync(cdir)) for (const f of fs.readdirSync(cdir).filter((f) => f.endsWith('.mjs')).sort()) GUIDES.push(...(await import(pathToFileURL(path.join(cdir, f)).href)).default(utm));
  const [{ jobs: all }, upd, pap] = await Promise.all([data('jobs.json'), data('updates.json').catch(() => ({ updates: [] })), data('papers.json').catch(() => ({ papers: [] }))]);
  for (const d of GENERATED) fs.rmSync(path.join(HERE, d), { recursive: true, force: true });

  const cutoff = Date.parse(todayPK) - 30 * 864e5;
  const jobs = all
    .filter((j) => j.id && j.title && j.url && (j.lastDate ? j.lastDate >= todayPK : Date.parse(j.firstSeen || j.postedDate || 0) >= cutoff))
    .sort((a, b) => String(b.firstSeen || b.postedDate).localeCompare(String(a.firstSeen || a.postedDate)));

  const pages = []; // [url, html]
  const add = (url, html) => pages.push([url, html]);

  // groupings
  const group = (keyFn) => { const m = new Map(); for (const j of jobs) for (const k of [].concat(keyFn(j) || [])) { if (!m.has(k)) m.set(k, []); m.get(k).push(j); } return m; };
  const byCity = group((j) => (j.cities || []).filter((c) => c && c !== 'All Pakistan' && c !== 'ICT'));
  const bySrc = group((j) => (SOURCES[j.source] ? j.source : null));
  const byQual = group((j) => (QUALS[j.qualification] ? j.qualification : null));
  const cityIdx = [...byCity].sort((a, b) => b[1].length - a[1].length).map(([c, l]) => [`${c} (${l.length})`, `/jobs-in/${slug(c)}`]);
  const srcIdx = [...bySrc].map(([s, l]) => [`${SOURCES[s][0]} (${l.length})`, `/jobs-by/${SOURCES[s][1]}`]);
  const qualIdx = Object.keys(QUALS).filter((q) => byQual.has(q)).map((q) => [`${q} (${byQual.get(q).length})`, `/qualification/${QUALS[q]}`]);
  const related = relatedLinks(cityIdx, srcIdx, qualIdx);

  for (const j of jobs) add(jobUrl(j), jobPage(j, related));

  add('/govt-jobs', listPage({
    url: '/govt-jobs', h1: 'Latest Govt Jobs in Pakistan 2026', title: `Latest Govt Jobs in Pakistan ${todayPK.slice(0, 4)} – Today's New Vacancies`,
    desc: `${jobs.length} open government jobs in Pakistan from NJP, PPSC, FPSC, KPPSC, SPSC, BPSC, NTS, Army, Navy and PAF. Updated every hour with last dates.`,
    intro: 'All open government vacancies in Pakistan, collected every hour from the National Jobs Portal, public service commissions, NTS and the armed forces. Newest jobs first; each job links to its official advertisement.',
    jobs, crumbTrail: [['Home', '/'], ['Govt Jobs', '/govt-jobs']], current: 'govt', related,
  }));
  const soon = jobs.filter((j) => j.lastDate && daysLeft(j.lastDate) <= 7).sort((a, b) => a.lastDate.localeCompare(b.lastDate));
  add('/last-date-soon', listPage({
    url: '/last-date-soon', h1: 'Jobs Closing This Week – Last Date Soon', title: 'Govt Jobs Closing Soon in Pakistan – Last Date This Week',
    desc: `${soon.length} government jobs in Pakistan whose last date is within 7 days. Apply before it is too late.`,
    intro: 'These government jobs close within the next 7 days, soonest first. Apply on the official website before the last date.',
    jobs: soon, crumbTrail: [['Home', '/'], ['Last date soon', '/last-date-soon']], related,
  }));
  for (const [c, l] of byCity) {
    const prov = PROVINCES[c];
    add(`/jobs-in/${slug(c)}`, listPage({
      url: `/jobs-in/${slug(c)}`, h1: `Govt Jobs in ${c} 2026`, title: `Govt Jobs in ${c} ${todayPK.slice(0, 4)} – Latest Vacancies (${l.length} open)`,
      desc: `${l.length} latest government jobs in ${c}${prov ? ' province' : ''}. Matric, intermediate and bachelor jobs with last dates and official apply links. Updated hourly.`,
      intro: `Latest open government jobs ${prov ? `for ${prov} domicile and posts in ${prov}` : `in ${c}`}, updated every hour from official sources.`,
      jobs: l, crumbTrail: [['Home', '/'], ['Govt Jobs', '/govt-jobs'], [c, `/jobs-in/${slug(c)}`]], related,
    }));
  }
  for (const [s, l] of bySrc) {
    const [name, sl] = SOURCES[s];
    add(`/jobs-by/${sl}`, listPage({
      url: `/jobs-by/${sl}`, h1: `${name} Jobs 2026`, title: `${name} Jobs ${todayPK.slice(0, 4)} – Latest Advertisements & Last Dates`,
      desc: `${l.length} latest ${name} jobs with last dates, eligibility and official apply links. Get alerts for new ${name} jobs.`,
      intro: `All open ${name} jobs and advertisements, checked every hour.`, jobs: l,
      crumbTrail: [['Home', '/'], ['Govt Jobs', '/govt-jobs'], [name, `/jobs-by/${sl}`]], related,
    }));
  }
  for (const [q, l] of byQual) {
    add(`/qualification/${QUALS[q]}`, listPage({
      url: `/qualification/${QUALS[q]}`, h1: `${q} Base Govt Jobs 2026`, title: `${q} Base Govt Jobs in Pakistan ${todayPK.slice(0, 4)} (${l.length} open)`,
      desc: `${l.length} government jobs in Pakistan for ${q} pass candidates, with pay scale, last date and official links.`,
      intro: `Open government jobs where the minimum qualification is ${q}.`, jobs: l,
      crumbTrail: [['Home', '/'], ['Govt Jobs', '/govt-jobs'], [q, `/qualification/${QUALS[q]}`]], related,
    }));
  }

  // results / roll no slips
  const updates = (upd.updates || []).slice(0, 80);
  const KIND = { result: 'Result', rollno: 'Roll No Slip', schedule: 'Test Schedule', interview: 'Interview', merit: 'Merit List' };
  const [rc, rl] = crumbs([['Home', '/'], ['Results & Roll No Slips', '/results']]);
  add('/results', layout({
    title: 'PPSC, FPSC, KPPSC, SPSC Results, Roll No Slips & Test Schedules 2026', desc: 'Latest results, roll number slips, interview calls and test schedules from Pakistan\'s public service commissions and NTS, updated every hour.',
    canonical: '/results', current: 'results', jsonld: [rl],
    body: `<main class="wrap page">${rc}<h1>Results, Roll No Slips & Test Schedules</h1>
    <p>The latest announcements from the public service commissions and testing services. Each link opens the official file.</p>
    <ul class="updates">${updates.map((u) => `<li><span class="tag">${esc(KIND[u.kind] || 'Update')}</span> <b>${esc(String(u.source || '').toUpperCase())}</b> – <a href="${esc(u.url)}" rel="nofollow noopener" target="_blank">${esc(u.title)}</a> <span class="muted">${fmtDate((u.date || u.firstSeen || '').slice(0, 10))}</span></li>`).join('')}</ul>
    ${appBox('results', 'Get a notification as soon as your result, roll number slip or interview call is announced.')}</main>`,
  }));

  // past papers
  const papers = (pap.papers || []).slice(0, 200);
  const [pc, pl] = crumbs([['Home', '/'], ['Past Papers', '/past-papers']]);
  add('/past-papers', layout({
    title: 'KPPSC & SPSC Past Papers PDF – Official Solved Papers', desc: 'Official past papers from KPPSC and SPSC, plus free PPSC, FPSC and NTS pattern mock tests in the PakJobs Daily app.',
    canonical: '/past-papers', jsonld: [pl],
    body: `<main class="wrap page">${pc}<h1>Official Past Papers</h1>
    <p>Past papers published by the commissions themselves. Practising past papers is the fastest way to learn the test pattern – many questions repeat.</p>
    ${appBox('papers', 'Read these papers inside the app and take free timed mock tests in the PPSC, FPSC, KPPSC, SPSC, NTS and armed-forces pattern.')}
    <ul class="updates">${papers.map((p) => `<li><b>${esc(String(p.source || '').toUpperCase())}</b> – <a href="${esc(p.url)}" rel="nofollow noopener" target="_blank">${esc(p.title)}</a></li>`).join('')}</ul></main>`,
  }));

  // guides
  const [gc, gl] = crumbs([['Home', '/'], ['Guides', '/guides']]);
  add('/guides', layout({
    title: 'Job Guides for Pakistan – Apply Online, Tests, CV & More', desc: 'Free guides for job seekers in Pakistan: NJP, PPSC and FPSC applications, test preparation, CV writing, armed forces and avoiding scams.',
    canonical: '/guides', current: 'guides', jsonld: [gl],
    body: `<main class="wrap page">${gc}<h1>Guides for job seekers</h1><ul class="updates">${GUIDES.map(([s, t, d]) => `<li><a href="/guides/${s}"><b>${esc(t)}</b></a><br><span class="muted">${esc(d)}</span></li>`).join('')}</ul>${appBox('guides')}</main>`,
  }));
  for (const [s, t, d, html] of GUIDES) {
    const [c, l] = crumbs([['Home', '/'], ['Guides', '/guides'], [t, `/guides/${s}`]]);
    const art = { '@context': 'https://schema.org', '@type': 'Article', headline: t, description: d, author: { '@type': 'Organization', name: 'PakJobs Daily' }, publisher: { '@type': 'Organization', name: 'PakJobs Daily', logo: { '@type': 'ImageObject', url: SITE + '/icon.png' } }, datePublished: '2026-11-13', dateModified: todayPK, mainEntityOfPage: SITE + `/guides/${s}` };
    add(`/guides/${s}`, layout({ title: t, desc: d, canonical: `/guides/${s}`, current: 'guides', jsonld: [art, l], body: `<main class="wrap page article">${c}<h1>${esc(t)}</h1>${html}${appBox('guide_' + s.slice(0, 20))}<h2>Latest jobs</h2>${jobs.slice(0, 5).map(card).join('')}<p><a href="/govt-jobs">See all govt jobs →</a></p></main>` }));
  }

  // write pages (cleanUrls: /x -> x.html, /x/y -> x/y.html)
  for (const [url, html] of pages) {
    const file = path.join(HERE, url.slice(1) + '.html');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, html);
  }

  // home page: inject latest govt jobs + links (between markers)
  const homeFile = path.join(HERE, 'index.html');
  const home = fs.readFileSync(homeFile, 'utf8');
  const block = `<!--GOVT-->
  <section class="govt"><div class="bar"><h2>Latest govt jobs</h2><a href="/govt-jobs">All ${jobs.length} govt jobs →</a></div>
  ${jobs.slice(0, 8).map(card).join('')}
  ${relatedLinks(cityIdx.slice(0, 14), srcIdx, qualIdx)}</section>
  <!--/GOVT-->`;
  fs.writeFileSync(homeFile, home.replace(/<!--GOVT-->[\s\S]*?<!--\/GOVT-->/, block));

  const statics = ['/', '/about', '/privacy'];
  const urls = [...statics, ...pages.map(([u]) => u)];
  fs.writeFileSync(path.join(HERE, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${SITE}${u}</loc><lastmod>${todayPK}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(HERE, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${SITE}/sitemap.xml\n`);
  console.log(`built ${pages.length} pages (${jobs.length} open jobs of ${all.length}), sitemap ${urls.length} urls`);
}

main().catch((e) => { console.error(e); process.exit(1); });
