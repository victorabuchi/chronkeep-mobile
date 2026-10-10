import * as Haptics from 'expo-haptics';

// A soft tap under the finger. Never allowed to throw (not every device has a haptic engine).
export const tap = () => void Haptics.selectionAsync().catch(() => undefined);
export const soft = () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
export const done = () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
export const warn = () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
