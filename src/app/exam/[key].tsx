import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PaperRow } from '@/components/PaperRow';
import { Icon, type IconName, SectionTitle, Tap, useStatusBar } from '@/components/ui';
import { ATTEMPT_STEPS, EXAMS, examByKey } from '@/data/exams';
import { adOnOpen, BottomBanner, withAd } from '@/lib/ads';
import { prettyDate, safeUrl } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { exportPracticePaper } from '@/lib/paper';
import { useApp } from '@/lib/store';
import { font, useTheme } from '@/lib/theme';

/** One recruiting body: start its mock test, download a practice paper, its notices, links and the exam-day guide. */
export default function ExamScreen() {
  useStatusBar('hero');
  const { key } = useLocalSearchParams<{ key: string }>();
  const exam = examByKey(key ?? '') ?? EXAMS[0]!;
  const c = useTheme();
  const { t, tf } = useI18n();
  const insets = useSafeAreaInsets();
  const best = useApp((s) => s.quizBest[`mock-${exam.key}`]);
  const updates = useApp((s) => s.updates);
  const allPapers = useApp((s) => s.papers);
  const papers = useMemo(() => allPapers.filter((p) => p.source === exam.source), [allPapers, exam.source]);
  const [busy, setBusy] = useState(false);
  const total = Object.values(exam.mix).reduce((a, b) => a + b, 0);

  // test dates, interviews, roll-no slips and results this body has announced
  const notices = useMemo(
    () => (exam.source ? updates.filter((u) => u.source === exam.source).slice(0, 6) : []),
    [updates, exam.source],
  );

  const download = async () => {
    setBusy(true);
    await exportPracticePaper(exam).catch(() => {});
    setBusy(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <LinearGradient colors={exam.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 10 }]}>
          <Tap onPress={() => router.back()} style={styles.back}><Icon name="arrow-left" size={22} color="#fff" /></Tap>
          <Text style={[styles.h1, tf('bold')]}>{exam.name}</Text>
          <Text style={[styles.sub, tf()]}>{exam.full}</Text>
          <Icon name={exam.icon as IconName} size={150} color="rgba(255,255,255,0.1)" style={styles.deco} />
        </LinearGradient>

        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[tf('bold'), { color: c.text, fontSize: 16 }]}>📝 {t('mockTest')}</Text>
          <Text style={[tf(), { color: c.sub, fontSize: 12.5, marginTop: 4 }]}>
            {total} MCQs • {exam.minutes} {t('minutes')}{best != null ? ` • ${t('best')} ${best}%` : ''}
          </Text>
          <Text style={[tf(), { color: c.sub, fontSize: 12, marginTop: 6 }]}>{t('mockHint')}</Text>
          <Tap onPress={() => withAd(() => router.push(`/quiz/mock-${exam.key}`))} style={[styles.btn, { backgroundColor: exam.colors[0], marginTop: 14 }]}>
            <Icon name="play-circle-outline" size={20} color="#fff" />
            <Text style={[styles.btnText, tf('bold')]}>{t('startMock')}</Text>
          </Tap>
          <Tap onPress={download} disabled={busy} style={[styles.btn, { backgroundColor: c.cardAlt, marginTop: 10 }]}>
            {busy ? <ActivityIndicator color={c.text} /> : <Icon name="file-download-outline" size={20} color={c.text} />}
            <Text style={[styles.btnText, tf('bold'), { color: c.text }]}>{t('downloadPaper')}</Text>
          </Tap>
        </View>

        {notices.length > 0 && (
          <>
            <SectionTitle title={`📅 ${t('examNotices')}`} />
            {notices.map((u) => (
              <Tap key={u.id} onPress={() => adOnOpen('update', () => WebBrowser.openBrowserAsync(safeUrl(u.url)))}
                style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[styles.kind, { backgroundColor: exam.colors[0] }]}>{t(`kind.${u.kind}` as any)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={2}>{u.title}</Text>
                  {!!u.date && <Text style={[styles.rowMeta, { color: c.faint }]}>{prettyDate(u.date)}</Text>}
                </View>
                <Icon name="open-in-new" size={16} color={c.faint} />
              </Tap>
            ))}
          </>
        )}

        {papers.length > 0 && (
          <>
            <SectionTitle title={`📄 ${t('officialPapers')} (${papers.length})`} />
            {papers.map((p) => <PaperRow key={p.id} paper={p} />)}
          </>
        )}

        <SectionTitle title={`🔗 ${t('syllabus')} & ${t('sources')}`} />
        {exam.links.map((l) => (
          <Tap key={l.url} onPress={() => adOnOpen('paper', () => WebBrowser.openBrowserAsync(l.url))}
            style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
            <Icon name="web" size={20} color={c.primary} />
            <Text style={[styles.rowTitle, { color: c.text, flex: 1 }]}>{l.label}</Text>
            <Icon name="open-in-new" size={16} color={c.faint} />
          </Tap>
        ))}

        <SectionTitle title={`✅ ${t('howToAttempt')}`} />
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, marginTop: 0 }]}>
          {ATTEMPT_STEPS.map((s, i) => (
            <View key={s.title} style={[styles.step, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
              <View style={[styles.stepNum, { backgroundColor: c.primarySoft }]}><Icon name={s.icon as IconName} size={18} color={c.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: c.text }]}>{i + 1}. {s.title}</Text>
                <Text style={[styles.stepBody, { color: c.sub }]}>{s.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <BottomBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 18, paddingBottom: 26, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  h1: { color: '#fff', fontSize: 26 },
  sub: { color: 'rgba(255,255,255,0.88)', fontSize: 13, marginTop: 2 },
  deco: { position: 'absolute', right: -30, bottom: -30 },
  card: { marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 16, borderWidth: 1 },
  btn: { flexDirection: 'row', gap: 8, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 14.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 10, padding: 14, borderRadius: 16, borderWidth: 1 },
  rowTitle: { fontFamily: font.semi, fontSize: 13.5 },
  rowMeta: { fontFamily: font.regular, fontSize: 11.5, marginTop: 2 },
  kind: { fontFamily: font.bold, fontSize: 10.5, color: '#fff', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  step: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  stepNum: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepBody: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 19, marginTop: 2 },
});
