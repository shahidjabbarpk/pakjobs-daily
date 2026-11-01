import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, EmptyState, Icon, type IconName, Tap, useStatusBar } from '@/components/ui';
import {
  banUser, deleteComment, deletePost, dismissReport, fetchFeatureRequests, fetchPending, fetchReports, moderatePost,
} from '@/lib/community';
import { prettyDate, toIntl } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import { font, useTheme } from '@/lib/theme';
import type { Job, Report } from '@/lib/types';

type Tab = 'pending' | 'featured' | 'reports';

export default function Admin() {
  useStatusBar('plain');
  const c = useTheme();
  const { t, tf } = useI18n();
  const insets = useSafeAreaInsets();
  const admin = useApp((s) => s.admin);
  const [tab, setTab] = useState<Tab>('pending');
  const [pending, setPending] = useState<Job[] | null>(null);
  const [featured, setFeatured] = useState<Job[] | null>(null);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [p, f, r] = await Promise.all([fetchPending(), fetchFeatureRequests(), fetchReports()]);
      setPending(p);
      setFeatured(f);
      setReports(r);
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { if (admin) load(); }, [admin, load]);

  const act = (fn: () => Promise<unknown>) => fn().then(load).catch((e) => setErr(String(e?.message ?? e)));

  if (!admin) {
    return <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center' }}><EmptyState icon="lock-outline" title="Admin only" hint="" /></View>;
  }

  const counts = { pending: pending?.length ?? 0, featured: featured?.length ?? 0, reports: reports?.length ?? 0 };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[c.primary]} />}>
      <View style={styles.head}>
        <Tap onPress={() => router.back()} style={[styles.back, { backgroundColor: c.card }]}>
          <Icon name="arrow-left" size={22} color={c.text} />
        </Tap>
        <Text style={[styles.h1, tf('bold'), { color: c.text, flex: 1 }]}>🛡️ {t('admin')}</Text>
        <Tap onPress={() => router.push('/post-job')} style={[styles.back, { backgroundColor: c.primary }]}>
          <Icon name="plus" size={22} color="#fff" />
        </Tap>
      </View>
      <View style={styles.tabs}>
        <Chip label={`${t('pending')} (${counts.pending})`} active={tab === 'pending'} onPress={() => setTab('pending')} />
        <Chip label={`⭐ ${t('featured')} (${counts.featured})`} active={tab === 'featured'} onPress={() => setTab('featured')} />
        <Chip label={`${t('reports')} (${counts.reports})`} active={tab === 'reports'} onPress={() => setTab('reports')} />
      </View>
      {err && <Text style={[styles.err, { color: c.danger }]}>{err}</Text>}
      {loading && !pending && <ActivityIndicator color={c.primary} style={{ marginTop: 30 }} />}

      {tab === 'pending' && pending?.map((j, i) => (
        <PostCard key={j.id} job={j} i={i} actions={[
          ['check', t('approve'), c.ok, () => act(() => moderatePost(j.id, { status: 'approved' }))],
          ['close', t('reject'), c.danger, () => act(() => moderatePost(j.id, { status: 'rejected' }))],
          ['account-cancel', t('ban'), c.faint, () => act(async () => { await banUser(j.ownerUid!); await deletePost(j.id); })],
        ]} />
      ))}

      {tab === 'featured' && featured?.map((j, i) => (
        <PostCard key={j.id} job={j} i={i} actions={[
          j.featured
            ? ['star-off', t('removeFeatured'), c.faint, () => act(() => moderatePost(j.id, { featured: false, featureRequested: false }))]
            : ['star', t('makeFeatured'), c.gold, () => act(() => moderatePost(j.id, { featured: true, status: 'approved' }))],
          ['close', t('dismiss'), c.faint, () => act(() => moderatePost(j.id, { featureRequested: false }))],
        ]} />
      ))}

      {tab === 'reports' && reports?.map((r, i) => (
        <Animated.View key={r.id} entering={FadeInDown.delay(i * 40)} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.title, { color: c.text }]}>{r.kind === 'comment' ? '💬 Comment' : '📄 Job'} • {t(r.reason as any)}</Text>
          <Text style={[styles.meta, { color: c.faint }]}>{r.jobId}{r.commentId ? ` / ${r.commentId}` : ''}</Text>
          <View style={styles.actions}>
            <Action icon="eye" label="Open" color={c.primary} onPress={() => router.push(`/job/${r.jobId}`)} />
            <Action icon="trash-can" label={t('delete')} color={c.danger} onPress={() => act(async () => {
              if (r.kind === 'comment' && r.commentId) await deleteComment(r.jobId, r.commentId);
              else if (r.jobId.startsWith('u-')) await deletePost(r.jobId);
              await dismissReport(r.id);
            })} />
            <Action icon="close" label={t('dismiss')} color={c.faint} onPress={() => act(() => dismissReport(r.id))} />
          </View>
        </Animated.View>
      ))}

      {!loading && ((tab === 'pending' && counts.pending === 0) || (tab === 'featured' && counts.featured === 0)
        || (tab === 'reports' && counts.reports === 0)) && <EmptyState icon="check-all" title={t('nothingHere')} hint="" />}
    </ScrollView>
  );
}

function PostCard({ job, i, actions }: { job: Job; i: number; actions: [IconName, string, string, () => void][] }) {
  const c = useTheme();
  const { t } = useI18n();
  return (
    <Animated.View entering={FadeInDown.delay(i * 40)} style={[styles.card, { backgroundColor: c.card, borderColor: job.featured ? c.gold : c.border }]}>
      <Text style={[styles.title, { color: c.text }]}>{job.title}</Text>
      <Text style={[styles.meta, { color: c.sub }]}>{job.organization} • {job.cities[0]} • {job.salary ?? '—'}</Text>
      <Text style={[styles.meta, { color: c.faint }]}>{t('postedBy')}: {job.ownerName} • {prettyDate(job.postedDate)} • {job.status}</Text>
      <Text style={[styles.desc, { color: c.sub }]} numberOfLines={6}>{job.description}</Text>
      <View style={styles.contacts}>
        {!!job.phone && <Action icon="phone" label={job.phone} color={c.primary} onPress={() => Linking.openURL(`tel:${job.phone}`)} />}
        {!!job.whatsapp && <Action icon="whatsapp" label="WhatsApp" color="#25D366" onPress={() => Linking.openURL(`https://wa.me/${toIntl(job.whatsapp!)}`)} />}
      </View>
      <View style={styles.actions}>
        <Action icon="pencil" label={t('editPost')} color={c.primary} onPress={() => router.push({ pathname: '/post-job', params: { edit: job.id } })} />
        {actions.map(([icon, label, color, fn]) => <Action key={label} icon={icon} label={label} color={color} onPress={fn} />)}
      </View>
    </Animated.View>
  );
}

function Action({ icon, label, color, onPress }: { icon: IconName; label: string; color: string; onPress: () => void }) {
  return (
    <Tap onPress={onPress} style={[styles.action, { backgroundColor: color + '1A' }]}>
      <Icon name={icon} size={16} color={color} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
  back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 22 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 6 },
  err: { fontFamily: font.medium, fontSize: 12, marginHorizontal: 16, marginTop: 8 },
  card: { marginHorizontal: 16, marginTop: 12, borderRadius: 18, padding: 14, borderWidth: 1.5 },
  title: { fontFamily: font.semi, fontSize: 15 },
  meta: { fontFamily: font.regular, fontSize: 12, marginTop: 2 },
  desc: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 19, marginTop: 8 },
  contacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 10 },
  actionText: { fontFamily: font.semi, fontSize: 12.5 },
});
