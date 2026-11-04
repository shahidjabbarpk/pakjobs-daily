import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Pressable, type PressableProps, RefreshControl, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { daysLeft, initials, urgency } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { CATEGORY_META, font, useTheme } from '@/lib/theme';
import type { Job } from '@/lib/types';

const APressable = Animated.createAnimatedComponent(Pressable);

/** Haptics throw synchronously where unsupported (web, some devices) - never let that block a tap. */
export function haptic(kind: 'select' | 'light' | 'medium' = 'select') {
  try {
    const p = kind === 'select' ? Haptics.selectionAsync()
      : Haptics.impactAsync(kind === 'light' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
    p.catch(() => {});
  } catch {
    /* unsupported */
  }
}

/** Pressable with a short, subtle press-down + light haptic (no spring, so nothing bounces). */
export function Tap({ style, children, haptic: withHaptic = true, scaleTo = 0.96, onPress, ...rest }:
  Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; children?: ReactNode; haptic?: boolean; scaleTo?: number }) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      {...rest}
      onPressIn={() => { s.value = withTiming(scaleTo, { duration: 80 }); }}
      onPressOut={() => { s.value = withTiming(1, { duration: 120 }); }}
      onPress={(e) => {
        if (withHaptic) haptic();
        onPress?.(e);
      }}
      style={[style, anim]}
    >
      {children}
    </APressable>
  );
}

export type IconName = keyof typeof MaterialCommunityIcons.glyphMap;
export const Icon = MaterialCommunityIcons;

export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName }) {
  const c = useTheme();
  const { tf } = useI18n();
  return (
    <Tap
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? c.primary : c.card, borderColor: active ? c.primary : c.border },
      ]}
    >
      {icon && <Icon name={icon} size={14} color={active ? '#fff' : c.sub} />}
      <Text style={[styles.chipText, tf(), { color: active ? '#fff' : c.text }]} numberOfLines={1}>{label}</Text>
    </Tap>
  );
}

export function Tag({ icon, label, tint }: { icon: IconName; label: string; tint?: string }) {
  const c = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: c.cardAlt }]}>
      <Icon name={icon} size={12} color={tint ?? c.sub} />
      <Text style={[styles.tagText, { color: c.sub }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function useUrgencyColor(job: Job) {
  const c = useTheme();
  const u = urgency(job);
  return { closed: c.faint, today: c.danger, urgent: c.danger, soon: c.warn, ok: c.ok, open: c.primary }[u];
}

/** Time left until midnight Pakistan time (UTC+5), as "5h 20m". */
function leftToday(now: number) {
  const pk = now + 5 * 3600_000;
  const mins = Math.max(0, Math.floor((86_400_000 - (pk % 86_400_000)) / 60000));
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/** Last-date countdown: soft-red pill while a deadline runs, ticking hours on the final day. */
export function DeadlineBadge({ job }: { job: Job }) {
  const c = useTheme();
  const { t, tf } = useI18n();
  const u = urgency(job);
  const d = daysLeft(job);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (u !== 'today') return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [u]);
  const label =
    u === 'open' ? t('noDeadline') : u === 'closed' ? t('closed') : u === 'today' ? `${t('lastDay')} • ${leftToday(now)}`
      : `${d} ${d === 1 ? t('dayLeft') : t('daysLeft')}`;
  const [fg, bg] = u === 'closed' ? [c.faint, c.cardAlt] : u === 'open' ? [c.ok, c.accentSoft] : [c.danger, c.dangerSoft];
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (u === 'today' || u === 'urgent') {
      pulse.value = withRepeat(withSequence(withTiming(0.55, { duration: 650 }), withTiming(1, { duration: 650 })), -1);
    }
  }, [u, pulse]);
  const dot = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {u === 'today' || u === 'urgent' ? (
        <Animated.View style={[styles.dot, { backgroundColor: fg }, dot]} />
      ) : (
        <Icon name={u === 'open' ? 'check-circle-outline' : u === 'closed' ? 'lock-outline' : 'timer-outline'} size={13} color={fg} />
      )}
      <Text style={[styles.badgeText, tf('bold'), { color: fg }]}>{label}</Text>
    </View>
  );
}

/** Rounded category pill in the category's own colour. */
export function CategoryPill({ category }: { category: Job['category'] }) {
  const c = useTheme();
  const { t, tf } = useI18n();
  // the lighter end of the category gradient stays readable on dark cards
  const col = CATEGORY_META[category].colors[c.dark ? 1 : 0];
  return (
    <View style={[styles.catPill, { backgroundColor: col + '18', borderColor: col + '33' }]}>
      <Icon name={CATEGORY_META[category].icon as IconName} size={11} color={col} />
      <Text style={[styles.catPillText, tf('bold'), { color: col }]} numberOfLines={1}>{t(`cat.${category}`)}</Text>
    </View>
  );
}

export function NewBadge() {
  const { t } = useI18n();
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [glow]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: 1 + glow.value * 0.08 }] }));
  return (
    <Animated.View style={st}>
      <LinearGradient colors={['#F59E0B', '#EF4444']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.newBadge}>
        <Text style={styles.newText}>{t('new')}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

export function OrgAvatar({ job, size = 46 }: { job: Job; size?: number }) {
  const meta = CATEGORY_META[job.category];
  return (
    <LinearGradient colors={meta.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size * 0.3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {job.logo ? (
        <Image source={{ uri: job.logo }} style={{ width: size, height: size, backgroundColor: '#fff' }} contentFit="contain" transition={200} />
      ) : job.source === 'army' || job.source === 'navy' ? (
        <Icon name={meta.icon as IconName} size={size * 0.52} color="#fff" />
      ) : (
        <Text style={{ color: '#fff', fontFamily: font.bold, fontSize: size * 0.34 }}>{initials(job.organization) || 'PK'}</Text>
      )}
    </LinearGradient>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const c = useTheme();
  const { tf, isUr } = useI18n();
  return (
    <View style={[styles.section, isUr && { flexDirection: 'row-reverse' }]}>
      <Text style={[styles.sectionTitle, tf('bold'), { color: c.text }]}>{title}</Text>
      {action && (
        <Tap onPress={onAction} haptic={false}>
          <Text style={[styles.sectionAction, tf(), { color: c.primary }]}>{action}</Text>
        </Tap>
      )}
    </View>
  );
}

export function EmptyState({ icon, title, hint }: { icon: IconName; title: string; hint: string }) {
  const c = useTheme();
  const { tf } = useI18n();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.primarySoft }]}>
        <Icon name={icon} size={44} color={c.primary} />
      </View>
      <Text style={[styles.emptyTitle, tf('bold'), { color: c.text }]}>{title}</Text>
      <Text style={[styles.emptyHint, tf(), { color: c.sub }]}>{hint}</Text>
    </View>
  );
}

const HEART = '#FF3B5C';

/** Save-for-later heart: squash, pop and a burst ring when it turns on. */
export function BookmarkButton({ active, onPress, size = 22, light }: { active: boolean; onPress: () => void; size?: number; light?: boolean }) {
  const c = useTheme();
  const s = useSharedValue(1);
  const ring = useSharedValue(0);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const ringSt = useAnimatedStyle(() => ({
    opacity: ring.value === 0 ? 0 : 1 - ring.value,
    transform: [{ scale: 0.4 + ring.value * 1.4 }],
  }));
  const box = size + 14;
  return (
    <Pressable
      hitSlop={12}
      onPress={() => {
        haptic(active ? 'light' : 'medium');
        if (active) {
          s.value = withSequence(withTiming(0.85, { duration: 80 }), withTiming(1, { duration: 120 }));
        } else {
          s.value = withSequence(withTiming(1.15, { duration: 100 }), withTiming(1, { duration: 140 }));
          ring.value = 0;
          ring.value = withTiming(1, { duration: 480, easing: Easing.out(Easing.quad) }, () => { ring.value = 0; });
        }
        onPress();
      }}
      style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View pointerEvents="none" style={[styles.burst, { width: box, height: box, borderRadius: box / 2, borderColor: HEART }, ringSt]} />
      <Animated.View style={st}>
        <Icon name={active ? 'heart' : 'heart-outline'} size={size} color={active ? HEART : light ? '#fff' : c.faint} />
      </Animated.View>
    </Pressable>
  );
}

/** Shimmering placeholder block. */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  const x = useSharedValue(-1);
  useEffect(() => {
    x.value = withRepeat(withTiming(1, { duration: 1150, easing: Easing.inOut(Easing.quad) }), -1);
  }, [x]);
  const shine = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 320 }] }));
  return (
    <View style={[{ backgroundColor: c.cardAlt, overflow: 'hidden', borderRadius: 8 }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, shine]}>
        <LinearGradient colors={['transparent', c.dark ? '#FFFFFF12' : '#FFFFFFB3', 'transparent']}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1, width: 180 }} />
      </Animated.View>
    </View>
  );
}

/** Job-card shaped skeleton shown while jobs load. */
export function JobCardSkeleton() {
  const c = useTheme();
  return (
    <View style={[styles.skCard, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Skeleton style={{ width: 46, height: 46, borderRadius: 14 }} />
        <View style={{ flex: 1, gap: 8, paddingTop: 2 }}>
          <Skeleton style={{ height: 14, width: '85%' }} />
          <Skeleton style={{ height: 11, width: '55%' }} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
        <Skeleton style={{ height: 22, width: 70, borderRadius: 11 }} />
        <Skeleton style={{ height: 22, width: 90, borderRadius: 11 }} />
        <Skeleton style={{ height: 22, width: 60, borderRadius: 11 }} />
      </View>
      <Skeleton style={{ height: 24, width: 110, borderRadius: 12, marginTop: 14 }} />
    </View>
  );
}

/**
 * Pull-to-refresh with our own spinner: the native RefreshControl keeps the gesture but its
 * indicator is pushed off-screen, and <BrandSpinner> (a spinning crescent) shows instead.
 */
export function brandRefreshControl(refreshing: boolean, onRefresh: () => void) {
  return (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="transparent" colors={['transparent']}
      progressBackgroundColor="transparent" progressViewOffset={-1000} />
  );
}

export function BrandSpinner({ visible, top }: { visible: boolean; top: number }) {
  const c = useTheme();
  const r = useSharedValue(0);
  useEffect(() => {
    if (visible) r.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1);
    else r.value = 0;
  }, [visible, r]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  if (!visible) return null;
  return (
    <Animated.View pointerEvents="none"
      style={[styles.spinner, { top, backgroundColor: c.card, shadowColor: c.shadow }]}>
      <Animated.View style={spin}>
        <Icon name="star-crescent" size={24} color={c.primary} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 18, borderWidth: 1 },
  chipText: { fontSize: 13 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, maxWidth: 170 },
  tagText: { fontFamily: font.medium, fontSize: 11 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start', maxWidth: 170 },
  catPillText: { fontSize: 10.5 },
  burst: { position: 'absolute', borderWidth: 2 },
  skCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 14, borderWidth: 1 },
  spinner: {
    position: 'absolute', alignSelf: 'center', width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8, zIndex: 50,
  },
  badgeText: { fontSize: 11 },
  newBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  newText: { color: '#fff', fontFamily: font.bold, fontSize: 9.5, letterSpacing: 0.6 },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 22, marginBottom: 12 },
  sectionTitle: { fontSize: 17 },
  sectionAction: { fontSize: 13 },
  empty: { alignItems: 'center', paddingHorizontal: 36, paddingVertical: 60, gap: 10 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 17, textAlign: 'center' },
  emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});

/** Status-bar icon colour for the focused screen: 'hero' screens have a dark gradient header. */
export function useStatusBar(kind: 'hero' | 'plain') {
  const c = useTheme();
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(kind === 'hero' || c.dark ? 'light' : 'dark');
    }, [kind, c.dark]),
  );
}

export const TAB_BAR_H = 64;

/** Bottom space tab screens leave free so the floating tab bar never covers content. */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_H + Math.max(insets.bottom, 12) + 16;
}
