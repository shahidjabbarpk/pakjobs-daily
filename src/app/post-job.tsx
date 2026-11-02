import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthCard, isLoggedIn, useAuthUser } from '@/components/AuthCard';
import { CityPicker } from '@/components/CityPicker';
import { FeaturedPayInfo, Field, ProfileForm, useProfile } from '@/components/community';
import { Chip, Icon, Tap, useStatusBar } from '@/components/ui';
import { communityReady, createPost, updatePost } from '@/lib/community';
import { FEATURED } from '@/lib/config';
import { useI18n } from '@/lib/i18n';
import { ALL_CATEGORIES, useApp } from '@/lib/store';
import { font, useTheme } from '@/lib/theme';
import type { Category } from '@/lib/types';

const QUALS = ['Middle', 'Matric', 'Intermediate', 'DAE', 'Bachelor', 'Masters'];

export default function PostJob() {
  useStatusBar('plain');
  const c = useTheme();
  const { t, tf, qual } = useI18n();
  const insets = useSafeAreaInsets();
  const [profile] = useProfile();
  const user = useAuthUser();
  const homeCity = useApp((s) => s.homeCity);
  const admin = useApp((s) => s.admin);
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const editing = useApp((s) => (edit ? s.jobs.find((j) => j.id === edit) : undefined));

  const [title, setTitle] = useState(editing?.title ?? '');
  const [company, setCompany] = useState(editing?.organization ?? '');
  const [category, setCategory] = useState<Category>(editing?.category ?? 'private');
  const [city, setCity] = useState<string | null>(editing?.cities[0] ?? homeCity);
  const [salary, setSalary] = useState(editing?.salary ?? '');
  const [qualification, setQualification] = useState<string | null>(editing?.qualification ?? null);
  const [jobType, setJobType] = useState(editing?.jobType ?? '');
  const [vacancies, setVacancies] = useState(editing?.vacancies ? String(editing.vacancies) : '');
  const [lastDate, setLastDate] = useState(editing?.lastDate ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [phone, setPhone] = useState(editing?.phone ?? '');
  const [whatsapp, setWhatsapp] = useState(editing?.whatsapp ?? profile?.whatsapp ?? '');
  const [feature, setFeature] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);

  const submit = async () => {
    const dateOk = !lastDate || /^\d{4}-\d{2}-\d{2}$/.test(lastDate);
    if (title.trim().length < 3 || company.trim().length < 2 || !city || description.trim().length < 10 || !dateOk
      || (!phone.trim() && !whatsapp.trim())) {
      setErr(t('required'));
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const input = {
        title, company, category, city, salary: salary.trim(), qualification, jobType: jobType.trim(),
        vacancies: Number(vacancies) || null, lastDate: lastDate || null, description,
        phone: phone.trim(), whatsapp: whatsapp.trim(),
      };
      if (editing && admin) {
        await updatePost(editing.id, input);
        router.back();
        return;
      }
      setDoneId(await createPost(input, profile!.name, feature, admin));
    } catch {
      setErr(t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <View style={[styles.head, { paddingTop: insets.top + 8 }]}>
      <Tap onPress={() => router.back()} style={[styles.back, { backgroundColor: c.card }]}>
        <Icon name="arrow-left" size={22} color={c.text} />
      </Tap>
      <Text style={[styles.h1, tf('bold'), { color: c.text }]}>{editing ? t('editPost') : t('postJob')}</Text>
    </View>
  );

  if (doneId) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        {header}
        <Animated.View entering={ZoomIn.springify()} style={styles.done}>
          <View style={[styles.doneIcon, { backgroundColor: c.primarySoft }]}>
            <Icon name="check-decagram" size={56} color={c.primary} />
          </View>
          <Text style={[tf('bold'), { color: c.text, fontSize: 17, textAlign: 'center' }]}>{t('postSubmitted')}</Text>
        </Animated.View>
        {feature && <View style={{ marginHorizontal: 16 }}><FeaturedPayInfo jobId={doneId} /></View>}
        <View style={{ padding: 16, gap: 10 }}>
          <Tap onPress={() => router.replace('/my-posts')} style={[styles.submit, { backgroundColor: c.primary }]}>
            <Text style={[styles.submitText, tf('bold')]}>{t('myPosts')}</Text>
          </Tap>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
        {header}
        {!communityReady() ? (
          <Text style={[tf(), { color: c.sub, textAlign: 'center', padding: 30, fontSize: 14 }]}>{t('communityOff')}</Text>
        ) : user === undefined ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
        ) : !isLoggedIn(user) ? (
          <AuthCard />
        ) : !profile ? (
          <ProfileForm />
        ) : (
          <Animated.View entering={FadeIn} style={{ paddingHorizontal: 16 }}>
            <View style={[styles.warn, { backgroundColor: c.danger + '14' }]}>
              <Icon name="shield-alert-outline" size={18} color={c.danger} />
              <Text style={[tf(), { color: c.danger, fontSize: 12.5, flex: 1 }]}>{t('scamWarning')}</Text>
            </View>

            {admin && (
              <View style={[styles.warn, { backgroundColor: c.gold + '1F' }]}>
                <Icon name="shield-crown-outline" size={18} color={c.gold} />
                <Text style={[tf('bold'), { color: c.text, fontSize: 12.5, flex: 1 }]}>{t('adminPost')}</Text>
              </View>
            )}
            <Field label={t('jobTitle')} value={title} onChange={setTitle} required maxLength={120} placeholder="Sales Executive, Driver, Teacher…" />
            <Field label={t('company')} value={company} onChange={setCompany} required maxLength={120} />

            <Text style={[styles.label, tf('bold'), { color: c.sub }]}>{t('category')}</Text>
            <View style={styles.wrap}>
              {ALL_CATEGORIES.filter((k) => k !== 'psc' && k !== 'armed').map((k) => (
                <Chip key={k} label={t(`cat.${k}`)} active={category === k} onPress={() => setCategory(k)} />
              ))}
            </View>

            <Text style={[styles.label, tf('bold'), { color: c.sub, marginTop: 14 }]}>{t('city')} *</Text>
            <CityPicker value={city} onChange={setCity} />

            <View style={{ height: 14 }} />
            <Field label={t('salary')} value={salary} onChange={setSalary} placeholder={t('salaryPh')} maxLength={60} />

            <Text style={[styles.label, tf('bold'), { color: c.sub }]}>{t('qualification')}</Text>
            <View style={[styles.wrap, { marginBottom: 14 }]}>
              <Chip label={t('any')} active={!qualification} onPress={() => setQualification(null)} />
              {QUALS.map((q) => <Chip key={q} label={qual(q)} active={qualification === q} onPress={() => setQualification(q)} />)}
            </View>

            <Field label={t('jobType')} value={jobType} onChange={setJobType} placeholder={t('jobTypePh')} maxLength={40} />
            <Field label={t('vacancies')} value={vacancies} onChange={(v) => setVacancies(v.replace(/\D/g, ''))} keyboard="numeric" maxLength={4} />
            <Field label={t('lastDateOpt')} value={lastDate} onChange={setLastDate} placeholder="2026-12-31" maxLength={10} />
            <Field label={t('description')} value={description} onChange={setDescription} placeholder={t('descPh')} multiline required maxLength={3000} />
            <Field label={t('phone')} value={phone} onChange={setPhone} keyboard="phone-pad" placeholder="03XX XXXXXXX" maxLength={20} />
            <Field label={t('whatsapp')} value={whatsapp} onChange={setWhatsapp} keyboard="phone-pad" placeholder="03XX XXXXXXX" maxLength={20} />

            <View style={[styles.featureRow, { backgroundColor: c.card, borderColor: feature ? c.gold : c.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[tf('bold'), { color: c.text, fontSize: 14 }]}>{t('requestFeatured')}</Text>
                <Text style={[tf(), { color: c.sub, fontSize: 12 }]}>Rs {FEATURED.pricePkr} / {FEATURED.days} days</Text>
              </View>
              <Switch value={feature} onValueChange={setFeature} trackColor={{ true: c.gold, false: c.border }} thumbColor="#fff" />
            </View>
            {feature && <Animated.View entering={FadeIn}><FeaturedPayInfo /></Animated.View>}

            {err && <Text style={[styles.err, tf(), { color: c.danger }]}>{err}</Text>}
            <Tap onPress={submit} disabled={busy} style={[styles.submit, { backgroundColor: c.primary }]}>
              {busy ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Icon name="send-check" size={20} color="#fff" />
                  <Text style={[styles.submitText, tf('bold')]}>{t('submit')}</Text>
                </>
              )}
            </Tap>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 14 },
  back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 22 },
  label: { fontSize: 12, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  warn: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: 14, marginBottom: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, borderWidth: 1.5, marginBottom: 12 },
  pay: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  payTo: { fontFamily: font.semi, fontSize: 13.5, marginTop: 8 },
  waBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 12, marginTop: 10 },
  err: { fontSize: 13, marginBottom: 10, textAlign: 'center' },
  submit: { flexDirection: 'row', gap: 8, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  submitText: { color: '#fff', fontSize: 16 },
  done: { alignItems: 'center', gap: 16, padding: 30 },
  doneIcon: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center' },
});
