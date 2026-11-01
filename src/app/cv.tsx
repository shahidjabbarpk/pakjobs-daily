import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Field } from '@/components/community';
import { Icon, Tap } from '@/components/ui';
import { maybeShowInterstitial } from '@/lib/ads';
import { type CvData, type CvRow, EMPTY_CV, exportCv } from '@/lib/cv';
import { useI18n } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import { font, useTheme } from '@/lib/theme';

export default function CvBuilder() {
  const c = useTheme();
  const { t, tf } = useI18n();
  const insets = useSafeAreaInsets();
  const saved = useApp((s) => s.cv);
  const profile = useApp((s) => s.profile);
  const [cv, setCv] = useState<CvData>(() => saved ?? { ...EMPTY_CV, name: profile?.name ?? '', phone: profile?.whatsapp ?? '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // autosave drafts (debounced) so nothing typed is ever lost
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => useApp.getState().set({ cv }), 600);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [cv]);

  const f = (k: keyof CvData) => (v: string) => setCv((p) => ({ ...p, [k]: v }));
  const setRow = (list: 'education' | 'experience', i: number, k: keyof CvRow, v: string) =>
    setCv((p) => ({ ...p, [list]: p[list].map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));
  const addRow = (list: 'education' | 'experience') => setCv((p) => ({ ...p, [list]: [...p[list], { a: '', b: '', c: '' }] }));
  const delRow = (list: 'education' | 'experience', i: number) => setCv((p) => ({ ...p, [list]: p[list].filter((_, j) => j !== i) }));

  const make = async () => {
    if (cv.name.trim().length < 2 || !cv.phone.trim()) { setErr(t('required')); return; }
    setErr(null);
    setBusy(true);
    try {
      await exportCv(cv);
      setTimeout(maybeShowInterstitial, 800);
    } catch {
      setErr(t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  const rowsBlock = (list: 'education' | 'experience', heads: [string, string, string]) => (
    <View>
      {cv[list].map((r, i) => (
        <Animated.View key={i} entering={FadeInDown} style={[styles.rowCard, { backgroundColor: c.cardAlt }]}>
          <View style={styles.rowHead}>
            <Text style={[styles.rowNum, { color: c.primary }]}>#{i + 1}</Text>
            <Tap onPress={() => delRow(list, i)} haptic={false}><Icon name="close-circle-outline" size={20} color={c.faint} /></Tap>
          </View>
          <Field label={heads[0]} value={r.a} onChange={(v) => setRow(list, i, 'a', v)} maxLength={80} />
          <Field label={heads[1]} value={r.b} onChange={(v) => setRow(list, i, 'b', v)} maxLength={100} />
          <Field label={heads[2]} value={r.c} onChange={(v) => setRow(list, i, 'c', v)} maxLength={60} />
        </Animated.View>
      ))}
      <Tap onPress={() => addRow(list)} style={[styles.add, { borderColor: c.primary }]}>
        <Icon name="plus" size={18} color={c.primary} />
        <Text style={[tf('bold'), { color: c.primary, fontSize: 13 }]}>{t('addRow')}</Text>
      </Tap>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={['#0F172A', '#1E3A8A', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 10 }]}>
          <Tap onPress={() => router.back()} style={styles.back}><Icon name="arrow-left" size={22} color="#fff" /></Tap>
          <Text style={[styles.h1, tf('bold')]}>📄 {t('cvBuilder')}</Text>
          <Text style={[styles.sub, tf()]}>{t('cvSub')}</Text>
          <Icon name="file-account" size={150} color="rgba(255,255,255,0.08)" style={styles.deco} />
        </LinearGradient>

        <Animated.View entering={FadeIn} style={{ padding: 16 }}>
          <Section title={t('profileTitle')} icon="account-outline" />
          <Field label={t('fullName')} value={cv.name} onChange={f('name')} required maxLength={60} />
          <Field label={t('fatherName')} value={cv.father} onChange={f('father')} maxLength={60} />
          <View style={styles.two}>
            <View style={{ flex: 1 }}><Field label={t('cnic')} value={cv.cnic} onChange={f('cnic')} keyboard="numeric" placeholder="35202-1234567-1" maxLength={15} /></View>
            <View style={{ flex: 1 }}><Field label={t('dob')} value={cv.dob} onChange={f('dob')} placeholder="01-01-2000" maxLength={12} /></View>
          </View>
          <Field label={t('phone')} value={cv.phone} onChange={f('phone')} keyboard="phone-pad" required maxLength={20} />
          <Field label={t('email')} value={cv.email} onChange={f('email')} maxLength={80} />
          <Field label={t('address')} value={cv.address} onChange={f('address')} maxLength={150} />
          <Field label={t('objective')} value={cv.objective} onChange={f('objective')} multiline maxLength={500} />

          <Section title={t('education')} icon="school-outline" />
          {rowsBlock('education', [t('degree'), t('institute'), t('yearMarks')])}

          <Section title={t('experience')} icon="briefcase-outline" />
          {rowsBlock('experience', [t('jobTitleCv'), t('employer'), t('duration')])}

          <Section title={t('skills')} icon="star-outline" />
          <Field label={t('skills')} value={cv.skills} onChange={f('skills')} placeholder="MS Office, Typing 40 wpm, Communication" maxLength={300} />
          <Field label={t('languages')} value={cv.languages} onChange={f('languages')} maxLength={100} />
          {err && <Text style={[styles.err, tf(), { color: c.danger }]}>{err}</Text>}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14, backgroundColor: c.card, borderTopColor: c.border }]}>
        <Tap onPress={make} disabled={busy} style={{ flex: 1 }}>
          <LinearGradient colors={['#1E3A8A', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
            {busy ? <ActivityIndicator color="#fff" /> : (
              <>
                <Icon name="file-pdf-box" size={22} color="#fff" />
                <Text style={[styles.btnText, tf('bold')]}>{t('makePdf')}</Text>
              </>
            )}
          </LinearGradient>
        </Tap>
      </View>
    </KeyboardAvoidingView>
  );
}

function Section({ title, icon }: { title: string; icon: any }) {
  const c = useTheme();
  const { tf } = useI18n();
  return (
    <View style={styles.section}>
      <Icon name={icon} size={18} color={c.primary} />
      <Text style={[tf('bold'), { color: c.text, fontSize: 15 }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 18, paddingBottom: 26, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  h1: { color: '#fff', fontSize: 24 },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  deco: { position: 'absolute', right: -30, bottom: -30 },
  section: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 12 },
  two: { flexDirection: 'row', gap: 10 },
  rowCard: { borderRadius: 16, padding: 12, marginBottom: 10 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rowNum: { fontFamily: font.bold, fontSize: 13 },
  add: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', marginBottom: 6 },
  err: { textAlign: 'center', fontSize: 13, marginTop: 6 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  btn: { flexDirection: 'row', gap: 8, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16 },
});
