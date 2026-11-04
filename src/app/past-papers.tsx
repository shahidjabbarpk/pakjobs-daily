import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dropdown } from '@/components/Dropdown';
import { PaperRow } from '@/components/PaperRow';
import { Icon, type IconName, SectionTitle, Tap, useStatusBar } from '@/components/ui';
import { EXAMS } from '@/data/exams';
import { BottomBanner } from '@/lib/ads';
import { useI18n } from '@/lib/i18n';
import { exportPracticePaper } from '@/lib/paper';
import { useApp } from '@/lib/store';
import { font, useTheme } from '@/lib/theme';

/**
 * Official past papers listed by name (the PDFs the commissions publish, refreshed by the scraper),
 * opened inside the app; below them, practice papers with answer keys that save as PDF.
 */
export default function PastPapers() {
  useStatusBar('hero');
  const c = useTheme();
  const { t, tf } = useI18n();
  const insets = useSafeAreaInsets();
  const papers = useApp((s) => s.papers);
  const [src, setSrc] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const sources = useMemo(() => [...new Set(papers.map((p) => p.source))], [papers]);
  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return papers.filter((p) => (!src || p.source === src) && words.every((w) => `${p.title} ${p.source}`.toLowerCase().includes(w)));
  }, [papers, src, q]);

  const download = async (key: string) => {
    setBusy(key);
    await exportPracticePaper(EXAMS.find((e) => e.key === key)!).catch(() => {});
    setBusy(null);
  };

  const header = (
    <View>
      <LinearGradient colors={['#0F4C5C', '#0E7490', '#22D3EE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 10 }]}>
        <Tap onPress={() => router.back()} style={styles.back}><Icon name="arrow-left" size={22} color="#fff" /></Tap>
        <Text style={[styles.h1, tf('bold')]}>📄 {t('pastPapers')}</Text>
        <Text style={[styles.sub, tf()]}>{papers.length} {t('pastPapersSub')}</Text>
        <Icon name="file-document-multiple" size={150} color="rgba(255,255,255,0.08)" style={styles.deco} />
      </LinearGradient>
      <View style={styles.filters}>
        <View style={[styles.search, { backgroundColor: c.card, borderColor: c.border }]}>
          <Icon name="magnify" size={18} color={c.faint} />
          <TextInput value={q} onChangeText={setQ} placeholder={t('searchPapers')} placeholderTextColor={c.faint}
            style={[styles.input, { color: c.text }]} autoCorrect={false} />
        </View>
        <Dropdown label={t('commissionShort')} icon="bank-outline" value={src}
          options={sources.map((s) => ({ value: s, label: s.toUpperCase() }))} onChange={setSrc} />
      </View>
    </View>
  );

  const footer = (
    <View>
      <SectionTitle title={`📝 ${t('practicePapers')}`} />
      <Text style={[styles.note, tf(), { color: c.sub }]}>{t('practicePapersHint')}</Text>
      {EXAMS.map((e) => (
        <Tap key={e.key} onPress={() => download(e.key)} disabled={!!busy} style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
          <LinearGradient colors={e.colors} style={styles.icon}><Icon name={e.icon as IconName} size={18} color="#fff" /></LinearGradient>
          <Text style={[styles.title, { color: c.text }]}>{e.name} {t('practicePaper')}</Text>
          {busy === e.key ? <ActivityIndicator size="small" color={c.primary} />
            : <Text style={[styles.pdf, { backgroundColor: c.primarySoft, color: c.primary }]}>PDF</Text>}
        </Tap>
      ))}
      <View style={{ height: 24 }} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        data={list}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        renderItem={({ item }) => <PaperRow paper={item} />}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
      />
      <BottomBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 18, paddingBottom: 26, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  h1: { color: '#fff', fontSize: 24 },
  sub: { color: 'rgba(255,255,255,0.88)', fontSize: 12.5, marginTop: 4 },
  deco: { position: 'absolute', right: -30, bottom: -30 },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginVertical: 14 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, borderRadius: 20, borderWidth: 1, paddingHorizontal: 12 },
  input: { flex: 1, fontFamily: font.regular, fontSize: 13 },
  note: { fontSize: 12, paddingHorizontal: 18, marginTop: -4, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 16, borderWidth: 1 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: font.semi, fontSize: 13.5 },
  pdf: { fontFamily: font.bold, fontSize: 10.5, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
});
