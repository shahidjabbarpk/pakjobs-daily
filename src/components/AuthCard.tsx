import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { isAdmin, loadProfile, resetPassword, saveProfile, signInEmail, signInGoogle, signUpEmail, watchAuth, type AuthUser } from '@/lib/community';
import { useI18n } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import { font, useTheme } from '@/lib/theme';
import { Icon, Tap } from './ui';

/** Live Firebase user; `undefined` until the saved session has loaded. */
export function useAuthUser(): AuthUser | null | undefined {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  useEffect(() => watchAuth(setUser), []);
  return user;
}

/** True once the user has logged in with Google or email (not just the automatic guest account). */
export const isLoggedIn = (u: AuthUser | null | undefined) => !!u && !u.guest;

// Firebase error codes → our i18n keys
const ERRORS: Record<string, string> = {
  'auth/invalid-email': 'authBadEmail',
  'auth/missing-email': 'authBadEmail',
  'auth/weak-password': 'authWeakPassword',
  'auth/email-already-in-use': 'authEmailUsed',
  'auth/invalid-credential': 'authWrongPassword',
  'auth/wrong-password': 'authWrongPassword',
  'auth/user-not-found': 'authWrongPassword',
  'auth/too-many-requests': 'authTooMany',
  'auth/network-request-failed': 'offline',
};

/** After any login: the uid may have changed, so re-read profile + admin flag for it. */
async function afterLogin(name: string | null) {
  const { set, homeCity } = useApp.getState();
  let profile = await loadProfile().catch(() => null);
  if (!profile && name) {
    profile = { name: name.slice(0, 60), whatsapp: '', city: homeCity };
    await saveProfile(profile).catch(() => {});
  }
  set({ profile, admin: await isAdmin().catch(() => false) });
}

/** Google + email/password login. `onDone` fires after a successful login or sign-up. */
export function AuthCard({ onDone, title, style }: { onDone?: () => void; title?: string; style?: ViewStyle }) {
  const c = useTheme();
  const { t, tf } = useI18n();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<'google' | 'email' | 'reset' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const fail = (e: any) => setErr(t((ERRORS[e?.code] ?? 'errorGeneric') as any));

  const google = async () => {
    setBusy('google'); setErr(null); setNote(null);
    try {
      if (await signInGoogle()) {
        await afterLogin(null);
        onDone?.();
      }
    } catch (e: any) {
      setErr(String(e?.message).includes('google-web') ? t('authGoogleApp') : t((ERRORS[e?.code] ?? 'authGoogleFail') as any));
    } finally {
      setBusy(null);
    }
  };

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setErr(t('authBadEmail')); return; }
    if (password.length < 6) { setErr(t('authWeakPassword')); return; }
    setBusy('email'); setErr(null); setNote(null);
    try {
      if (mode === 'signup') await signUpEmail(email, password);
      else await signInEmail(email, password);
      await afterLogin(null);
      onDone?.();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const forgot = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setErr(t('authBadEmail')); return; }
    setBusy('reset'); setErr(null);
    try {
      await resetPassword(email);
      setNote(t('authResetSent'));
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const input = [styles.input, { backgroundColor: c.cardAlt, color: c.text, borderColor: c.border }];
  return (
    <Animated.View
      style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>
      <View style={[styles.badge, { backgroundColor: c.primarySoft }]}>
        <Icon name="account-lock-outline" size={26} color={c.primary} />
      </View>
      <Text style={[styles.title, tf('bold'), { color: c.text }]}>{title ?? t('authTitle')}</Text>
      <Text style={[tf(), styles.hint, { color: c.sub }]}>{t('authHint')}</Text>

      <Tap onPress={google} disabled={!!busy} style={[styles.google, { borderColor: c.border, backgroundColor: c.card }]}>
        {busy === 'google' ? <ActivityIndicator color={c.primary} /> : (
          <>
            <Icon name="google" size={20} color="#EA4335" />
            <Text style={[tf('bold'), { color: c.text, fontSize: 14.5 }]}>{t('authGoogle')}</Text>
          </>
        )}
      </Tap>

      <View style={styles.or}>
        <View style={[styles.line, { backgroundColor: c.border }]} />
        <Text style={[tf(), { color: c.faint, fontSize: 12 }]}>{t('authOr')}</Text>
        <View style={[styles.line, { backgroundColor: c.border }]} />
      </View>

      <View style={[styles.segment, { backgroundColor: c.cardAlt }]}>
        {(['login', 'signup'] as const).map((m) => (
          <Tap key={m} onPress={() => { setMode(m); setErr(null); setNote(null); }}
            style={[styles.segBtn, mode === m && { backgroundColor: c.card }]}>
            <Text style={[tf('bold'), { fontSize: 13, color: mode === m ? c.primary : c.sub }]}>
              {t(m === 'login' ? 'authLogin' : 'authSignup')}
            </Text>
          </Tap>
        ))}
      </View>

      <TextInput value={email} onChangeText={setEmail} placeholder={t('authEmail')} placeholderTextColor={c.faint}
        autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" style={input} />
      <View>
        <TextInput value={password} onChangeText={setPassword} placeholder={t('authPassword')} placeholderTextColor={c.faint}
          secureTextEntry={!show} autoCapitalize="none" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          onSubmitEditing={submit} style={[input, { paddingRight: 48 }]} />
        <Tap onPress={() => setShow(!show)} style={styles.eye}>
          <Icon name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={c.faint} />
        </Tap>
      </View>

      {err && <Animated.Text style={[styles.msg, { color: c.danger }]}>{err}</Animated.Text>}
      {note && <Animated.Text style={[styles.msg, { color: c.primary }]}>{note}</Animated.Text>}

      <Tap onPress={submit} disabled={!!busy} style={[styles.btn, { backgroundColor: c.primary }]}>
        {busy === 'email' ? <ActivityIndicator color="#fff" /> : (
          <Text style={[tf('bold'), styles.btnText]}>{t(mode === 'login' ? 'authLogin' : 'authCreate')}</Text>
        )}
      </Tap>
      {mode === 'login' && (
        <Tap onPress={forgot} disabled={!!busy} style={styles.forgot}>
          <Text style={[tf(), { color: c.primary, fontSize: 13 }]}>{busy === 'reset' ? '…' : t('authForgot')}</Text>
        </Tap>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 14, borderRadius: 22, padding: 18, borderWidth: 1 },
  badge: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 10 },
  title: { fontSize: 17, textAlign: 'center' },
  hint: { fontSize: 12.5, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  google: { height: 50, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  or: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 12 },
  segBtn: { flex: 1, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  input: {
    height: 50, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, marginBottom: 10,
    fontFamily: font.regular, fontSize: 14, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : null),
  },
  eye: { position: 'absolute', right: 6, top: 6, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  msg: { fontFamily: font.medium, fontSize: 12.5, marginBottom: 8 },
  btn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontSize: 15 },
  forgot: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 12, marginTop: 4 },
});
