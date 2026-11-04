import { useApp } from './store';
import type { Category } from './types';

// Brand: deep forest green (#006400, trust / official) + emerald accent (#00C853, live / success).
const light = {
  dark: false,
  bg: '#F8F9FA',
  card: '#FFFFFF',
  cardAlt: '#F1F3F5',
  text: '#212529',
  sub: '#6C757D',
  faint: '#ADB5BD',
  border: '#E9ECEF',
  primary: '#006400',
  primaryDark: '#004B00',
  primarySoft: '#E4F3E4',
  accent: '#00C853',
  accentSoft: '#DDF8E8',
  gold: '#F2B705',
  danger: '#E53935',
  dangerSoft: '#FDECEC',
  warn: '#F59E0B',
  ok: '#00A844',
  heroA: '#003300',
  heroB: '#006400',
  heroC: '#00A844',
  shadow: '#0B2B12',
  tabBar: 'rgba(255,255,255,0.78)',
  glassBorder: 'rgba(255,255,255,0.9)',
};

const dark: typeof light = {
  dark: true,
  bg: '#121212',
  card: '#1E1E1E',
  cardAlt: '#272727',
  text: '#F1F3F5',
  sub: '#A3A9AF',
  faint: '#6C757D',
  border: '#2D2D2D',
  // #006400 is too dark to read on charcoal, so the emerald accent carries the brand in dark mode
  primary: '#00C853',
  primaryDark: '#006400',
  primarySoft: '#11301C',
  accent: '#00C853',
  accentSoft: '#11301C',
  gold: '#F7C948',
  danger: '#FF6B6B',
  dangerSoft: '#3A1E1E',
  warn: '#FBBF24',
  ok: '#2EE57A',
  heroA: '#001A00',
  heroB: '#004000',
  heroC: '#006400',
  shadow: '#000000',
  tabBar: 'rgba(30,30,30,0.80)',
  glassBorder: 'rgba(255,255,255,0.08)',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  // light unless the user switched Dark mode on in Profile (the phone's own theme is ignored)
  return useApp((s) => s.theme) === 'dark' ? dark : light;
}

export const CATEGORY_META: Record<Category, { icon: string; colors: [string, string] }> = {
  govt: { icon: 'bank', colors: ['#006400', '#00C853'] },
  psc: { icon: 'file-document-edit', colors: ['#1D4ED8', '#60A5FA'] },
  armed: { icon: 'shield-star', colors: ['#3F6212', '#84CC16'] },
  banking: { icon: 'cash-multiple', colors: ['#B45309', '#F59E0B'] },
  police: { icon: 'police-badge', colors: ['#1E3A8A', '#3B82F6'] },
  education: { icon: 'school', colors: ['#7C3AED', '#C084FC'] },
  health: { icon: 'hospital-box', colors: ['#BE123C', '#FB7185'] },
  it: { icon: 'laptop', colors: ['#4338CA', '#818CF8'] },
  private: { icon: 'briefcase', colors: ['#0E7490', '#22D3EE'] },
};

export const font = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semi: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  urdu: 'NotoNastaliqUrdu_400Regular',
  urduBold: 'NotoNastaliqUrdu_700Bold',
};
