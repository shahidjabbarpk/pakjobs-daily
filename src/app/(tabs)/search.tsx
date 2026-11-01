import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JobCard } from '@/components/JobCard';
import { Chip, EmptyState, Icon, Tap } from '@/components/ui';
import { NativeAdCard } from '@/lib/ads';
import { NATIVE_AD_EVERY } from '@/lib/config';
import { sortJobs, urgency } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { ALL_CATEGORIES, useApp } from '@/lib/store';
import { font, useTheme } from '@/lib/theme';
import type { Category, Job } from '@/lib/types';

const QUALS = ['Middle', 'Matric', 'Intermediate', 'DAE', 'Bachelor', 'Masters', 'MPhil', 'PhD'];
const CITIES = ['Islamabad', 'Lahore', 'Karachi', 'Peshawar', 'Quetta', 'Rawalpindi', 'Multan', 'Faisalabad', 'Hyderabad',
  'Gwadar', 'Turbat', 'Punjab', 'Sindh', 'KPK', 'Balochistan', 'AJK', 'GB'];
const RANK = Object.fromEntries(QUALS.map((q, i) => [q, i]));

type Row = { type: 'job'; job: Job; i: number } | { type: 'ad'; key: string };

export default function Search() {
  const c = useTheme();
  const { t, tf, qual, isUr } = useI18n();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ cat?: string; city?: string; sort?: string }>();
  const jobs = useApp((s) => s.jobs);

  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Category | null>(null);
  const [qualF, setQualF] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [sort, setSort] = useState<'newest' | 'deadline'>('newest');
  const [showClosed, setShowClosed] = useState(false);

  // deep links from Home (category tiles, city chips, stat cards)
  useEffect(() => {
    if (params.cat) setCat(params.cat as Category);
    if (params.city) setCity(params.city);
    if (params.sort === 'deadline' || params.sort === 'newest') setSort(params.sort);
  }, [params.cat, params.city, params.sort]);

  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const list = jobs.filter((j) => {
      if (!showClosed && urgency(j) === 'closed') return false;
      if (cat && j.category !== cat) return false;
      // "Matric" shows jobs whose minimum requirement is Matric or lower
      if (qualF && j.qualification && j.qualification !== 'Any' && (RANK[j.qualification] ?? 0) > RANK[qualF]!) return false;
      if (city && !j.cities.includes('All Pakistan') && !j.cities.some((x) => x.toLowerCase() === city.toLowerCase())) return false;
      if (words.length) {
        const hay = `${j.title} ${j.organization} ${j.cities.join(' ')} ${j.grade ?? ''} ${j.source}`.toLowerCase();
        if (!words.every((w) => hay.includes(w))) return false;
      }
      return true;
    });
    return sortJobs(list, sort);
  }, [jobs, q, cat, qualF, city, sort, showClosed]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    results.forEach((job, i) => {
      out.push({ type: 'job', job, i });
      if ((i + 1) % NATIVE_AD_EVERY === 0) out.push({ type: 'ad', key: `ad-${i}` });
    });
    return out;
  }, [results]);

  const active = [cat, qualF, city, q].filter(Boolean).length;
  const clear = () => { setQ(''); setCat(null); setQualF(null); setCity(null); };

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

      <FilterRow label={t('category')}>
        <Chip label={t('all')} active={!cat} onPress={() => setCat(null)} />
        {ALL_CATEGORIES.map((k) => <Chip key={k} label={t(`cat.${k}`)} active={cat === k} onPress={() => setCat(cat === k ? null : k)} />)}
      </FilterRow>
      <FilterRow label={t('qualification')}>
        <Chip label={t('all')} active={!qualF} onPress={() => setQualF(null)} />
        {QUALS.map((k) => <Chip key={k} icon="school-outline" label={qual(k)} active={qualF === k} onPress={() => setQualF(qualF === k ? null : k)} />)}
      </FilterRow>
      <FilterRow label={t('city')}>
        <Chip label={t('all')} active={!city} onPress={() => setCity(null)} />
        {CITIES.map((k) => <Chip key={k} icon="map-marker-outline" label={k} active={city === k} onPress={() => setCity(city === k ? null : k)} />)}
      </FilterRow>

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
      ListFooterComponent={<View style={{ height: 24 }} />}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      initialNumToRender={8}
      showsVerticalScrollIndicator={false}
    />
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  const c = useTheme();
  const { tf } = useI18n();
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={[styles.rowLabel, tf('bold'), { color: c.sub }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{children}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 16, paddingBottom: 4 },
  h1: { fontSize: 26, marginBottom: 12 },
  input: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, borderRadius: 16, paddingHorizontal: 14, borderWidth: 1 },
  inputText: { flex: 1, fontFamily: font.regular, fontSize: 14 },
  rowLabel: { fontSize: 12, marginLeft: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  chips: { paddingHorizontal: 16, gap: 8 },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 16, marginBottom: 10 },
  count: { fontFamily: font.bold, fontSize: 20 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
});
