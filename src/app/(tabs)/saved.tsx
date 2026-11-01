import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JobCard } from '@/components/JobCard';
import { EmptyState } from '@/components/ui';
import { sortJobs } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import { useTheme } from '@/lib/theme';

export default function Saved() {
  const c = useTheme();
  const { t, tf, isUr } = useI18n();
  const insets = useSafeAreaInsets();
  const saved = useApp((s) => s.saved);
  const list = useMemo(() => sortJobs(Object.values(saved), 'deadline'), [saved]);

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: c.bg }}
      data={list}
      keyExtractor={(j) => j.id}
      renderItem={({ item, index }) => <JobCard job={item} index={index} />}
      ListHeaderComponent={
        <View style={[styles.head, { paddingTop: insets.top + 12 }]}>
          <Text style={[styles.h1, tf('bold'), { color: c.text }, isUr && { textAlign: 'right' }]}>{t('saved')}</Text>
          {list.length > 0 && <Text style={[tf(), { color: c.sub, fontSize: 13 }]}>{list.length} • {t('deadline')}</Text>}
        </View>
      }
      ListEmptyComponent={<EmptyState icon="bookmark-multiple-outline" title={t('savedEmpty')} hint={t('savedEmptyHint')} />}
      ListFooterComponent={<View style={{ height: 24 }} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 16, paddingBottom: 14 },
  h1: { fontSize: 26 },
});
