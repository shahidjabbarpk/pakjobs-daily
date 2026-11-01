import { useColorScheme } from 'react-native';
import { useApp } from './store';
import type { Category } from './types';

const light = {
  dark: false,
  bg: '#F3F6F4',
  card: '#FFFFFF',
  cardAlt: '#EEF4F0',
  text: '#0F1D16',
  sub: '#5D6E65',
  faint: '#93A39A',
  border: '#E1E9E4',
  primary: '#0B7A43',
  primaryDark: '#01411C',
  primarySoft: '#DDF3E6',
  gold: '#F2B705',
  danger: '#E5484D',
  warn: '#F59E0B',
  ok: '#16A34A',
  heroA: '#01411C',
  heroB: '#0B7A43',
  heroC: '#17A45C',
  shadow: '#0B3B22',
  tabBar: '#FFFFFF',
};

const dark: typeof light = {
  dark: true,
  bg: '#07110C',
  card: '#101D16',
  cardAlt: '#15261D',
  text: '#ECF5EF',
  sub: '#A3B6AB',
  faint: '#6A7D72',
  border: '#1F3328',
  primary: '#2FBF71',
  primaryDark: '#0B7A43',
  primarySoft: '#123222',
  gold: '#F7C948',
  danger: '#F16A6E',
  warn: '#FBBF24',
  ok: '#34D399',
  heroA: '#012411',
  heroB: '#045C31',
  heroC: '#0B7A43',
  shadow: '#000000',
  tabBar: '#0D1913',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  const sys = useColorScheme();
  const pref = useApp((s) => s.theme);
  const isDark = pref === 'system' ? sys === 'dark' : pref === 'dark';
  return isDark ? dark : light;
}

export const CATEGORY_META: Record<Category, { icon: string; colors: [string, string] }> = {
  govt: { icon: 'bank', colors: ['#0B7A43', '#2FBF71'] },
  psc: { icon: 'file-document-edit', colors: ['#1D4ED8', '#60A5FA'] },
  armed: { icon: 'shield-star', colors: ['#3F6212', '#84CC16'] },
  banking: { icon: 'cash-multiple', colors: ['#B45309', '#F59E0B'] },
  police: { icon: 'police-badge', colors: ['#1E3A8A', '#3B82F6'] },
  education: { icon: 'school', colors: ['#7C3AED', '#C084FC'] },
  health: { icon: 'hospital-box', colors: ['#BE123C', '#FB7185'] },
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
