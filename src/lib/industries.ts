import type { IconName } from '@/components/ui';
import type { Job } from './types';

/** Private-sector fields, picked by the employer when posting and used as the Private tab's filter. */
export const INDUSTRIES: { key: string; icon: IconName; match: RegExp }[] = [
  { key: 'factory', icon: 'factory', match: /factory|industr|textile|mill|plant|machine operator|production|packing|garment|stitch/i },
  { key: 'construction', icon: 'crane', match: /construct|civil|\bsite\b|mason|labou?r|plumber|electrician|welder|carpenter|steel fixer|painter|builder/i },
  { key: 'sales', icon: 'sale', match: /sales|marketing|business develop|telesales|call cent|customer service|csr|cashier|shop|store|retail/i },
  { key: 'office', icon: 'office-building-outline', match: /office|admin|receptionist|clerk|accountant|account|\bhr\b|data entry|computer operator|assistant|manager/i },
  { key: 'tech', icon: 'laptop', match: /software|developer|programmer|\bweb\b|\bit\b|network|designer|graphic|seo|wordpress|\bapp\b/i },
  { key: 'driver', icon: 'truck-delivery-outline', match: /driver|delivery|rider|courier|transport|logistic|warehouse|loader/i },
  { key: 'hotel', icon: 'silverware-fork-knife', match: /hotel|restaurant|chef|cook|waiter|kitchen|bakery|cafe|food/i },
  { key: 'health', icon: 'hospital-box-outline', match: /clinic|hospital|nurse|doctor|pharmac|lab tech|dispenser|medical/i },
  { key: 'teaching', icon: 'school-outline', match: /teacher|tutor|academy|school|lecturer|instructor|coach/i },
  { key: 'security', icon: 'shield-account-outline', match: /security|guard|chowkidar|watchman|gunman/i },
  { key: 'household', icon: 'home-heart', match: /maid|domestic|house|cleaner|sweeper|gardener|mali|cook at home|babysit/i },
  { key: 'other', icon: 'dots-horizontal-circle-outline', match: /$^/ },
];

/** The industry a private job belongs to: what the employer picked, else a guess from its title. */
export function jobIndustry(job: Job): string {
  if (job.industry && INDUSTRIES.some((i) => i.key === job.industry)) return job.industry;
  const text = `${job.title} ${job.jobType ?? ''}`;
  return INDUSTRIES.find((i) => i.match.test(text))?.key ?? 'other';
}
