import { useEffect, useState } from 'react';
import { AppState, Linking, Pressable } from 'react-native';
import { useData } from '../lib/data';
import { askPermission, notifyState, type NotifyState } from '../lib/notify';
import { useTheme } from '../lib/theme-context';
import { Txt } from './ui';

// Shown under the top bar when the phone is not allowing reminders, so a silent "no" never goes unnoticed.
export default function NotifBanner() {
  const { c } = useTheme();
  const wants = useData((d) => d.settings.notify);
  const [state, setState] = useState<NotifyState>('on');
  useEffect(() => {
    const check = () => void notifyState().then(setState);
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, []);
  if (!wants || state === 'on' || state === 'unsupported') return null;
  const blocked = state === 'blocked';
  return (
    <Pressable onPress={async () => (blocked ? void Linking.openSettings() : setState(await askPermission()))} accessibilityRole="button" style={{ paddingVertical: 7, paddingHorizontal: 12, backgroundColor: c.warnBg, borderTopWidth: 1, borderTopColor: c.line }}>
      <Txt style={{ fontSize: 12.5, fontWeight: '600', color: c.warn }}>{blocked ? 'Notifications are blocked, so reminders cannot reach you. Tap to open settings.' : 'Notifications are off, so reminders cannot reach you. Tap to turn them on.'}</Txt>
    </Pressable>
  );
}
