import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

// NOTE: these are LOCAL, on-device notifications (Notifications.scheduleNotificationAsync),
// not server-sent push. Expo Go (SDK 53+) no longer supports remote push notifications at
// all, but local scheduled notifications work fine in Expo Go — so this is the reliable
// option for a project meant to run via `expo start` + Expo Go rather than a custom dev build.

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const DAILY_REMINDER_ID = 'daily-outfit-log-reminder';

export async function requestNotificationPermission() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  return status === 'granted';
}

// Schedules (or re-schedules) a repeating reminder every day at the given
// hour/minute, nudging the person to log today's outfit if they haven't yet.
export async function scheduleDailyLogReminder(hour = 20, minute = 0) {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: "What'd you wear today?",
      body: "Log today's outfit to keep your wardrobe stats accurate.",
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
  return true;
}

export async function cancelDailyLogReminder() {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
}

// Schedules a one-off "pack for your trip" reminder for 7pm the evening
// before the trip's start date. Returns false if that evening is already
// in the past (e.g. trip starts today/tomorrow morning already passed).
export async function scheduleTripReminder(startDateISO, occasion = 'trip') {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  const start = new Date(`${startDateISO}T00:00:00`);
  const reminderTime = new Date(start);
  reminderTime.setDate(reminderTime.getDate() - 1);
  reminderTime.setHours(19, 0, 0, 0);

  if (reminderTime.getTime() <= Date.now()) return false;

  await Notifications.scheduleNotificationAsync({
    identifier: `trip-reminder-${startDateISO}`,
    content: {
      title: 'Trip tomorrow ✈️',
      body: `Don't forget to pack — your ${occasion} trip starts tomorrow!`,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: reminderTime,
    },
  });
  return true;
}