import * as Haptics from 'expo-haptics';

// Every call is wrapped so a device without a haptic engine (or a simulator)
// never throws into UI code.
const safe = (fn) => {
  try {
    return Promise.resolve(fn()).catch(() => {});
  } catch (_) {
    return Promise.resolve();
  }
};

export const haptic = {
  select: () => safe(() => Haptics.selectionAsync()),
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
