import { Tabs } from 'expo-router';
import { type ComponentProps, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName, Tap } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import { font, useTheme } from '@/lib/theme';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: { name: string; icon: IconName; active: IconName; label: 'home' | 'privateTab' | 'search' | 'saved' | 'settings' }[] = [
  { name: 'index', icon: 'home-variant-outline', active: 'home-variant', label: 'home' },
  { name: 'private', icon: 'briefcase-outline', active: 'briefcase', label: 'privateTab' },
  { name: 'search', icon: 'magnify', active: 'text-search', label: 'search' },
  { name: 'saved', icon: 'bookmark-outline', active: 'bookmark', label: 'saved' },
  { name: 'settings', icon: 'cog-outline', active: 'cog', label: 'settings' },
];

function TabBar({ state, navigation }: BottomTabBarProps) {
  const c = useTheme();
  const { t, tf } = useI18n();
  const insets = useSafeAreaInsets();
  const savedCount = useApp((s) => Object.keys(s.saved).length);
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const tabW = w / TABS.length;

  useEffect(() => {
    x.value = withSpring(state.index * tabW, { damping: 18, stiffness: 180 });
  }, [state.index, tabW, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: c.tabBar, borderTopColor: c.border }]}>
      <View style={styles.row} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 && (
          <Animated.View style={[styles.pillSlot, { width: tabW }, pill]}>
            <View style={[styles.pill, { backgroundColor: c.primarySoft }]} />
          </Animated.View>
        )}
        {TABS.map((tab, i) => {
          const focused = state.index === i;
          return (
            <Tap key={tab.name} style={styles.tab} onPress={() => !focused && navigation.navigate(state.routes[i]!.name)}>
              <View>
                <Icon name={focused ? tab.active : tab.icon} size={24} color={focused ? c.primary : c.faint} />
                {tab.name === 'saved' && savedCount > 0 && (
                  <View style={[styles.count, { backgroundColor: c.danger, borderColor: c.tabBar }]}>
                    <Text style={styles.countText}>{savedCount > 99 ? '99' : savedCount}</Text>
                  </View>
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
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, animation: 'shift' }}>
      {TABS.map((tab) => <Tabs.Screen key={tab.name} name={tab.name} />)}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, paddingHorizontal: 10 },
  row: { flexDirection: 'row' },
  pillSlot: { position: 'absolute', top: 0, bottom: 0, alignItems: 'center' },
  pill: { width: 56, height: 32, borderRadius: 16 },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingTop: 4 },
  label: { fontSize: 11 },
  count: { position: 'absolute', top: -4, right: -10, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, paddingHorizontal: 3 },
  countText: { color: '#fff', fontSize: 9.5, fontFamily: font.bold },
});
