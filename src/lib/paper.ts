import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { buildMock, type Exam } from '@/data/exams';
import { adOnOpen } from './ads';
import type { Paper } from './types';

/** Opens an official past paper in the in-app PDF viewer (app/paper.tsx); every other open has an ad. */
export function openPaper(p: Paper) {
  adOnOpen('paper', () => router.push({ pathname: '/paper', params: { url: p.url, title: p.title } }));
}

// Repeated on every printed page (position: fixed repeats per page when printing):
// a faint diagonal "PakJobs Daily" across the middle and a footer line.
export const WATERMARK_CSS = `
  .wm { position: fixed; top: 42%; left: -10%; width: 120%; text-align: center; transform: rotate(-30deg);
        font-size: 72px; font-weight: 800; letter-spacing: 6px; color: rgba(0,100,0,0.07); z-index: 0; pointer-events: none; }
  .wmfoot { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 10px; color: #6b8a76; }
  .content { position: relative; z-index: 1; }`;
export const WATERMARK_HTML = '<div class="wm">PakJobs Daily</div><div class="wmfoot">PakJobs Daily - Govt &amp; Private Job Alerts, Mock Tests &amp; Past Papers</div>';

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
  ${WATERMARK_CSS}
  </style></head><body>${WATERMARK_HTML}<div class="content">
  <h1>${esc(exam.name)} Practice Paper</h1>
  <div class="meta">${qs.length} MCQs &nbsp;•&nbsp; ${exam.minutes} minutes &nbsp;•&nbsp; Practice paper, not an official past paper</div>
  ${qs.map((q, i) => `<div class="q"><b>${i + 1}. ${esc(q.q)}</b>${q.o.map((o, j) => `<span class="o">(${'ABCD'[j]}) ${esc(o)}</span>`).join('')}</div>`).join('')}
  <div class="key"><h1>Answer Key</h1><div class="meta">Check yourself after attempting the paper.</div>
  ${qs.map((q, i) => `<span>${i + 1}. ${'ABCD'[q.a]}</span>`).join('')}</div>
  </div></body></html>`;
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
