import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dropdown } from './Dropdown';
import {
  BrandSpinner, brandRefreshControl, EmptyState, Icon, type IconName, NewBadge, Tap, useStatusBar, useTabBarSpace,
} from '@/components/ui';
import { NativeAdCard, showRewarded } from '@/lib/ads';
import { NATIVE_AD_EVERY } from '@/lib/config';
import { prettyDate, safeUrl } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import { font, useTheme } from '@/lib/theme';
import type { Update, UpdateKind } from '@/lib/types';
import { refreshUpdates } from '@/lib/updates';

const KIND_META: Record<UpdateKind, { icon: IconName; color: string }> = {
  rollno: { icon: 'card-account-details-outline', color: '#0E7490' },
  result: { icon: 'trophy-outline', color: '#16A34A' },
  interview: { icon: 'account-tie-voice-outline', color: '#7C3AED' },
  schedule: { icon: 'calendar-clock', color: '#D97706' },
};
const SOURCES = ['ppsc', 'fpsc', 'kppsc', 'spsc', 'bpsc', 'nts'];

type Row = { type: 'u'; u: Update; i: number } | { type: 'ad'; key: string };

/** Results / roll-no / schedule notices; `tab` = shown as the Alerts tab (no back button). */
export function UpdatesScreen({ tab }: { tab?: boolean }) {
  useStatusBar('plain');
  const c = useTheme();
  const { t, tf } = useI18n();
  const insets = useSafeAreaInsets();
  const updates = useApp((s) => s.updates);
  // home's Services grid opens this pre-filtered (?kind=result / rollno)
  const params = useLocalSearchParams<{ kind?: UpdateKind }>();
  const [kind, setKind] = useState<UpdateKind | null>(params.kind ?? null);
  useEffect(() => { if (params.kind) setKind(params.kind); }, [params.kind]);
  const [src, setSrc] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const tabSpace = useTabBarSpace();
  // opening the Alerts tab marks everything as read
  useFocusEffect(useCallback(() => {
    if (tab) useApp.getState().set({ alertsSeenAt: Date.now() });
  }, [tab]));

  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return updates.filter((u) => (!kind || u.kind === kind) && (!src || u.source === src)
      && words.every((w) => `${u.title} ${u.source}`.toLowerCase().includes(w)));
  }, [updates, kind, src, q]);
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    list.forEach((u, i) => {
      out.push({ type: 'u', u, i });
      if ((i + 1) % (NATIVE_AD_EVERY * 2) === 0) out.push({ type: 'ad', key: `ad-${i}` });
    });
    return out;
  }, [list]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUpdates().catch(() => {});
    setRefreshing(false);
  }, []);

  // roll-no slips and results open behind a rewarded video (skipped if none is ready)
  const open = (u: Update) => showRewarded(() => WebBrowser.openBrowserAsync(safeUrl(u.url)));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
    <FlatList
      style={{ flex: 1, backgroundColor: c.bg }}
      data={rows}
      keyExtractor={(r) => (r.type === 'u' ? r.u.id : r.key)}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={brandRefreshControl(refreshing, onRefresh)}
      ListHeaderComponent={
        <View style={{ paddingTop: insets.top + 8 }}>
          <View style={styles.head}>
            {!tab && (
              <Tap onPress={() => router.back()} style={[styles.back, { backgroundColor: c.card }]}>
                <Icon name="arrow-left" size={22} color={c.text} />
              </Tap>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.h1, tf('bold'), { color: c.text }]}>{t('updates')}</Text>
              <Text style={[tf(), { color: c.sub, fontSize: 12 }]}>{t('updatesSub')}</Text>
            </View>
          </View>
          <View style={[styles.input, { backgroundColor: c.card, borderColor: c.border }]}>
            <Icon name="magnify" size={20} color={c.faint} />
            <TextInput value={q} onChangeText={setQ} placeholder={t('searchUpdates')} placeholderTextColor={c.faint}
              style={[styles.inputText, { color: c.text }]} returnKeyType="search" autoCorrect={false} />
            {!!q && <Tap onPress={() => setQ('')}><Icon name="close-circle" size={18} color={c.faint} /></Tap>}
          </View>
          <View style={styles.dropdowns}>
            <Dropdown label={t('noticeType')} icon="file-document-multiple-outline" value={kind}
              options={(Object.keys(KIND_META) as UpdateKind[]).map((k) => ({ value: k, label: t(`kind.${k}` as any), icon: KIND_META[k].icon }))}
              onChange={(v) => setKind(v as UpdateKind | null)} />
            <Dropdown label={t('commissionShort')} icon="bank-outline" value={src}
              options={SOURCES.map((k) => ({ value: k, label: k.toUpperCase() }))} onChange={setSrc} />
          </View>
        </View>
      }
      renderItem={({ item }) => {
        if (item.type === 'ad') return <NativeAdCard />;
        const { u, i } = item;
        const meta = KIND_META[u.kind];
        const fresh = Date.now() - Date.parse(u.firstSeen) < 2 * 86_400_000;
        return (
          <Animated.View entering={i < 10 ? FadeInDown.delay(i * 40) : undefined}>
            <Tap onPress={() => open(u)} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={[styles.icon, { backgroundColor: meta.color + '1F' }]}>
                <Icon name={meta.icon} size={22} color={meta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.row}>
                  {/* who published it is what people scan for: big solid badge */}
                  <Text style={[styles.srcBadge, { backgroundColor: meta.color }]}>{u.source.toUpperCase()}</Text>
                  <Text style={[styles.src, { color: meta.color }]}>{t(`kind.${u.kind}` as any)}</Text>
                  {fresh && <NewBadge />}
                </View>
                <Text style={[styles.title, { color: c.text }]} numberOfLines={3}>{u.title}</Text>
                <Text style={[styles.date, { color: c.faint }]}>{prettyDate(u.date ?? u.firstSeen)}</Text>
              </View>
              <Icon name="open-in-new" size={18} color={c.faint} />
            </Tap>
          </Animated.View>
        );
      }}
      ListEmptyComponent={<EmptyState icon="file-document-multiple-outline" title={t('nothingHere')} hint={t('pullToRefresh')} />}
      ListFooterComponent={<View style={{ height: tab ? tabSpace : 30 }} />}
    />
    <BrandSpinner visible={refreshing} top={insets.top + 12} />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
  back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 22 },
  dropdowns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  input: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, borderRadius: 16, paddingHorizontal: 14, borderWidth: 1, marginHorizontal: 16, marginBottom: 12 },
  inputText: { flex: 1, fontFamily: font.regular, fontSize: 14 },
  card: { flexDirection: 'row', gap: 12, alignItems: 'center', marginHorizontal: 16, marginBottom: 10, padding: 14, borderRadius: 18, borderWidth: 1 },
  icon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  srcBadge: { fontFamily: font.bold, fontSize: 13, color: '#fff', letterSpacing: 0.6, paddingHorizontal: 9, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  src: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 0.3 },
  title: { fontFamily: font.semi, fontSize: 14, lineHeight: 20, marginTop: 6 },
  date: { fontFamily: font.regular, fontSize: 11, marginTop: 4 },
});
