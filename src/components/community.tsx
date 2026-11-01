import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInDown } from 'react-native-reanimated';
import { FEATURED } from '@/lib/config';
import { addComment, communityReady, currentUid, deleteComment, listenComments, loadProfile, report, saveProfile } from '@/lib/community';
import { useI18n } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import { font, useTheme } from '@/lib/theme';
import type { Comment, Profile } from '@/lib/types';
import { Icon, Tap } from './ui';

/** Cached profile; fetched from Firestore once if this device has none yet. */
export function useProfile(): [Profile | null, (p: Profile) => Promise<void>] {
  const profile = useApp((s) => s.profile);
  const set = useApp((s) => s.set);
  useEffect(() => {
    if (!profile) loadProfile().then((p) => p && set({ profile: p })).catch(() => {});
  }, [profile, set]);
  const save = async (p: Profile) => {
    await saveProfile(p);
    set({ profile: p });
  };
  return [profile, save];
}

export function Field({ label, value, onChange, placeholder, multiline, keyboard, required, maxLength }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean;
  keyboard?: 'default' | 'phone-pad' | 'numeric'; required?: boolean; maxLength?: number;
}) {
  const c = useTheme();
  const { tf } = useI18n();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[styles.label, tf('bold'), { color: c.sub }]}>{label}{required ? ' *' : ''}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.faint}
        multiline={multiline}
        keyboardType={keyboard}
        maxLength={maxLength}
        style={[styles.input, multiline && styles.multi, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
      />
    </View>
  );
}

/** Name + WhatsApp. Shown once, before the first post or comment. */
export function ProfileForm({ onDone }: { onDone?: () => void }) {
  const c = useTheme();
  const { t, tf } = useI18n();
  const [profile, save] = useProfile();
  const homeCity = useApp((s) => s.homeCity);
  const [name, setName] = useState(profile?.name ?? '');
  const [wa, setWa] = useState(profile?.whatsapp ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (profile) { setName(profile.name); setWa(profile.whatsapp); }
  }, [profile]);

  const submit = async () => {
    if (name.trim().length < 2) { setErr(t('required')); return; }
    setBusy(true);
    setErr(null);
    try {
      await save({ name: name.trim(), whatsapp: wa.trim(), city: profile?.city ?? homeCity });
      onDone?.();
    } catch {
      setErr(t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={[styles.cardTitle, tf('bold'), { color: c.text }]}>{t('profileTitle')}</Text>
      <Text style={[tf(), { color: c.sub, fontSize: 12, marginBottom: 12 }]}>{t('profileHint')}</Text>
      <Field label={t('yourName')} value={name} onChange={setName} required maxLength={60} />
      <Field label={t('whatsapp')} value={wa} onChange={setWa} keyboard="phone-pad" placeholder="03XX XXXXXXX" maxLength={20} />
      {err && <Text style={[styles.err, { color: c.danger }]}>{err}</Text>}
      <Tap onPress={submit} disabled={busy} style={[styles.btn, { backgroundColor: c.primary }]}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnText, tf('bold')]}>{t('save2')}</Text>}
      </Tap>
    </View>
  );
}

// ------------------------------------------------------------------ featured payment

export function FeaturedPayInfo({ jobId }: { jobId?: string }) {
  const c = useTheme();
  const { t, tf } = useI18n();
  return (
    <View style={[payStyles.pay, { backgroundColor: c.gold + '1F', borderColor: c.gold + '66' }]}>
      <Text style={[tf('bold'), { color: c.text, fontSize: 14 }]}>⭐ {t('featured')}: Rs {FEATURED.pricePkr} / {FEATURED.days} days</Text>
      <Text style={[tf(), { color: c.sub, fontSize: 12.5, marginTop: 4 }]}>{t('featuredInfo')}</Text>
      <Text style={[payStyles.payTo, { color: c.text }]}>{FEATURED.payTo}</Text>
      {!!FEATURED.adminWhatsapp && (
        <Tap onPress={() => Linking.openURL(`https://wa.me/${FEATURED.adminWhatsapp}?text=${encodeURIComponent(`Featured payment for job ${jobId ?? ''}`)}`)}
          style={[payStyles.waBtn, { backgroundColor: '#25D366' }]}>
          <Icon name="whatsapp" size={18} color="#fff" />
          <Text style={[tf('bold'), { color: '#fff', fontSize: 13 }]}>{t('sendProof')}</Text>
        </Tap>
      )}
    </View>
  );
}

const payStyles = StyleSheet.create({
  pay: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  payTo: { fontFamily: font.semi, fontSize: 13.5, marginTop: 8 },
  waBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 12, marginTop: 10 },
});

// ------------------------------------------------------------------ report

export function ReportSheet({ visible, onClose, kind, jobId, commentId }: {
  visible: boolean; onClose: (done: boolean) => void; kind: 'job' | 'comment'; jobId: string; commentId?: string;
}) {
  const c = useTheme();
  const { t, tf } = useI18n();
  const [busy, setBusy] = useState(false);
  const reasons = ['reasonScam', 'reasonFake', 'reasonAbuse', 'reasonOther'] as const;
  const send = async (reason: string) => {
    setBusy(true);
    try {
      await report(kind, jobId, reason, commentId);
      onClose(true);
    } catch {
      onClose(false);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => onClose(false)}>
      <Pressable style={styles.backdrop} onPress={() => onClose(false)}>
        <Animated.View entering={SlideInDown.springify().damping(18)} style={[styles.sheet, { backgroundColor: c.card }]}>
          <Pressable>
            <Text style={[styles.cardTitle, tf('bold'), { color: c.text, marginBottom: 12 }]}>{t('reportTitle')}</Text>
            {reasons.map((r) => (
              <Tap key={r} disabled={busy} onPress={() => send(r)} style={[styles.reason, { borderColor: c.border }]}>
                <Icon name="flag-outline" size={18} color={c.danger} />
                <Text style={[tf(), { color: c.text, fontSize: 14, flex: 1 }]}>{t(r)}</Text>
              </Tap>
            ))}
            <Tap onPress={() => onClose(false)} style={[styles.btn, { backgroundColor: c.cardAlt, marginTop: 8 }]}>
              <Text style={[styles.btnText, tf('bold'), { color: c.text }]}>{t('cancel')}</Text>
            </Tap>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ------------------------------------------------------------------ comments

function timeAgo(ms: number) {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
}

export function Comments({ jobId, onToast }: { jobId: string; onToast: (msg: string) => void }) {
  const c = useTheme();
  const { t, tf } = useI18n();
  const [profile] = useProfile();
  const admin = useApp((s) => s.admin);
  const [list, setList] = useState<Comment[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [needProfile, setNeedProfile] = useState(false);
  const [reporting, setReporting] = useState<string | null>(null);

  useEffect(() => listenComments(jobId, setList, () => setFailed(true)), [jobId]);

  const send = async () => {
    if (!text.trim()) return;
    if (!profile) { setNeedProfile(true); return; }
    setBusy(true);
    try {
      await addComment(jobId, profile.name, text);
      setText('');
    } catch {
      onToast(t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  const me = currentUid();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={[styles.cardTitle, tf('bold'), { color: c.text }]}>💬 {t('comments')} {list?.length ? `(${list.length})` : ''}</Text>
      {list === null && !failed && <ActivityIndicator color={c.primary} style={{ marginVertical: 12 }} />}
      {failed && <Text style={[tf(), { color: c.faint, fontSize: 12.5, marginVertical: 8 }]}>{communityReady() ? t('errorGeneric') : t('communityOff')}</Text>}
      {list?.length === 0 && <Text style={[tf(), { color: c.faint, fontSize: 12.5, marginVertical: 8 }]}>{t('noComments')}</Text>}
      {list?.map((cm, i) => (
        <Animated.View key={cm.id} entering={i > list.length - 3 ? FadeInDown : undefined} style={[styles.comment, { borderColor: c.border }]}>
          <View style={[styles.avatar, { backgroundColor: c.primarySoft }]}>
            <Text style={{ color: c.primary, fontFamily: font.bold }}>{cm.name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.cName, { color: c.text }]} numberOfLines={1}>{cm.name}</Text>
              <Text style={{ color: c.faint, fontSize: 11, fontFamily: font.regular }}>{timeAgo(cm.createdAt)}</Text>
            </View>
            <Text style={[styles.cText, { color: c.sub }]}>{cm.text}</Text>
          </View>
          {cm.uid === me || admin ? (
            <Pressable hitSlop={10} onPress={() => deleteComment(jobId, cm.id).catch(() => onToast(t('errorGeneric')))}>
              <Icon name="trash-can-outline" size={18} color={c.faint} />
            </Pressable>
          ) : (
            <Pressable hitSlop={10} onPress={() => setReporting(cm.id)}>
              <Icon name="flag-outline" size={18} color={c.faint} />
            </Pressable>
          )}
        </Animated.View>
      ))}

      {!communityReady() ? null : needProfile && !profile ? (
        <Animated.View entering={FadeIn} style={{ marginTop: 10 }}>
          <ProfileForm onDone={() => setNeedProfile(false)} />
        </Animated.View>
      ) : (
        <View style={[styles.composer, { backgroundColor: c.cardAlt }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('writeComment')}
            placeholderTextColor={c.faint}
            style={[styles.composerInput, { color: c.text }]}
            multiline
            maxLength={500}
          />
          <Tap onPress={send} disabled={busy || !text.trim()} style={[styles.sendBtn, { backgroundColor: text.trim() ? c.primary : c.border }]}>
            {busy ? <ActivityIndicator color="#fff" size="small" /> : <Icon name="send" size={18} color="#fff" />}
          </Tap>
        </View>
      )}

      <ReportSheet
        visible={!!reporting}
        kind="comment"
        jobId={jobId}
        commentId={reporting ?? undefined}
        onClose={(done) => { setReporting(null); if (done) onToast(t('reportDone')); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontFamily: font.regular, fontSize: 14 },
  multi: { minHeight: 110, textAlignVertical: 'top' },
  card: { marginHorizontal: 16, marginTop: 14, borderRadius: 22, padding: 16, borderWidth: 1 },
  cardTitle: { fontSize: 15.5, marginBottom: 6 },
  err: { fontFamily: font.medium, fontSize: 12.5, marginBottom: 8 },
  btn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 15 },
  backdrop: { flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
  reason: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  comment: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cName: { fontFamily: font.semi, fontSize: 13, flexShrink: 1 },
  cText: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, marginTop: 1 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderRadius: 16, padding: 6, marginTop: 12 },
  composerInput: { flex: 1, fontFamily: font.regular, fontSize: 13.5, paddingHorizontal: 10, paddingVertical: 8, maxHeight: 110 },
  sendBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
