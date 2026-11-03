import type { Job } from './types';

export type Province = 'Punjab' | 'Sindh' | 'KPK' | 'Balochistan' | 'ICT' | 'AJK' | 'GB';

/** Districts / major cities users can pick, with their province. */
export const DISTRICTS: Record<string, Province> = {
  Islamabad: 'ICT',
  Lahore: 'Punjab', Rawalpindi: 'Punjab', Faisalabad: 'Punjab', Multan: 'Punjab', Gujranwala: 'Punjab',
  Sialkot: 'Punjab', Bahawalpur: 'Punjab', Sargodha: 'Punjab', Sahiwal: 'Punjab', Sheikhupura: 'Punjab',
  Jhang: 'Punjab', 'Rahim Yar Khan': 'Punjab', Gujrat: 'Punjab', Kasur: 'Punjab', Okara: 'Punjab',
  'Dera Ghazi Khan': 'Punjab', Muzaffargarh: 'Punjab', Jhelum: 'Punjab', Chakwal: 'Punjab', Attock: 'Punjab',
  Mianwali: 'Punjab', Bahawalnagar: 'Punjab', Vehari: 'Punjab', Khanewal: 'Punjab', 'Toba Tek Singh': 'Punjab',
  Karachi: 'Sindh', Hyderabad: 'Sindh', Sukkur: 'Sindh', Larkana: 'Sindh', Nawabshah: 'Sindh',
  Mirpurkhas: 'Sindh', Thatta: 'Sindh', Jacobabad: 'Sindh', Khairpur: 'Sindh', Dadu: 'Sindh',
  Peshawar: 'KPK', Mardan: 'KPK', Abbottabad: 'KPK', Swat: 'KPK', Kohat: 'KPK', Bannu: 'KPK',
  'Dera Ismail Khan': 'KPK', Mansehra: 'KPK', Charsadda: 'KPK', Nowshera: 'KPK', Swabi: 'KPK', Chitral: 'KPK',
  Quetta: 'Balochistan', Gwadar: 'Balochistan', Turbat: 'Balochistan', Khuzdar: 'Balochistan',
  Sibi: 'Balochistan', Zhob: 'Balochistan', Loralai: 'Balochistan', Chaman: 'Balochistan',
  Muzaffarabad: 'AJK', Mirpur: 'AJK', Kotli: 'AJK', Rawalakot: 'AJK',
  Gilgit: 'GB', Skardu: 'GB', Hunza: 'GB',
};

export const DISTRICT_NAMES = Object.keys(DISTRICTS).sort((a, b) => a.localeCompare(b));

export const PROVINCE_NAMES: Record<Province, string> = {
  Punjab: 'Punjab', Sindh: 'Sindh', KPK: 'Khyber Pakhtunkhwa', Balochistan: 'Balochistan',
  ICT: 'Islamabad Capital', AJK: 'Azad Kashmir', GB: 'Gilgit-Baltistan',
};

/**
 * Is this job open to someone living in `place` (a district or province)?
 * Jobs tagged with the district, its province, or "All Pakistan" match; untagged jobs match everyone.
 */
export function jobInArea(job: Job, place: string | null): boolean {
  if (!place) return true;
  if (!job.cities.length) return true;
  // same rules as the search filter, so a "Punjab" alert also covers jobs tagged Lahore
  return jobMatchesPlace(job, place);
}

/** Matches the user's own district only (for the "Jobs in your city" strip). */
export function jobInCity(job: Job, place: string | null): boolean {
  if (!place) return false;
  return job.cities.some((c) => c.toLowerCase() === place.toLowerCase());
}

/** Source filter chips: [job.source, label]. */
export const SOURCE_CHIPS: [string, string][] = [['ppsc', 'PPSC'], ['spsc', 'SPSC'], ['kppsc', 'KPPSC'], ['bpsc', 'BPSC'], ['fpsc', 'FPSC'],
  ['nts', 'NTS'], ['army', 'Army'], ['navy', 'Navy'], ['paf', 'PAF'], ['njp', 'NJP'], ['user', 'Private']];

const PROVINCE_ALIASES: Record<string, Province> = {
  punjab: 'Punjab', sindh: 'Sindh', kpk: 'KPK', 'khyber pakhtunkhwa': 'KPK', balochistan: 'Balochistan',
  ict: 'ICT', ajk: 'AJK', 'azad kashmir': 'AJK', gb: 'GB', 'gilgit-baltistan': 'GB',
};

/**
 * Search filter: a district also shows its province-wide and All-Pakistan jobs;
 * a province also shows jobs posted in any of its districts. Untagged jobs don't match.
 */
export function jobMatchesPlace(job: Job, place: string): boolean {
  const tags = job.cities.map((c) => c.toLowerCase());
  if (!tags.length) return false;
  if (tags.includes('all pakistan')) return true;
  const p = place.toLowerCase();
  if (tags.includes(p)) return true;
  const prov = PROVINCE_ALIASES[p];
  if (prov) {
    return tags.some((t) => PROVINCE_ALIASES[t] === prov
      || Object.entries(DISTRICTS).some(([d, pr]) => pr === prov && d.toLowerCase() === t));
  }
  const own = DISTRICTS[place];
  return !!own && tags.some((t) => PROVINCE_ALIASES[t] === own || (own === 'ICT' && t === 'islamabad'));
}
