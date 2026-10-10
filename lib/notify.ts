import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { IOS_LIMIT, plan } from './schedule';
import type { AppData, Planned } from './types';

// Reminders as local notifications. The planner (schedule.ts) works out when each one is due; this hands the
// nearest ones to the operating system, which shows them even when ChronKeep is closed.

export const CATEGORY = 'reminder'; // no ":" or "-" in category ids
const CHANNEL = 'reminders';
const LIMIT = Platform.OS === 'ios' ? IOS_LIMIT : 200;

export type NotifyState = 'unsupported' | 'blocked' | 'off' | 'on';

// Reminders show while the app is open too.
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });

export async function setupNotifications(): Promise<void> {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Reminders', importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 200, 120, 200] });
  // The buttons open the app briefly: on iOS a button that does not would be ignored when the app is closed.
  await Notifications.setNotificationCategoryAsync(CATEGORY, [
    { identifier: 'snooze', buttonTitle: 'Snooze 10 min', options: { opensAppToForeground: true } },
    { identifier: 'done', buttonTitle: 'Done', options: { opensAppToForeground: true } },
  ]);
}

export async function notifyState(): Promise<NotifyState> {
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'on';
    return status === 'denied' && !canAskAgain ? 'blocked' : 'off';
  } catch {
    return 'unsupported';
  }
}

export async function askPermission(): Promise<NotifyState> {
  const r = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return r.granted ? 'on' : r.canAskAgain ? 'off' : 'blocked';
}

// Replaces everything scheduled with the nearest reminders from the current plan. Returns the new log.
export async function syncNotifications(data: AppData, now = Date.now()): Promise<Planned[]> {
  const keep = data.log.filter((e) => e.at <= now).slice(-100); // what has gone by: the bell's "Earlier"
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!data.settings.notify || (await notifyState()) !== 'on') return keep;
    const chosen = plan({ items: data.items, settings: data.settings, snoozed: data.snoozed, now }).slice(0, LIMIT);
    for (const p of chosen) {
      await Notifications.scheduleNotificationAsync({
        identifier: p.id.replace(/[:]/g, '_'),
        content: { title: p.title, body: p.body, sound: 'default', categoryIdentifier: p.itemId ? CATEGORY : undefined, data: { itemId: p.itemId, date: p.date, kind: p.kind } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(p.at), channelId: CHANNEL },
      });
    }
    return [...keep, ...chosen];
  } catch {
    return data.log; // scheduling failed: leave the log as it was
  }
}

export async function sendTest(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title: 'ChronKeep test', body: 'Notifications are working!', sound: 'default' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2, channelId: CHANNEL },
  });
}

export type Tap = { itemId: string; date: string; action: 'open' | 'done' | 'snooze' };

// A notification (or one of its buttons) was pressed.
export function readResponse(r: Notifications.NotificationResponse | null | undefined): (Tap & { key: string }) | null {
  if (!r) return null;
  const d = r.notification.request.content.data as { itemId?: string; date?: string } | undefined;
  if (!d?.itemId) return null;
  const a = r.actionIdentifier;
  const action = a === 'done' ? 'done' : a === 'snooze' ? 'snooze' : a === Notifications.DEFAULT_ACTION_IDENTIFIER ? 'open' : null;
  return action ? { itemId: d.itemId, date: d.date ?? '', action, key: `${r.notification.request.identifier}|${a}` } : null;
}
