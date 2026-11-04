import type { Job, Source } from '@/lib/types';
import { type Mcq, SUBJECTS } from './mcqs';

/**
 * Mock tests per recruiting body. The subject mix follows the usual pattern of each body's
 * general-ability MCQ test; it is practice, not an official paper (the advert is the final word).
 */
export interface Exam {
  key: string;
  name: string;
  full: string;
  icon: string;
  colors: [string, string];
  mix: Record<string, number>; // subject key -> questions
  minutes: number;
  source?: Source;             // notices in the Updates feed for this body
  links: { label: string; url: string }[];
}

export const EXAMS: Exam[] = [
  {
    key: 'ppsc', name: 'PPSC', full: 'Punjab Public Service Commission', icon: 'file-document-edit', colors: ['#1D4ED8', '#60A5FA'],
    mix: { pak: 6, gk: 6, islamiat: 5, eng: 5, math: 4, computer: 4 }, minutes: 30, source: 'ppsc',
    links: [
      { label: 'Syllabus for various posts', url: 'https://www.ppsc.gop.pk/Syllabus.aspx' },
      { label: 'PMS / CCE compulsory papers', url: 'https://www.ppsc.gop.pk/PMSCompulsoryPapers.aspx' },
      { label: 'Official website', url: 'https://www.ppsc.gop.pk/' },
    ],
  },
  {
    key: 'fpsc', name: 'FPSC', full: 'Federal Public Service Commission', icon: 'bank', colors: ['#006400', '#00C853'],
    mix: { eng: 8, gk: 6, pak: 6, islamiat: 5, math: 5 }, minutes: 30, source: 'fpsc',
    links: [
      { label: 'General recruitment syllabus', url: 'https://www.fpsc.gov.pk/Syllabuses?section=GR%20Syllabus' },
      { label: 'Official website', url: 'https://www.fpsc.gov.pk/' },
    ],
  },
  {
    key: 'kppsc', name: 'KPPSC', full: 'Khyber Pakhtunkhwa Public Service Commission', icon: 'file-certificate', colors: ['#B45309', '#F59E0B'],
    mix: { pak: 6, gk: 6, islamiat: 5, eng: 5, math: 4, computer: 4 }, minutes: 30, source: 'kppsc',
    links: [
      { label: 'Competitive exam past papers', url: 'https://www.kppsc.gov.pk/past_papers' },
      { label: 'Syllabus', url: 'https://www.kppsc.gov.pk/syllabus' },
      { label: 'Official website', url: 'https://www.kppsc.gov.pk/' },
    ],
  },
  {
    key: 'spsc', name: 'SPSC', full: 'Sindh Public Service Commission', icon: 'file-document-multiple', colors: ['#0E7490', '#22D3EE'],
    mix: { pak: 6, gk: 6, islamiat: 5, eng: 5, math: 4, computer: 4 }, minutes: 30, source: 'spsc',
    links: [
      { label: 'Past papers', url: 'https://spsc.gov.pk/Past_Papers.php' },
      { label: 'Scope & syllabus', url: 'https://spsc.gov.pk/Syllabus.php' },
      { label: 'Official website', url: 'https://spsc.gov.pk/' },
    ],
  },
  {
    key: 'bpsc', name: 'BPSC', full: 'Balochistan Public Service Commission', icon: 'file-document', colors: ['#7C3AED', '#C084FC'],
    mix: { pak: 6, gk: 6, islamiat: 5, eng: 5, math: 4, computer: 4 }, minutes: 30, source: 'bpsc',
    links: [{ label: 'Official website', url: 'https://www.bpsc.gob.pk/' }],
  },
  {
    key: 'nts', name: 'NTS', full: 'National Testing Service', icon: 'pencil-box-multiple', colors: ['#BE123C', '#FB7185'],
    mix: { eng: 8, math: 8, gk: 6, pak: 4, islamiat: 4 }, minutes: 30, source: 'nts',
    links: [
      { label: 'Results & answer keys', url: 'https://www.nts.org.pk/new/Allresults.php' },
      { label: 'Official website', url: 'https://www.nts.org.pk/' },
    ],
  },
  {
    key: 'armed', name: 'Army / Navy / PAF', full: 'Armed forces initial (intelligence & academic) test', icon: 'shield-star', colors: ['#3F6212', '#84CC16'],
    mix: { eng: 8, math: 8, gk: 6, pak: 4, islamiat: 4 }, minutes: 30,
    links: [
      { label: 'Join Pak Army', url: 'https://joinpakarmy.gov.pk/' },
      { label: 'Join Pak Navy', url: 'https://www.joinpaknavy.gov.pk/' },
      { label: 'Join PAF', url: 'https://www.joinpaf.gov.pk/' },
    ],
  },
  {
    key: 'police', name: 'Police / General', full: 'Police, constable and other departmental written tests', icon: 'police-badge', colors: ['#1E3A8A', '#3B82F6'],
    mix: { gk: 6, pak: 6, islamiat: 6, eng: 4, math: 4, computer: 4 }, minutes: 30,
    links: [{ label: 'National Jobs Portal', url: 'https://www.njp.gov.pk/' }],
  },
];

export const examByKey = (k: string) => EXAMS.find((e) => e.key === k);

/** The mock test that fits a job: its commission, or the closest general pattern. */
export function examForJob(job: Job): Exam {
  const direct = EXAMS.find((e) => e.source && e.source === job.source);
  if (direct) return direct;
  if (job.category === 'armed' || ['army', 'navy', 'paf'].includes(job.source)) return examByKey('armed')!;
  return examByKey('police')!;
}

function shuffle<T>(a: T[]): T[] {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j]!, x[i]!];
  }
  return x;
}

/** A question with its four options in a new random order (the answer index follows). */
export function shuffleOptions(q: Mcq): Mcq {
  const order = shuffle([0, 1, 2, 3]);
  return { ...q, o: order.map((i) => q.o[i]!) as Mcq['o'], a: order.indexOf(q.a) as Mcq['a'] };
}

/** A fresh paper: questions drawn per the exam's mix, then questions and options shuffled. */
export function buildMock(exam: Exam): Mcq[] {
  const picked = Object.entries(exam.mix).flatMap(([key, n]) =>
    shuffle(SUBJECTS.find((s) => s.key === key)?.mcqs ?? []).slice(0, n));
  return shuffle(picked).map(shuffleOptions);
}

/** How to attempt a written test - the same steps hold for every body above. */
export const ATTEMPT_STEPS: { icon: string; title: string; body: string }[] = [
  { icon: 'form-select', title: 'Apply before the last date', body: 'Apply online on the official website only and note your application / tracking ID.' },
  { icon: 'cash-check', title: 'Pay the fee', body: 'Pay the fee challan at the bank named in the advert and keep the paid receipt safe.' },
  { icon: 'card-account-details-outline', title: 'Download the roll number slip', body: 'Slips are usually issued about a week before the test - check Roll No in this app or the official site. Print it.' },
  { icon: 'book-open-page-variant-outline', title: 'Prepare from the syllabus', body: 'Read the syllabus for your post, practise the mock tests and the official past papers.' },
  { icon: 'bag-personal-outline', title: 'What to bring', body: 'Original CNIC, printed roll number slip and a blue/black ballpoint. Mobile phones, smart watches and bags are not allowed.' },
  { icon: 'clock-check-outline', title: 'Reach early', body: 'Reach the centre 30-60 minutes before the reporting time written on your slip. Late candidates are often not allowed in.' },
  { icon: 'checkbox-marked-circle-outline', title: 'Fill the answer sheet carefully', body: 'Write your roll number and paper code correctly, fill one circle per question completely, and do not overwrite or use whitener.' },
  { icon: 'timer-outline', title: 'Manage your time', body: 'Do the easy questions first and come back to the hard ones. Read the instructions on the paper about negative marking.' },
  { icon: 'trophy-outline', title: 'After the test', body: 'Answer keys and results come on the official site (and in Results here). If shortlisted, bring original documents and attested copies to the interview.' },
];
