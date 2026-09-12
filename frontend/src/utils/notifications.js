import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

// NOTE: these are LOCAL, on-device notifications, not server-sent push.
// Expo Go (SDK 53+) removed remote push support, and local notifications are
// documented to still work in Expo Go — but expo-notifications also ships a
// side-effect file (DevicePushTokenAutoRegistration.fx.js) that auto-registers
// a push-token listener the instant the module is imported/evaluated, which
// logs a console.error on Android that Expo Go's runtime treats as fatal
// during startup ("[runtime not ready]").
//
// Fix: never import/require expo-notifications while running in Expo Go.
// require() only evaluates a module's top-level code the first time it's
// actually called, so gating it behind isRunningInExpoGo() means that
// side-effect file simply never runs there. In a dev build / production
// build, isRunningInExpoGo() is false and everything loads and works
// normally, including real push notifications if you add them later.

let Notifications = null;
let SchedulableTriggerInputTypes = null;
let handlerConfigured = false;

function getNotifications() {
  if (isRunningInExpoGo()) return null;
  if (!Notifications) {
    Notifications = require('expo-notifications');
    ({ SchedulableTriggerInputTypes } = Notifications);
  }
  if (!handlerConfigured) {
    handlerConfigured = true;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
  return Notifications;
}

const DAILY_REMINDER_ID = 'daily-outfit-log-reminder';

export async function requestNotificationPermission() {
  const N = getNotifications();
  if (!N) return false; // Expo Go: notifications silently unavailable

  const { status: existing } = await N.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await N.requestPermissionsAsync();
  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync('default', {
      name: 'default',
      importance: N.AndroidImportance.DEFAULT,
    });
  }
  return status === 'granted';
}

// Schedules (or re-schedules) a repeating reminder every day at the given
// hour/minute, nudging the person to log today's outfit if they haven't yet.
export async function scheduleDailyLogReminder(hour = 20, minute = 0) {
  const N = getNotifications();
  if (!N) return false;

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  await N.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
  await N.scheduleNotificationAsync({
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
  const N = getNotifications();
  if (!N) return;
  await N.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
}

// Schedules a one-off "pack for your trip" reminder for 7pm the evening
// before the trip's start date. Returns false if that evening is already
// in the past (e.g. trip starts today/tomorrow morning already passed).
export async function scheduleTripReminder(startDateISO, occasion = 'trip') {
  const N = getNotifications();
  if (!N) return false;

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  const start = new Date(`${startDateISO}T00:00:00`);
  const reminderTime = new Date(start);
  reminderTime.setDate(reminderTime.getDate() - 1);
  reminderTime.setHours(19, 0, 0, 0);

  if (reminderTime.getTime() <= Date.now()) return false;

  await N.scheduleNotificationAsync({
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