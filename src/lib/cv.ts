import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export interface CvRow {
  a: string; // degree / position
  b: string; // institute / organisation
  c: string; // year & marks / duration
}

export interface CvData {
  name: string;
  father: string;
  cnic: string;
  dob: string;
  phone: string;
  email: string;
  address: string;
  objective: string;
  education: CvRow[];
  experience: CvRow[];
  skills: string;
  languages: string;
}

export const EMPTY_CV: CvData = {
  name: '', father: '', cnic: '', dob: '', phone: '', email: '', address: '',
  objective: 'Seeking a challenging position where I can use my skills and dedication to contribute to the organisation and grow professionally.',
  education: [{ a: '', b: '', c: '' }],
  experience: [],
  skills: '',
  languages: 'Urdu, English',
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function rows(list: CvRow[], heads: [string, string, string]) {
  const filled = list.filter((r) => r.a.trim() || r.b.trim());
  if (!filled.length) return '';
  return `<table><thead><tr>${heads.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${filled
    .map((r) => `<tr><td>${esc(r.a)}</td><td>${esc(r.b)}</td><td>${esc(r.c)}</td></tr>`)
    .join('')}</tbody></table>`;
}

function chips(csv: string) {
  return csv.split(',').map((x) => x.trim()).filter(Boolean).map((x) => `<span class="chip">${esc(x)}</span>`).join('');
}

export function cvHtml(d: CvData): string {
  const info: [string, string][] = [
    ["Father's Name", d.father], ['CNIC', d.cnic], ['Date of Birth', d.dob],
    ['Phone', d.phone], ['Email', d.email], ['Address', d.address],
  ];
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { margin: 28px; }
  body { font-family: Helvetica, Arial, sans-serif; color: #1b2a22; font-size: 12.5px; }
  .head { background: linear-gradient(135deg,#003300,#006400); color: #fff; padding: 22px 26px; border-radius: 14px; }
  .head h1 { margin: 0; font-size: 26px; letter-spacing: .5px; }
  .head p { margin: 6px 0 0; opacity: .9; }
  h2 { color: #006400; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #006400; padding-bottom: 4px; margin: 22px 0 10px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 22px; }
  .grid div b { display: inline-block; min-width: 105px; color: #5d6e65; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f1f3f5; text-align: left; padding: 7px 8px; font-size: 11.5px; color: #006400; }
  td { padding: 7px 8px; border-bottom: 1px solid #e1e9e4; }
  .chip { display: inline-block; background: #e4f3e4; color: #003300; padding: 4px 10px; border-radius: 12px; margin: 0 6px 6px 0; font-size: 11.5px; }
  .foot { margin-top: 30px; color: #93a39a; font-size: 10px; text-align: center; }
  </style></head><body>
  <div class="head"><h1>${esc(d.name || 'Your Name')}</h1><p>${esc([d.phone, d.email].filter(Boolean).join('  •  '))}</p></div>
  ${d.objective.trim() ? `<h2>Career Objective</h2><p>${esc(d.objective)}</p>` : ''}
  <h2>Personal Information</h2>
  <div class="grid">${info.filter(([, v]) => v.trim()).map(([k, v]) => `<div><b>${k}</b> ${esc(v)}</div>`).join('')}</div>
  ${d.education.some((r) => r.a.trim()) ? `<h2>Education</h2>${rows(d.education, ['Degree / Class', 'Board / Institute', 'Year & Marks'])}` : ''}
  ${d.experience.some((r) => r.a.trim()) ? `<h2>Experience</h2>${rows(d.experience, ['Position', 'Organisation', 'Duration'])}` : ''}
  ${d.skills.trim() ? `<h2>Skills</h2>${chips(d.skills)}` : ''}
  ${d.languages.trim() ? `<h2>Languages</h2>${chips(d.languages)}` : ''}
  <h2>Declaration</h2><p>I hereby declare that the information given above is true to the best of my knowledge.</p>
  <div class="foot">Made with PakJobs Daily</div>
  </body></html>`;
}

/** Renders the CV to a PDF and opens the share sheet (WhatsApp, email, save to files…). */
export async function exportCv(d: CvData): Promise<void> {
  const html = cvHtml(d);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'CV', UTI: 'com.adobe.pdf' });
  } else {
    await Print.printAsync({ uri });
  }
}
