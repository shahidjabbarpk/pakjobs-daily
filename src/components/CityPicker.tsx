import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useI18n } from '@/lib/i18n';
import { DISTRICT_NAMES } from '@/lib/places';
import { font, useTheme } from '@/lib/theme';
import { Chip, Icon } from './ui';

const POPULAR = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Peshawar', 'Quetta', 'Faisalabad', 'Multan'];

export function CityPicker({ value, onChange }: { value: string | null; onChange: (city: string) => void }) {
  const c = useTheme();
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [...POPULAR, ...DISTRICT_NAMES.filter((d) => !POPULAR.includes(d))];
    return DISTRICT_NAMES.filter((d) => d.toLowerCase().includes(s));
  }, [q]);

  return (
    <View>
      <View style={[styles.search, { backgroundColor: c.card, borderColor: c.border }]}>
        <Icon name="magnify" size={18} color={c.faint} />
        <TextInput value={q} onChangeText={setQ} placeholder={t('searchCity')} placeholderTextColor={c.faint}
          style={[styles.input, { color: c.text }]} autoCorrect={false} />
      </View>
      <View style={styles.wrap}>
        {list.slice(0, q ? 40 : 24).map((d) => (
          <Chip key={d} icon="map-marker-outline" label={d} active={value === d} onPress={() => onChange(d)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, marginBottom: 12 },
  input: { flex: 1, fontFamily: font.regular, fontSize: 14 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
