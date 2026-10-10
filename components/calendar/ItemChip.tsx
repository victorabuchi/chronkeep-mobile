import { Pressable, View } from 'react-native';
import { colorOf, dueAt, isDone } from '../../lib/selectors';
import { startFor, ymd } from '../../lib/recur';
import { edge, mix, tint } from '../../lib/theme';
import { useTheme } from '../../lib/theme-context';
import type { Item, Settings } from '../../lib/types';
import Tick from '../Tick';
import { Txt } from '../ui';

// A deadline or all-day item as a small tinted chip (the web's .chip): in a day's top row, and in the month grid.
export default function ItemChip({ it, ds, settings, now, onOpen, onTick, month }: { it: Item; ds: string; settings: Settings; now: number; onOpen: () => void; onTick: () => void; month?: boolean }) {
  const { c } = useTheme();
  const col = colorOf(settings, it.category, c.b);
  const task = it.type !== 'event';
  const done = isDone(it, ds), late = task && !done && dueAt(it, ds, settings) < now;
  const cont = it.type === 'event' && !!it.time && startFor(it, ds) !== ds;
  const time = it.time ? (cont ? (startFor(it, ds) && it.endTime ? `until ${it.endTime}` : 'continues') : it.time) : '';
  const tone = late ? { bg: c.negBg, border: c.negLine, fg: c.neg } : { bg: tint(c, col), border: edge(c, col), fg: c.ink };
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={it.title} style={({ pressed }) => ({ flexDirection: month ? 'row' : 'row', flexWrap: month ? 'nowrap' : 'wrap', alignItems: month ? 'center' : 'flex-start', gap: 6, paddingVertical: month ? 2 : 3, paddingLeft: 5, paddingRight: 7, borderWidth: 1, borderRadius: 7, borderColor: tone.border, backgroundColor: tone.bg, opacity: done ? 0.5 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      {task ? <Tick done={done} onPress={onTick} size={15} color={late ? c.neg : col} label="Tick off" /> : <View style={{ width: 2 }} />}
      <Txt numberOfLines={month ? 1 : undefined} style={{ flexShrink: 1, flex: month ? 1 : undefined, minWidth: 40, fontSize: month ? 11.5 : 12, lineHeight: 15, fontWeight: '600', color: tone.fg, textDecorationLine: done ? 'line-through' : 'none' }}>
        {it.priority === 'high' ? <Txt style={{ color: c.neg, fontWeight: '800', fontSize: month ? 11.5 : 12, lineHeight: 15 }}>! </Txt> : null}
        {it.title}
      </Txt>
      {time && !month ? <Txt style={{ flexBasis: '100%', paddingLeft: 21, fontSize: 10.5, lineHeight: 13, fontWeight: '600', color: late ? c.neg : c.muted }}>{time}</Txt> : null}
    </Pressable>
  );
}

export const occOf = (it: Item, ds: string) => (it.type === 'event' ? startFor(it, ds) ?? ds : ds);
void ymd; void mix;
