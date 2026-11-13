// Generates Blogger posts (HTML) for pakjobs-daily-govt-jobs.blogspot.com into marketing/blogger/html/.
// Posts are short, original write-ups that send readers to the full pages on the website + the app.
//   node marketing/blogger/make-posts.mjs            -> evergreen posts (once) + this week's job roundup
import fs from 'node:fs';
const OUT = new URL('./html/', import.meta.url);
fs.mkdirSync(OUT, { recursive: true });
const SITE = 'https://pakjobs-daily.vercel.app';
const PLAY = 'https://play.google.com/store/apps/details?id=com.pakjobs.daily.mza&referrer=utm_source%3Dblogger%26utm_medium%3D';
const slug = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'job';
const cta = (m) => `<div style="background:#e9f7ef;border:1px solid #17A45C;border-radius:12px;padding:14px 16px;margin:18px 0"><b>📲 Har nayi sarkari naukri ka alert – free app</b><br>Apne district ki nayi jobs ka notification, last date reminder, mock tests, past papers aur CV maker – English aur Urdu mein.<br><a href="${PLAY}${m}" style="display:inline-block;margin-top:8px;background:#006400;color:#fff;padding:8px 14px;border-radius:8px;text-decoration:none;font-weight:bold">Download PakJobs Daily (Google Play)</a></div>`;
const fmt = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const posts = [];

// ---- weekly roundup from the live feed ----
const feed = await (await fetch('https://raw.githubusercontent.com/shahidjabbarpk/pakjobs-daily/main/data/jobs.json')).json();
const today = new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
const open = feed.jobs.filter((j) => !j.lastDate || j.lastDate >= today).sort((a, b) => String(b.firstSeen).localeCompare(String(a.firstSeen)));
const byOrg = new Map();
for (const j of open) { const k = j.organization || 'Other'; if (!byOrg.has(k)) byOrg.set(k, []); byOrg.get(k).push(j); }
const weekTitle = `Latest Govt Jobs in Pakistan – ${fmt(today)} (${open.length} open vacancies)`;
posts.push([`roundup-${today}`, weekTitle, ['Govt Jobs', 'Weekly Jobs'], `
<p>Is hafte Pakistan mein <b>${open.length} sarkari naukriyan</b> open hain – National Jobs Portal, NTS, Pak Navy, PAF, SPSC, BPSC aur doosre idaron se. Neeche department-wise list hai; har job par click karke poori detail, eligibility aur official apply link dekhein.</p>
${[...byOrg].slice(0, 25).map(([org, l]) => `<h3>${org} (${l.length})</h3><ul>${l.slice(0, 6).map((j) => `<li><a href="${SITE}/jobs/${slug(j.title)}-${j.id}">${j.title}</a>${j.grade ? ` – ${j.grade}` : ''}${j.qualification ? ` – ${j.qualification}` : ''}${j.lastDate ? ` – <b>last date ${fmt(j.lastDate)}</b>` : ''}</li>`).join('')}</ul>`).join('')}
<p>👉 Poori list: <a href="${SITE}/govt-jobs">All govt jobs</a> · <a href="${SITE}/last-date-soon">Is hafte band hone wali jobs</a> · <a href="${SITE}/results">Results & roll no slips</a></p>
${cta('roundup')}
<p><small>PakJobs Daily kisi sarkari idare se mutaliq nahi. Har job ka official ishtihar zaroor check karein aur sirf official website par apply karein. Naukri ke liye kabhi kisi ko paise na dein.</small></p>`]);

// ---- evergreen posts (short original takes, full guide on the website) ----
const ever = [
  ['How to Apply for Govt Jobs Online in Pakistan (NJP, PPSC, FPSC, NTS)', ['Guides', 'Apply Online'], 'how-to-apply-on-national-jobs-portal', `
<p>Aaj kal Pakistan mein zyada tar sarkari naukriyon ke liye <b>online apply</b> hota hai. Har idare ka tareeqa thora mukhtalif hai, lekin basic steps aik jaise hain:</p>
<ol><li><b>Ishtihar ghaur se parhein:</b> post, seats, taleem, age limit, domicile aur last date.</li><li><b>Account banayein:</b> NJP, PPSC, FPSC ya NTS ki official website par CNIC ke sath.</li><li><b>Profile mukammal karein:</b> naam bilkul CNIC jaisa, taleem marks ke sath, tasveer.</li><li><b>Fee</b> sirf official challan / online tareeqe se jama karein.</li><li><b>Last date se 2–3 din pehle</b> submit karein – aakhri din website slow hoti hai.</li></ol>
<p>Har idare ki step-by-step guide: <a href="${SITE}/guides/how-to-apply-on-national-jobs-portal">NJP</a> · <a href="${SITE}/guides/ppsc-jobs-preparation-guide">PPSC</a> · <a href="${SITE}/guides/fpsc-jobs-apply-online-guide">FPSC</a> · <a href="${SITE}/guides/kppsc-spsc-bpsc-how-to-apply">KPPSC/SPSC/BPSC</a> · <a href="${SITE}/guides/nts-test-pattern-and-preparation">NTS</a></p>`],
  ['Matric Base Govt Jobs in Pakistan – Kaise Dhoondein aur Apply Karein', ['Matric Jobs', 'Govt Jobs'], 'matric', `
<p>Matric pass candidates ke liye har mahine bohat si sarkari naukriyan aati hain: clerk, computer operator, driver, police constable, naib qasid, security staff aur armed forces ki bharti.</p>
<h3>Kahan dekhein</h3><ul><li><a href="${SITE}/qualification/matric">Matric base jobs (live list)</a></li><li><a href="${SITE}/qualification/middle-pass">Middle pass jobs</a> · <a href="${SITE}/qualification/intermediate">Intermediate jobs</a></li></ul>
<h3>Tips</h3><ul><li>Domicile aur CNIC pehle se tayyar rakhein – <a href="${SITE}/guides/domicile-certificate-for-govt-jobs">domicile guide</a>.</li><li>Clerk posts ke liye typing speed practice karein.</li><li>Age limit ishtihar ki date ke hisab se calculate karein – <a href="${SITE}/guides/age-relaxation-govt-jobs-pakistan">age relaxation guide</a>.</li></ul>`],
  ['BPS Scale Kya Hai? BPS-1 se BPS-22 Asaan Alfaaz Mein', ['Guides', 'Salary'], 'bps', `
<p>Har sarkari job ke sath <b>BPS</b> (Basic Pay Scale) likha hota hai. Ye post ka darja batata hai: BPS-1 se 4 support staff, 11 se 15 clerk/assistant aur junior teachers, 16 senior posts, aur 17 ya upar officer grade.</p>
<p>Salary basic pay + allowances (house rent, conveyance, medical) se banti hai, aur hukoomat waqtan-fawaqtan scales revise karti hai – is liye hamesha latest official notification dekhein.</p>
<p>Tafseel se parhein: <a href="${SITE}/guides/bps-pay-scale-explained">BPS pay scale explained</a>.</p>`],
  ['Fake Jobs Se Kaise Bachein – 5 Nishaniyan', ['Guides', 'Scam Alert'], 'scam', `
<p>Har saal hazaron log naukri ke naam par dhoka khate hain. Ye 5 nishaniyan yaad rakhein:</p>
<ol><li>Koi "job confirm" karne ke liye paise maange.</li><li>Ishtihar mein department ka naam ya advertisement number na ho.</li><li>Sirf WhatsApp number diya ho.</li><li>Baghair test/interview ke naukri ka wada.</li><li>Sarkari idare ke naam se gmail/yahoo email.</li></ol>
<p>Hamesha job ko official .gov.pk website ya National Jobs Portal par confirm karein. Poori guide: <a href="${SITE}/guides/how-to-avoid-fake-job-scams-pakistan">fake job scams</a>.</p>`],
  ['Job Interview Ki Tayari – Sarkari Naukri Interview Tips', ['Guides', 'Interview'], 'interview', `
<p>Written test pass karne ke baad interview final merit ka faisla karta hai. Kuch aham baatein:</p>
<ul><li>Saare original documents aur attested copies file mein rakhein.</li><li>Saaf, simple formal kapre pehnein.</li><li>"Apne baare mein batayein" aur "ye job kyun chahiye" ke jawab pehle se soch lein.</li><li>Current affairs aur apne subject ki basic baatein revise karein.</li><li>Jo sawal na aaye, adab se bata dein – andaza na lagayein.</li></ul>
<p>Poori guide: <a href="${SITE}/guides/job-interview-tips-pakistan">job interview tips</a> · <a href="${SITE}/guides/job-application-letter-format">application letter format</a>.</p>`],
];
for (const [title, labels, m, html] of ever) posts.push([slug(title), title, labels, html + cta('post_' + m)]);

for (const [s, title, labels, html] of posts) fs.writeFileSync(new URL(`${s}.html`, OUT), html.trim());
fs.writeFileSync(new URL('./index.json', import.meta.url), JSON.stringify(posts.map(([s, title, labels]) => ({ file: `html/${s}.html`, title, labels })), null, 1));
console.log(posts.map(([s, t]) => `${s}.html  ${t}`).join('\n'));
