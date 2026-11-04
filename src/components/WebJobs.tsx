import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { adOnOpen } from '@/lib/ads';
import { useI18n } from '@/lib/i18n';
import { PROVINCE_NAMES } from '@/lib/places';
import { font, useTheme } from '@/lib/theme';
import { fetchWebJobs, INDUSTRY_KEYWORDS, type WebJob } from '@/lib/webjobs';
import { Icon, SectionTitle, Tap } from './ui';

/**
 * Private-sector jobs from across the web (Careerjet), filtered by the Private tab's industry and area.
 * Renders nothing while the feature is off (no proxy URL or no API key yet).
 */
export function WebJobs({ industry, area }: { industry: string | null; area: string | null }) {
  const c = useTheme();
  const { t, tf } = useI18n();
  const [jobs, setJobs] = useState<WebJob[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [off, setOff] = useState(false);
  const [loading, setLoading] = useState(false);
  const keywords = industry ? INDUSTRY_KEYWORDS[industry] : undefined;
  const location = area ? (PROVINCE_NAMES as Record<string, string>)[area] ?? area : undefined;

  const load = async (p: number) => {
    setLoading(true);
    try {
      const res = await fetchWebJobs({ keywords, location, page: p });
      if (!res) { setOff(true); return; }
      setJobs((prev) => (p === 1 ? res.jobs : [...prev, ...res.jobs]));
      setPages(res.pages);
      setPage(p);
    } catch {
      if (p === 1) setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  // a new industry or area starts again from page 1
  useEffect(() => { load(1); }, [keywords, location]); // eslint-disable-line react-hooks/exhaustive-deps

  if (off) return null;
  return (
    <View>
      <SectionTitle title={`🌐 ${t('webJobs')}`} />
      {jobs.map((j) => (
        <Tap key={j.url} onPress={() => adOnOpen('job', () => WebBrowser.openBrowserAsync(j.url))}
          style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>{j.title}</Text>
          {!!j.company && <Text style={[styles.company, { color: c.sub }]} numberOfLines={1}>{j.company}</Text>}
          <View style={styles.meta}>
            {!!j.locations && <Meta icon="map-marker-outline" text={j.locations} />}
            {!!j.salary && <Meta icon="cash" text={j.salary} />}
            {!!j.date && <Meta icon="calendar-outline" text={new Date(j.date).toDateString().slice(4)} />}
          </View>
          {!!j.description && <Text style={[styles.desc, { color: c.faint }]} numberOfLines={2}>{j.description.replace(/<[^>]+>/g, '')}</Text>}
        </Tap>
      ))}
      {loading && <ActivityIndicator color={c.primary} style={{ marginVertical: 16 }} />}
      {!loading && !jobs.length && <Text style={[styles.empty, tf(), { color: c.sub }]}>{t('noResults')}</Text>}
      {!loading && page < Math.min(pages, 10) && (
        <Tap onPress={() => load(page + 1)} style={[styles.more, { borderColor: c.primary }]}>
          <Text style={[tf('bold'), { color: c.primary, fontSize: 13.5 }]}>{t('loadMore')}</Text>
        </Tap>
      )}
      <Text style={[styles.credit, { color: c.faint }]}>{t('jobsByCareerjet')}</Text>
    </View>
  );
}

function Meta({ icon, text }: { icon: any; text: string }) {
  const c = useTheme();
  return (
    <View style={styles.metaItem}>
      <Icon name={icon} size={13} color={c.faint} />
      <Text style={[styles.metaText, { color: c.sub }]} numberOfLines={1}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 10, padding: 14, borderRadius: 18, borderWidth: 1, gap: 4 },
  title: { fontFamily: font.semi, fontSize: 14.5 },
  company: { fontFamily: font.medium, fontSize: 12.5 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  metaText: { fontFamily: font.regular, fontSize: 11.5 },
  desc: { fontFamily: font.regular, fontSize: 12, marginTop: 4 },
  empty: { textAlign: 'center', fontSize: 12.5, marginVertical: 12 },
  more: { marginHorizontal: 16, height: 44, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  credit: { textAlign: 'center', fontFamily: font.regular, fontSize: 11, marginVertical: 8 },
});
