import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { type ComponentProps, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName, TAB_BAR_H as BAR_H, Tap } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import { font, useTheme } from '@/lib/theme';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: { name: string; icon: IconName; active: IconName; label: 'home' | 'privateTab' | 'saved' | 'alertsTab' | 'profileTab' }[] = [
  { name: 'index', icon: 'home-variant-outline', active: 'home-variant', label: 'home' },
  { name: 'private', icon: 'briefcase-outline', active: 'briefcase', label: 'privateTab' },
  { name: 'saved', icon: 'heart-outline', active: 'heart', label: 'saved' },
  { name: 'alerts', icon: 'bell-outline', active: 'bell', label: 'alertsTab' },
  { name: 'settings', icon: 'account-circle-outline', active: 'account-circle', label: 'profileTab' },
];
// reachable from Home's search pill and filter chips, but not a tab of its own
const HIDDEN = ['search'];

function TabBar({ state, navigation }: BottomTabBarProps) {
  const c = useTheme();
  const { t, tf } = useI18n();
  const insets = useSafeAreaInsets();
  const savedCount = useApp((s) => Object.keys(s.saved).length);
  const unreadAlerts = useApp((s) => s.updates.filter((u) => Date.parse(u.firstSeen) > s.alertsSeenAt).length);
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const tabW = w / TABS.length;
  const current = state.routes[state.index]?.name;
  const idx = TABS.findIndex((tab) => tab.name === current);

  useEffect(() => {
    if (idx >= 0) x.value = withSpring(idx * tabW, { damping: 18, stiffness: 180 });
  }, [idx, tabW, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View pointerEvents="box-none" style={[styles.float, { bottom: Math.max(insets.bottom, 12) }]}>
      <View style={[styles.bar, { borderColor: c.glassBorder, shadowColor: c.shadow }]}>
        <BlurView intensity={60} tint={c.dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.tabBar }]} />
        <View style={styles.row} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          {w > 0 && idx >= 0 && (
            <Animated.View style={[styles.pillSlot, { width: tabW }, pill]}>
              <View style={[styles.pill, { backgroundColor: c.primarySoft }]} />
            </Animated.View>
          )}
          {TABS.map((tab, i) => {
            const focused = i === idx;
            const badge = tab.name === 'saved' ? savedCount : tab.name === 'alerts' ? unreadAlerts : 0;
            return (
              <Tap key={tab.name} style={styles.tab} onPress={() => !focused && navigation.navigate(tab.name)}>
                <View>
                  <Icon name={focused ? tab.active : tab.icon} size={23} color={focused ? c.primary : c.faint} />
                  {badge > 0 && (
                    <Animated.View entering={ZoomIn.springify()} style={[styles.count, { backgroundColor: c.danger, borderColor: c.card }]}>
                      <Text style={styles.countText}>{badge > 99 ? '99' : badge}</Text>
                    </Animated.View>
                  )}
                </View>
                <Text style={[styles.label, tf(focused ? 'bold' : 'regular'), { color: focused ? c.primary : c.faint }]} numberOfLines={1}>
                  {t(tab.label)}
                </Text>
              </Tap>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, animation: 'shift' }}>
      {TABS.map((tab) => <Tabs.Screen key={tab.name} name={tab.name} />)}
      {HIDDEN.map((name) => <Tabs.Screen key={name} name={name} />)}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  float: { position: 'absolute', left: 14, right: 14 },
  bar: {
    height: BAR_H, borderRadius: 26, borderWidth: 1, overflow: 'hidden', justifyContent: 'center', paddingHorizontal: 6,
    shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  row: { flexDirection: 'row' },
  pillSlot: { position: 'absolute', top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  pill: { width: 58, height: 48, borderRadius: 18 },
  tab: { flex: 1, alignItems: 'center', gap: 1, paddingVertical: 6 },
  label: { fontSize: 10.5 },
  count: { position: 'absolute', top: -5, right: -11, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, paddingHorizontal: 3 },
  countText: { color: '#fff', fontSize: 9.5, fontFamily: font.bold },
});
