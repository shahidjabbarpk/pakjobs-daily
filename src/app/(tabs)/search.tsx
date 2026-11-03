import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JobCard } from '@/components/JobCard';
import { CityPicker } from '@/components/CityPicker';
import { Dropdown } from '@/components/Dropdown';
import { Chip, EmptyState, Icon, type IconName, Tap, useStatusBar, useTabBarSpace } from '@/components/ui';
import { NativeAdCard } from '@/lib/ads';
import { NATIVE_AD_EVERY } from '@/lib/config';
import { isEngineeringJob, sortJobs, urgency } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { jobMatchesPlace, SOURCE_CHIPS } from '@/lib/places';
import { ALL_CATEGORIES, useApp } from '@/lib/store';
import { CATEGORY_META, font, useTheme } from '@/lib/theme';
import type { Category, Job } from '@/lib/types';

const QUALS = ['Middle', 'Matric', 'Intermediate', 'DAE', 'Bachelor', 'Masters', 'MPhil', 'PhD'];
const GOVT_ALL = '__govt';
const ENG = '__eng';
const RANK = Object.fromEntries(QUALS.map((q, i) => [q, i]));
type Row = { type: 'job'; job: Job; i: number } | { type: 'ad'; key: string };

export default function Search() {
  useStatusBar('plain');
  const c = useTheme();
  const { t, tf, qual, isUr } = useI18n();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const params = useLocalSearchParams<{ cat?: string; city?: string; sort?: string; source?: string; q?: string; govt?: string; eng?: string; n?: string }>();
  const jobs = useApp((s) => s.jobs);

  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Category | null>(null);
  const [qualF, setQualF] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [sort, setSort] = useState<'newest' | 'deadline'>('newest');
  const [showClosed, setShowClosed] = useState(false);
  const [govtOnly, setGovtOnly] = useState(false);
  const [engOnly, setEngOnly] = useState(false);

  // deep links from Home (services, category tiles, city chips). Search is a tab that stays mounted,
  // so each visit replaces the previous visit's filters instead of piling onto them; `n` makes a
  // repeat tap on the same tile count as a new visit.
  useEffect(() => {
    if (!params.n) return;
    setCat((params.cat as Category) || null);
    setCity(params.city || null);
    setSort(params.sort === 'deadline' ? 'deadline' : 'newest');
    setSource(params.source || null);
    setQ(params.q || '');
    setGovtOnly(params.govt === '1');
    setEngOnly(params.eng === '1');
    setQualF(null);
  }, [params.n, params.cat, params.city, params.sort, params.source, params.q, params.govt, params.eng]);

  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const list = jobs.filter((j) => {
      if (!showClosed && urgency(j) === 'closed') return false;
      if (govtOnly && (j.source === 'user' || j.category === 'private')) return false;
      if (engOnly && !isEngineeringJob(j)) return false;
      if (cat && j.category !== cat) return false;
      if (source && j.source !== source) return false;
      // "Matric" shows jobs whose minimum requirement is Matric or lower
      if (qualF && j.qualification && j.qualification !== 'Any' && (RANK[j.qualification] ?? 0) > RANK[qualF]!) return false;
      if (city && !jobMatchesPlace(j, city)) return false;
      if (words.length) {
        const hay = `${j.title} ${j.organization} ${j.cities.join(' ')} ${j.grade ?? ''} ${j.source} ${j.qualification ?? ''} ${j.jobType ?? ''} ${j.advertNo ?? ''}`.toLowerCase();
        if (!words.every((w) => hay.includes(w))) return false;
      }
      return true;
    });
    return sortJobs(list, sort);
  }, [jobs, q, cat, qualF, city, source, sort, showClosed, govtOnly, engOnly]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    results.forEach((job, i) => {
      out.push({ type: 'job', job, i });
      if ((i + 1) % NATIVE_AD_EVERY === 0) out.push({ type: 'ad', key: `ad-${i}` });
    });
    return out;
  }, [results]);

  const active = [cat, qualF, city, source, q, govtOnly, engOnly].filter(Boolean).length;
  const clear = () => { setQ(''); setCat(null); setQualF(null); setCity(null); setSource(null); setGovtOnly(false); setEngOnly(false); };

  const filters = (
    <View>
      <View style={[styles.head, { paddingTop: insets.top + 12, backgroundColor: c.bg }]}>
        <Text style={[styles.h1, tf('bold'), { color: c.text }, isUr && { textAlign: 'right' }]}>{t('search')}</Text>
        <View style={[styles.input, { backgroundColor: c.card, borderColor: c.border }]}>
          <Icon name="magnify" size={20} color={c.faint} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={c.faint}
            style={[styles.inputText, { color: c.text, textAlign: isUr && !q ? 'right' : 'left' }]}
            returnKeyType="search"
            autoCorrect={false}
          />
          {!!q && <Tap onPress={() => setQ('')}><Icon name="close-circle" size={18} color={c.faint} /></Tap>}
        </View>
      </View>

      {/* one line of dropdowns instead of four rows of chips */}
      <View style={styles.dropdowns}>
        <Dropdown label={t('category')} icon="shape-outline" value={engOnly ? ENG : govtOnly ? GOVT_ALL : cat}
          options={[{ value: GOVT_ALL, label: t('allGovt'), icon: 'bank-outline' }, { value: ENG, label: t('engineers'), icon: 'hard-hat' },
            ...ALL_CATEGORIES.map((k) => ({ value: k, label: t(`cat.${k}`), icon: CATEGORY_META[k].icon as IconName }))]}
          onChange={(v) => { setGovtOnly(v === GOVT_ALL); setEngOnly(v === ENG); setCat(v && v !== GOVT_ALL && v !== ENG ? (v as Category) : null); }} />
        <Dropdown label={t('commissionShort')} icon="bank-outline" value={source}
          options={SOURCE_CHIPS.map(([k, label]) => ({ value: k, label }))} onChange={setSource} />
        <Dropdown label={t('qualification')} icon="school-outline" value={qualF}
          options={QUALS.map((k) => ({ value: k, label: qual(k) }))} onChange={setQualF} />
        <CityPicker inline value={city} onChange={setCity} />
      </View>

      <View style={styles.summary}>
        <Animated.Text key={results.length} entering={FadeIn} style={[styles.count, { color: c.text }]}>
          {results.length} <Text style={[tf(), { color: c.sub, fontSize: 13 }]}>{t('results')}</Text>
        </Animated.Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Chip icon="sort-calendar-descending" label={t('newest')} active={sort === 'newest'} onPress={() => setSort('newest')} />
          <Chip icon="timer-sand" label={t('deadline')} active={sort === 'deadline'} onPress={() => setSort('deadline')} />
        </View>
      </View>
      <View style={[styles.summary, { marginTop: 0 }]}>
        <Tap onPress={() => setShowClosed(!showClosed)} style={styles.toggle}>
          <Icon name={showClosed ? 'checkbox-marked' : 'checkbox-blank-outline'} size={18} color={c.primary} />
          <Text style={[tf(), { color: c.sub, fontSize: 12.5 }]}>{t('closed')}</Text>
        </Tap>
        {active > 0 && (
          <Tap onPress={clear} style={styles.toggle}>
            <Icon name="filter-remove-outline" size={18} color={c.danger} />
            <Text style={[tf(), { color: c.danger, fontSize: 12.5 }]}>{t('clear')} ({active})</Text>
          </Tap>
        )}
      </View>
    </View>
  );

  return (
    <Animated.FlatList
      style={{ flex: 1, backgroundColor: c.bg }}
      data={rows}
      keyExtractor={(r) => (r.type === 'job' ? r.job.id : r.key)}
      renderItem={({ item }) => (item.type === 'job' ? <JobCard job={item.job} index={item.i} /> : <NativeAdCard />)}
      itemLayoutAnimation={LinearTransition.springify().damping(18)}
      ListHeaderComponent={filters}
      ListEmptyComponent={<EmptyState icon="file-search-outline" title={t('noResults')} hint={t('noResultsHint')} />}
      ListFooterComponent={<View style={{ height: tabSpace }} />}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      initialNumToRender={8}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 16, paddingBottom: 4 },
  h1: { fontSize: 26, marginBottom: 12 },
  input: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, borderRadius: 16, paddingHorizontal: 14, borderWidth: 1 },
  inputText: { flex: 1, fontFamily: font.regular, fontSize: 14 },
  dropdowns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 12 },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 16, marginBottom: 10 },
  count: { fontFamily: font.bold, fontSize: 20 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
});
