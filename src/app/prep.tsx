import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName, SectionTitle, Tap, useStatusBar } from '@/components/ui';
import { PAST_PAPERS, SUBJECTS } from '@/data/mcqs';
import { BottomBanner, withAd } from '@/lib/ads';
import { useI18n } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import { font, useTheme } from '@/lib/theme';

export default function Prep() {
  useStatusBar('hero');
  const c = useTheme();
  const { t, tf, isUr } = useI18n();
  const insets = useSafeAreaInsets();
  const best = useApp((s) => s.quizBest);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <LinearGradient colors={['#4C1D95', '#7C3AED', '#A78BFA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 10 }]}>
          <Tap onPress={() => router.back()} style={styles.back}><Icon name="arrow-left" size={22} color="#fff" /></Tap>
          <Text style={[styles.h1, tf('bold')]}>📚 {t('preparation')}</Text>
          <Text style={[styles.sub, tf()]}>{t('prepSub')}</Text>
          <Icon name="school" size={150} color="rgba(255,255,255,0.08)" style={styles.deco} />
        </LinearGradient>

        <SectionTitle title={`🧠 ${t('mcqPractice')}`} />
        <View style={styles.grid}>
          {SUBJECTS.map((s, i) => (
            <Animated.View key={s.key} entering={ZoomIn.delay(80 + i * 60).springify().damping(14)} style={styles.cell}>
              <Tap onPress={() => router.push(`/quiz/${s.key}`)} style={[styles.subject, { backgroundColor: c.card, borderColor: c.border }]}>
                <LinearGradient colors={s.colors} style={styles.subIcon}>
                  <Icon name={s.icon as IconName} size={24} color="#fff" />
                </LinearGradient>
                <Text style={[styles.subTitle, isUr ? { fontFamily: font.urdu } : null, { color: c.text }]} numberOfLines={1}>{isUr ? s.titleUr : s.title}</Text>
                <Text style={[styles.subMeta, { color: c.faint }]}>
                  {s.mcqs.length} {t('questions')}{best[s.key] != null ? ` • ${t('best')} ${best[s.key]}%` : ''}
                </Text>
              </Tap>
            </Animated.View>
          ))}
        </View>

        <SectionTitle title={`📄 ${t('pastPapers')}`} />
        {PAST_PAPERS.map((p, i) => (
          <Animated.View key={p.url} entering={FadeInDown.delay(200 + i * 40)}>
            <Tap onPress={() => withAd(() => WebBrowser.openBrowserAsync(p.url))}
              style={[styles.paper, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={[styles.paperIcon, { backgroundColor: c.primarySoft }]}>
                <Icon name="file-document-outline" size={20} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.paperTitle, { color: c.text }]}>{p.title}</Text>
                <Text style={[styles.subMeta, { color: c.faint }]}>{p.source} • official website</Text>
              </View>
              <Icon name="open-in-new" size={18} color={c.faint} />
            </Tap>
          </Animated.View>
        ))}
      </ScrollView>
      <BottomBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 18, paddingBottom: 26, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  h1: { color: '#fff', fontSize: 24 },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  deco: { position: 'absolute', right: -30, bottom: -30 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  cell: { width: '50%', padding: 4 },
  subject: { borderRadius: 18, padding: 14, borderWidth: 1, gap: 6 },
  subIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  subTitle: { fontFamily: font.semi, fontSize: 14 },
  subMeta: { fontFamily: font.regular, fontSize: 11.5 },
  paper: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 10, padding: 14, borderRadius: 16, borderWidth: 1 },
  paperIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  paperTitle: { fontFamily: font.semi, fontSize: 13.5 },
});
