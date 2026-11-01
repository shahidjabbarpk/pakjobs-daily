import { router } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { isNew, prettyDate, windowProgress } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import { font, useTheme } from '@/lib/theme';
import type { Job } from '@/lib/types';
import { BookmarkButton, DeadlineBadge, NewBadge, OrgAvatar, Tag, Tap, useUrgencyColor } from './ui';

function JobCardBase({ job, index = 0 }: { job: Job; index?: number }) {
  const c = useTheme();
  const { t, qual } = useI18n();
  const saved = useApp((s) => !!s.saved[job.id]);
  const toggleSave = useApp((s) => s.toggleSave);
  const barColor = useUrgencyColor(job);
  const progress = windowProgress(job);
  const place = job.cities.includes('All Pakistan') ? t('allPakistan') : job.cities.slice(0, 2).join(', ');

  return (
    <Animated.View entering={index < 12 ? FadeInDown.delay(index * 45).springify().damping(16) : undefined}>
      <Tap
        haptic={false}
        onPress={() => router.push(`/job/${job.id}`)}
        style={[styles.card, { backgroundColor: c.card, borderColor: job.featured ? c.gold : c.border, shadowColor: c.shadow },
          job.featured && styles.featuredCard]}
      >
        {job.featured && (
          <View style={[styles.ribbon, { backgroundColor: c.gold }]}>
            <Text style={styles.ribbonText}>⭐ {t('featured')}</Text>
          </View>
        )}
        <View style={styles.top}>
          <OrgAvatar job={job} />
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              {isNew(job) && <NewBadge />}
              <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>{job.title}</Text>
            </View>
            <Text style={[styles.org, { color: c.sub }]} numberOfLines={1}>{job.organization}</Text>
          </View>
          <BookmarkButton active={saved} onPress={() => toggleSave(job)} />
        </View>

        <View style={styles.tags}>
          <Tag icon="school-outline" label={qual(job.qualification)} />
          {!!place && <Tag icon="map-marker-outline" label={place} />}
          {!!job.salary && <Tag icon="cash" label={job.salary} tint={c.ok} />}
          {!!job.grade && <Tag icon="star-four-points-outline" label={job.grade} />}
          {!!job.vacancies && <Tag icon="account-multiple-outline" label={`${job.vacancies}`} />}
        </View>

        <View style={styles.bottom}>
          <DeadlineBadge job={job} />
          <Text style={[styles.date, { color: c.faint }]}>
            {job.lastDate ? `${t('lastDate')}: ${prettyDate(job.lastDate)}` : `${t('posted')}: ${prettyDate(job.postedDate ?? job.firstSeen)}`}
          </Text>
        </View>
        {!!job.lastDate && (
          <View style={[styles.track, { backgroundColor: c.cardAlt }]}>
            <View style={[styles.fill, { width: `${Math.max(4, progress * 100)}%`, backgroundColor: barColor }]} />
          </View>
        )}
      </Tap>
    </Animated.View>
  );
}

export const JobCard = memo(JobCardBase);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 20, padding: 14, borderWidth: 1,
    shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  top: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  title: { fontFamily: font.semi, fontSize: 15, lineHeight: 21, flexShrink: 1 },
  org: { fontFamily: font.regular, fontSize: 12.5, marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  date: { fontFamily: font.medium, fontSize: 11 },
  featuredCard: { borderWidth: 1.5 },
  ribbon: { position: 'absolute', top: 0, right: 44, paddingHorizontal: 8, paddingVertical: 2, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  ribbonText: { fontFamily: font.bold, fontSize: 9.5, color: '#1A1300' },
  track: { height: 4, borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
});
