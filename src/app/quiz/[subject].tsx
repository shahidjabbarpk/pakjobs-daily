import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic, Icon, Tap, useStatusBar } from '@/components/ui';
import { buildMock, examByKey, shuffleOptions } from '@/data/exams';
import { type Mcq, SUBJECTS } from '@/data/mcqs';
import { maybeShowInterstitial, withAd } from '@/lib/ads';
import { track } from '@/lib/analytics';
import { maybeAskReview } from '@/lib/engagement';
import { useI18n } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import { font, useTheme } from '@/lib/theme';

const PER_TEST = 15;

function shuffle<T>(a: T[]): T[] {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j]!, x[i]!];
  }
  return x;
}

export default function Quiz() {
  useStatusBar('hero');
  const { subject } = useLocalSearchParams<{ subject: string }>();
  // "mock-ppsc" etc. = a timed mock test in that body's subject mix; anything else = subject practice
  const exam = subject?.startsWith('mock-') ? examByKey(subject.slice(5)) : undefined;
  // memoised: a new object every render would reshuffle the paper on each tap
  const sub = useMemo(() => (exam
    ? { key: subject!, title: `${exam.name} Mock Test`, titleUr: `${exam.name} ماک ٹیسٹ`, colors: exam.colors, mcqs: [] as Mcq[] }
    : SUBJECTS.find((s) => s.key === subject) ?? SUBJECTS[0]!), [exam, subject]);
  const c = useTheme();
  const { t, tf, isUr } = useI18n();
  const insets = useSafeAreaInsets();
  const [round, setRound] = useState(0);
  // every session gets new questions in a new order, with the options shuffled too
  const questions = useMemo<Mcq[]>(
    () => (exam ? buildMock(exam) : shuffle(sub.mcqs).slice(0, PER_TEST).map(shuffleOptions)),
    [exam, sub, round],
  );
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<(number | null)[]>([]);
  const [done, setDone] = useState(false);
  const [review, setReview] = useState(false);

  const q = questions[idx]!;
  const choice = picked[idx] ?? null;
  const score = picked.filter((p, i) => p === questions[i]?.a).length;
  const pct = Math.round((score / questions.length) * 100);

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming((idx + (choice != null ? 1 : 0)) / questions.length, { duration: 400 });
  }, [idx, choice, questions.length, progress]);
  const bar = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  // a mock test is like the real paper: no answer is revealed until the end and answers can be changed
  const pick = (i: number) => {
    if (!exam && choice != null) return;
    haptic(exam || i === q.a ? 'light' : 'medium');
    const next = [...picked];
    next[idx] = i;
    setPicked(next);
  };

  const finish = () => {
    setDone(true);
    const { quizBest, set } = useApp.getState();
    if ((quizBest[sub.key] ?? -1) < pct) set({ quizBest: { ...quizBest, [sub.key]: pct } });
    track(exam ? 'mock_test_complete' : 'practice_complete', { subject: subject ?? '', score: pct });
    // the result is on screen first, then one ad; a good score is a happy moment to ask for a rating
    setTimeout(() => maybeShowInterstitial(pct >= 60 ? maybeAskReview : undefined), 1500);
  };
  const next = () => {
    if (idx + 1 < questions.length) { setIdx(idx + 1); return; }
    finish();
  };

  // mock tests run against the clock and submit themselves when time is up
  const [left, setLeft] = useState(exam ? exam.minutes * 60 : 0);
  useEffect(() => {
    if (!exam || done) return;
    if (left <= 0) { finish(); return; }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [exam, done, left]); // eslint-disable-line react-hooks/exhaustive-deps

  const restart = () => withAd(() => {
    setRound((r) => r + 1);
    setIdx(0);
    setPicked([]);
    setDone(false);
    setReview(false);
    if (exam) setLeft(exam.minutes * 60);
  });

  const title = isUr ? sub.titleUr : sub.title;
  const header = (
    <LinearGradient colors={sub.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 8 }]}>
      <View style={styles.heroRow}>
        <Tap onPress={() => router.back()} style={styles.back}><Icon name="close" size={22} color="#fff" /></Tap>
        <Text style={[styles.heroTitle, isUr ? { fontFamily: font.urduBold } : null]} numberOfLines={1}>{title}</Text>
        {!done && exam && <Text style={[styles.counter, left < 60 && { color: '#FFD54F' }]}>⏱ {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</Text>}
        {!done && <Text style={styles.counter}>{idx + 1}/{questions.length}</Text>}
      </View>
      {!done && (
        <View style={styles.track}><Animated.View style={[styles.fill, bar]} /></View>
      )}
    </LinearGradient>
  );

  if (done) {
    const color = pct >= 70 ? c.ok : pct >= 40 ? c.warn : c.danger;
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        {header}
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
          <Animated.View style={[styles.result, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[tf(), { color: c.sub, fontSize: 14 }]}>{t('yourScore')}</Text>
            <View style={[styles.ring, { borderColor: color }]}>
              <Text style={[styles.pct, { color }]}>{pct}%</Text>
              <Text style={{ color: c.sub, fontFamily: font.medium }}>{score} / {questions.length}</Text>
            </View>
            <Text style={{ fontSize: 30 }}>{pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '📖'}</Text>
          </Animated.View>
          <View style={styles.actions}>
            <Tap onPress={restart} style={[styles.btn, { backgroundColor: sub.colors[0] }]}>
              <Icon name="refresh" size={20} color="#fff" />
              <Text style={[styles.btnText, tf('bold')]}>{t('tryAgain')}</Text>
            </Tap>
            <Tap onPress={() => setReview(!review)} style={[styles.btn, { backgroundColor: c.cardAlt }]}>
              <Icon name="eye-outline" size={20} color={c.text} />
              <Text style={[styles.btnText, tf('bold'), { color: c.text }]}>{t('review')}</Text>
            </Tap>
          </View>
          {review && questions.map((qq, i) => {
            const ok = picked[i] === qq.a;
            return (
              <Animated.View key={i} style={[styles.reviewCard, { backgroundColor: c.card, borderColor: ok ? c.ok : c.danger }]}>
                <Text style={[styles.reviewQ, { color: c.text }]}>{i + 1}. {qq.q}</Text>
                {!ok && picked[i] != null && <Text style={[styles.reviewA, { color: c.danger }]}>✗ {qq.o[picked[i]!]}</Text>}
                <Text style={[styles.reviewA, { color: c.ok }]}>✓ {qq.o[qq.a]}</Text>
                {!!qq.e && <Text style={[styles.expl, { color: c.sub }]}>{qq.e}</Text>}
              </Animated.View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {header}
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 120 }}>
        <Animated.View key={`${round}-${idx}`}>
          <Text style={[styles.question, { color: c.text }]}>{q.q}</Text>
          {q.o.map((opt, i) => {
            const isRight = !exam && choice != null && i === q.a;
            const isWrong = !exam && choice === i && i !== q.a;
            return (
              <Option key={i} label={String.fromCharCode(65 + i)} text={opt} onPress={() => pick(i)}
                state={exam ? (choice === i ? 'selected' : 'idle') : isRight ? 'right' : isWrong ? 'wrong' : choice != null ? 'dim' : 'idle'} />
            );
          })}
          {!exam && choice != null && !!q.e && (
            <Animated.View style={[styles.explBox, { backgroundColor: c.primarySoft }]}>
              <Icon name="lightbulb-on-outline" size={18} color={c.primary} />
              <Text style={[styles.expl, { color: c.text, flex: 1, marginTop: 0 }]}>{q.e}</Text>
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>
      {(choice != null || exam) && (
        <Animated.View style={[styles.footer, { paddingBottom: insets.bottom + 14, backgroundColor: c.card, borderTopColor: c.border, gap: 10 }]}>
          {exam && idx > 0 && (
            <Tap onPress={() => setIdx(idx - 1)} style={[styles.btn, { backgroundColor: c.cardAlt }]}>
              <Icon name="arrow-left" size={20} color={c.text} />
            </Tap>
          )}
          <Tap onPress={next} style={[styles.btn, { backgroundColor: sub.colors[0], flex: 1 }]}>
            <Text style={[styles.btnText, tf('bold')]}>{idx + 1 < questions.length ? t('next') : t('finish')}</Text>
            <Icon name="arrow-right" size={20} color="#fff" />
          </Tap>
        </Animated.View>
      )}
    </View>
  );
}

function Option({ label, text, state, onPress }: { label: string; text: string; state: 'idle' | 'right' | 'wrong' | 'dim' | 'selected'; onPress: () => void }) {
  const c = useTheme();
  const col = state === 'right' ? c.ok : state === 'wrong' ? c.danger : state === 'selected' ? c.primary : c.border;
  return (
    <View>
      <Tap onPress={onPress} haptic={false}
        style={[styles.option, { backgroundColor: state === 'right' ? c.ok + '1A' : state === 'wrong' ? c.danger + '1A' : state === 'selected' ? c.primarySoft : c.card, borderColor: col, opacity: state === 'dim' ? 0.55 : 1 }]}>
        <View style={[styles.letter, { backgroundColor: state === 'idle' || state === 'dim' ? c.cardAlt : col }]}>
          {state === 'right' ? <Icon name="check" size={18} color="#fff" /> : state === 'wrong' ? <Icon name="close" size={18} color="#fff" />
            : <Text style={{ color: state === 'selected' ? '#fff' : c.text, fontFamily: font.bold }}>{label}</Text>}
        </View>
        <Text style={[styles.optText, { color: c.text }]}>{text}</Text>
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 16, paddingBottom: 18, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { flex: 1, color: '#fff', fontFamily: font.bold, fontSize: 18 },
  counter: { color: '#fff', fontFamily: font.semi, fontSize: 14 },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 14, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: '#fff' },
  question: { fontFamily: font.semi, fontSize: 18, lineHeight: 27, marginBottom: 18 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5, marginBottom: 10 },
  letter: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optText: { flex: 1, fontFamily: font.medium, fontSize: 14.5 },
  explBox: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 14, marginTop: 6 },
  expl: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 19, marginTop: 6 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', padding: 14, borderTopWidth: StyleSheet.hairlineWidth },
  btn: { flexDirection: 'row', gap: 8, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  btnText: { color: '#fff', fontSize: 15 },
  result: { alignItems: 'center', gap: 12, padding: 24, borderRadius: 24, borderWidth: 1 },
  ring: { width: 150, height: 150, borderRadius: 75, borderWidth: 10, alignItems: 'center', justifyContent: 'center' },
  pct: { fontFamily: font.bold, fontSize: 36 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 6 },
  reviewCard: { borderRadius: 14, padding: 12, borderWidth: 1.5, marginTop: 10 },
  reviewQ: { fontFamily: font.semi, fontSize: 13.5 },
  reviewA: { fontFamily: font.medium, fontSize: 13, marginTop: 4 },
});
