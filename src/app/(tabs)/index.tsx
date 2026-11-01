import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInRight,
  FadeOutUp,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JobCard } from '@/components/JobCard';
import { DeadlineBadge, Icon, type IconName, OrgAvatar, SectionTitle, Tap } from '@/components/ui';
import { BottomBanner, NativeAdCard } from '@/lib/ads';
import { NATIVE_AD_EVERY } from '@/lib/config';
import { refreshJobs } from '@/lib/feed';
import { isNew, sortJobs, urgency } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { jobInCity } from '@/lib/places';
import { ALL_CATEGORIES, useApp } from '@/lib/store';
import { CATEGORY_META, font, useTheme } from '@/lib/theme';
import type { Job } from '@/lib/types';

const CITY_CHIPS = ['Islamabad', 'Lahore', 'Karachi', 'Peshawar', 'Quetta', 'Rawalpindi', 'Multan', 'Punjab', 'Sindh', 'KPK', 'Balochistan'];

type Row = { type: 'job'; job: Job; i: number } | { type: 'ad'; key: string };

function greetingKey(): 'greetMorning' | 'greetAfternoon' | 'greetEvening' {
  const h = new Date(Date.now() + 5 * 3600_000).getUTCHours();
  return h < 12 ? 'greetMorning' : h < 17 ? 'greetAfternoon' : 'greetEvening';
}

export default function Home() {
  const c = useTheme();
  const { t, tf } = useI18n();
  const insets = useSafeAreaInsets();
  const jobs = useApp((s) => s.jobs);
  const homeCity = useApp((s) => s.homeCity);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const scrollY = useSharedValue(0);

  const live = useMemo(() => jobs.filter((j) => urgency(j) !== 'closed'), [jobs]);
  const latest = useMemo(() => sortJobs(live, 'newest'), [live]);
  const closing = useMemo(
    () => sortJobs(live.filter((j) => ['today', 'urgent', 'soon'].includes(urgency(j))), 'deadline').slice(0, 10),
    [live],
  );
  const featured = useMemo(() => live.filter((j) => j.featured).slice(0, 10), [live]);
  const cityJobs = useMemo(() => sortJobs(live.filter((j) => jobInCity(j, homeCity)), 'newest').slice(0, 12), [live, homeCity]);
  const newCount = useMemo(() => live.filter((j) => isNew(j)).length, [live]);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const j of live) m[j.category] = (m[j.category] ?? 0) + 1;
    return m;
  }, [live]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    latest.slice(0, 40).forEach((job, i) => {
      out.push({ type: 'job', job, i });
      if ((i + 1) % NATIVE_AD_EVERY === 0) out.push({ type: 'ad', key: `ad-${i}` });
    });
    return out;
  }, [latest]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const { fresh } = await refreshJobs();
      setToast(fresh.length ? `${fresh.length} ${t('foundNew')} 🎉` : `${t('upToDate')} ✓`);
    } catch {
      setToast(t('offline'));
    } finally {
      setRefreshing(false);
      setTimeout(() => setToast(null), 2600);
    }
  }, [t]);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const miniHeader = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [120, 190], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [120, 190], [-10, 0], Extrapolation.CLAMP) }],
  }));
  const heroParallax = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [-100, 0, 200], [-30, 0, 60], Extrapolation.CLAMP) }],
    opacity: interpolate(scrollY.value, [0, 180], [1, 0.4], Extrapolation.CLAMP),
  }));

  const header = (
    <View>
      <LinearGradient colors={[c.heroA, c.heroB, c.heroC]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 14 }]}>
        <Animated.View style={heroParallax}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.greet, tf()]}>{t(greetingKey())} 👋</Text>
              <Text style={[styles.brand, tf('bold')]}>{t('appName')}</Text>
              <Text style={[styles.tagline, tf()]}>{t('tagline')}</Text>
            </View>
            <Tap style={styles.bell} onPress={() => router.push({ pathname: '/search', params: { sort: 'newest' } })}>
              <Icon name="bell-ring-outline" size={22} color="#fff" />
              {newCount > 0 && (
                <Animated.View entering={ZoomIn.delay(400)} style={[styles.bellDot, { backgroundColor: c.gold }]}>
                  <Text style={styles.bellDotText}>{newCount > 99 ? '99+' : newCount}</Text>
                </Animated.View>
              )}
            </Tap>
          </View>
        </Animated.View>

        <Tap haptic={false} onPress={() => router.push('/search')} style={styles.searchBar}>
          <Icon name="magnify" size={20} color="#5D6E65" />
          <Text style={[styles.searchText, tf()]} numberOfLines={1}>{t('searchPlaceholder')}</Text>
          <View style={[styles.filterBtn, { backgroundColor: c.primary }]}>
            <Icon name="tune-variant" size={16} color="#fff" />
          </View>
        </Tap>
        {/* decorative crescent & star */}
        <Icon name="star-crescent" size={160} color="rgba(255,255,255,0.06)" style={styles.deco} />
      </LinearGradient>

      <View style={styles.stats}>
        {([
          ['briefcase-search-outline', live.length, t('liveJobs'), c.primary, undefined],
          ['fire', newCount, t('newToday'), '#EF4444', 'newest'],
          ['timer-sand', closing.length, t('closingSoon'), c.warn, 'deadline'],
        ] as [IconName, number, string, string, string | undefined][]).map(([icon, n, label, col, sort], i) => (
          <Animated.View key={label} entering={FadeIn.delay(150 + i * 90)} style={{ flex: 1 }}>
            <Tap style={[styles.stat, { backgroundColor: c.card, borderColor: c.border, shadowColor: c.shadow }]}
              onPress={() => router.push({ pathname: '/search', params: sort ? { sort } : {} })}>
              <View style={[styles.statIcon, { backgroundColor: col + '1A' }]}>
                <Icon name={icon} size={18} color={col} />
              </View>
              <Text style={[styles.statNum, { color: c.text }]}>{n}</Text>
              <Text style={[styles.statLabel, tf(), { color: c.sub }]} numberOfLines={1}>{label}</Text>
            </Tap>
          </Animated.View>
        ))}
      </View>

      <SectionTitle title={t('categories')} />
      <View style={styles.grid}>
        {ALL_CATEGORIES.map((cat, i) => {
          const meta = CATEGORY_META[cat];
          return (
            <Animated.View key={cat} entering={ZoomIn.delay(120 + i * 40).springify().damping(14)} style={styles.cell}>
              <Tap style={styles.cellInner} onPress={() => router.push({ pathname: '/search', params: { cat } })}>
                <LinearGradient colors={meta.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.catIcon}>
                  <Icon name={meta.icon as IconName} size={24} color="#fff" />
                  {!!counts[cat] && (
                    <View style={[styles.catCount, { backgroundColor: c.card }]}>
                      <Text style={[styles.catCountText, { color: meta.colors[0] }]}>{counts[cat]}</Text>
                    </View>
                  )}
                </LinearGradient>
                <Text style={[styles.catLabel, tf(), { color: c.text }]} numberOfLines={2}>{t(`cat.${cat}`)}</Text>
              </Tap>
            </Animated.View>
          );
        })}
      </View>

      <SectionTitle title={t('byCity')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
        {CITY_CHIPS.map((city, i) => (
          <Animated.View key={city} entering={FadeInRight.delay(i * 40)}>
            <Tap style={[styles.cityChip, { backgroundColor: c.card, borderColor: c.border }]}
              onPress={() => router.push({ pathname: '/search', params: { city } })}>
              <Icon name="map-marker-radius" size={16} color={c.primary} />
              <Text style={[styles.cityText, { color: c.text }]}>{city}</Text>
            </Tap>
          </Animated.View>
        ))}
      </ScrollView>

      {featured.length > 0 && (
        <>
          <SectionTitle title={`⭐ ${t('featuredJobs')}`} action={t('seeAll')} onAction={() => router.push('/private')} />
          <JobStrip jobs={featured} featured />
        </>
      )}

      {cityJobs.length > 0 && (
        <>
          <SectionTitle title={`📍 ${t('yourCity')} ${homeCity}`} action={t('seeAll')}
            onAction={() => router.push({ pathname: '/search', params: { city: homeCity! } })} />
          <JobStrip jobs={cityJobs} />
        </>
      )}

      {closing.length > 0 && (
        <>
          <SectionTitle title={`⏳ ${t('closingSoon')}`} action={t('seeAll')}
            onAction={() => router.push({ pathname: '/search', params: { sort: 'deadline' } })} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList} decelerationRate="fast" snapToInterval={262}>
            {closing.map((job, i) => (
              <Animated.View key={job.id} entering={FadeInRight.delay(i * 60).springify()}>
                <Tap style={[styles.closeCard, { backgroundColor: c.card, borderColor: c.border, shadowColor: c.shadow }]}
                  onPress={() => router.push(`/job/${job.id}`)}>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <OrgAvatar job={job} size={38} />
                    <Text style={[styles.closeOrg, { color: c.sub }]} numberOfLines={2}>{job.organization}</Text>
                  </View>
                  <Text style={[styles.closeTitle, { color: c.text }]} numberOfLines={2}>{job.title}</Text>
                  <DeadlineBadge job={job} />
                </Tap>
              </Animated.View>
            ))}
          </ScrollView>
        </>
      )}

      <SectionTitle title={`🆕 ${t('latestJobs')}`} action={t('seeAll')} onAction={() => router.push('/search')} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Animated.FlatList
        data={rows}
        keyExtractor={(r) => (r.type === 'job' ? r.job.id : r.key)}
        renderItem={({ item }) => (item.type === 'job' ? <JobCard job={item.job} index={item.i} /> : <NativeAdCard />)}
        ListHeaderComponent={header}
        ListFooterComponent={<View style={{ height: 24 }} />}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        windowSize={9}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" colors={[c.primary]}
            progressViewOffset={insets.top} />
        }
      />

      {/* compact header that slides in once the hero scrolls away */}
      <Animated.View pointerEvents="none" style={[styles.mini, { paddingTop: insets.top + 6, backgroundColor: c.heroA }, miniHeader]}>
        <Icon name="briefcase-variant" size={18} color={c.gold} />
        <Text style={[styles.miniTitle, tf('bold')]}>{t('appName')}</Text>
        <Text style={styles.miniCount}>{live.length} {t('liveJobs').toLowerCase()}</Text>
      </Animated.View>

      {toast && (
        <Animated.View entering={FadeIn.springify()} exiting={FadeOutUp} style={[styles.toast, { top: insets.top + 60, backgroundColor: c.text }]}>
          <Text style={[styles.toastText, tf(), { color: c.bg }]}>{toast}</Text>
        </Animated.View>
      )}
      <BottomBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 18, paddingBottom: 56, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start' },
  greet: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  brand: { color: '#fff', fontSize: 26, marginTop: 2 },
  tagline: { color: 'rgba(255,255,255,0.75)', fontSize: 12.5, marginTop: 1 },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: -2, right: -4, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  bellDotText: { color: '#1A1300', fontFamily: font.bold, fontSize: 10 },
  searchBar: { marginTop: 18, height: 52, borderRadius: 16, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 6, gap: 10 },
  searchText: { flex: 1, color: '#93A39A', fontSize: 13.5 },
  filterBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  deco: { position: 'absolute', right: -30, top: -10, transform: [{ rotate: '-15deg' }] },
  stats: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: -38 },
  stat: { borderRadius: 18, padding: 12, borderWidth: 1, shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statNum: { fontFamily: font.bold, fontSize: 22, marginTop: 6 },
  statLabel: { fontSize: 11.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  cell: { width: '25%', padding: 4 },
  cellInner: { alignItems: 'center', gap: 6, paddingVertical: 6 },
  catIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  catCount: { position: 'absolute', top: -5, right: -7, minWidth: 22, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, elevation: 2, shadowOpacity: 0.15, shadowRadius: 4 },
  catCountText: { fontFamily: font.bold, fontSize: 10.5 },
  catLabel: { fontSize: 11.5, textAlign: 'center' },
  hList: { paddingHorizontal: 16, gap: 10 },
  cityChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 40, borderRadius: 20, borderWidth: 1 },
  cityText: { fontFamily: font.medium, fontSize: 13 },
  closeCard: { width: 252, borderRadius: 20, padding: 14, gap: 10, borderWidth: 1, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2, marginBottom: 4 },
  closeOrg: { flex: 1, fontFamily: font.medium, fontSize: 11.5 },
  closeTitle: { fontFamily: font.semi, fontSize: 14.5, lineHeight: 20, minHeight: 40 },
  mini: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingBottom: 12 },
  miniTitle: { color: '#fff', fontSize: 16, flex: 1 },
  miniCount: { color: 'rgba(255,255,255,0.8)', fontFamily: font.medium, fontSize: 12 },
  toast: { position: 'absolute', alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22, elevation: 6 },
  toastText: { fontSize: 13 },
});

/** Horizontal snap carousel of compact job cards. */
function JobStrip({ jobs, featured }: { jobs: Job[]; featured?: boolean }) {
  const c = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList} decelerationRate="fast" snapToInterval={262}>
      {jobs.map((job, i) => (
        <Animated.View key={job.id} entering={FadeInRight.delay(i * 60).springify()}>
          <Tap style={[styles.closeCard, { backgroundColor: c.card, borderColor: featured ? c.gold : c.border, shadowColor: c.shadow }]}
            onPress={() => router.push(`/job/${job.id}`)}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <OrgAvatar job={job} size={38} />
              <Text style={[styles.closeOrg, { color: c.sub }]} numberOfLines={2}>{job.organization}</Text>
            </View>
            <Text style={[styles.closeTitle, { color: c.text }]} numberOfLines={2}>{job.title}</Text>
            {job.salary ? <Text style={{ color: c.ok, fontFamily: font.semi, fontSize: 12.5 }} numberOfLines={1}>💰 {job.salary}</Text> : <DeadlineBadge job={job} />}
          </Tap>
        </Animated.View>
      ))}
    </ScrollView>
  );
}
