import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useData } from '../../lib/data';
import { whenText } from '../../lib/dates';
import { plan, upcomingList } from '../../lib/schedule';
import { useTheme } from '../../lib/theme-context';
import { openItem } from '../../lib/ui-state';
import type { Planned } from '../../lib/types';
import Popover from '../Popover';
import { LinkBtn, Segment, Txt } from '../ui';

// The bell: what is coming (Upcoming) and what was sent (Earlier). Tapping one opens its item.
export default function NotifSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const router = useRouter();
  const data = useData((d) => d);
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming');
  const now = Date.now();
  const KINDS: Record<string, [string, string]> = { action: ['Action', c.pos], reminder: ['Reminder', c.b], repeat: ['Repeating', '#8b5cf6'], overdue: ['Overdue', c.neg], summary: ['Summary', c.warn], test: ['Test', c.muted] };
  const list: Planned[] = tab === 'upcoming' ? upcomingList(open ? plan({ items: data.items, settings: data.settings, snoozed: data.snoozed, now }) : [], now) : data.log.filter((e) => e.at <= now).slice().reverse().slice(0, 30);
  return (
    <Popover open={open} onClose={onClose} width={360}>
      <View style={{ gap: 10, padding: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt style={{ fontWeight: '800', fontSize: 15 }}>Notifications</Txt>
          <LinkBtn onPress={() => { onClose(); router.navigate('/tasks'); }}>Open tasks</LinkBtn>
        </View>
        <Segment options={[{ id: 'upcoming', label: 'Upcoming' }, { id: 'history', label: 'Earlier' }]} value={tab} onChange={setTab} wide />
        {list.length ? list.map((n, i) => {
          const [kl, kc] = KINDS[n.kind] ?? KINDS.reminder!, it = n.itemId ? data.items.find((x) => x.id === n.itemId) : undefined;
          return (
            <Pressable key={n.id + i} disabled={!it} onPress={() => { if (it) { onClose(); openItem(it, undefined, n.date || undefined); } }} style={({ pressed }) => ({ flexDirection: 'row', gap: 10, paddingVertical: 9, paddingHorizontal: 8, borderRadius: 9, backgroundColor: pressed ? c.soft : 'transparent' })}>
              <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 6, backgroundColor: kc }} />
              <View style={{ flex: 1 }}>
                <Txt style={{ fontWeight: '700' }}>{n.title}</Txt>
                <Txt style={{ color: c.muted, fontSize: 12.5 }}>{n.body}</Txt>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Txt style={{ color: kc, fontSize: 11, fontWeight: '700' }}>{kl}</Txt>
                <Txt style={{ color: c.muted, fontSize: 11.5 }}>{whenText(n.at, now)}</Txt>
              </View>
            </Pressable>
          );
        }) : <Txt style={{ color: c.muted, textAlign: 'center', padding: 20 }}>{tab === 'upcoming' ? 'Nothing scheduled. Add a deadline with a reminder and it shows up here.' : 'No notifications sent yet.'}</Txt>}
      </View>
    </Popover>
  );
}
