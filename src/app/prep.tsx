import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName, SectionTitle, Tap, useStatusBar } from '@/components/ui';
import { EXAMS } from '@/data/exams';
import { SUBJECTS } from '@/data/mcqs';
import { BottomBanner, withAd } from '@/lib/ads';
import { useI18n } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import { font, useTheme } from '@/lib/theme';

/** Exam Center: mock tests per commission, subject practice, past papers, test schedules. */
export default function Prep() {
  useStatusBar('hero');
  const c = useTheme();
  const { t, tf, isUr } = useI18n();
  const insets = useSafeAreaInsets();
  const best = useApp((s) => s.quizBest);

  // a short ad before a practice session starts (the result screen shows the other one)
  const startQuiz = (key: string) => withAd(() => router.push(`/quiz/${key}`));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <LinearGradient colors={['#4C1D95', '#7C3AED', '#A78BFA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 10 }]}>
          <Tap onPress={() => router.back()} style={styles.back}><Icon name="arrow-left" size={22} color="#fff" /></Tap>
          <Text style={[styles.h1, tf('bold')]}>📚 {t('examCenter')}</Text>
          <Text style={[styles.sub, tf()]}>{t('prepSub')}</Text>
          <Icon name="school" size={150} color="rgba(255,255,255,0.08)" style={styles.deco} />
        </LinearGradient>

        <View style={styles.quick}>
          <Quick icon="file-document-multiple-outline" label={t('pastPapers')} color="#0E7490" onPress={() => router.push('/past-papers')} />
          <Quick icon="calendar-clock" label={t('testSchedule')} color="#D97706" onPress={() => router.push({ pathname: '/updates', params: { kind: 'schedule' } })} />
          <Quick icon="trophy-outline" label={t('kind.result')} color="#16A34A" onPress={() => router.push({ pathname: '/updates', params: { kind: 'result' } })} />
        </View>

        <SectionTitle title={`📝 ${t('mockTests')}`} />
        <Text style={[styles.note, tf(), { color: c.sub }]}>{t('mockHint')}</Text>
        <View style={styles.grid}>
          {EXAMS.map((e) => (
            <View key={e.key} style={styles.cell}>
              <Tap onPress={() => router.push(`/exam/${e.key}`)} style={[styles.subject, { backgroundColor: c.card, borderColor: c.border }]}>
                <LinearGradient colors={e.colors} style={styles.subIcon}>
                  <Icon name={e.icon as IconName} size={24} color="#fff" />
                </LinearGradient>
                <Text style={[styles.subTitle, { color: c.text }]} numberOfLines={1}>{e.name}</Text>
                <Text style={[styles.subMeta, { color: c.faint }]} numberOfLines={1}>
                  {Object.values(e.mix).reduce((a, b) => a + b, 0)} MCQs • {e.minutes} min
                  {best[`mock-${e.key}`] != null ? ` • ${t('best')} ${best[`mock-${e.key}`]}%` : ''}
                </Text>
              </Tap>
            </View>
          ))}
        </View>

        <SectionTitle title={`🧠 ${t('mcqPractice')}`} />
        <View style={styles.grid}>
          {SUBJECTS.map((s) => (
            <View key={s.key} style={styles.cell}>
              <Tap onPress={() => startQuiz(s.key)} style={[styles.subject, { backgroundColor: c.card, borderColor: c.border }]}>
                <LinearGradient colors={s.colors} style={styles.subIcon}>
                  <Icon name={s.icon as IconName} size={24} color="#fff" />
                </LinearGradient>
                <Text style={[styles.subTitle, isUr ? { fontFamily: font.urdu } : null, { color: c.text }]} numberOfLines={1}>{isUr ? s.titleUr : s.title}</Text>
                <Text style={[styles.subMeta, { color: c.faint }]}>
                  {s.mcqs.length} {t('questions')}{best[s.key] != null ? ` • ${t('best')} ${best[s.key]}%` : ''}
                </Text>
              </Tap>
            </View>
          ))}
        </View>
      </ScrollView>
      <BottomBanner />
    </View>
  );
}

function Quick({ icon, label, color, onPress }: { icon: IconName; label: string; color: string; onPress: () => void }) {
  const c = useTheme();
  const { tf } = useI18n();
  return (
    <Tap onPress={onPress} style={[styles.quickBtn, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[styles.quickIcon, { backgroundColor: color + '1F' }]}><Icon name={icon} size={22} color={color} /></View>
      <Text style={[tf('bold'), { color: c.text, fontSize: 12, textAlign: 'center' }]} numberOfLines={2}>{label}</Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 18, paddingBottom: 26, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  h1: { color: '#fff', fontSize: 24 },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  deco: { position: 'absolute', right: -30, bottom: -30 },
  quick: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 16 },
  quickBtn: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 6, borderRadius: 18, borderWidth: 1 },
  quickIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: 12, paddingHorizontal: 18, marginTop: -4, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  cell: { width: '50%', padding: 4 },
  subject: { borderRadius: 18, padding: 14, borderWidth: 1, gap: 6 },
  subIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  subTitle: { fontFamily: font.semi, fontSize: 14 },
  subMeta: { fontFamily: font.regular, fontSize: 11.5 },
});
