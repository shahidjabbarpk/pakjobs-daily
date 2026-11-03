import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '@/lib/i18n';
import { font, useTheme } from '@/lib/theme';
import { Icon, type IconName, Tap } from './ui';

export interface Option { value: string; label: string; icon?: IconName }

/**
 * Compact filter button ("City: Lahore ▾") that opens a bottom-sheet list.
 * Replaces long horizontal chip rows so filters take one line instead of half the screen.
 * value null = "All" (the first row of the sheet).
 */
export function Dropdown({ label, icon, value, options, onChange, searchable }: {
  label: string;
  icon: IconName;
  value: string | null;
  options: Option[];
  onChange: (v: string | null) => void;
  searchable?: boolean;
}) {
  const c = useTheme();
  const { t, tf } = useI18n();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const current = options.find((o) => o.value === value);
  const active = !!current;

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const all: Option[] = [{ value: '', label: t('all') }, ...options];
    return s ? all.filter((o) => o.value && o.label.toLowerCase().includes(s)) : all;
  }, [options, q, t]);

  const pick = (v: string) => {
    onChange(v || null);
    setOpen(false);
    setQ('');
  };

  return (
    <>
      <Tap onPress={() => setOpen(true)}
        style={[styles.btn, { backgroundColor: active ? c.primary : c.card, borderColor: active ? c.primary : c.border }]}>
        <Icon name={current?.icon ?? icon} size={15} color={active ? '#fff' : c.sub} />
        <Text style={[styles.btnText, tf(active ? 'bold' : 'regular'), { color: active ? '#fff' : c.text }]} numberOfLines={1}>
          {current?.label ?? label}
        </Text>
        <Icon name="chevron-down" size={16} color={active ? '#fff' : c.faint} />
      </Tap>

      <Modal visible={open} transparent animationType="none" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <Animated.View entering={FadeIn.duration(150)} style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <Animated.View entering={SlideInDown.springify().damping(18)}
            style={[styles.sheet, { backgroundColor: c.bg, paddingBottom: insets.bottom + 12 }]}>
            <View style={[styles.grip, { backgroundColor: c.border }]} />
            <View style={styles.head}>
              <Icon name={icon} size={20} color={c.primary} />
              <Text style={[styles.title, tf('bold'), { color: c.text }]}>{label}</Text>
              <Tap onPress={() => setOpen(false)} style={[styles.close, { backgroundColor: c.cardAlt }]}>
                <Icon name="close" size={18} color={c.text} />
              </Tap>
            </View>
            {searchable && (
              <View style={[styles.search, { backgroundColor: c.card, borderColor: c.border }]}>
                <Icon name="magnify" size={18} color={c.faint} />
                <TextInput value={q} onChangeText={setQ} placeholder={t('search')} placeholderTextColor={c.faint}
                  style={[styles.input, { color: c.text }]} autoCorrect={false} />
              </View>
            )}
            <FlatList
              data={list}
              keyExtractor={(o) => o.value || '*'}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const on = (item.value || null) === value;
                return (
                  <Tap haptic={false} onPress={() => pick(item.value)}
                    style={[styles.row, { backgroundColor: on ? c.primarySoft : 'transparent' }]}>
                    {item.icon && <Icon name={item.icon} size={18} color={on ? c.primary : c.sub} />}
                    <Text style={[styles.rowText, tf(on ? 'bold' : 'regular'), { color: on ? c.primary : c.text }]}>{item.label}</Text>
                    {on && <Icon name="check" size={20} color={c.primary} />}
                  </Tap>
                );
              }}
            />
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 38, paddingHorizontal: 12, borderRadius: 19, borderWidth: 1, maxWidth: 190 },
  btnText: { fontSize: 13, flexShrink: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '72%', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 12, paddingTop: 8 },
  grip: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6, paddingBottom: 10 },
  title: { flex: 1, fontSize: 17 },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, marginHorizontal: 4, marginBottom: 8 },
  input: { flex: 1, fontFamily: font.regular, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, height: 50, borderRadius: 14 },
  rowText: { flex: 1, fontSize: 14.5 },
});
