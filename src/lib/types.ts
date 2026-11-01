export type Category =
  | 'govt' | 'psc' | 'armed' | 'banking' | 'police' | 'education' | 'health' | 'private';

export type Source = 'njp' | 'ppsc' | 'fpsc' | 'kppsc' | 'army' | 'navy';

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
}

export interface Feed {
  updatedAt: string;
  jobs: Job[];
}
