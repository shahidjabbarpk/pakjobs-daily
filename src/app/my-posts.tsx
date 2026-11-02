import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FeaturedPayInfo } from '@/components/community';
import { EmptyState, Icon, Tap, useStatusBar } from '@/components/ui';
import { deletePost, fetchMyPosts, requestFeature } from '@/lib/community';
import { refreshJobs } from '@/lib/feed';
import { prettyDate } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { font, useTheme } from '@/lib/theme';
import type { Job } from '@/lib/types';

export default function MyPosts() {
  useStatusBar('plain');
  const c = useTheme();
  const { t, tf } = useI18n();
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<Job[] | null>(null);
  const [err, setErr] = useState(false);

  const load = useCallback(() => {
    setErr(false);
    fetchMyPosts().then(setPosts).catch(() => setErr(true));
  }, []);
  useFocusEffect(load);

  const confirmDelete = (job: Job) => {
    // refresh the shared job list too, or the deleted post lingers on Private Jobs
    const run = () => deletePost(job.id).then(() => { load(); refreshJobs().catch(() => {}); }).catch(() => setErr(true));
    if (Platform.OS === 'web') { run(); return; }
    Alert.alert(t('confirmDelete'), job.title, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: run },
    ]);
  };

  const statusMeta = (j: Job) =>
    j.status === 'approved' ? { label: t('statusApproved'), color: c.ok, icon: 'check-circle' as const }
      : j.status === 'rejected' ? { label: t('statusRejected'), color: c.danger, icon: 'close-circle' as const }
        : { label: t('statusPending'), color: c.warn, icon: 'clock-outline' as const };

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: c.bg }}
      data={posts ?? []}
      keyExtractor={(j) => j.id}
      ListHeaderComponent={
        <View style={[styles.head, { paddingTop: insets.top + 8 }]}>
          <Tap onPress={() => router.back()} style={[styles.back, { backgroundColor: c.card }]}>
            <Icon name="arrow-left" size={22} color={c.text} />
          </Tap>
          <Text style={[styles.h1, tf('bold'), { color: c.text }]}>{t('myPosts')}</Text>
          <Tap onPress={() => router.push('/post-job')} style={[styles.add, { backgroundColor: c.primary }]}>
            <Icon name="plus" size={22} color="#fff" />
          </Tap>
        </View>
      }
      ListEmptyComponent={
        posts === null && !err ? <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
          : <EmptyState icon={err ? 'wifi-off' : 'briefcase-plus-outline'} title={err ? t('errorGeneric') : t('nothingHere')} hint={t('postJob')} />
      }
      renderItem={({ item, index }) => {
        const st = statusMeta(item);
        return (
          <Animated.View entering={FadeInDown.delay(index * 50)} style={[styles.card, { backgroundColor: c.card, borderColor: item.featured ? c.gold : c.border }]}>
            <View style={styles.row}>
              <View style={[styles.status, { backgroundColor: st.color + '1F' }]}>
                <Icon name={st.icon} size={14} color={st.color} />
                <Text style={[tf('bold'), { color: st.color, fontSize: 11.5 }]}>{st.label}</Text>
              </View>
              {item.featured && <Text style={[styles.feat, { backgroundColor: c.gold }]}>⭐ {t('featured')}</Text>}
              <View style={{ flex: 1 }} />
              <Tap onPress={() => confirmDelete(item)} haptic={false}><Icon name="trash-can-outline" size={20} color={c.faint} /></Tap>
            </View>
            <Tap haptic={false} disabled={item.status !== 'approved'} onPress={() => router.push(`/job/${item.id}`)}>
              <Text style={[styles.title, { color: c.text }]}>{item.title}</Text>
              <Text style={[styles.sub, { color: c.sub }]}>{item.organization} • {item.cities[0]} • {prettyDate(item.postedDate)}</Text>
            </Tap>
            {!item.featured && item.status !== 'rejected' && (
              item.featureRequested ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={[tf(), { color: c.gold, fontSize: 12.5, marginBottom: 6 }]}>⭐ {t('featureRequested')}</Text>
                  <FeaturedPayInfo jobId={item.id} />
                </View>
              ) : (
                <Tap onPress={() => requestFeature(item.id).then(load).catch(() => setErr(true))}
                  style={[styles.featBtn, { borderColor: c.gold }]}>
                  <Text style={[tf('bold'), { color: c.gold, fontSize: 13 }]}>{t('requestFeatured')}</Text>
                </Tap>
              )
            )}
          </Animated.View>
        );
      }}
      contentContainerStyle={{ paddingBottom: 40 }}
    />
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 14 },
  back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  add: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  h1: { fontSize: 22 },
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 18, padding: 14, borderWidth: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  feat: { fontFamily: font.bold, fontSize: 10.5, color: '#1A1300', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  title: { fontFamily: font.semi, fontSize: 15 },
  sub: { fontFamily: font.regular, fontSize: 12.5, marginTop: 2 },
  featBtn: { marginTop: 12, borderWidth: 1.5, borderRadius: 12, height: 42, alignItems: 'center', justifyContent: 'center' },
});
