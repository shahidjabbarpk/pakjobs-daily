import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { buildMock, type Exam } from '@/data/exams';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * A printable practice paper for an exam (fresh random questions) with the answer key on the last page,
 * saved as PDF and handed to the share sheet - so it can be kept offline, printed or sent on WhatsApp.
 */
export async function exportPracticePaper(exam: Exam): Promise<void> {
  const qs = buildMock(exam);
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { margin: 26px; }
  body { font-family: Helvetica, Arial, sans-serif; color: #1b2a22; font-size: 12.5px; }
  h1 { font-size: 20px; margin: 0; color: #003300; }
  .meta { color: #5d6e65; margin: 4px 0 16px; }
  .q { margin-bottom: 12px; page-break-inside: avoid; }
  .q b { display: block; margin-bottom: 4px; }
  .o { display: inline-block; width: 46%; margin: 2px 0; }
  .key { page-break-before: always; }
  .key span { display: inline-block; width: 18%; margin: 3px 0; }
  .foot { margin-top: 20px; color: #93a39a; font-size: 10px; text-align: center; }
  </style></head><body>
  <h1>${esc(exam.name)} Practice Paper</h1>
  <div class="meta">${qs.length} MCQs &nbsp;•&nbsp; ${exam.minutes} minutes &nbsp;•&nbsp; Practice paper, not an official past paper</div>
  ${qs.map((q, i) => `<div class="q"><b>${i + 1}. ${esc(q.q)}</b>${q.o.map((o, j) => `<span class="o">(${'ABCD'[j]}) ${esc(o)}</span>`).join('')}</div>`).join('')}
  <div class="key"><h1>Answer Key</h1><div class="meta">Check yourself after attempting the paper.</div>
  ${qs.map((q, i) => `<span>${i + 1}. ${'ABCD'[q.a]}</span>`).join('')}</div>
  <div class="foot">Made with PakJobs Daily</div>
  </body></html>`;
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${exam.name} paper`, UTI: 'com.adobe.pdf' });
  } else {
    await Print.printAsync({ uri });
  }
}
