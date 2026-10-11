import { Pressable, View } from 'react-native';
import { dueAt, isDone } from '../../lib/selectors';
import { fgOn } from '../../lib/theme';
import { useTheme } from '../../lib/theme-context';
import type { Item, Settings } from '../../lib/types';
import Tick from '../Tick';
import { Txt } from '../ui';

// An assignment in the day's hours: a flat solid block like an event, but in its own colour (orange; red when late), with a tick.
// Same-title assignments due at the same minute are one block with a count, which opens the day's list.
export default function AssignmentBlock({ group, ds, settings, now, top, height, left, width, onOpen, onTick, onMore }: { group: Item[]; ds: string; settings: Settings; now: number; top: number; height: number; left: number; width: number; onOpen: (it: Item) => void; onTick: (it: Item) => void; onMore: () => void }) {
  const { c } = useTheme();
  const it = group[0]!, many = group.length > 1, done = group.every((x) => isDone(x, ds)), late = !done && group.some((x) => !isDone(x, ds) && dueAt(x, ds, settings) < now);
  const tone = late ? c.neg : c.asg, fg = fgOn(tone);
  return (
    <Pressable onPress={many ? onMore : () => onOpen(it)} accessibilityRole="button" accessibilityLabel={`${it.title}${many ? `, ${group.length} due` : ''}`} style={({ pressed }) => ({ position: 'absolute', top, height, left, width, overflow: 'hidden', paddingVertical: 3, paddingHorizontal: 6, borderRadius: 3, backgroundColor: tone, opacity: done ? 0.45 : pressed ? 0.85 : 1 })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        {many ? null : <Tick done={done} onPress={() => onTick(it)} size={14} color={fg} label="Tick off" />}
        <Txt style={{ flex: 1, fontSize: 11, lineHeight: 14, fontWeight: '800', color: fg }}>Due {it.time || settings.dueTime}</Txt>
        {many ? <View style={{ minWidth: 17, height: 16, paddingHorizontal: 4, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: fg === '#ffffff' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.45)' }}><Txt style={{ color: fg, fontSize: 10.5, lineHeight: 13, fontWeight: '800' }}>{group.length}</Txt></View> : null}
      </View>
      <Txt numberOfLines={Math.max(1, Math.floor((height - 24) / 16))} style={{ fontSize: 12.5, lineHeight: 16, fontWeight: '700', color: fg, textDecorationLine: done ? 'line-through' : 'none' }}>{it.title}</Txt>
      {it.category && height > 64 ? <Txt numberOfLines={1} style={{ fontSize: 11, lineHeight: 14, fontWeight: '600', color: fg, opacity: 0.8 }}>{it.subject || it.category}</Txt> : null}
    </Pressable>
  );
}
