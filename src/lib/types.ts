export type Category =
  | 'govt' | 'psc' | 'armed' | 'banking' | 'police' | 'education' | 'health' | 'it' | 'private';

/** 'user' = private job posted inside the app (Firestore). */
export type Source = 'njp' | 'ppsc' | 'fpsc' | 'kppsc' | 'spsc' | 'bpsc' | 'army' | 'navy' | 'paf' | 'nts' | 'user';

export interface Job {
  id: string;
  source: Source;
  title: string;
  organization: string;
  category: Category;
  cities: string[];
  qualification: string | null;
  url: string;
  applyUrl?: string;
  description?: string;
  grade?: string;
  jobType?: string;
  vacancies?: number;
  domicile?: string;
  ageLimit?: string;
  fee?: string;
  advertNo?: string;
  caseNo?: string;
  postedDate?: string;   // YYYY-MM-DD
  lastDate?: string;     // YYYY-MM-DD
  advertImage?: string;  // image or PDF of the official advert
  criteriaUrl?: string;
  logo?: string;
  firstSeen: string;     // ISO timestamp the detector first saw it
  // private (user-posted) jobs only
  salary?: string;
  industry?: string;     // private jobs: see lib/industries.ts
  phone?: string;
  whatsapp?: string;
  ownerUid?: string;
  ownerName?: string;
  featured?: boolean;
  status?: PostStatus;
  featureRequested?: boolean;
}

export type PostStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  name: string;
  whatsapp: string;
  city: string | null;
}

export interface Comment {
  id: string;
  uid: string;
  name: string;
  text: string;
  createdAt: number;
}

export interface Report {
  id: string;
  kind: 'job' | 'comment';
  jobId: string;
  commentId?: string;
  reason: string;
  uid: string;
  createdAt: number;
}

/** An official past paper (PDF) a commission publishes on its own site; see scraper scrape_papers. */
export interface Paper {
  id: string;
  source: Source;
  title: string;
  url: string;
  year: number | null;
}

export type UpdateKind = 'rollno' | 'result' | 'interview' | 'schedule';

/** Result / roll-no slip / exam schedule notice from a commission or NTS. */
export interface Update {
  id: string;
  source: Source;
  kind: UpdateKind;
  title: string;
  url: string;
  date: string | null;
  firstSeen: string;
}

export interface Feed {
  updatedAt: string;
  jobs: Job[];
}
