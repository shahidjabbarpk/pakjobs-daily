import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName, Tap, useStatusBar } from '@/components/ui';
import { EXAMS } from '@/data/exams';
import { adOnOpen, BottomBanner } from '@/lib/ads';
import { useI18n } from '@/lib/i18n';
import { exportPracticePaper } from '@/lib/paper';
import { font, useTheme } from '@/lib/theme';

/**
 * Past papers per body. Official papers/syllabi open on the body's own website (download them there);
 * the app adds a practice paper with answer key that can be saved as PDF and used offline.
 */
export default function PastPapers() {
  useStatusBar('hero');
  const c = useTheme();
  const { t, tf } = useI18n();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState<string | null>(null);

  const download = async (key: string) => {
    setBusy(key);
    await exportPracticePaper(EXAMS.find((e) => e.key === key)!).catch(() => {});
    setBusy(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <LinearGradient colors={['#0F4C5C', '#0E7490', '#22D3EE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 10 }]}>
          <Tap onPress={() => router.back()} style={styles.back}><Icon name="arrow-left" size={22} color="#fff" /></Tap>
          <Text style={[styles.h1, tf('bold')]}>📄 {t('pastPapers')}</Text>
          <Text style={[styles.sub, tf()]}>{t('pastPapersSub')}</Text>
          <Icon name="file-document-multiple" size={150} color="rgba(255,255,255,0.08)" style={styles.deco} />
        </LinearGradient>

        {EXAMS.map((e) => (
          <View key={e.key} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.head}>
              <LinearGradient colors={e.colors} style={styles.icon}><Icon name={e.icon as IconName} size={20} color="#fff" /></LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: c.text }]}>{e.name}</Text>
                <Text style={[styles.full, { color: c.faint }]} numberOfLines={1}>{e.full}</Text>
              </View>
            </View>
            {e.links.map((l) => (
              <Tap key={l.url} onPress={() => adOnOpen('paper', () => WebBrowser.openBrowserAsync(l.url))}
                style={[styles.link, { borderTopColor: c.border }]}>
                <Icon name="web" size={17} color={c.primary} />
                <Text style={[styles.linkText, { color: c.text }]}>{l.label}</Text>
                <Icon name="open-in-new" size={15} color={c.faint} />
              </Tap>
            ))}
            <Tap onPress={() => download(e.key)} disabled={!!busy} style={[styles.link, { borderTopColor: c.border }]}>
              {busy === e.key ? <ActivityIndicator size="small" color={c.primary} /> : <Icon name="file-download-outline" size={17} color={c.primary} />}
              <Text style={[styles.linkText, { color: c.text }]}>{t('downloadPaper')}</Text>
              <Text style={[styles.pdf, { backgroundColor: c.primarySoft, color: c.primary }]}>PDF</Text>
            </Tap>
            <Tap onPress={() => router.push(`/exam/${e.key}`)} style={[styles.link, { borderTopColor: c.border }]}>
              <Icon name="play-circle-outline" size={17} color={c.primary} />
              <Text style={[styles.linkText, tf('bold'), { color: c.primary }]}>{t('mockTest')}</Text>
              <Icon name="chevron-right" size={18} color={c.faint} />
            </Tap>
          </View>
        ))}
      </ScrollView>
      <BottomBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 18, paddingBottom: 26, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden', marginBottom: 8 },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  h1: { color: '#fff', fontSize: 24 },
  sub: { color: 'rgba(255,255,255,0.88)', fontSize: 12.5, marginTop: 4 },
  deco: { position: 'absolute', right: -30, bottom: -30 },
  card: { marginHorizontal: 16, marginTop: 10, borderRadius: 18, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4, borderWidth: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: font.bold, fontSize: 15 },
  full: { fontFamily: font.regular, fontSize: 11.5 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  linkText: { flex: 1, fontFamily: font.medium, fontSize: 13.5 },
  pdf: { fontFamily: font.bold, fontSize: 10.5, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
});
