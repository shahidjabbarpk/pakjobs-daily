import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JobCard } from '@/components/JobCard';
import { WebJobs } from '@/components/WebJobs';
import {
  BrandSpinner, brandRefreshControl, Chip, EmptyState, Icon, JobCardSkeleton, Tap, useStatusBar, useTabBarSpace,
} from '@/components/ui';
import { NativeAdCard } from '@/lib/ads';
import { NATIVE_AD_EVERY } from '@/lib/config';
import { communityReady } from '@/lib/community';
import { refreshJobs } from '@/lib/feed';
import { urgency } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { jobInArea } from '@/lib/places';
import { INDUSTRIES, jobIndustry } from '@/lib/industries';
import { useApp } from '@/lib/store';
import { font, useTheme } from '@/lib/theme';
import type { Job } from '@/lib/types';

type Row = { type: 'job'; job: Job; i: number } | { type: 'ad'; key: string };

export default function PrivateJobs() {
  useStatusBar('hero');
  const c = useTheme();
  const { t, tf } = useI18n();
  const insets = useSafeAreaInsets();
  const jobs = useApp((s) => s.jobs);
  const homeCity = useApp((s) => s.homeCity);
  const [area, setArea] = useState<string | null>(homeCity);
  const [industry, setIndustry] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const syncing = useApp((s) => s.syncing);
  const tabSpace = useTabBarSpace();

  const list = useMemo(() => jobs
    // employers' own posts plus private-company ads found on the official portals
    .filter((j) => (j.source === 'user' || j.category === 'private') && urgency(j) !== 'closed' && jobInArea(j, area)
      && (!industry || jobIndustry(j) === industry))
    .sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || b.firstSeen.localeCompare(a.firstSeen)), [jobs, area, industry]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    list.forEach((job, i) => {
      out.push({ type: 'job', job, i });
      if ((i + 1) % NATIVE_AD_EVERY === 0) out.push({ type: 'ad', key: `ad-${i}` });
    });
    return out;
  }, [list]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshJobs().catch(() => {});
    setRefreshing(false);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        data={rows}
        keyExtractor={(r) => (r.type === 'job' ? r.job.id : r.key)}
        renderItem={({ item }) => (item.type === 'job' ? <JobCard job={item.job} index={item.i} /> : <NativeAdCard />)}
        refreshControl={brandRefreshControl(refreshing, onRefresh)}
        ListHeaderComponent={
          <View>
            <LinearGradient colors={[c.heroA, c.heroB, c.heroC]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.hero, { paddingTop: insets.top + 14 }]}>
              <View style={styles.heroRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.h1, tf('bold')]}>{t('privateJobs')}</Text>
                  <Text style={[styles.sub, tf()]}>{list.length} {t('liveJobs').toLowerCase()}</Text>
                </View>
                <Tap onPress={() => router.push('/my-posts')} style={styles.heroBtn}>
                  <Icon name="account-box-outline" size={22} color="#fff" />
                </Tap>
              </View>
              <Animated.View>
                <Tap onPress={() => router.push('/post-job')} style={styles.postBtn}>
                  <Icon name="briefcase-plus" size={22} color={c.heroB} />
                  <Text style={[styles.postText, tf('bold'), { color: c.heroB }]}>{t('postJob')}</Text>
                  <Text style={styles.free}>FREE</Text>
                </Tap>
              </Animated.View>
              <Icon name="briefcase-variant" size={150} color="rgba(255,255,255,0.08)" style={styles.deco} />
            </LinearGradient>
            <View style={styles.filters}>
              <Chip icon="earth" label={t('allPakistan')} active={!area} onPress={() => setArea(null)} />
              {homeCity && <Chip icon="map-marker" label={homeCity} active={area === homeCity} onPress={() => setArea(homeCity)} />}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.industries}>
              <Chip icon="view-grid-outline" label={t('all')} active={!industry} onPress={() => setIndustry(null)} />
              {INDUSTRIES.map((i) => (
                <Chip key={i.key} icon={i.icon} label={t(`ind.${i.key}` as any)} active={industry === i.key}
                  onPress={() => setIndustry(industry === i.key ? null : i.key)} />
              ))}
            </ScrollView>
            <Animated.View style={[styles.warn, { backgroundColor: c.danger + '12' }]}>
              <Icon name="shield-alert-outline" size={16} color={c.danger} />
              <Text style={[tf(), { color: c.danger, fontSize: 12, flex: 1 }]}>{t('scamWarning')}</Text>
            </Animated.View>
          </View>
        }
        ListEmptyComponent={syncing
          ? <View>{[0, 1, 2].map((k) => <JobCardSkeleton key={k} />)}</View>
          : <EmptyState icon="briefcase-search-outline" title={t('nothingHere')} hint={communityReady() ? t('postJob') : t('communityOff')} />}
        ListFooterComponent={<View><WebJobs industry={industry} area={area} /><View style={{ height: tabSpace }} /></View>}
        showsVerticalScrollIndicator={false}
      />
      <BrandSpinner visible={refreshing} top={insets.top + 12} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 18, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  h1: { color: '#fff', fontSize: 24 },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  heroBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  postBtn: { marginTop: 16, height: 54, borderRadius: 27, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  postText: { color: '#0E7490', fontSize: 16 },
  free: { fontFamily: font.bold, fontSize: 10, color: '#fff', backgroundColor: '#00C853', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  deco: { position: 'absolute', right: -30, top: 0 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 14 },
  industries: { gap: 8, paddingHorizontal: 16, marginTop: 10 },
  warn: { flexDirection: 'row', gap: 8, alignItems: 'center', marginHorizontal: 16, marginVertical: 12, padding: 10, borderRadius: 12 },
});
