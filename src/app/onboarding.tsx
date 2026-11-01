import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CityPicker } from '@/components/CityPicker';
import { Icon, Tap } from '@/components/ui';
import { openBatterySettings } from '@/lib/battery';
import { useI18n } from '@/lib/i18n';
import { setupNotifications } from '@/lib/notify';
import { useApp } from '@/lib/store';
import { font, useTheme } from '@/lib/theme';

export default function Onboarding() {
  const c = useTheme();
  const { t, tf, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const set = useApp((s) => s.set);
  const [step, setStep] = useState<0 | 1>(0);
  const [city, setCity] = useState<string | null>(null);

  const finish = () => {
    set({ onboarded: true, batteryHintShown: true, homeCity: city, alertCity: city });
    router.replace('/');
  };

  const next = async () => {
    if (step === 0) {
      if (Platform.OS !== 'web') await setupNotifications().catch(() => {});
      if (Platform.OS === 'android') { setStep(1); return; }
    }
    finish();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <LinearGradient colors={[c.heroA, c.heroB, c.heroC]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.logo}>
          <Icon name="briefcase-variant" size={38} color={c.heroA} />
          <View style={[styles.logoDot, { backgroundColor: c.gold }]} />
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(150)} style={[styles.title, tf('bold')]}>{t('onboardTitle')}</Animated.Text>
        <Animated.Text entering={FadeInDown.delay(250)} style={[styles.sub, tf()]}>{t('onboardSub')}</Animated.Text>
        <View style={styles.dots}>
          {[0, 1].map((i) => <View key={i} style={[styles.dot, { opacity: step === i ? 1 : 0.4, width: step === i ? 22 : 8 }]} />)}
        </View>
      </LinearGradient>

      {step === 0 ? (
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeIn.delay(300)}>
            <Text style={[styles.label, tf('bold'), { color: c.text }]}>{t('language')}</Text>
            <View style={styles.langRow}>
              {(['en', 'ur'] as const).map((l) => (
                <Tap key={l} onPress={() => set({ lang: l })} style={[styles.lang, { backgroundColor: lang === l ? c.primary : c.card, borderColor: lang === l ? c.primary : c.border }]}>
                  <Text style={{ fontFamily: l === 'ur' ? font.urdu : font.semi, fontSize: 15, color: lang === l ? '#fff' : c.text }}>
                    {l === 'en' ? 'English' : 'اردو'}
                  </Text>
                </Tap>
              ))}
            </View>
            <Text style={[styles.label, tf('bold'), { color: c.text, marginTop: 22 }]}>📍 {t('pickCity')}</Text>
            <CityPicker value={city} onChange={setCity} />
          </Animated.View>
        </ScrollView>
      ) : (
        <Animated.View entering={FadeInRight.springify()} style={{ padding: 22, gap: 16 }}>
          <View style={[styles.battery, { backgroundColor: c.warn + '1A' }]}>
            <Icon name="battery-heart-variant" size={44} color={c.warn} />
          </View>
          <Text style={[tf('bold'), { color: c.text, fontSize: 19, textAlign: 'center' }]}>{t('batteryTitle')}</Text>
          <Text style={[tf(), { color: c.sub, fontSize: 13.5, lineHeight: 21, textAlign: 'center' }]}>{t('batteryBody')}</Text>
          <Tap onPress={() => openBatterySettings()} style={[styles.btn, { backgroundColor: c.warn }]}>
            <Icon name="cog-outline" size={20} color="#fff" />
            <Text style={[styles.btnText, tf('bold')]}>{t('batteryOpen')}</Text>
          </Tap>
        </Animated.View>
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14, backgroundColor: c.bg, borderTopColor: c.border }]}>
        <Tap onPress={finish} style={styles.skip}>
          <Text style={[tf(), { color: c.sub, fontSize: 14 }]}>{t('skip')}</Text>
        </Tap>
        <Tap onPress={next} style={{ flex: 1 }}>
          <LinearGradient colors={[c.primaryDark, c.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
            <Text style={[styles.btnText, tf('bold')]}>{t('continueBtn')}</Text>
            <Icon name="arrow-right" size={20} color="#fff" />
          </LinearGradient>
        </Tap>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 22, paddingBottom: 26, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, alignItems: 'center' },
  logo: { width: 76, height: 76, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  logoDot: { position: 'absolute', top: 12, right: 12, width: 14, height: 14, borderRadius: 7 },
  title: { color: '#fff', fontSize: 22, textAlign: 'center', marginTop: 16 },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 13.5, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 16 },
  dot: { height: 8, borderRadius: 4, backgroundColor: '#fff' },
  label: { fontSize: 15, marginBottom: 10 },
  langRow: { flexDirection: 'row', gap: 10 },
  lang: { flex: 1, height: 50, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  battery: { width: 92, height: 92, borderRadius: 46, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  skip: { paddingHorizontal: 10, paddingVertical: 14 },
  btn: { flexDirection: 'row', gap: 8, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16 },
});
