import { StyleSheet, Text, View } from 'react-native';
import { openPaper } from '@/lib/paper';
import { font, useTheme } from '@/lib/theme';
import type { Paper } from '@/lib/types';
import { Icon, Tap } from './ui';

/** One official past paper: just its name, commission and year; opens inside the app. */
export function PaperRow({ paper }: { paper: Paper }) {
  const c = useTheme();
  return (
    <Tap onPress={() => openPaper(paper)} style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[styles.icon, { backgroundColor: c.primarySoft }]}><Icon name="file-document-outline" size={18} color={c.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>{paper.title}</Text>
        <Text style={[styles.meta, { color: c.faint }]}>{paper.source.toUpperCase()}{paper.year ? ` • ${paper.year}` : ''}</Text>
      </View>
      <Icon name="chevron-right" size={20} color={c.faint} />
    </Tap>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 16, borderWidth: 1 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.semi, fontSize: 13.5 },
  meta: { fontFamily: font.regular, fontSize: 11.5, marginTop: 2 },
});
