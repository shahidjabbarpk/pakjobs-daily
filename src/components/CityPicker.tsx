import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useI18n } from '@/lib/i18n';
import { DISTRICTS, type Province, PROVINCE_NAMES } from '@/lib/places';
import { Dropdown } from './Dropdown';

const PROVINCES = Object.keys(PROVINCE_NAMES) as Province[];

/** The province a place belongs to: a province itself, or a district's province. */
export function provinceOf(place: string | null): Province | null {
  if (!place) return null;
  if ((PROVINCES as string[]).includes(place)) return place as Province;
  return DISTRICTS[place] ?? null;
}

/**
 * Province first, then a district of that province - both as dropdowns.
 * value/onChange carry one place: a district, a province ("whole province"), or null (All Pakistan).
 * `inline` renders just the two buttons so they can sit in another wrapping row (Search filters).
 */
export function CityPicker({ value, onChange, inline }: {
  value: string | null;
  onChange: (place: string | null) => void;
  inline?: boolean;
}) {
  const { t } = useI18n();
  const province = provinceOf(value);
  const district = value && value !== province ? value : null;
  const districts = useMemo(
    () => Object.entries(DISTRICTS).filter(([, p]) => p === province).map(([d]) => d).sort((a, b) => a.localeCompare(b)),
    [province],
  );

  const buttons = (
    <>
      <Dropdown label={t('province')} icon="map-outline" value={province}
        options={PROVINCES.map((p) => ({ value: p, label: PROVINCE_NAMES[p] }))}
        // a province with a single district (Islamabad) just picks that district
        onChange={(p) => { const only = p && Object.keys(DISTRICTS).filter((d) => DISTRICTS[d] === p); onChange(only && only.length === 1 ? only[0]! : p); }} />
      {/* districts appear once a province is chosen; "All" = the whole province */}
      {province && districts.length > 1 && (
        <Dropdown label={t('district')} icon="map-marker-outline" value={district} searchable
          options={districts.map((d) => ({ value: d, label: d }))}
          onChange={(d) => onChange(d ?? province)} />
      )}
    </>
  );
  return inline ? buttons : <View style={styles.row}>{buttons}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
