import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CityPicker } from '@/components/CityPicker';
import { ProfileForm } from '@/components/community';
import { Chip, Icon, type IconName, Tap } from '@/components/ui';
import { openBatterySettings } from '@/lib/battery';
import { PRIVACY_URL } from '@/lib/config';
import { currentUid, ensureUser } from '@/lib/community';
import { refreshJobs } from '@/lib/feed';
import { useI18n } from '@/lib/i18n';
import { notifyNewJobs, setupNotifications } from '@/lib/notify';
import { ALL_CATEGORIES, useApp } from '@/lib/store';
import { font, useTheme } from '@/lib/theme';

const SOURCES: [string, string, IconName][] = [
  ['National Jobs Portal', 'https://www.njp.gov.pk/', 'web'],
  ['PPSC', 'https://www.ppsc.gop.pk/', 'file-document-edit-outline'],
  ['FPSC', 'https://www.fpsc.gov.pk/', 'file-document-edit-outline'],
  ['KPPSC', 'https://www.kppsc.gov.pk/', 'file-document-edit-outline'],
  ['SPSC', 'https://spsc.gov.pk/', 'file-document-edit-outline'],
  ['BPSC', 'https://www.bpsc.gob.pk/', 'file-document-edit-outline'],
  ['NTS', 'https://www.nts.org.pk/', 'pencil-box-outline'],
  ['Join Pak Army', 'https://joinpakarmy.gov.pk/', 'shield-star-outline'],
  ['Join Pak Navy', 'https://www.joinpaknavy.gov.pk/', 'anchor'],
  ['Join PAF', 'https://www.joinpaf.gov.pk/', 'airplane'],
];
const ALERT_CITIES = ['Islamabad', 'Lahore', 'Karachi', 'Peshawar', 'Quetta', 'Punjab', 'Sindh', 'KPK', 'Balochistan'];

function ago(iso: string | null, t: (k: any) => string) {
  if (!iso) return '—';
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return t('justNow');
  if (m < 60) return `${m} ${t('minAgo')}`;
  return `${Math.round(m / 60)} ${t('hrAgo')}`;
}

export default function Settings() {
  const c = useTheme();
  const { t, tf, isUr } = useI18n();
  const insets = useSafeAreaInsets();
  const s = useApp();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [editCity, setEditCity] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const [uid, setUid] = useState<string | null>(currentUid());
  const [copied, setCopied] = useState(false);
  const copyId = async () => {
    const id = uid ?? (await ensureUser().catch(() => null));
    if (!id) return;
    setUid(id);
    await Clipboard.setStringAsync(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const checkNow = async () => {
    setChecking(true);
    setResult(null);
    try {
      const { fresh } = await refreshJobs();
      await notifyNewJobs(fresh);
      setResult(fresh.length ? `${fresh.length} ${t('foundNew')}` : t('upToDate'));
    } catch {
      setResult(t('offline'));
    } finally {
      setChecking(false);
    }
  };

  const toggleCat = (k: (typeof ALL_CATEGORIES)[number]) =>
    s.set({ alertCategories: s.alertCategories.includes(k) ? s.alertCategories.filter((x) => x !== k) : [...s.alertCategories, k] });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}>
      <Text style={[styles.h1, tf('bold'), { color: c.text }, isUr && { textAlign: 'right' }]}>{t('settings')}</Text>

      <Card>
        <Label icon="translate" text={t('language')} />
        <View style={styles.segment}>
          {(['en', 'ur'] as const).map((l) => (
            <Tap key={l} onPress={() => s.set({ lang: l })}
              style={[styles.segBtn, { backgroundColor: s.lang === l ? c.primary : c.cardAlt }]}>
              <Text style={[l === 'ur' ? { fontFamily: font.urdu } : { fontFamily: font.semi }, styles.segText, { color: s.lang === l ? '#fff' : c.text }]}>
                {l === 'en' ? 'English' : 'اردو'}
              </Text>
            </Tap>
          ))}
        </View>
      </Card>

      <Card>
        <Label icon="map-marker-radius" text={t('pickCity')} />
        <Tap onPress={() => setEditCity(!editCity)} style={[styles.row, { backgroundColor: c.cardAlt }]}>
          <Icon name="map-marker" size={18} color={c.primary} />
          <Text style={[styles.rowText, { color: c.text }]}>{s.homeCity ?? t('allPakistan')}</Text>
          <Icon name={editCity ? 'chevron-up' : 'chevron-down'} size={20} color={c.faint} />
        </Tap>
        {editCity && (
          <Animated.View entering={FadeIn} style={{ marginTop: 12 }}>
            <CityPicker value={s.homeCity} onChange={(city) => { s.set({ homeCity: city, alertCity: city }); setEditCity(false); }} />
          </Animated.View>
        )}
      </Card>

      <Card>
        <Label icon="account-circle-outline" text={t('profileTitle')} />
        {s.profile && !editProfile ? (
          <Tap onPress={() => setEditProfile(true)} style={[styles.row, { backgroundColor: c.cardAlt }]}>
            <Icon name="account" size={18} color={c.primary} />
            <Text style={[styles.rowText, { color: c.text }]}>{s.profile.name}{s.profile.whatsapp ? ` • ${s.profile.whatsapp}` : ''}</Text>
            <Icon name="pencil-outline" size={18} color={c.faint} />
          </Tap>
        ) : (
          <View style={{ marginHorizontal: -16, marginTop: -14 }}><ProfileForm onDone={() => setEditProfile(false)} /></View>
        )}
        <Tap onPress={() => router.push('/my-posts')} style={[styles.row, { backgroundColor: c.cardAlt, marginTop: 10 }]}>
          <Icon name="briefcase-account-outline" size={18} color={c.primary} />
          <Text style={[styles.rowText, tf(), { color: c.text }]}>{t('myPosts')}</Text>
          <Icon name="chevron-right" size={20} color={c.faint} />
        </Tap>
        <Tap onPress={() => router.push('/post-job')} style={[styles.row, { backgroundColor: c.cardAlt, marginTop: 10 }]}>
          <Icon name="briefcase-plus-outline" size={18} color={c.primary} />
          <Text style={[styles.rowText, tf(), { color: c.text }]}>{t('postJob')}</Text>
          <Icon name="chevron-right" size={20} color={c.faint} />
        </Tap>
        {s.admin && (
          <Tap onPress={() => router.push('/admin')} style={[styles.row, { backgroundColor: c.gold + '26', marginTop: 10 }]}>
            <Icon name="shield-crown-outline" size={18} color={c.gold} />
            <Text style={[styles.rowText, tf('bold'), { color: c.text }]}>{t('admin')}</Text>
            <Icon name="chevron-right" size={20} color={c.faint} />
          </Tap>
        )}
      </Card>

      <Card>
        <View style={styles.between}>
          <View style={{ flex: 1 }}>
            <Label icon="bell-ring-outline" text={t('notifications')} />
            <Text style={[styles.hint, tf(), { color: c.sub }]}>{t('notificationsHint')}</Text>
          </View>
          <Switch
            value={s.notify}
            onValueChange={async (v) => {
              s.set({ notify: v });
              if (v && Platform.OS !== 'web') await setupNotifications();
            }}
            trackColor={{ true: c.primary, false: c.border }}
            thumbColor="#fff"
          />
        </View>
        {s.notify && (
          <Animated.View entering={FadeIn}>
            <Text style={[styles.sub, tf('bold'), { color: c.sub }]}>{t('alertFor')}</Text>
            <View style={styles.wrap}>
              {ALL_CATEGORIES.map((k) => (
                <Chip key={k} label={t(`cat.${k}`)} active={s.alertCategories.includes(k)} onPress={() => toggleCat(k)} />
              ))}
            </View>
            <Text style={[styles.sub, tf('bold'), { color: c.sub }]}>{t('city')}</Text>
            <View style={styles.wrap}>
              <Chip label={t('allPakistan')} active={!s.alertCity} onPress={() => s.set({ alertCity: null })} />
              {ALERT_CITIES.map((k) => (
                <Chip key={k} label={k} active={s.alertCity === k} onPress={() => s.set({ alertCity: s.alertCity === k ? null : k })} />
              ))}
            </View>
          </Animated.View>
        )}
      </Card>

      {Platform.OS === 'android' && (
        <Card>
          <Label icon="battery-heart-variant" text={t('batteryTitle')} />
          <Text style={[styles.hint, tf(), { color: c.sub, marginTop: -4, marginBottom: 10 }]}>{t('batteryBody')}</Text>
          <Tap onPress={() => openBatterySettings()} style={[styles.checkBtn, { backgroundColor: c.warn }]}>
            <Icon name="cog-outline" size={18} color="#fff" />
            <Text style={[styles.checkText, tf('bold')]}>{t('batteryOpen')}</Text>
          </Tap>
        </Card>
      )}

      <Card>
        <View style={styles.between}>
          <View style={{ flex: 1 }}>
            <Label icon="clipboard-text-clock-outline" text={t('updatesAlerts')} />
            <Text style={[styles.hint, tf(), { color: c.sub }]}>{t('updatesAlertsHint')}</Text>
          </View>
          <Switch value={s.notifyUpdates} onValueChange={(v) => s.set({ notifyUpdates: v })} trackColor={{ true: c.primary, false: c.border }} thumbColor="#fff" />
        </View>
      </Card>

      <Card>
        <Label icon="theme-light-dark" text={t('theme')} />
        <View style={styles.segment}>
          {(['system', 'light', 'dark'] as const).map((m) => (
            <Tap key={m} onPress={() => s.set({ theme: m })} style={[styles.segBtn, { backgroundColor: s.theme === m ? c.primary : c.cardAlt }]}>
              <Text style={[styles.segText, tf(), { color: s.theme === m ? '#fff' : c.text }]}>
                {t(m === 'system' ? 'themeSystem' : m === 'light' ? 'themeLight' : 'themeDark')}
              </Text>
            </Tap>
          ))}
        </View>
      </Card>

      <Card>
        <Tap onPress={checkNow} disabled={checking} style={[styles.checkBtn, { backgroundColor: c.primary }]}>
          {checking ? <ActivityIndicator color="#fff" /> : <Icon name="radar" size={20} color="#fff" />}
          <Text style={[styles.checkText, tf('bold')]}>{checking ? t('checking') : t('checkNow')}</Text>
        </Tap>
        {result && <Animated.Text entering={FadeIn} style={[styles.result, tf(), { color: c.primary }]}>{result}</Animated.Text>}
        <Text style={[styles.hint, tf(), { color: c.sub, textAlign: 'center', marginTop: 8 }]}>
          {t('lastChecked')}: {ago(s.lastChecked ?? s.updatedAt, t)}
        </Text>
      </Card>

      <Card>
        <Label icon="shield-check-outline" text={t('sources')} />
        {SOURCES.map(([name, url, icon]) => (
          <Tap key={url} onPress={() => WebBrowser.openBrowserAsync(url)} style={[styles.source, { borderColor: c.border }]}>
            <Icon name={icon} size={18} color={c.primary} />
            <Text style={[styles.sourceName, { color: c.text }]}>{name}</Text>
            <Text style={[styles.sourceUrl, { color: c.faint }]} numberOfLines={1}>{url.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')}</Text>
            <Icon name="open-in-new" size={14} color={c.faint} />
          </Tap>
        ))}
      </Card>

      <Card>
        <Label icon="information-outline" text={t('disclaimerTitle')} />
        <Text style={[styles.disclaimer, tf(), { color: c.sub }]}>{t('disclaimer')}</Text>
        <Tap onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} style={[styles.row, { backgroundColor: c.cardAlt, marginTop: 12 }]}>
          <Icon name="shield-lock-outline" size={18} color={c.primary} />
          <Text style={[styles.rowText, tf(), { color: c.text }]}>{t('privacy')}</Text>
          <Icon name="open-in-new" size={16} color={c.faint} />
        </Tap>
        <Tap onPress={copyId} haptic={false} style={{ marginTop: 12 }}>
          <Text style={[styles.version, { color: c.faint, marginTop: 0 }]} numberOfLines={1}>
            {t('yourId')}: {uid ?? '—'} {copied ? `✓ ${t('copied')}` : '⧉'}
          </Text>
        </Tap>
        <Text style={[styles.version, { color: c.faint }]}>PakJobs Daily v1.0.0</Text>
      </Card>
    </ScrollView>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  const c = useTheme();
  return <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>{children}</View>;
}

function Label({ icon, text }: { icon: IconName; text: string }) {
  const c = useTheme();
  const { tf, isUr } = useI18n();
  return (
    <View style={[styles.label, isUr && { flexDirection: 'row-reverse' }]}>
      <View style={[styles.labelIcon, { backgroundColor: c.primarySoft }]}><Icon name={icon} size={17} color={c.primary} /></View>
      <Text style={[styles.labelText, tf('bold'), { color: c.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, height: 48, borderRadius: 12 },
  rowText: { flex: 1, fontFamily: font.medium, fontSize: 14 },
  h1: { fontSize: 26, paddingHorizontal: 16, marginBottom: 12 },
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 20, padding: 16, borderWidth: 1 },
  label: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  labelIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  labelText: { fontSize: 15 },
  between: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hint: { fontSize: 12, marginTop: -6 },
  sub: { fontSize: 12, marginTop: 14, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segment: { flexDirection: 'row', gap: 8 },
  segBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segText: { fontSize: 14 },
  checkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: 16 },
  checkText: { color: '#fff', fontSize: 14.5 },
  result: { textAlign: 'center', marginTop: 10, fontSize: 14 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderTopWidth: StyleSheet.hairlineWidth },
  sourceName: { fontFamily: font.medium, fontSize: 13.5 },
  sourceUrl: { flex: 1, fontFamily: font.regular, fontSize: 11.5, textAlign: 'right' },
  disclaimer: { fontSize: 12.5, lineHeight: 20 },
  version: { fontFamily: font.regular, fontSize: 11, marginTop: 12, textAlign: 'center' },
});
