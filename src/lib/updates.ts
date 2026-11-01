import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { FEED_URL } from './config';
import { translate } from './i18n';
import { CHANNEL } from './notify';
import { useApp } from './store';
import type { Update } from './types';

const UPDATES_URL = FEED_URL.replace(/jobs\.json$/, 'updates.json');

/** Fetches results / roll-no / schedule notices; returns the ones this device hasn't seen. */
export async function refreshUpdates(): Promise<Update[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(`${UPDATES_URL}?t=${Math.floor(Date.now() / 300000)}`, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`updates ${r.status}`);
    const { updates } = (await r.json()) as { updates: Update[] };
    const { seenUpdateIds, set } = useApp.getState();
    const first = seenUpdateIds.length === 0; // first sync: don't flood the user with old notices
    const seen = new Set(seenUpdateIds);
    const fresh = first ? [] : updates.filter((u) => !seen.has(u.id));
    set({ updates, seenUpdateIds: [...new Set([...updates.map((u) => u.id), ...seenUpdateIds])].slice(0, 2000) });
    return fresh;
  } finally {
    clearTimeout(timer);
  }
}

export async function notifyUpdates(fresh: Update[]) {
  const { notifyUpdates: on, notify, lang } = useApp.getState();
  if (!on || !notify || !fresh.length || Platform.OS === 'web') return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  const top = fresh.slice(0, 3);
  const title = fresh.length === 1
    ? `📋 ${translate(lang, `kind.${top[0]!.kind}` as any)}: ${top[0]!.source.toUpperCase()}`
    : `📋 ${fresh.length} × ${translate(lang, 'notifUpdate')}`;
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: top.map((u) => `• ${u.title}`).join('\n'),
      data: { url: 'pakjobs://updates', screen: '/updates' },
    },
    trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
  });
}
