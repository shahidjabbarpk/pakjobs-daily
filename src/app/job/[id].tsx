import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Linking, Platform, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookmarkButton, DeadlineBadge, EmptyState, Icon, type IconName, NewBadge, OrgAvatar, Tap, useUrgencyColor } from '@/components/ui';
import { Comments, ReportSheet } from '@/components/community';
import { maybeShowInterstitial, showRewarded } from '@/lib/ads';
import { deadlineMs, isNew, prettyDate, toIntl, windowProgress } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { cancelReminder, scheduleDeadlineReminder } from '@/lib/notify';
import { useApp } from '@/lib/store';
import { CATEGORY_META, font, useTheme } from '@/lib/theme';
import type { Job } from '@/lib/types';

const SOURCE_NAME: Record<string, string> = {
  njp: 'National Jobs Portal (njp.gov.pk)', ppsc: 'PPSC (ppsc.gop.pk)', fpsc: 'FPSC (fpsc.gov.pk)',
  kppsc: 'KPPSC (kppsc.gov.pk)', army: 'Join Pak Army (joinpakarmy.gov.pk)', navy: 'Join Pak Navy (joinpaknavy.gov.pk)',
};

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const job = useApp((s) => s.jobs.find((j) => j.id === id) ?? s.saved[id!]);
  const c = useTheme();
  const { t } = useI18n();

  useEffect(() => {
    // small delay so the screen transition finishes before an ad covers it
    const timer = setTimeout(maybeShowInterstitial, 450);
    return () => clearTimeout(timer);
  }, []);

  if (!job) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center' }}>
        <EmptyState icon="briefcase-remove-outline" title={t('closed')} hint={t('noResultsHint')} />
        <Tap onPress={() => router.back()} style={[styles.apply, { backgroundColor: c.primary, marginHorizontal: 40 }]}>
          <Text style={styles.applyText}>OK</Text>
        </Tap>
      </View>
    );
  }
  return <Detail job={job} />;
}

function Detail({ job }: { job: Job }) {
  const c = useTheme();
  const { t, tf, qual } = useI18n();
  const insets = useSafeAreaInsets();
  const saved = useApp((s) => !!s.saved[job.id]);
  const hasReminder = useApp((s) => !!s.reminders[job.id]);
  const toggleSave = useApp((s) => s.toggleSave);
  const [note, setNote] = useState<string | null>(null);
  const meta = CATEGORY_META[job.category];
  const open = (url?: string) => url && WebBrowser.openBrowserAsync(encodeURI(decodeURI(url)), { toolbarColor: c.heroA });
  const openAdvert = (url?: string) => showRewarded(() => open(url));
  const isUser = job.source === 'user';
  const [reporting, setReporting] = useState(false);
  const call = () => job.phone && Linking.openURL(`tel:${job.phone.replace(/\s/g, '')}`);
  const whatsapp = () => job.whatsapp && Linking.openURL(`https://wa.me/${toIntl(job.whatsapp)}?text=${encodeURIComponent(`Assalam o Alaikum, I saw your job "${job.title}" on PakJobs Daily.`)}`);
  const isPdf = job.advertImage && /\.pdf($|\?)/i.test(job.advertImage);
  const isImage = job.advertImage && /\.(jpe?g|png|webp)($|\?)/i.test(job.advertImage);
  const place = job.cities.includes('All Pakistan') ? t('allPakistan') : job.cities.join(', ');

  const flash = (msg: string) => { setNote(msg); setTimeout(() => setNote(null), 2500); };

  const onRemind = async () => {
    if (Platform.OS === 'web') return;
    if (hasReminder) { await cancelReminder(job.id); return; }
    flash((await scheduleDeadlineReminder(job)) ? t('reminderSet') : t('reminderPast'));
  };

  const onShare = () =>
    Share.share({
      message: `📢 ${job.title}\n🏢 ${job.organization}\n${job.lastDate ? `⏳ ${t('lastDate')}: ${prettyDate(job.lastDate)}\n` : ''}🔗 ${job.applyUrl ?? job.url}\n\nPakJobs Daily app se share kiya gaya`,
    });

  const info: [IconName, string, string | undefined][] = [
    ['school-outline', t('qualification'), qual(job.qualification)],
    ['star-four-points-outline', t('grade'), job.grade ? `${job.grade}${/bps/i.test(job.grade) ? ` • ${t('salaryBps')}` : ''}` : undefined],
    ['briefcase-outline', t('jobType'), job.jobType],
    ['account-multiple-outline', t('vacancies'), job.vacancies?.toString()],
    ['calendar-account-outline', t('age'), job.ageLimit],
    ['card-account-details-outline', t('domicile'), job.domicile],
    ['map-marker-outline', t('location'), place || undefined],
    ['cash-multiple', t('salary'), job.salary],
    ['cash', t('fee'), job.fee],
    ['pound', t('advertNo'), job.advertNo],
    ['calendar-start', t('posted'), job.postedDate ? prettyDate(job.postedDate) : undefined],
    ['calendar-end', t('lastDate'), job.lastDate ? prettyDate(job.lastDate) : undefined],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <LinearGradient colors={[c.heroA, meta.colors[0], meta.colors[1]]} start={{ x: 0, y: 0 }} end={{ x: 1.2, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 8 }]}>
          <View style={styles.nav}>
            <Tap onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.navBtn}>
              <Icon name="arrow-left" size={22} color="#fff" />
            </Tap>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {isUser && <Tap onPress={() => setReporting(true)} style={styles.navBtn}><Icon name="flag-outline" size={20} color="#fff" /></Tap>}
              <Tap onPress={onShare} style={styles.navBtn}><Icon name="share-variant-outline" size={20} color="#fff" /></Tap>
              <View style={styles.navBtn}><BookmarkButton active={saved} onPress={() => toggleSave(job)} light /></View>
            </View>
          </View>
          <Animated.View entering={FadeInDown.springify().damping(15)} style={styles.heroBody}>
            <View style={styles.avatarRing}><OrgAvatar job={job} size={64} /></View>
            <View style={styles.heroTags}>
              {isNew(job) && <NewBadge />}
              <Text style={styles.catPill}>{t(`cat.${job.category}`)}</Text>
            </View>
            <Text style={styles.title}>{job.title}</Text>
            <Text style={styles.org}>{job.organization}</Text>
          </Animated.View>
          <Icon name={meta.icon as IconName} size={180} color="rgba(255,255,255,0.07)" style={styles.deco} />
        </LinearGradient>

        {job.lastDate && <Countdown job={job} />}

        <Animated.View entering={FadeInUp.delay(150)} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, tf('bold'), { color: c.text }]}>{t('eligibility')} & {t('details')}</Text>
          <View style={styles.grid}>
            {info.filter(([, , v]) => !!v).map(([icon, label, value]) => (
              <View key={label} style={[styles.cell, { backgroundColor: c.cardAlt }]}>
                <Icon name={icon} size={18} color={c.primary} />
                <Text style={[styles.cellLabel, tf(), { color: c.sub }]}>{label}</Text>
                <Text style={[styles.cellValue, { color: c.text }]}>{value}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {(isImage || isPdf || job.criteriaUrl) && (
          <Animated.View entering={FadeInUp.delay(220)} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.cardTitle, tf('bold'), { color: c.text }]}>{t('viewAdvert')}</Text>
            {isImage && (
              <Tap onPress={() => openAdvert(job.advertImage)} haptic={false}>
                <Image source={{ uri: encodeURI(decodeURI(job.advertImage!)) }} style={styles.advert} contentFit="cover" transition={300} />
                <View style={styles.zoom}><Icon name="magnify-plus-outline" size={18} color="#fff" /></View>
              </Tap>
            )}
            <View style={{ gap: 8, marginTop: isImage ? 12 : 0 }}>
              {isPdf && <LinkRow icon="file-pdf-box" label={`${t('viewAdvert')} (PDF)`} onPress={() => openAdvert(job.advertImage)} />}
              {job.criteriaUrl && <LinkRow icon="clipboard-check-outline" label={t('criteria')} onPress={() => open(job.criteriaUrl)} />}
            </View>
          </Animated.View>
        )}

        {!!job.description && (
          <Animated.View entering={FadeInUp.delay(280)} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.cardTitle, tf('bold'), { color: c.text }]}>{t('description')}</Text>
            {job.description.split('\n').filter(Boolean).map((line, i) => {
              const [k, ...rest] = line.split(':');
              const keyed = rest.length > 0 && k!.length < 32;
              return (
                <View key={i} style={styles.descLine}>
                  <View style={[styles.bullet, { backgroundColor: c.primary }]} />
                  <Text style={[styles.desc, { color: c.sub }]}>
                    {keyed && <Text style={{ fontFamily: font.semi, color: c.text }}>{k}:</Text>}
                    {keyed ? rest.join(':') : line}
                  </Text>
                </View>
              );
            })}
          </Animated.View>
        )}

        {isUser && (
          <Animated.View entering={FadeInUp.delay(320)} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.cardTitle, tf('bold'), { color: c.text }]}>📞 {t('postedBy')}: {job.ownerName}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {!!job.phone && <ContactBtn icon="phone" label={t('call')} color={c.primary} onPress={call} />}
              {!!job.whatsapp && <ContactBtn icon="whatsapp" label={t('whatsapp')} color="#25D366" onPress={whatsapp} />}
            </View>
            <View style={[styles.warn, { backgroundColor: c.danger + '12' }]}>
              <Icon name="shield-alert-outline" size={16} color={c.danger} />
              <Text style={[tf(), { color: c.danger, fontSize: 12, flex: 1 }]}>{t('scamWarning')}</Text>
            </View>
          </Animated.View>
        )}

        <Comments jobId={job.id} onToast={flash} />

        <View style={styles.sourceRow}>
          <Icon name={isUser ? 'account-group' : 'shield-check'} size={14} color={c.ok} />
          <Text style={[styles.sourceText, { color: c.faint }]}>{t('source')}: {isUser ? t('privateJobs') : SOURCE_NAME[job.source] ?? job.source}</Text>
        </View>
        <ReportSheet visible={reporting} kind="job" jobId={job.id} onClose={(done) => { setReporting(false); if (done) flash(t('reportDone')); }} />
      </ScrollView>

      {note && (
        <Animated.View entering={FadeIn} style={[styles.toast, { bottom: 100 + insets.bottom, backgroundColor: c.text }]}>
          <Text style={[tf(), { color: c.bg, fontSize: 13 }]}>{note}</Text>
        </Animated.View>
      )}

      <Animated.View entering={FadeInUp.delay(300).springify()}
        style={[styles.bar, { paddingBottom: insets.bottom + 12, backgroundColor: c.card, borderTopColor: c.border }]}>
        {job.lastDate && Platform.OS !== 'web' && (
          <Tap onPress={onRemind} style={[styles.iconBtn, { backgroundColor: hasReminder ? c.gold + '33' : c.cardAlt }]}>
            <Icon name={hasReminder ? 'bell-check' : 'bell-plus-outline'} size={22} color={hasReminder ? c.gold : c.text} />
          </Tap>
        )}
        {isUser ? (
          <Tap onPress={() => (job.whatsapp ? whatsapp() : call())} style={{ flex: 1 }}>
            <LinearGradient colors={job.whatsapp ? ['#128C7E', '#25D366'] : [c.primaryDark, c.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.apply}>
              <Icon name={job.whatsapp ? 'whatsapp' : 'phone'} size={22} color="#fff" />
              <Text style={[styles.applyText, tf('bold')]}>{t('applyNow')}</Text>
            </LinearGradient>
          </Tap>
        ) : (
          <Tap onPress={() => open(job.applyUrl ?? job.url)} style={{ flex: 1 }}>
            <LinearGradient colors={[c.primaryDark, c.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.apply}>
              <Text style={[styles.applyText, tf('bold')]}>{t('applyNow')}</Text>
              <Icon name="arrow-right" size={20} color="#fff" />
            </LinearGradient>
          </Tap>
        )}
      </Animated.View>
    </View>
  );
}

function ContactBtn({ icon, label, color, onPress }: { icon: IconName; label: string; color: string; onPress: () => void }) {
  const { tf } = useI18n();
  return (
    <Tap onPress={onPress} style={[styles.contact, { backgroundColor: color + '1A', borderColor: color + '55' }]}>
      <Icon name={icon} size={22} color={color} />
      <Text style={[tf('bold'), { color, fontSize: 14 }]}>{label}</Text>
    </Tap>
  );
}

function LinkRow({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const c = useTheme();
  const { tf } = useI18n();
  return (
    <Tap onPress={onPress} style={[styles.link, { backgroundColor: c.primarySoft }]}>
      <Icon name={icon} size={22} color={c.primary} />
      <Text style={[styles.linkText, tf('bold'), { color: c.primary }]}>{label}</Text>
      <Icon name="open-in-new" size={16} color={c.primary} />
    </Tap>
  );
}

function Countdown({ job }: { job: Job }) {
  const c = useTheme();
  const { t, tf } = useI18n();
  const color = useUrgencyColor(job);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const left = Math.max(0, (deadlineMs(job) ?? 0) - now);
  const parts: [number, string][] = [
    [Math.floor(left / 86_400_000), t('daysShort')],
    [Math.floor(left / 3_600_000) % 24, t('hoursShort')],
    [Math.floor(left / 60_000) % 60, t('minsShort')],
    [Math.floor(left / 1000) % 60, t('secsShort')],
  ];
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(300, withTiming(windowProgress(job), { duration: 1100 }));
  }, [job, progress]);
  const bar = useAnimatedStyle(() => ({ width: `${Math.max(3, progress.value * 100)}%` }));

  return (
    <Animated.View entering={FadeInUp.delay(80)} style={[styles.card, styles.countCard, { backgroundColor: c.card, borderColor: c.border, shadowColor: c.shadow }]}>
      <View style={styles.countHead}>
        <Text style={[styles.cardTitle, tf('bold'), { color: c.text, marginBottom: 0 }]}>⏳ {t('timeLeft')}</Text>
        <DeadlineBadge job={job} />
      </View>
      <View style={styles.countRow}>
        {parts.map(([n, label]) => (
          <View key={label} style={[styles.countBox, { backgroundColor: color + '14', borderColor: color + '33' }]}>
            <Text style={[styles.countNum, { color }]}>{String(n).padStart(2, '0')}</Text>
            <Text style={[styles.countLabel, tf(), { color: c.sub }]}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.track, { backgroundColor: c.cardAlt }]}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, bar]} />
      </View>
      <View style={styles.between}>
        <Text style={[styles.small, { color: c.faint }]}>{prettyDate(job.postedDate ?? job.firstSeen)}</Text>
        <Text style={[styles.small, { color: c.faint }]}>{prettyDate(job.lastDate)}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 18, paddingBottom: 54, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  navBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  heroBody: { alignItems: 'center', marginTop: 10 },
  avatarRing: { padding: 4, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.25)' },
  heroTags: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 12 },
  catPill: { color: '#fff', fontFamily: font.medium, fontSize: 11.5, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  title: { color: '#fff', fontFamily: font.bold, fontSize: 22, lineHeight: 30, textAlign: 'center', marginTop: 10 },
  org: { color: 'rgba(255,255,255,0.85)', fontFamily: font.regular, fontSize: 13.5, textAlign: 'center', marginTop: 4 },
  deco: { position: 'absolute', right: -40, bottom: -30 },
  card: { marginHorizontal: 16, marginTop: 14, borderRadius: 22, padding: 16, borderWidth: 1 },
  countCard: { marginTop: -36, shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  countHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  countRow: { flexDirection: 'row', gap: 8 },
  countBox: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  countNum: { fontFamily: font.bold, fontSize: 24 },
  countLabel: { fontSize: 11 },
  track: { height: 6, borderRadius: 3, marginTop: 14, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  between: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  small: { fontFamily: font.medium, fontSize: 10.5 },
  cardTitle: { fontSize: 15.5, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '48.5%', borderRadius: 14, padding: 12, gap: 3 },
  cellLabel: { fontSize: 11 },
  cellValue: { fontFamily: font.semi, fontSize: 13 },
  advert: { width: '100%', height: 220, borderRadius: 14, backgroundColor: '#0001' },
  zoom: { position: 'absolute', right: 10, bottom: 10, backgroundColor: '#0008', borderRadius: 16, padding: 6 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14 },
  linkText: { flex: 1, fontSize: 13.5 },
  descLine: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  desc: { flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 21 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 18, paddingHorizontal: 20 },
  sourceText: { fontFamily: font.regular, fontSize: 11.5 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  iconBtn: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  apply: { height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  applyText: { color: '#fff', fontSize: 16 },
  contact: { flex: 1, flexDirection: 'row', gap: 8, height: 50, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  warn: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 10, borderRadius: 12, marginTop: 12 },
  toast: { position: 'absolute', alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
});
