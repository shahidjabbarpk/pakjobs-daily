import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useEffect } from 'react';
import { Pressable, type PressableProps, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
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

/** Pressable with a springy scale-down + light haptic. */
export function Tap({ style, children, haptic: withHaptic = true, onPress, ...rest }:
  Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; children?: ReactNode; haptic?: boolean }) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      {...rest}
      onPressIn={() => { s.value = withSpring(0.96, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { s.value = withSpring(1, { damping: 12, stiffness: 300 }); }}
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

export function DeadlineBadge({ job }: { job: Job }) {
  const { t, tf } = useI18n();
  const color = useUrgencyColor(job);
  const u = urgency(job);
  const d = daysLeft(job);
  const label =
    u === 'open' ? t('noDeadline') : u === 'closed' ? t('closed') : u === 'today' ? t('lastDay')
      : `${d} ${d === 1 ? t('dayLeft') : t('daysLeft')}`;
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (u === 'today' || u === 'urgent') {
      pulse.value = withRepeat(withSequence(withTiming(0.55, { duration: 650 }), withTiming(1, { duration: 650 })), -1);
    }
  }, [u, pulse]);
  const dot = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <View style={[styles.badge, { backgroundColor: color + '1F' }]}>
      <Animated.View style={[styles.dot, { backgroundColor: color }, dot]} />
      <Text style={[styles.badgeText, tf('bold'), { color }]}>{label}</Text>
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
  const float = useSharedValue(0);
  useEffect(() => {
    float.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [float]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: -8 * float.value }] }));
  return (
    <View style={styles.empty}>
      <Animated.View style={[styles.emptyIcon, { backgroundColor: c.primarySoft }, st]}>
        <Icon name={icon} size={44} color={c.primary} />
      </Animated.View>
      <Text style={[styles.emptyTitle, tf('bold'), { color: c.text }]}>{title}</Text>
      <Text style={[styles.emptyHint, tf(), { color: c.sub }]}>{hint}</Text>
    </View>
  );
}

/** Bookmark icon that pops when toggled on. */
export function BookmarkButton({ active, onPress, size = 22, light }: { active: boolean; onPress: () => void; size?: number; light?: boolean }) {
  const c = useTheme();
  const s = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      hitSlop={12}
      onPress={() => {
        haptic(active ? 'light' : 'medium');
        s.value = withSequence(withSpring(1.35, { damping: 6, stiffness: 500 }), withSpring(1));
        onPress();
      }}
    >
      <Animated.View style={st}>
        <Icon name={active ? 'bookmark' : 'bookmark-outline'} size={size} color={active ? c.gold : light ? '#fff' : c.faint} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 18, borderWidth: 1 },
  chipText: { fontSize: 13 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, maxWidth: 170 },
  tagText: { fontFamily: font.medium, fontSize: 11 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  dot: { width: 7, height: 7, borderRadius: 4 },
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
