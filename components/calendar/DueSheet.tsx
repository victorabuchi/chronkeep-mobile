import { Pressable, View } from 'react-native';
import { DOW, MON } from '../../lib/dates';
import { day } from '../../lib/recur';
import { colorOf, dueAt, isDone } from '../../lib/selectors';
import { splitDay } from '../../lib/due';
import { useTheme } from '../../lib/theme-context';
import type { Item, Settings } from '../../lib/types';
import type { TypeFilter } from '../../lib/ui-state';
import Tick from '../Tick';
import { Sheet, Txt } from '../ui';
import { occOf } from './ItemChip';

// Everything due on one day, opened from a merged pill or "+N more". Tick things off here, or tap one to open it.
export default function DueSheet({ ds, items, settings, typeF, now, onClose, onOpen, onTick }: { ds: string | null; items: Item[]; settings: Settings; typeF: TypeFilter; now: number; onClose: () => void; onOpen: (it: Item, occ: string) => void; onTick: (it: Item, ds: string) => void }) {
  const { c } = useTheme();
  const list = ds ? splitDay(items, ds, settings, typeF).due : [];
  const d = ds ? day(ds) : null;
  return (
    <Sheet open={!!ds && list.length > 0} onClose={onClose} title={d ? `Due ${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]!.slice(0, 3)} · ${list.length}` : ''}>
      <View style={{ gap: 2 }}>
        {ds ? list.map((it) => {
          const done = isDone(it, ds), task = it.type !== 'event', late = task && !done && dueAt(it, ds, settings) < now, col = colorOf(settings, it.category, c.b);
          return (
            <Pressable key={it.id} onPress={() => { onClose(); onOpen(it, occOf(it, ds)); }} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 9, backgroundColor: pressed ? c.soft : 'transparent', opacity: done ? 0.55 : 1 })}>
              {task ? <Tick done={done} onPress={() => onTick(it, ds)} size={19} color={late ? c.neg : col} label="Tick off" /> : <View style={{ width: 19, alignItems: 'center' }}><View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: col }} /></View>}
              <Txt style={{ flex: 1, fontWeight: '600', color: late ? c.neg : c.ink, textDecorationLine: done ? 'line-through' : 'none' }}>{it.title}</Txt>
              <Txt style={{ fontSize: 12, color: late ? c.neg : c.muted, fontWeight: '600' }}>{it.time || 'all day'}</Txt>
            </Pressable>
          );
        }) : null}
      </View>
    </Sheet>
  );
}
