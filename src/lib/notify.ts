import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { deadlineMs } from './format';
import { jobInArea } from './places';
import { translate } from './i18n';
import { useApp } from './store';
import type { Job } from './types';

export const CHANNEL = 'new-jobs';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotifications(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'New job alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 220, 120, 220],
      lightColor: '#006400',
    });
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Deadline reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  if (!cur.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Only alert for what the user subscribed to. */
export function matchesAlerts(job: Job): boolean {
  const { alertCategories, alertCity } = useApp.getState();
  if (!alertCategories.includes(job.category)) return false;
  return jobInArea(job, alertCity);
}

export async function notifyNewJobs(jobs: Job[]): Promise<void> {
  const { notify, lang } = useApp.getState();
  if (!notify) return;
  const wanted = jobs.filter(matchesAlerts);
  if (!wanted.length) return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;

  if (wanted.length <= 3) {
    for (const j of wanted) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🆕 ${translate(lang, 'notifTitleOne')}: ${j.title}`,
          body: `${j.organization}${j.lastDate ? ` • ${translate(lang, 'lastDate')}: ${j.lastDate}` : ''}`,
          data: { url: `pakjobs://job/${j.id}`, jobId: j.id },
        },
        trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
      });
    }
  } else {
    const top = wanted.slice(0, 4).map((j) => `• ${j.title}`).join('\n');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔔 ${wanted.length} ${translate(lang, 'notifTitleMany')}`,
        body: `${top}\n${translate(lang, 'notifBodyMany')}`,
        data: { url: 'pakjobs://' },
      },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
    });
  }
}

/** Local reminders at 9 AM PKT, 3 days and 1 day before the deadline. Returns false if both are already past. */
export async function scheduleDeadlineReminder(job: Job): Promise<boolean> {
  const end = deadlineMs(job);
  if (end == null) return false;
  await cancelReminder(job.id);
  const { lang } = useApp.getState();
  const ids: string[] = [];
  for (const days of [3, 1]) {
    const at = new Date(Date.parse(`${job.lastDate}T09:00:00+05:00`) - days * 86_400_000);
    if (at.getTime() < Date.now() + 60_000) continue;
    ids.push(await Notifications.scheduleNotificationAsync({
      content: {
        title: days === 1 ? `⏰ ${translate(lang, 'reminderTitle')}` : `⏳ ${days} ${translate(lang, 'daysLeft')}`,
        body: `${job.title} — ${job.organization}`,
        data: { url: `pakjobs://job/${job.id}`, jobId: job.id },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: 'reminders' },
    }));
  }
  if (!ids.length) return false;
  const { reminders, set } = useApp.getState();
  set({ reminders: { ...reminders, [job.id]: ids.join(',') } });
  return true;
}

export async function cancelReminder(jobId: string) {
  const { reminders, set } = useApp.getState();
  const stored = reminders[jobId];
  if (!stored) return;
  for (const id of stored.split(',')) await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  const next = { ...reminders };
  delete next[jobId];
  set({ reminders: next });
}
